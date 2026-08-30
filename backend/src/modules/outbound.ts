import { Router } from 'express'
import { db } from '../config/db'
import { authRequired } from '../middleware/auth'
import { logAudit } from '../utils/audit'

export const outboundRouter = Router()

interface OutboundBody {
  destination: string
  outbound_date: string
  item_id: number
  quantity: number
  manual_fees?: Array<{ fee_type: 'labor' | 'extra'; description: string; amount: number }>
  remark?: string
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a)
  const d2 = new Date(b)
  const diff = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(diff, 1)
}

interface BillingRule {
  id: number
  price_per_day: number
  min_days: number
}

/** 匹配计费规则：按精细度层级 L1 (item+location) > L2 (item) > L3 (location) > L4 (通用)；同层取最新 (id DESC) */
function matchRule(itemId: number, locationId: number, outboundDate: string): BillingRule {
  const q = `
    SELECT * FROM billing_rules 
    WHERE active=1
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
      AND (item_id IS NULL OR item_id = ?)
      AND (location_id IS NULL OR location_id = ?)
    ORDER BY 
      (CASE WHEN item_id IS NOT NULL AND location_id IS NOT NULL THEN 3
            WHEN item_id IS NOT NULL THEN 2
            WHEN location_id IS NOT NULL THEN 1
            ELSE 0 END) DESC,
      id DESC
    LIMIT 1
  `
  const rule = db.prepare(q).get(outboundDate, outboundDate, itemId, locationId) as
    | BillingRule
    | undefined
  return rule || { id: 0, price_per_day: 0.5, min_days: 1 }
}

