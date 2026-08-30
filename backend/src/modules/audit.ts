import { Router } from 'express'
import { db } from '../config/db'
import { authRequired, adminRequired } from '../middleware/auth'

export const auditRouter = Router()

/**
 * 操作日志列表，仅管理员可查
 */
auditRouter.post('/list', authRequired, adminRequired, (req, res) => {
  const { keyword, resource, action, from, to, limit = 200 } = req.body || {}
  const cond: string[] = []
  const params: any[] = []
  if (keyword) {
    cond.push('(username LIKE ? OR detail LIKE ? OR resource_id LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (resource) {
    cond.push('resource = ?')
    params.push(resource)
  }
  if (action) {
    cond.push('action = ?')
    params.push(action)
  }
  if (from) {
    cond.push('created_at >= ?')
    params.push(from)
  }
  if (to) {
    cond.push('created_at <= ?')
    params.push(to + ' 23:59:59')
  }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : ''
  const rows = db
    .prepare(
      `SELECT * FROM audit_logs ${where} ORDER BY id DESC LIMIT ?`
    )
    .all(...params, Number(limit))
  const stats = db
    .prepare(
      `SELECT resource, COUNT(*) as c FROM audit_logs GROUP BY resource ORDER BY c DESC LIMIT 10`
    )
    .all()
  res.json({ success: true, data: { rows, stats } })
})
