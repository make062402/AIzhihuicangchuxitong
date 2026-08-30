import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import RoleBadge from '@/components/RoleBadge'
import { useConfirm } from '@/components/ConfirmDialog'
import { useAuth } from '@/hooks/use-auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Edit,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  Check,
  X,
} from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'
import { FormField, useFormErrors } from '@/components/form/FormField'

interface User {
  id: number
  username: string
  email: string
  phone: string
  role: 'admin' | 'operator'
  display_name: string
  created_at: string
}

type UserForm = {
  id: number
  username: string
  password: string
  email: string
  phone: string
  role: 'admin' | 'operator'
  display_name: string
}

/**
 * 权限对照表：管理员可用 / 操作员可用
 */
const PERMISSIONS: Array<{
  key: string
  label: string
  admin: boolean
  operator: boolean
}> = [
  { key: 'dashboard', label: '库存总览', admin: true, operator: true },
  { key: 'inbound', label: '入库登记', admin: true, operator: true },
  { key: 'outbound', label: '出库登记与计费', admin: true, operator: true },
  { key: 'inventory', label: '库存明细查看', admin: true, operator: true },
  { key: 'alerts', label: '库存预警查看', admin: true, operator: true },
  { key: 'fees', label: '费用明细查看', admin: true, operator: true },
  { key: 'billing_rules', label: '计费规则维护', admin: true, operator: false },
  { key: 'items', label: '物品型号管理', admin: true, operator: false },
  { key: 'locations', label: '库位管理', admin: true, operator: false },
  { key: 'users', label: '用户与权限管理', admin: true, operator: false },
  { key: 'thresholds', label: '预警阈值设置', admin: true, operator: false },
  { key: 'audit', label: '操作日志查看', admin: true, operator: false },
]

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [open, setOpen] = useState(false)
  const confirm = useConfirm()
  const [form, setForm] = useState<UserForm>({
    id: 0,
    username: '',
    password: '',
    email: '',
    phone: '',
    role: 'operator',
    display_name: '',
  })
  const { errors, register, validate, clear } = useFormErrors<UserForm>()

  const load = async () => {
    const { data } = await apiClient.post('/users/list', {})
    if (data.success) setUsers(data.data)
  }
  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setForm({
      id: 0,
      username: '',
      password: '',
      email: '',
      phone: '',
      role: 'operator',
      display_name: '',
    })
    clear()
    setOpen(true)
  }

  const openEdit = (u: User) => {
    setForm({ ...u, password: '' })
    clear()
    setOpen(true)
  }

  const setField = <K extends keyof UserForm>(k: K, v: UserForm[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }))
    clear(k)
  }

  const submit = async () => {
    const ok = validate(form, {
      username: form.id
        ? {}
        : { required: '请填写用户名' },
      password: form.id
        ? {}
        : {
            required: '请填写初始密码',
            validate: (v) =>
              String(v).length >= 6 ? null : '密码至少 6 位',
          },
      display_name: {
        validate: (v) =>
          !v || String(v).length <= 30 ? null : '姓名过长',
      },
      role: { required: '请选择角色' },
    })
    if (!ok) {
      toast.error('存在未填写或错误项，请检查')
      return
    }
    try {
      const url = form.id ? '/users/update' : '/users/create'
      const { data } = await apiClient.post(url, form)
      if (data.success) {
        toast.success('保存成功')
        setOpen(false)
        load()
      } else toast.error(data.message)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const changeRole = async (u: User, next: 'admin' | 'operator') => {
    if (u.role === next) return
    if (me?.id === u.id && next !== 'admin') {
      toast.error('不能取消自己的管理员权限')
      return
    }
    const ok = await confirm({
      title: '调整用户权限',
      description: `将「${u.display_name || u.username}」的角色从 ${
        u.role === 'admin' ? '管理员' : '操作员'
      } 调整为 ${next === 'admin' ? '管理员' : '操作员'}？`,
      confirmText: '确认调整',
      danger: next === 'operator' && u.role === 'admin',
    })
    if (!ok) return
    try {
      const { data } = await apiClient.post('/users/changeRole', {
        id: u.id,
        role: next,
      })
      if (data.success) {
        toast.success('权限已更新')
        load()
      } else toast.error(data.message)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const del = async (u: User) => {
    if (me?.id === u.id) {
      toast.error('不能删除自己')
      return
    }
    const ok = await confirm({
      title: '删除用户',
      description: `确定删除用户「${u.display_name || u.username}」？该操作不可撤销。`,
      confirmText: '确认删除',
      danger: true,
    })
    if (!ok) return
    try {
      const { data } = await apiClient.post('/users/delete', { id: u.id })
      if (data.success) {
        toast.success('已删除')
        load()
      } else toast.error(data.message || '删除失败')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const adminCount = users.filter((u) => u.role === 'admin').length
  const operatorCount = users.filter((u) => u.role === 'operator').length

  return (
    <div>
      <PageHeader
        title="用户与权限管理"
        description="创建账号、切换角色、维护登录信息"
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> 新增用户
          </Button>
        }
      />

      <div style={{ padding: 'var(--spacing-xl)' }} className="space-y-4">
        {/* 角色统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FadeIn>
            <Card
              style={{ padding: 'var(--spacing-md)' }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-md bg-primary/15 text-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">管理员</div>
                <div className="text-2xl font-bold">{adminCount}</div>
              </div>
            </Card>
          </FadeIn>
          <FadeIn>
            <Card
              style={{ padding: 'var(--spacing-md)' }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-md bg-info/15 text-info flex items-center justify-center">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">操作员</div>
                <div className="text-2xl font-bold">{operatorCount}</div>
              </div>
            </Card>
          </FadeIn>
          <FadeIn>
            <Card
              style={{ padding: 'var(--spacing-md)' }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-md bg-muted text-foreground flex items-center justify-center">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">总账号数</div>
                <div className="text-2xl font-bold">{users.length}</div>
              </div>
            </Card>
          </FadeIn>
        </div>

        {/* 权限对照卡 */}
        <FadeIn>
          <Card style={{ padding: 'var(--spacing-lg)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-primary" />
              <span className="text-sm font-semibold">角色权限对照</span>
              <span className="text-xs text-muted-foreground">
                — 每个角色允许访问的功能
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="text-left py-2 pr-3 font-medium">功能</th>
                    <th className="py-2 px-3 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        管理员
                      </div>
                    </th>
                    <th className="py-2 px-3 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-info" />
                        操作员
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map((p) => (
                    <tr key={p.key} className="border-b last:border-0">
                      <td className="py-2 pr-3">{p.label}</td>
                      <td className="text-center px-3">
                        {p.admin ? (
                          <Check className="w-4 h-4 text-success mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </td>
                      <td className="text-center px-3">
                        {p.operator ? (
                          <Check className="w-4 h-4 text-success mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-muted-foreground mt-3 pt-3 border-t">
              角色修改后立即生效；被修改用户下次刷新页面时将按新角色获取菜单和权限。
            </div>
          </Card>
        </FadeIn>

        {/* 用户列表 */}
        <FadeIn>
          <Card className="overflow-x-auto">
            <div className="p-4 border-b flex items-center gap-2">
              <span className="text-sm font-semibold">账号列表</span>
              <span className="text-xs text-muted-foreground">
                共 {users.length} 位用户 · 支持在"角色"列直接切换权限
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead className="w-44">角色（可切换）</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSelf = me?.id === u.id
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono">
                        {u.username}
                        {isSelf && (
                          <span className="ml-2 text-[10px] px-1 py-0.5 rounded bg-primary/15 text-primary">
                            我
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{u.display_name}</TableCell>
                      <TableCell className="text-xs">{u.email || '-'}</TableCell>
                      <TableCell className="text-xs">{u.phone || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={u.role} />
                          <Select
                            value={u.role}
                            onValueChange={(v) =>
                              changeRole(u, v as 'admin' | 'operator')
                            }
                            disabled={isSelf && u.role === 'admin'}
                          >
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">管理员</SelectItem>
                              <SelectItem value="operator">操作员</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.created_at}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(u)}
                            title="编辑资料"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive disabled:opacity-30"
                            onClick={() => del(u)}
                            disabled={isSelf}
                            title={isSelf ? '不能删除自己' : '删除用户'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!users.length && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-10"
                    >
                      暂无用户
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </FadeIn>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) clear() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id ? `编辑用户 · ${form.display_name || form.username}` : '新增用户'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField
              label="用户名"
              required={!form.id}
              error={errors.username}
              hint={form.id ? '登录用户名不可修改' : '登录用户名，不可重复'}
            >
              <Input
                ref={register('username') as any}
                value={form.username}
                disabled={!!form.id}
                onChange={(e) => setField('username', e.target.value)}
              />
            </FormField>
            <FormField
              label={form.id ? '重置密码（留空不改）' : '初始密码'}
              required={!form.id}
              error={errors.password}
              hint="至少 6 位"
            >
              <Input
                ref={register('password') as any}
                type="password"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
              />
            </FormField>
            <FormField label="姓名" error={errors.display_name}>
              <Input
                ref={register('display_name') as any}
                value={form.display_name}
                onChange={(e) => setField('display_name', e.target.value)}
                placeholder="用于界面显示"
              />
            </FormField>
            <FormField label="角色" required error={errors.role}>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setField('role', v as 'admin' | 'operator')
                }
              >
                <SelectTrigger ref={register('role') as any}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      <span>管理员</span>
                      <span className="text-xs text-muted-foreground">全部权限</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="operator">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-3.5 h-3.5 text-info" />
                      <span>操作员</span>
                      <span className="text-xs text-muted-foreground">仅业务操作</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="邮箱">
              <Input
                value={form.email || ''}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="用于邮箱验证码登录"
              />
            </FormField>
            <FormField label="手机号">
              <Input
                value={form.phone || ''}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="用于短信验证码登录"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={submit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
