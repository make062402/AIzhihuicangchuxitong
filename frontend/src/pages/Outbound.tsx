import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Search, Eye, Trash2 } from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'
import { FormField, useFormErrors } from '@/components/form/FormField'
import { RecordList, type RecordColumn } from '@/components/RecordList'

interface Item {
  id: number
  model_code: string
  name: string
  unit: string
  stock: number
}

interface Record {
  id: number
  destination: string
  outbound_date: string
  model_code: string
  item_name: string
  quantity: number
  unit: string
  storage_fee: number
  manual_fee: number
  total_fee: number
  operator_name: string
}

interface ManualFee {
  fee_type: 'labor' | 'extra'
  description: string
  amount: string
}

type OutboundForm = {
  destination: string
  outbound_date: string
  item_id: string
  quantity: string
  remark: string
}

export default function Outbound() {
  const [items, setItems] = useState<Item[]>([])
  const [records, setRecords] = useState<Record[]>([])
  const [keyword, setKeyword] = useState('')

  const [open, setOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [form, setForm] = useState<OutboundForm>({
    destination: '',
    outbound_date: new Date().toISOString().slice(0, 10),
    item_id: '',
    quantity: '',
    remark: '',
  })
  const [manualFees, setManualFees] = useState<ManualFee[]>([])
  const { errors, register, validate, clear } = useFormErrors<OutboundForm>()

  const loadAll = async () => {
    const [i, r] = await Promise.all([
      apiClient.post('/items/inStock', {}),
      apiClient.post('/outbound/list', { keyword }),
    ])
    if (i.data.success) setItems(i.data.data)
    if (r.data.success) setRecords(r.data.data)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const search = async () => {
    const { data } = await apiClient.post('/outbound/list', { keyword })
    if (data.success) setRecords(data.data)
  }

  const openCreate = async () => {
    const { data } = await apiClient.post('/items/inStock', {})
    if (data.success) setItems(data.data)
    setForm({
      destination: '',
      outbound_date: new Date().toISOString().slice(0, 10),
      item_id: '',
      quantity: '',
      remark: '',
    })
    setManualFees([])
    clear()
    setOpen(true)
  }

  const setField = <K extends keyof OutboundForm>(k: K, v: OutboundForm[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }))
    clear(k)
  }

  const addManualFee = () => {
    setManualFees([...manualFees, { fee_type: 'labor', description: '', amount: '' }])
  }
  const updateFee = (i: number, patch: Partial<ManualFee>) => {
    const next = [...manualFees]
    next[i] = { ...next[i], ...patch }
    setManualFees(next)
  }
  const removeFee = (i: number) => {
    setManualFees(manualFees.filter((_, idx) => idx !== i))
  }

  const submit = async () => {
    const selected = items.find((i) => String(i.id) === form.item_id)
    const ok = validate(form, {
      destination: { required: '请填写去向' },
      outbound_date: { required: '请选择出库日期' },
      item_id: { required: '请选择物品型号' },
      quantity: {
        required: '请输入出库数量',
        validate: (v) => {
          const n = Number(v)
          if (!(n > 0)) return '数量必须大于 0'
          if (selected && n > selected.stock)
            return `超过当前可出库存 (${selected.stock})`
          return null
        },
      },
    })
    if (!ok) {
      toast.error('存在未填写或错误项，请检查')
      return
    }
    try {
      const { data } = await apiClient.post('/outbound/create', {
        ...form,
        item_id: Number(form.item_id),
        quantity: Number(form.quantity),
        manual_fees: manualFees
          .filter((f) => f.amount && f.description)
          .map((f) => ({ ...f, amount: Number(f.amount) })),
      })
      if (data.success) {
        toast.success(
          `出库成功，存储费 ¥${data.data.storage_fee.toFixed(2)}，总费用 ¥${data.data.total_fee.toFixed(2)}`
        )
        setOpen(false)
        loadAll()
      } else toast.error(data.message)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const viewDetail = async (id: number) => {
    const { data } = await apiClient.post('/outbound/detail', { id })
    if (data.success) {
      setDetail(data.data)
      setDetailOpen(true)
    }
  }

  const selectedItem = items.find((i) => String(i.id) === form.item_id)

  return (
    <div>
      <PageHeader
        title="出库管理"
        description="出库时自动计算存放时长并生成费用明细"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            新增出库
          </Button>
        }
      />

      <div className="p-3 md:p-6 lg:p-8 space-y-3 md:space-y-4">
        <FadeIn>
          <Card className="p-3 md:p-4">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="搜索去向 / 型号 / 名称"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                className="flex-1 md:max-w-sm"
              />
              <Button variant="outline" onClick={search} className="shrink-0">
                <Search className="w-4 h-4 md:mr-1" />
                <span className="hidden md:inline">搜索</span>
              </Button>
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <RecordList<Record>
            data={records}
            rowKey={(r) => r.id}
            emptyText="暂无出库记录"
            columns={
              [
                {
                  key: 'item',
                  header: '物品',
                  primary: true,
                  cell: (r) => (
                    <span>
                      <span className="font-mono text-xs text-muted-foreground mr-2">
                        {r.model_code}
                      </span>
                      {r.item_name}
                    </span>
                  ),
                },
                {
                  key: 'date',
                  header: '出库日期',
                  meta: true,
                  cell: (r) => r.outbound_date,
                },
                {
                  key: 'destination',
                  header: '去向',
                  cell: (r) => r.destination,
                },
                {
                  key: 'quantity',
                  header: '数量',
                  align: 'right',
                  cell: (r) => (
                    <span>
                      {r.quantity} {r.unit}
                    </span>
                  ),
                },
                {
                  key: 'storage',
                  header: '存储费',
                  align: 'right',
                  cell: (r) => `¥${r.storage_fee?.toFixed(2)}`,
                },
                {
                  key: 'manual',
                  header: '人工费',
                  align: 'right',
                  cell: (r) => `¥${r.manual_fee?.toFixed(2)}`,
                },
                {
                  key: 'total',
                  header: '总费用',
                  align: 'right',
                  cell: (r) => (
                    <span className="font-semibold text-primary">
                      ¥{r.total_fee?.toFixed(2)}
                    </span>
                  ),
                },
                {
                  key: 'operator',
                  header: '操作员',
                  cell: (r) => (
                    <span className="text-xs text-muted-foreground">
                      {r.operator_name}
                    </span>
                  ),
                },
              ] as RecordColumn<Record>[]
            }
            desktopAction={(r) => (
              <Button size="icon" variant="ghost" onClick={() => viewDetail(r.id)}>
                <Eye className="w-4 h-4" />
              </Button>
            )}
            mobileAction={(r) => (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => viewDetail(r.id)}
                className="h-8"
              >
                <Eye className="w-4 h-4 mr-1" />
                查看详情
              </Button>
            )}
          />
        </FadeIn>
      </div>

      {/* 出库表单 */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) clear() }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增出库</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="去向" required error={errors.destination}>
              <Input
                ref={register('destination') as any}
                value={form.destination}
                onChange={(e) => setField('destination', e.target.value)}
                placeholder="客户 / 目的地名称"
              />
            </FormField>
            <FormField label="出库日期" required error={errors.outbound_date}>
              <Input
                ref={register('outbound_date') as any}
                type="date"
                value={form.outbound_date}
                onChange={(e) => setField('outbound_date', e.target.value)}
              />
            </FormField>
            <FormField
              label="物品型号（仅显示有库存的）"
              required
              error={errors.item_id}
              className="sm:col-span-2"
            >
              <Select
                value={form.item_id}
                onValueChange={(v) => {
                  setField('item_id', v)
                  setField('quantity', '')
                }}
              >
                <SelectTrigger ref={register('item_id') as any} className="w-full min-w-0">
                  <SelectValue placeholder="选择型号" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      <span className="font-mono text-xs">{i.model_code}</span>
                      <span className="ml-2">{i.name}</span>
                      <span className="ml-2 text-muted-foreground text-xs">
                        库存 {i.stock} {i.unit}
                      </span>
                    </SelectItem>
                  ))}
                  {!items.length && (
                    <div className="text-center text-sm text-muted-foreground p-4">
                      当前无可出库物品
                    </div>
                  )}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label="出库数量"
              required
              error={errors.quantity}
              hint={
                selectedItem
                  ? `当前库存: ${selectedItem.stock} ${selectedItem.unit}`
                  : undefined
              }
              className="sm:col-span-2"
            >
              <Input
                ref={register('quantity') as any}
                type="number"
                inputMode="numeric"
                min={1}
                value={form.quantity}
                onChange={(e) => setField('quantity', e.target.value)}
                placeholder={selectedItem ? `最多可出 ${selectedItem.stock}` : '请输入数量'}
              />
            </FormField>
            <FormField label="备注" className="sm:col-span-2">
              <Textarea
                value={form.remark}
                onChange={(e) => setField('remark', e.target.value)}
                rows={2}
              />
            </FormField>

            {/* 人工费录入 */}
            <div className="sm:col-span-2 border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label>人工/附加费录入（可选）</Label>
                <Button size="sm" variant="outline" onClick={addManualFee}>
                  <Plus className="w-3 h-3 mr-1" />
                  添加
                </Button>
              </div>
              <div className="space-y-2">
                {manualFees.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row gap-2 p-2 sm:p-0 border sm:border-0 rounded-md"
                  >
                    <div className="flex gap-2">
                      <Select
                        value={f.fee_type}
                        onValueChange={(v) =>
                          updateFee(idx, { fee_type: v as 'labor' | 'extra' })
                        }
                      >
                        <SelectTrigger className="w-24 sm:w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="labor">人工费</SelectItem>
                          <SelectItem value="extra">附加费</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="w-28 sm:hidden"
                        type="number"
                        inputMode="numeric"
                        placeholder="金额"
                        value={f.amount}
                        onChange={(e) => updateFee(idx, { amount: e.target.value })}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFee(idx)}
                        className="text-destructive ml-auto sm:hidden"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      className="flex-1"
                      placeholder="费用说明"
                      value={f.description}
                      onChange={(e) => updateFee(idx, { description: e.target.value })}
                    />
                    <Input
                      className="w-28 hidden sm:block"
                      type="number"
                      inputMode="numeric"
                      placeholder="金额"
                      value={f.amount}
                      onChange={(e) => updateFee(idx, { amount: e.target.value })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFee(idx)}
                      className="text-destructive hidden sm:inline-flex"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {!manualFees.length && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    如无额外费用可跳过，存储费将根据计费规则自动计算
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="sm:w-auto w-full">
              取消
            </Button>
            <Button onClick={submit} className="sm:w-auto w-full">
              确定出库并计费
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>出库详情与费用明细</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <Card className="p-3 md:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">出库日期：</span>
                    {detail.record.outbound_date}
                  </div>
                  <div>
                    <span className="text-muted-foreground">去向：</span>
                    {detail.record.destination}
                  </div>
                  <div>
                    <span className="text-muted-foreground">型号：</span>
                    {detail.record.model_code} - {detail.record.item_name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">数量：</span>
                    {detail.record.quantity} {detail.record.unit}
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t">
                    <span className="text-muted-foreground">总费用：</span>
                    <span className="text-primary font-bold text-lg ml-2">
                      ¥{detail.record.total_fee?.toFixed(2)}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1 sm:mt-0 sm:inline sm:ml-2">
                      (存储费 ¥{detail.record.storage_fee?.toFixed(2)} + 人工附加 ¥
                      {detail.record.manual_fee?.toFixed(2)})
                    </div>
                  </div>
                </div>
              </Card>

              <div>
                <h4 className="font-semibold mb-2 text-sm">FIFO 批次分配</h4>

                {/* 桌面：表格 */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>批次来源</TableHead>
                        <TableHead>库位</TableHead>
                        <TableHead>入库日期</TableHead>
                        <TableHead className="text-right">数量</TableHead>
                        <TableHead className="text-right">存放天数</TableHead>
                        <TableHead className="text-right">日单价</TableHead>
                        <TableHead className="text-right">小计</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.batches.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs">{b.source}</TableCell>
                          <TableCell className="text-xs">{b.location_code}</TableCell>
                          <TableCell className="text-xs">{b.inbound_date}</TableCell>
                          <TableCell className="text-right">{b.quantity}</TableCell>
                          <TableCell className="text-right">{b.days_stored}</TableCell>
                          <TableCell className="text-right">
                            ¥{b.price_per_day?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ¥{b.fee?.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 移动：卡片 */}
                <div className="md:hidden space-y-2">
                  {detail.batches.map((b: any) => (
                    <div key={b.id} className="border rounded-md p-2.5 text-xs">
                      <div className="flex justify-between items-start mb-1.5 pb-1.5 border-b">
                        <div className="font-medium">{b.source}</div>
                        <div className="text-muted-foreground">{b.inbound_date}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 gap-x-3">
                        <div>
                          <span className="text-muted-foreground">库位：</span>
                          {b.location_code}
                        </div>
                        <div>
                          <span className="text-muted-foreground">数量：</span>
                          {b.quantity}
                        </div>
                        <div>
                          <span className="text-muted-foreground">存放：</span>
                          {b.days_stored} 天
                        </div>
                        <div>
                          <span className="text-muted-foreground">日单价：</span>
                          ¥{b.price_per_day?.toFixed(2)}
                        </div>
                        <div className="col-span-2 pt-1 mt-1 border-t flex justify-between">
                          <span className="text-muted-foreground">小计</span>
                          <span className="font-semibold text-primary">
                            ¥{b.fee?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm">费用明细</h4>
                <div className="space-y-2">
                  {detail.fees.map((f: any) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between border rounded p-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            f.fee_type === 'storage'
                              ? 'default'
                              : f.fee_type === 'labor'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {f.fee_type === 'storage'
                            ? '存储费'
                            : f.fee_type === 'labor'
                              ? '人工费'
                              : '附加费'}
                        </Badge>
                        <span>{f.description}</span>
                      </div>
                      <span className="font-medium">¥{f.amount?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
