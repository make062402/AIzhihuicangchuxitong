import { useEffect, useState } from 'react'
import apiClient from '@/lib/api-client'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, RotateCw } from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'

interface Log {
  id: number
  user_id: number | null
  username: string
  action: string
  resource: string
  resource_id: string | null
  detail: string | null
  ip: string | null
  created_at: string
}

const RESOURCE_LABEL: Record<string, string> = {
  inbound_record: '入库记录',
  outbound_record: '出库记录',
  billing_rule: '计费规则',
  stock_threshold: '预警阈值',
  user: '用户账号',
  item: '物品型号',
  location: '库位',
}
const ACTION_LABEL: Record<string, { label: string; variant: any }> = {
  create: { label: '新建', variant: 'default' },
  update: { label: '修改', variant: 'secondary' },
  delete: { label: '删除', variant: 'destructive' },
  inbound: { label: '入库', variant: 'default' },
  outbound: { label: '出库', variant: 'default' },
  login: { label: '登录', variant: 'outline' },
}

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员',
  operator: '操作员',
}
const LEVEL_LABEL: Record<string, string> = {
  CRITICAL: '关键',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
}
const LOGIN_METHOD_LABEL: Record<string, string> = {
  password: '账号密码',
  email_code: '邮箱验证码',
  sms_code: '短信验证码',
}

/**
 * 将后端存储的 detail JSON 翻译成中文自然语言
 */
function translateDetail(log: Log): string {
  if (!log.detail) return '-'
  let obj: any
  try {
    obj = JSON.parse(log.detail)
  } catch {
    return log.detail
  }
  if (!obj || typeof obj !== 'object') return String(log.detail)

  const parts: string[] = []
  const push = (label: string, value: any) => {
    if (value === undefined || value === null || value === '') return
    parts.push(`${label} ${value}`)
  }

  // 登录
  if (log.action === 'login' && obj.method) {
    return `使用 ${LOGIN_METHOD_LABEL[obj.method] || obj.method} 登录`
  }

  // 用户角色变更
  if (log.resource === 'user') {
    if (obj.role_from && obj.role_to && obj.role_from !== obj.role_to) {
      const who = obj.username ? `用户「${obj.username}」` : '该用户'
      parts.push(
        `${who}角色由「${ROLE_LABEL[obj.role_from] || obj.role_from}」调整为「${ROLE_LABEL[obj.role_to] || obj.role_to}」`
      )
    } else if (obj.username && log.action === 'create') {
      parts.push(
        `新建用户「${obj.username}」，角色：${ROLE_LABEL[obj.role] || obj.role || '-'}`
      )
    } else if (obj.username && log.action === 'delete') {
      parts.push(`删除用户「${obj.username}」`)
    }
    if (obj.password_reset) parts.push('（重置了登录密码）')
    if (parts.length) return parts.join('')
  }

  // 计费规则
  if (log.resource === 'billing_rule') {
    if (obj.name) parts.push(`规则「${obj.name}」`)
    if (obj.level) parts.push(`优先级：${LEVEL_LABEL[obj.level] || obj.level}`)
    if (obj.price_per_day != null) parts.push(`日单价 ¥${obj.price_per_day}`)
    if (parts.length) return parts.join('，')
  }

  // 入库
  if (log.action === 'inbound' || log.resource === 'inbound_record') {
    if (obj.source) push('来源', obj.source)
    if (obj.item_id) push('物品ID', `#${obj.item_id}`)
    if (obj.location_id) push('库位ID', `#${obj.location_id}`)
    if (obj.qty != null) push('数量', obj.qty)
    if (parts.length) return parts.join('，')
  }

  // 出库
  if (log.action === 'outbound' || log.resource === 'outbound_record') {
    if (obj.destination) push('去向', obj.destination)
    if (obj.item_id) push('物品ID', `#${obj.item_id}`)
    if (obj.qty != null) push('数量', obj.qty)
    if (obj.total_fee != null) push('总费用', `¥${Number(obj.total_fee).toFixed(2)}`)
    if (parts.length) return parts.join('，')
  }

  // 阈值
  if (log.resource === 'stock_threshold') {
    if (obj.item_id) push('物品ID', `#${obj.item_id}`)
    if (obj.low_threshold != null) push('低阈值', obj.low_threshold)
    if (obj.high_threshold != null) push('高阈值', obj.high_threshold)
    if (obj.aging_days != null) push('老化天数', obj.aging_days)
    if (parts.length) return parts.join('，')
  }

  // 兜底：把常见字段翻译成中文键
  const KEY_LABEL: Record<string, string> = {
    username: '用户',
    name: '名称',
    qty: '数量',
    source: '来源',
    destination: '去向',
    item_id: '物品',
    location_id: '库位',
    total_fee: '总费用',
    role: '角色',
    method: '方式',
  }
  const kv = Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${KEY_LABEL[k] || k}: ${v}`)
  return kv.length ? kv.join('，') : '-'
}

export default function AuditLogs() {
  const [rows, setRows] = useState<Log[]>([])
  const [stats, setStats] = useState<Array<{ resource: string; c: number }>>([])
  const [keyword, setKeyword] = useState('')
  const [resource, setResource] = useState<string>('all')
  const [action, setAction] = useState<string>('all')

  const load = async () => {
    const { data } = await apiClient.post('/audit/list', {
      keyword,
      resource: resource === 'all' ? '' : resource,
      action: action === 'all' ? '' : action,
    })
    if (data.success) {
      setRows(data.data.rows)
      setStats(data.data.stats)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <PageHeader
        title="操作日志"
        description="全站关键操作可追溯审计"
        actions={
          <Button variant="outline" onClick={load}>
            <RotateCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        }
      />

      <div style={{ padding: 'var(--spacing-xl)' }} className="space-y-4">
        {stats.length > 0 && (
          <FadeIn>
            <Card style={{ padding: 'var(--spacing-md)' }}>
              <div className="text-xs text-muted-foreground mb-2">
                最活跃的资源类型（操作次数排行）
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.map((s) => (
                  <span
                    key={s.resource}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-muted text-xs"
                  >
                    <span>{RESOURCE_LABEL[s.resource] || s.resource}</span>
                    <span className="font-mono font-semibold">{s.c}</span>
                  </span>
                ))}
              </div>
            </Card>
          </FadeIn>
        )}

        <FadeIn>
          <Card style={{ padding: 'var(--spacing-md)' }}>
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                placeholder="搜索用户 / 详情 / 目标编号"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                className="max-w-sm"
              />
              <Select value={resource} onValueChange={setResource}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="资源类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部资源</SelectItem>
                  {Object.entries(RESOURCE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="操作类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部动作</SelectItem>
                  {Object.entries(ACTION_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={load}>
                <Search className="w-4 h-4 mr-1" />
                查询
              </Button>
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">时间</TableHead>
                  <TableHead>操作员</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>资源</TableHead>
                  <TableHead>目标编号</TableHead>
                  <TableHead>详情说明</TableHead>
                  <TableHead className="w-32">来源IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const a = ACTION_LABEL[r.action] || { label: r.action, variant: 'outline' }
                  const detail = translateDetail(r)
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.created_at}</TableCell>
                      <TableCell>{r.username}</TableCell>
                      <TableCell>
                        <Badge variant={a.variant}>{a.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {RESOURCE_LABEL[r.resource] || r.resource}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.resource_id ? `#${r.resource_id}` : '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-md">
                        <div
                          className="whitespace-pre-wrap break-words"
                          title={r.detail || ''}
                        >
                          {detail}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {r.ip || '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      暂无操作日志
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </FadeIn>
      </div>
    </div>
  )
}