outboundRouter.post('/list', authRequired, (req, res) => {
  const { keyword, from, to, limit = 200 } = req.body || {}
  const conditions: string[] = []
  const params: any[] = []
  if (keyword) {
    conditions.push('(r.destination LIKE ? OR i.model_code LIKE ? OR i.name LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (from) {
    conditions.push('r.outbound_date >= ?')
    params.push(from)
  }
  if (to) {
    conditions.push('r.outbound_date <= ?')
    params.push(to)
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const rows = db
    .prepare(
      `SELECT r.*, i.model_code, i.name as item_name, i.unit,
        u.display_name as operator_name
       FROM outbound_records r
       LEFT JOIN items i ON i.id = r.item_id
       LEFT JOIN users u ON u.id = r.operator_id
       ${where}
       ORDER BY r.outbound_date DESC, r.id DESC LIMIT ?`
    )
    .all(...params, Number(limit))
  res.json({ success: true, data: rows })
})

outboundRouter.post('/detail', authRequired, (req, res) => {
  const { id } = req.body
  const record = db
    .prepare(
      `SELECT r.*, i.model_code, i.name as item_name, i.unit
       FROM outbound_records r LEFT JOIN items i ON i.id=r.item_id WHERE r.id=?`
    )
    .get(id)
  const batches = db
    .prepare(
      `SELECT b.*, r.source, r.inbound_date, l.code as location_code
       FROM outbound_batches b 
       LEFT JOIN inbound_records r ON r.id = b.inbound_id
       LEFT JOIN locations l ON l.id = r.location_id
       WHERE b.outbound_id=?`
    )
    .all(id)
  const fees = db.prepare('SELECT * FROM fee_details WHERE outbound_id=? ORDER BY id').all(id)
  res.json({ success: true, data: { record, batches, fees } })
})

outboundRouter.post('/create', authRequired, (req, res) => {
  const body = req.body as OutboundBody
  if (!body.destination || !body.outbound_date || !body.item_id || !body.quantity) {
    return res.status(400).json({ success: false, message: '必填项缺失' })
  }

  // 检查库存
  const stockRow = db
    .prepare('SELECT COALESCE(SUM(remaining_qty),0) as stock FROM inbound_records WHERE item_id=?')
    .get(body.item_id) as { stock: number }
  if (stockRow.stock < body.quantity) {
    return res
      .status(400)
      .json({ success: false, message: `库存不足，当前可出库 ${stockRow.stock}` })
  }

  const trx = db.transaction(() => {
    // 创建出库主记录（先占位，稍后更新费用）
    const outboundInfo = db
      .prepare(
        `INSERT INTO outbound_records (destination, outbound_date, item_id, quantity, operator_id, remark)
         VALUES (?,?,?,?,?,?)`
      )
      .run(
        body.destination,
        body.outbound_date,
        body.item_id,
        body.quantity,
        req.user!.id,
        body.remark || null
      )
    const outboundId = Number(outboundInfo.lastInsertRowid)

    // FIFO 分配批次
    const inbounds = db
      .prepare(
        `SELECT * FROM inbound_records WHERE item_id=? AND remaining_qty>0 
         ORDER BY inbound_date ASC, id ASC`
      )
      .all(body.item_id) as Array<{
      id: number
      inbound_date: string
      remaining_qty: number
      location_id: number
    }>

    let need = body.quantity
    let storageFee = 0
    const batchRecords: Array<{
      inbound_id: number
      quantity: number
      days: number
      price: number
      fee: number
      location_id: number
    }> = []

    for (const ib of inbounds) {
      if (need <= 0) break
      const take = Math.min(need, ib.remaining_qty)
      const rule = matchRule(body.item_id, ib.location_id, body.outbound_date)
      const days = Math.max(daysBetween(ib.inbound_date, body.outbound_date), rule.min_days)
      const fee = take * days * rule.price_per_day
      storageFee += fee
      batchRecords.push({
        inbound_id: ib.id,
        quantity: take,
        days,
        price: rule.price_per_day,
        fee,
        location_id: ib.location_id,
      })
      db.prepare('UPDATE inbound_records SET remaining_qty = remaining_qty - ? WHERE id=?').run(
        take,
        ib.id
      )
      need -= take
    }

    // 保存批次
    const batchStmt = db.prepare(
      `INSERT INTO outbound_batches (outbound_id, inbound_id, quantity, days_stored, price_per_day, fee)
       VALUES (?,?,?,?,?,?)`
    )
    batchRecords.forEach((b) =>
      batchStmt.run(outboundId, b.inbound_id, b.quantity, b.days, b.price, b.fee)
    )

    // 保存费用明细：基础存储费按批次
    const feeStmt = db.prepare(
      `INSERT INTO fee_details (outbound_id, fee_type, description, amount) VALUES (?,?,?,?)`
    )
    batchRecords.forEach((b) => {
      feeStmt.run(
        outboundId,
        'storage',
        `批次#${b.inbound_id} 存放${b.days}天 × ${b.quantity}件 × ¥${b.price}/天`,
        b.fee
      )
    })

    // 保存人工费
    let manualFee = 0
    if (Array.isArray(body.manual_fees)) {
      body.manual_fees.forEach((f) => {
        if (f.amount && f.description) {
          feeStmt.run(outboundId, f.fee_type, f.description, f.amount)
          manualFee += Number(f.amount)
        }
      })
    }

    const total = storageFee + manualFee
    db.prepare(
      'UPDATE outbound_records SET storage_fee=?, manual_fee=?, total_fee=? WHERE id=?'
    ).run(storageFee, manualFee, total, outboundId)

    return { id: outboundId, storage_fee: storageFee, manual_fee: manualFee, total_fee: total }
  })

  try {
    const result = trx()
    logAudit(req, {
      action: 'outbound',
      resource: 'outbound_record',
      resourceId: result.id,
      detail: {
        item_id: body.item_id,
        qty: body.quantity,
        destination: body.destination,
        total_fee: result.total_fee,
      },
    })
    res.json({ success: true, data: result })
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message })
  }
})

outboundRouter.post('/addFee', authRequired, (req, res) => {
  const { outbound_id, fee_type, description, amount } = req.body || {}
  if (!outbound_id || !fee_type || !amount)
    return res.status(400).json({ success: false, message: '参数错误' })
  db.prepare(
    'INSERT INTO fee_details (outbound_id, fee_type, description, amount) VALUES (?,?,?,?)'
  ).run(outbound_id, fee_type, description || '', amount)

  // 重算总费用
  const sums = db
    .prepare(
      `SELECT 
        COALESCE(SUM(CASE WHEN fee_type='storage' THEN amount ELSE 0 END),0) as storage,
        COALESCE(SUM(CASE WHEN fee_type IN ('labor','extra') THEN amount ELSE 0 END),0) as manual
       FROM fee_details WHERE outbound_id=?`
    )
    .get(outbound_id) as { storage: number; manual: number }
  const total = sums.storage + sums.manual
  db.prepare(
    'UPDATE outbound_records SET storage_fee=?, manual_fee=?, total_fee=? WHERE id=?'
  ).run(sums.storage, sums.manual, total, outbound_id)

  res.json({ success: true, data: { storage_fee: sums.storage, manual_fee: sums.manual, total } })
})
