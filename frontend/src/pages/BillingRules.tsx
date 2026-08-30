import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Plus, Edit, Trash2, HelpCircle, ChevronDown, ArrowDown } from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'
import { useConfirm } from '@/components/ConfirmDialog'
import { FormField, useFormErrors } from '@/components/form/FormField'
import { Label } from '@/components/ui/label'

interface Rule {
  id: number
  name: string
  item_id: number | null
  location_id: number | null
  model_code?: string
  item_name?: string
  location_code?: string
  start_date?: string
  end_date?: string
  price_per_day: number
  min_days: number
  active: number
}

type RuleForm = {
  name: string
  item_id: string
  location_id: string
  start_date: string
  end_date: string
  price_per_day: string
  min_days: string
  active: boolean
}

// 精细度层级：L1 最精细 → L4 兜底
const LEVELS = [
  { level: 'L1', label: '物品 + 库位', color: 'primary', desc: '最精细，指定物品且指定库位' },
  { level: 'L2', label: '仅物品', color: 'info', desc: '只指定物品，不限库位' },
  { level: 'L3', label: '仅库位', color: 'warning', desc: '只指定库位，不限物品' },
  { level: 'L4', label: '通用规则', color: 'muted-foreground', desc: '兜底基础费率' },
]

function getLevel(r: { item_id: number | null; location_id: number | null }) {
  if (r.item_id && r.location_id) return { key: 'L1', color: 'primary' }
  if (r.item_id) return { key: 'L2', color: 'info' }
  if (r.location_id) return { key: 'L3', color: 'warning' }
  return { key: 'L4', color: 'muted-foreground' }
}

