import { Router } from 'express'
import { db } from '../config/db'
import { authRequired, adminRequired } from '../middleware/auth'
import { logAudit } from '../utils/audit'

export const alertsRouter = Router()

/**
 * 库存预警汇总：
 * - low: 库存低于 low_threshold
 * - high: 库存高于 high_threshold
 * - aging: 存在超过 aging_days 未出库的批次
 * - out_of_stock: 库存为 0
 */
alertsRouter.post('/summary', authRequired, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT 
        i.id, i.model_code, i.name, i.unit, i.category,
        COALESCE(SUM(r.remaining_qty),0) as stock,
        COALESCE(MAX(julianday('now') - julianday(r.inbound_date)),0) as oldest_days,
        COALESCE(t.low_threshold, 50) as low_threshold,
        COALESCE(t.high_threshold, 2000) as high_threshold,
        COALESCE(t.aging_days, 60) as aging_days
       FROM items i
       LEFT JOIN inbound_records r ON r.item_id = i.id AND r.remaining_qty > 0
       LEFT JOIN stock_thresholds t ON t.item_id = i.id
       GROUP BY i.id`
    )
    .all() as any[]

  const alerts = rows
    .map((row) => {
      const stock = row.stock as number
      const oldest = Math.floor(row.oldest_days as number)
      const levels: string[] = []
      if (stock === 0) levels.push('out_of_stock')
      else if (stock < row.low_threshold) levels.push('low')
      if (stock > row.high_threshold) levels.push('high')
      if (oldest >= row.aging_days && stock > 0) levels.push('aging')
      return { ...row, oldest_days: oldest, levels }
    })
    .filter((r) => r.levels.length > 0)

  const stats = {
    out_of_stock: alerts.filter((a) => a.levels.includes('out_of_stock')).length,
    low: alerts.filter((a) => a.levels.includes('low')).length,
    high: alerts.filter((a) => a.levels.includes('high')).length,
    aging: alerts.filter((a) => a.levels.includes('aging')).length,
  }

  res.json({ success: true, data: { alerts, stats } })
})

alertsRouter.post('/thresholds/list', authRequired, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT i.id as item_id, i.model_code, i.name, i.unit,
        COALESCE(t.low_threshold, 50) as low_threshold,
        COALESCE(t.high_threshold, 2000) as high_threshold,
        COALESCE(t.aging_days, 60) as aging_days
       FROM items i
       LEFT JOIN stock_thresholds t ON t.item_id = i.id
       ORDER BY i.id`
    )
    .all()
  res.json({ success: true, data: rows })
})

alertsRouter.post('/thresholds/upsert', authRequired, adminRequired, (req, res) => {
  const { item_id, low_threshold, high_threshold, aging_days } = req.body || {}
  if (!item_id) return res.status(400).json({ success: false, message: '缺少 item_id' })
  const exists = db.prepare('SELECT id FROM stock_thresholds WHERE item_id=?').get(item_id)
  if (exists) {
    db.prepare(
      'UPDATE stock_thresholds SET low_threshold=?, high_threshold=?, aging_days=? WHERE item_id=?'
    ).run(Number(low_threshold), Number(high_threshold), Number(aging_days), item_id)
  } else {
    db.prepare(
      'INSERT INTO stock_thresholds (item_id, low_threshold, high_threshold, aging_days) VALUES (?,?,?,?)'
    ).run(item_id, Number(low_threshold), Number(high_threshold), Number(aging_days))
  }
  logAudit(req, {
    action: 'update',
    resource: 'stock_threshold',
    resourceId: item_id,
    detail: { low_threshold, high_threshold, aging_days },
  })
  res.json({ success: true })
})
