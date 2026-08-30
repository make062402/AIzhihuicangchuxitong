import { Router } from 'express'
import { db } from '../config/db'
import { authRequired, adminRequired } from '../middleware/auth'
import { logAudit } from '../utils/audit'

export const billingRouter = Router()

// 简化后：不再使用优先级维度，priority 字段固定写默认值以兼容历史 schema
const DEFAULT_PRIORITY = 10
const DEFAULT_LEVEL = 'MEDIUM'

billingRouter.post('/rules/list', authRequired, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*, i.model_code, i.name as item_name, l.code as location_code
       FROM billing_rules r
       LEFT JOIN items i ON i.id = r.item_id
       LEFT JOIN locations l ON l.id = r.location_id
       ORDER BY 
         (CASE WHEN r.item_id IS NOT NULL AND r.location_id IS NOT NULL THEN 3
               WHEN r.item_id IS NOT NULL THEN 2
               WHEN r.location_id IS NOT NULL THEN 1
               ELSE 0 END) DESC,
         r.id DESC`
    )
    .all()
  res.json({ success: true, data: rows })
})

billingRouter.post('/rules/create', authRequired, adminRequired, (req, res) => {
  const { name, item_id, location_id, start_date, end_date, price_per_day, min_days, active } =
    req.body || {}
  if (!name || price_per_day == null)
    return res.status(400).json({ success: false, message: '名称和日单价必填' })
  const info = db
    .prepare(
      `INSERT INTO billing_rules (name, item_id, location_id, start_date, end_date, price_per_day, min_days, priority, priority_level, active)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      name,
      item_id || null,
      location_id || null,
      start_date || null,
      end_date || null,
      Number(price_per_day),
      Number(min_days || 0),
      DEFAULT_PRIORITY,
      DEFAULT_LEVEL,
      active ? 1 : 0
    )
  logAudit(req, {
    action: 'create',
    resource: 'billing_rule',
    resourceId: info.lastInsertRowid,
    detail: { name, price_per_day },
  })
  res.json({ success: true, data: { id: info.lastInsertRowid } })
})

billingRouter.post('/rules/update', authRequired, adminRequired, (req, res) => {
  const { id, name, item_id, location_id, start_date, end_date, price_per_day, min_days, active } =
    req.body
  db.prepare(
    `UPDATE billing_rules SET name=?, item_id=?, location_id=?, start_date=?, end_date=?, 
     price_per_day=?, min_days=?, active=? WHERE id=?`
  ).run(
    name,
    item_id || null,
    location_id || null,
    start_date || null,
    end_date || null,
    Number(price_per_day),
    Number(min_days || 0),
    active ? 1 : 0,
    id
  )
  logAudit(req, {
    action: 'update',
    resource: 'billing_rule',
    resourceId: id,
    detail: { name },
  })
  res.json({ success: true })
})

billingRouter.post('/rules/delete', authRequired, adminRequired, (req, res) => {
  const { id } = req.body
  db.prepare('DELETE FROM billing_rules WHERE id=?').run(id)
  logAudit(req, { action: 'delete', resource: 'billing_rule', resourceId: id })
  res.json({ success: true })
})

billingRouter.post('/fees/list', authRequired, (req, res) => {
  const { from, to, keyword } = req.body || {}
  const cond: string[] = []
  const params: any[] = []
  if (from) {
    cond.push('r.outbound_date >= ?')
    params.push(from)
  }
  if (to) {
    cond.push('r.outbound_date <= ?')
    params.push(to)
  }
  if (keyword) {
    cond.push('(r.destination LIKE ? OR i.model_code LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : ''
  const rows = db
    .prepare(
      `SELECT r.id, r.outbound_date, r.destination, r.quantity, r.storage_fee, r.manual_fee, r.total_fee,
        i.model_code, i.name as item_name
       FROM outbound_records r
       LEFT JOIN items i ON i.id = r.item_id
       ${where}
       ORDER BY r.outbound_date DESC, r.id DESC LIMIT 500`
    )
    .all(...params)
  res.json({ success: true, data: rows })
})
