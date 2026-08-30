import { Router } from 'express'
import { db } from '../config/db'
import { authRequired } from '../middleware/auth'

export const inventoryRouter = Router()

inventoryRouter.post('/summary', authRequired, (_req, res) => {
  const totalStock = (
    db.prepare('SELECT COALESCE(SUM(remaining_qty),0) as v FROM inbound_records').get() as {
      v: number
    }
  ).v
  const skuCount = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT item_id) as v FROM inbound_records WHERE remaining_qty>0`
      )
      .get() as { v: number }
  ).v
  const locationUsed = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT location_id) as v FROM inbound_records WHERE remaining_qty>0`
      )
      .get() as { v: number }
  ).v
  const locationTotal = (db.prepare('SELECT COUNT(*) as v FROM locations').get() as { v: number }).v

  const today = new Date().toISOString().slice(0, 10)
  const todayIn = (
    db
      .prepare('SELECT COALESCE(SUM(quantity),0) as v FROM inbound_records WHERE inbound_date=?')
      .get(today) as { v: number }
  ).v
  const todayOut = (
    db
      .prepare('SELECT COALESCE(SUM(quantity),0) as v FROM outbound_records WHERE outbound_date=?')
      .get(today) as { v: number }
  ).v
  const monthFee = (
    db
      .prepare(
        `SELECT COALESCE(SUM(total_fee),0) as v FROM outbound_records 
         WHERE substr(outbound_date,1,7) = substr(?,1,7)`
      )
      .get(today) as { v: number }
  ).v

  // 近 30 天趋势
  const daysBack = 14
  const trend: Array<{ date: string; inbound: number; outbound: number }> = []
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    const ib = (
      db
        .prepare('SELECT COALESCE(SUM(quantity),0) as v FROM inbound_records WHERE inbound_date=?')
        .get(ds) as { v: number }
    ).v
    const ob = (
      db
        .prepare(
          'SELECT COALESCE(SUM(quantity),0) as v FROM outbound_records WHERE outbound_date=?'
        )
        .get(ds) as { v: number }
    ).v
    trend.push({ date: ds.slice(5), inbound: ib, outbound: ob })
  }

  // TOP 库存物品
  const topItems = db
    .prepare(
      `SELECT i.model_code, i.name, COALESCE(SUM(r.remaining_qty),0) as stock
       FROM items i LEFT JOIN inbound_records r ON r.item_id=i.id
       GROUP BY i.id HAVING stock>0 ORDER BY stock DESC LIMIT 5`
    )
    .all()

  // 库位占用
  const locationDist = db
    .prepare(
      `SELECT l.code, l.zone, l.capacity,
        COALESCE(SUM(r.remaining_qty),0) as used
       FROM locations l LEFT JOIN inbound_records r ON r.location_id=l.id
       GROUP BY l.id ORDER BY used DESC`
    )
    .all()

  res.json({
    success: true,
    data: {
      totalStock,
      skuCount,
      locationUsed,
      locationTotal,
      todayIn,
      todayOut,
      monthFee,
      trend,
      topItems,
      locationDist,
    },
  })
})

/** 库存明细：按物品+批次 */
inventoryRouter.post('/details', authRequired, (req, res) => {
  const { keyword } = req.body || {}
  const params: any[] = []
  let where = 'r.remaining_qty > 0'
  if (keyword) {
    where += ' AND (i.model_code LIKE ? OR i.name LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  const rows = db
    .prepare(
      `SELECT r.id, r.inbound_date, r.source, r.quantity, r.remaining_qty,
        i.model_code, i.name as item_name, i.unit,
        l.code as location_code, l.zone,
        CAST(julianday('now','localtime') - julianday(r.inbound_date) AS INTEGER) as days_stored
       FROM inbound_records r
       LEFT JOIN items i ON i.id = r.item_id
       LEFT JOIN locations l ON l.id = r.location_id
       WHERE ${where}
       ORDER BY r.inbound_date ASC`
    )
    .all(...params)
  res.json({ success: true, data: rows })
})
