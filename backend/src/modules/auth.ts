import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../config/db'
import { signToken, authRequired } from '../middleware/auth'
import { logAudit } from '../utils/audit'

export const authRouter = Router()

interface UserRow {
  id: number
  username: string
  password_hash: string
  email: string | null
  phone: string | null
  role: 'admin' | 'operator'
  display_name: string | null
}

/** 密码登录 */
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' })
  }
  const user = db
    .prepare('SELECT * FROM users WHERE username = ? OR email = ? OR phone = ?')
    .get(username, username, username) as UserRow | undefined
  if (!user) return res.status(401).json({ success: false, message: '账号不存在' })
  const ok = bcrypt.compareSync(password, user.password_hash)
  if (!ok) return res.status(401).json({ success: false, message: '密码错误' })
  const token = signToken({
    id: user.id,
    username: user.username,
    role: user.role,
    display_name: user.display_name || user.username,
  })
  ;(req as any).user = { id: user.id, username: user.username, display_name: user.display_name }
  logAudit(req, {
    action: 'login',
    resource: 'user',
    resourceId: user.id,
    detail: { method: 'password' },
  })
  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        display_name: user.display_name,
      },
    },
  })
})

/** 发送验证码 (模拟) */
authRouter.post('/send-code', (req, res) => {
  const { target, channel } = req.body || {}
  if (!target || !['email', 'sms'].includes(channel)) {
    return res.status(400).json({ success: false, message: '参数错误' })
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = Date.now() + 5 * 60 * 1000
  db.prepare(
    'INSERT INTO verification_codes (target, channel, code, expires_at) VALUES (?,?,?,?)'
  ).run(target, channel, code, expires)

  // Demo 模式：直接返回验证码，方便测试。真实场景应通过腾讯云短信/邮件服务发送。
  return res.json({
    success: true,
    message: `${channel === 'email' ? '邮箱' : '短信'}验证码已发送`,
    data: { demo_code: code },
  })
})

/** 验证码登录 */
authRouter.post('/verify-code', (req, res) => {
  const { target, channel, code } = req.body || {}
  if (!target || !channel || !code) {
    return res.status(400).json({ success: false, message: '参数错误' })
  }
  const record = db
    .prepare(
      `SELECT * FROM verification_codes WHERE target=? AND channel=? AND code=? AND used=0 AND expires_at > ? ORDER BY id DESC LIMIT 1`
    )
    .get(target, channel, code, Date.now()) as { id: number } | undefined
  if (!record) return res.status(401).json({ success: false, message: '验证码错误或已过期' })
  db.prepare('UPDATE verification_codes SET used=1 WHERE id=?').run(record.id)

  const field = channel === 'email' ? 'email' : 'phone'
  let user = db.prepare(`SELECT * FROM users WHERE ${field} = ?`).get(target) as
    | UserRow
    | undefined

  if (!user) {
    // 自动注册
    const pw = bcrypt.hashSync(Math.random().toString(36), 10)
    const username = `${channel}_${target.replace(/[^0-9a-zA-Z]/g, '').slice(-6)}`
    const info = db
      .prepare(
        `INSERT INTO users (username, password_hash, ${field}, role, display_name) VALUES (?,?,?,?,?)`
      )
      .run(username, pw, target, 'operator', `新用户_${username}`)
    user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid) as UserRow
  }

  const token = signToken({
    id: user.id,
    username: user.username,
    role: user.role,
    display_name: user.display_name || user.username,
  })
  ;(req as any).user = { id: user.id, username: user.username, display_name: user.display_name }
  logAudit(req, {
    action: 'login',
    resource: 'user',
    resourceId: user.id,
    detail: { method: channel === 'email' ? 'email_code' : 'sms_code' },
  })
  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        display_name: user.display_name,
      },
    },
  })
})

/** 当前用户 */
authRouter.post('/me', authRequired, (req, res) => {
  const u = db.prepare('SELECT id,username,email,phone,role,display_name FROM users WHERE id=?').get(
    req.user!.id
  )
  res.json({ success: true, data: u })
})
