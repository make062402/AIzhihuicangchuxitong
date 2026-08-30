import { Router } from 'express'
import { db } from '../config/db'
import { authRequired, adminRequired } from '../middleware/auth'

export const itemsRouter = Router()

itemsRouter.post('/list', authRequired, (_req, res) => {
  const items = db
    .prepare(
      `SELECT i.*, 
        (SELECT COALESCE(SUM(remaining_qty),0) FROM inbound_records WHERE item_id=i.id) as stock
       FROM items i ORDER BY i.id`
    )
    .all()
  res.json({ success: true, data: items })
})

itemsRouter.post('/inStock', authRequired, (_req, res) => {
  // 有剩余库存的物品，用于出库下拉
  const items = db
    .prepare(
      `SELECT i.id, i.model_code, i.name, i.unit,
        COALESCE(SUM(r.remaining_qty),0) as stock
       FROM items i LEFT JOIN inbound_records r ON r.item_id = i.id
       GROUP BY i.id HAVING stock > 0 ORDER BY i.model_code`
    )
    .all()
  res.json({ success: true, data: items })
})

itemsRouter.post('/create', authRequired, adminRequired, (req, res) => {
  const { model_code, name, unit, category } = req.body || {}
  if (!model_code || !name)
    return res.status(400).json({ success: false, message: '型号和名称必填' })
  try {
    const info = db
      .prepare('INSERT INTO items (model_code, name, unit, category) VALUES (?,?,?,?)')
      .run(model_code, name, unit || '件', category || null)
    res.json({ success: true, data: { id: info.lastInsertRowid } })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

itemsRouter.post('/update', authRequired, adminRequired, (req, res) => {
  const { id, model_code, name, unit, category } = req.body || {}
  db.prepare(
    'UPDATE items SET model_code=?, name=?, unit=?, category=? WHERE id=?'
  ).run(model_code, name, unit, category, id)
  res.json({ success: true })
})

itemsRouter.post('/delete', authRequired, adminRequired, (req, res) => {
  try {
    db.prepare('DELETE FROM items WHERE id=?').run(req.body.id)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, message: '存在关联记录，无法删除' })
  }
})

// Locations
export const locationsRouter = Router()

locationsRouter.post('/list', authRequired, (_req, res) => {
  const locations = db
    .prepare(
      `SELECT l.*,
        (SELECT COALESCE(SUM(remaining_qty),0) FROM inbound_records WHERE location_id=l.id) as used
       FROM locations l ORDER BY l.id`
    )
    .all()
  res.json({ success: true, data: locations })
})

locationsRouter.post('/create', authRequired, adminRequired, (req, res) => {
  const { code, zone, capacity } = req.body || {}
  if (!code) return res.status(400).json({ success: false, message: '库位编号必填' })
  try {
    const info = db
      .prepare('INSERT INTO locations (code, zone, capacity) VALUES (?,?,?)')
      .run(code, zone, capacity || 1000)
    res.json({ success: true, data: { id: info.lastInsertRowid } })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

locationsRouter.post('/update', authRequired, adminRequired, (req, res) => {
  const { id, code, zone, capacity } = req.body
  db.prepare('UPDATE locations SET code=?, zone=?, capacity=? WHERE id=?').run(
    code,
    zone,
    capacity,
    id
  )
  res.json({ success: true })
})

locationsRouter.post('/delete', authRequired, adminRequired, (req, res) => {
  try {
    db.prepare('DELETE FROM locations WHERE id=?').run(req.body.id)
    res.json({ success: true })
  } catch {
    res.status(400).json({ success: false, message: '存在关联记录，无法删除' })
  }
})
