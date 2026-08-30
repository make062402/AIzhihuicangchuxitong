import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../config/db'
import { authRequired, adminRequired } from '../middleware/auth'
import { logAudit } from '../utils/audit'

export const usersRouter = Router()

usersRouter.post('/list', authRequired, adminRequired, (_req, res) => {
  const rows = db
    .prepare(
      'SELECT id, username, email, phone, role, display_name, created_at FROM users ORDER BY id'
    )
    .all()
  res.json({ success: true, data: rows })
})

usersRouter.post('/create', authRequired, adminRequired, (req, res) => {
  const { username, password, email, phone, role, display_name } = req.body || {}
  if (!username || !password)
    return res.status(400).json({ success: false, message: '用户名和密码必填' })
  try {
    const info = db
      .prepare(
        `INSERT INTO users (username, password_hash, email, phone, role, display_name) VALUES (?,?,?,?,?,?)`
      )
      .run(
        username,
        bcrypt.hashSync(password, 10),
        email || null,
        phone || null,
        role === 'admin' ? 'admin' : 'operator',
        display_name || username
      )
    logAudit(req, {
      action: 'create',
      resource: 'user',
      resourceId: info.lastInsertRowid,
      detail: { username, role: role === 'admin' ? 'admin' : 'operator' },
    })
    res.json({ success: true, data: { id: info.lastInsertRowid } })
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message })
  }
})

/** 修改角色（快速切换权限） */
usersRouter.post('/changeRole', authRequired, adminRequired, (req, res) => {
  const { id, role } = req.body || {}
  if (!id || !['admin', 'operator'].includes(role))
    return res.status(400).json({ success: false, message: '参数错误' })
  if (Number(id) === req.user!.id && role !== 'admin')
    return res.status(400).json({ success: false, message: '不能取消自己的管理员权限' })
  const before = db.prepare('SELECT role, username FROM users WHERE id=?').get(id) as
    | { role: string; username: string }
    | undefined
  if (!before) return res.status(404).json({ success: false, message: '用户不存在' })
  if (before.role === role) return res.json({ success: true })
  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, id)
  logAudit(req, {
    action: 'update',
    resource: 'user',
    resourceId: id,
    detail: {
      username: before.username,
      role_from: before.role,
      role_to: role,
    },
  })
  res.json({ success: true })
})

usersRouter.post('/update', authRequired, adminRequired, (req, res) => {
  const { id, email, phone, role, display_name, password } = req.body
  const before = db.prepare('SELECT role, username FROM users WHERE id=?').get(id) as
    | { role: string; username: string }
    | undefined
  if (!before) return res.status(404).json({ success: false, message: '用户不存在' })
  if (Number(id) === req.user!.id && role !== 'admin')
    return res.status(400).json({ success: false, message: '不能取消自己的管理员权限' })
  if (password) {
    db.prepare(
      `UPDATE users SET email=?, phone=?, role=?, display_name=?, password_hash=? WHERE id=?`
    ).run(email, phone, role, display_name, bcrypt.hashSync(password, 10), id)
  } else {
    db.prepare(
      `UPDATE users SET email=?, phone=?, role=?, display_name=? WHERE id=?`
    ).run(email, phone, role, display_name, id)
  }
  logAudit(req, {
    action: 'update',
    resource: 'user',
    resourceId: id,
    detail: {
      username: before.username,
      role_from: before.role,
      role_to: role,
      password_reset: !!password,
    },
  })
  res.json({ success: true })
})

usersRouter.post('/delete', authRequired, adminRequired, (req, res) => {
  const { id } = req.body
  if (Number(id) === req.user!.id)
    return res.status(400).json({ success: false, message: '不能删除自己' })
  const before = db.prepare('SELECT username FROM users WHERE id=?').get(id) as
    | { username: string }
    | undefined
  db.prepare('DELETE FROM users WHERE id=?').run(id)
  logAudit(req, {
    action: 'delete',
    resource: 'user',
    resourceId: id,
    detail: { username: before?.username || '' },
  })
  res.json({ success: true })
})
