import { db } from '../config/db'
import type { Request } from 'express'

/**
 * 记录一条操作审计日志
 */
export function logAudit(
  req: Request,
  opts: {
    action: string
    resource: string
    resourceId?: string | number | bigint | null
    detail?: string | object | null
  }
) {
  try {
    const user = (req as any).user as
      | { id: number; username: string; display_name?: string }
      | undefined
    const detail =
      opts.detail == null
        ? null
        : typeof opts.detail === 'string'
          ? opts.detail
          : JSON.stringify(opts.detail)
    db.prepare(
      `INSERT INTO audit_logs (user_id, username, action, resource, resource_id, detail, ip)
       VALUES (?,?,?,?,?,?,?)`
    ).run(
      user?.id ?? null,
      user?.display_name || user?.username || 'anonymous',
      opts.action,
      opts.resource,
      opts.resourceId != null ? String(opts.resourceId) : null,
      detail,
      (req.headers['x-forwarded-for'] as string) || req.ip || ''
    )
  } catch (e) {
    console.warn('audit log failed:', e)
  }
}
