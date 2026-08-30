import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'wms-super-secret-dev-key-2026'

export interface AuthUser {
  id: number
  username: string
  role: 'admin' | 'operator'
  display_name?: string
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser
  } catch {
    return null
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ success: false, message: '请先登录' })
  const user = verifyToken(token)
  if (!user) return res.status(401).json({ success: false, message: '登录已失效，请重新登录' })
  req.user = user
  next()
}

export function adminRequired(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, message: '请先登录' })
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '仅管理员可执行此操作' })
  }
  next()
}