export default function BillingRules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [items, setItems] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [helpOpen, setHelpOpen] = useState(true)
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Rule | null>(null)
  const [form, setForm] = useState<RuleForm>({
    name: '',
    item_id: 'any',
    location_id: 'any',
    start_date: '',
    end_date: '',
    price_per_day: '',
    min_days: '1',
    active: true,
  })
  const { errors, register, validate, clear } = useFormErrors<RuleForm>()

  const load = async () => {
    const [r, i, l] = await Promise.all([
      apiClient.post('/billing/rules/list', {}),
      apiClient.post('/items/list', {}),
      apiClient.post('/locations/list', {}),
    ])
    if (r.data.success) setRules(r.data.data)
    if (i.data.success) setItems(i.data.data)
    if (l.data.success) setLocations(l.data.data)
  }
  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '',
      item_id: 'any',
      location_id: 'any',
      start_date: '',
      end_date: '',
      price_per_day: '',
      min_days: '1',
      active: true,
    })
    clear()
    setOpen(true)
  }

  const openEdit = (r: Rule) => {
    setEditing(r)
    setForm({
      name: r.name,
      item_id: r.item_id ? String(r.item_id) : 'any',
      location_id: r.location_id ? String(r.location_id) : 'any',
      start_date: r.start_date || '',
      end_date: r.end_date || '',
      price_per_day: String(r.price_per_day),
      min_days: String(r.min_days),
      active: !!r.active,
    })
    clear()
    setOpen(true)
  }

  const setField = <K extends keyof RuleForm>(k: K, v: RuleForm[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }))
    clear(k)
  }

  const submit = async () => {
    const ok = validate(form, {
      name: { required: '请填写规则名称' },
      price_per_day: {
        required: '请填写日单价',
        validate: (v) => (Number(v) > 0 ? null : '日单价必须大于 0'),
      },
      min_days: {
        validate: (v) => (Number(v) >= 0 ? null : '天数不能为负'),
      },
    })
    if (!ok) {
      toast.error('存在未填写或错误项，请检查')
      return
    }
    const payload = {
      ...form,
      item_id: form.item_id === 'any' ? null : Number(form.item_id),
      location_id: form.location_id === 'any' ? null : Number(form.location_id),
      price_per_day: Number(form.price_per_day),
      min_days: Number(form.min_days),
    }
    try {
      const url = editing ? '/billing/rules/update' : '/billing/rules/create'
      const { data } = await apiClient.post(
        url,
        editing ? { ...payload, id: editing.id } : payload
      )
      if (data.success) {
        toast.success(editing ? '规则已更新' : '规则已添加')
        setOpen(false)
        load()
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const del = async (r: Rule) => {
    const ok = await confirm({
      title: '删除计费规则',
      description: `确定删除规则 "${r.name}"？`,
      danger: true,
    })
    if (!ok) return
    const { data } = await apiClient.post('/billing/rules/delete', { id: r.id })
    if (data.success) {
      toast.success('已删除')
      load()
    }
  }

  // 当前所选层级预览
  const currentLevel = getLevel({
    item_id: form.item_id === 'any' ? null : 1,
    location_id: form.location_id === 'any' ? null : 1,
  })

  return (
    <div>
      <PageHeader
        title="计费规则"
        description="按物品和库位精细度自动匹配的仓储计费规则"
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            新增规则
          </Button>
        }
      />

      <div style={{ padding: 'var(--spacing-xl)' }}>
        <FadeIn>
          <Card
            style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}
          >
            <button
              type="button"
              onClick={() => setHelpOpen(!helpOpen)}
              className="w-full flex items-start gap-2 text-left"
            >
              <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold leading-tight">规则匹配说明</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  越具体的规则优先生效
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform mt-0.5 ${
                  helpOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {helpOpen && (
              <div className="mt-4 space-y-4">
                <div className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  出库计费时，系统按<b className="text-foreground">精细度</b>从高到低查找规则，命中即用：
                </div>

                {/* 4 张层级卡 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {LEVELS.map((l, idx) => (
                    <div key={l.level} className="flex items-center gap-2">
                      <div
                        className={`rounded-md text-xs font-mono font-bold px-2 py-1 bg-${l.color}/15 text-${l.color}`}
                        style={{ minWidth: 32, textAlign: 'center' }}
                      >
                        {l.level}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{l.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {l.desc}
                        </div>
                      </div>
                      {idx < 3 && (
                        <ArrowDown className="w-3 h-3 text-muted-foreground rotate-[-90deg] hidden md:inline" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-muted-foreground pl-1">
                  L1 匹配到就直接用 L1，不再看 L2；L1 没有才看 L2，依此类推。
                  <br />
                  同一层级里若有多条规则，取<b className="text-foreground">最新创建</b>的那条。
                </div>

                {/* 示例 */}
                <div className="pt-4 border-t bg-muted/40 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block px-2 py-0.5 rounded bg-info text-info-foreground text-xs font-bold">
                      举例
                    </span>
                    <span className="text-sm font-medium">
                      锂电池从 C 区冷藏库出库时怎么算？
                    </span>
                  </div>
                  <ol className="text-xs text-muted-foreground space-y-1 pl-4 list-decimal">
                    <li>
                      查 L1："锂电池 + C 区" 的专属规则？
                      <span className="text-foreground">没有 → 跳过</span>
                    </li>
                    <li>
                      查 L2："仅锂电池" 的规则？
                      <span className="text-foreground">找到 → 使用它</span>
                    </li>
                    <li>
                      <span className="text-primary">
                        L2 已命中即停止，不再往下查 L3/L4
                      </span>
                    </li>
                  </ol>
                  <div className="text-[11px] text-muted-foreground mt-2">
                    如果希望"锂电池在 C 区" 走专属价格，新建一条 L1 规则即可覆盖 L2。
                  </div>
                </div>
              </div>
            )}
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">层级</TableHead>
                  <TableHead>规则名称</TableHead>
                  <TableHead>匹配物品</TableHead>
                  <TableHead>匹配库位</TableHead>
                  <TableHead>生效日期</TableHead>
                  <TableHead className="text-right">日单价</TableHead>
                  <TableHead className="text-right">起租天数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => {
                  const level = getLevel(r)
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-mono font-bold bg-${level.color}/15 text-${level.color}`}
                        >
                          {level.key}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        {r.item_id ? (
                          <span className="text-xs">
                            {r.model_code} - {r.item_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">全部</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.location_id ? (
                          <span className="text-xs font-mono">{r.location_code}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">全部</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.start_date || '不限'} ~ {r.end_date || '长期'}
                      </TableCell>
                      <TableCell className="text-right">¥{r.price_per_day.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{r.min_days}</TableCell>
                      <TableCell>
                        <Badge variant={r.active ? 'default' : 'secondary'}>
                          {r.active ? '启用' : '停用'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => del(r)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </FadeIn>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) clear() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑' : '新增'}计费规则</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="规则名称" required error={errors.name} className="sm:col-span-2">
              <Input
                ref={register('name') as any}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </FormField>
            <FormField label="匹配物品">
              <Select
                value={form.item_id}
                onValueChange={(v) => setField('item_id', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">全部物品</SelectItem>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.model_code} - {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="匹配库位">
              <Select
                value={form.location_id}
                onValueChange={(v) => setField('location_id', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">全部库位</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.code} ({l.zone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {/* 当前规则将被识别为哪一层的实时提示 */}
            <div className="sm:col-span-2 flex items-center gap-2 text-xs bg-muted/50 border rounded-md px-3 py-2">
              <span className="text-muted-foreground">此规则精细度：</span>
              <span
                className={`inline-block rounded px-2 py-0.5 text-xs font-mono font-bold bg-${currentLevel.color}/15 text-${currentLevel.color}`}
              >
                {currentLevel.key}
              </span>
              <span className="text-muted-foreground">
                {currentLevel.key === 'L1' && '物品 + 库位（最精细）'}
                {currentLevel.key === 'L2' && '仅物品，不限库位'}
                {currentLevel.key === 'L3' && '仅库位，不限物品'}
                {currentLevel.key === 'L4' && '通用兜底'}
              </span>
            </div>
            <FormField label="起始日期">
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setField('start_date', e.target.value)}
              />
            </FormField>
            <FormField label="结束日期">
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setField('end_date', e.target.value)}
              />
            </FormField>
            <FormField label="日单价（元/件/天）" required error={errors.price_per_day}>
              <Input
                ref={register('price_per_day') as any}
                type="number"
                step="0.01"
                value={form.price_per_day}
                onChange={(e) => setField('price_per_day', e.target.value)}
              />
            </FormField>
            <FormField label="最少计费天数" error={errors.min_days}>
              <Input
                ref={register('min_days') as any}
                type="number"
                value={form.min_days}
                onChange={(e) => setField('min_days', e.target.value)}
              />
            </FormField>
            <div className="sm:col-span-2 flex items-center justify-between border rounded px-3 py-2">
              <Label className="cursor-pointer">启用规则</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setField('active', v)}
              />
            </div>
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
