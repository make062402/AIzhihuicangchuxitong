import { Router } from 'express'
import { db } from '../config/db'
import { authRequired } from '../middleware/auth'
import { logAudit } from '../utils/audit'

export const inboundRouter = Router()

interface InboundBody {
  source: string
  inbound_date: string
  item_id: number
  quantity: number
  location_id: number
  remark?: string
}

inboundRouter.post('/list', authRequired, (req, res) => {
  const { keyword, from, to, limit = 200 } = req.body || {}
  const conditions: string[] = []
  const params: any[] = []
  if (keyword) {
    conditions.push('(r.source LIKE ? OR i.model_code LIKE ? OR i.name LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (from) {
    conditions.push('r.inbound_date >= ?')
    params.push(from)
  }
  if (to) {
    conditions.push('r.inbound_date <= ?')
    params.push(to)
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const rows = db
    .prepare(
      `SELECT r.*, i.model_code, i.name as item_name, i.unit, l.code as location_code, l.zone,
        u.display_name as operator_name
       FROM inbound_records r
       LEFT JOIN items i ON i.id = r.item_id
       LEFT JOIN locations l ON l.id = r.location_id
       LEFT JOIN users u ON u.id = r.operator_id
       ${where}
       ORDER BY r.inbound_date DESC, r.id DESC LIMIT ?`
    )
    .all(...params, Number(limit))
  res.json({ success: true, data: rows })
})

inboundRouter.post('/create', authRequired, (req, res) => {
  const body = req.body as InboundBody
  if (!body.source || !body.inbound_date || !body.item_id || !body.quantity || !body.location_id) {
    return res.status(400).json({ success: false, message: '必填项缺失' })
  }
  const info = db
    .prepare(
      `INSERT INTO inbound_records (source, inbound_date, item_id, quantity, location_id, remaining_qty, operator_id, remark)
       VALUES (?,?,?,?,?,?,?,?)`
    )
    .run(
      body.source,
      body.inbound_date,
      body.item_id,
      body.quantity,
      body.location_id,
      body.quantity,
      req.user!.id,
      body.remark || null
    )
  logAudit(req, {
    action: 'inbound',
    resource: 'inbound_record',
    resourceId: info.lastInsertRowid,
    detail: {
      item_id: body.item_id,
      qty: body.quantity,
      location_id: body.location_id,
      source: body.source,
    },
  })
  res.json({ success: true, data: { id: info.lastInsertRowid } })
})

inboundRouter.post('/batchImport', authRequired, (req, res) => {
  const { rows } = req.body as { rows: InboundBody[] }
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(400).json({ success: false, message: '无有效数据' })
  }
  const stmt = db.prepare(
    `INSERT INTO inbound_records (source, inbound_date, item_id, quantity, location_id, remaining_qty, operator_id, remark)
     VALUES (?,?,?,?,?,?,?,?)`
  )
  let ok = 0
  const errors: string[] = []
  const trx = db.transaction((list: InboundBody[]) => {
    list.forEach((r, idx) => {
      try {
        stmt.run(
          r.source,
          r.inbound_date,
          r.item_id,
          r.quantity,
          r.location_id,
          r.quantity,
          req.user!.id,
          r.remark || null
        )
        ok++
      } catch (e: any) {
        errors.push(`第${idx + 1}行: ${e.message}`)
      }
    })
  })
  trx(rows)
  res.json({ success: true, data: { imported: ok, errors } })
})

inboundRouter.post('/delete', authRequired, (req, res) => {
  const { id } = req.body
  const record = db.prepare('SELECT * FROM inbound_records WHERE id=?').get(id) as any
  if (!record) return res.status(404).json({ success: false, message: '记录不存在' })
  if (record.remaining_qty !== record.quantity) {
    return res.status(400).json({ success: false, message: '该批次已有出库，无法删除' })
  }
  db.prepare('DELETE FROM inbound_records WHERE id=?').run(id)
  logAudit(req, {
    action: 'delete',
    resource: 'inbound_record',
    resourceId: id,
    detail: { item_id: record.item_id, qty: record.quantity },
  })
  res.json({ success: true })
})
