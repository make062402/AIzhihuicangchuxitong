import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import PageHeader from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Upload, Search, Trash2, FileDown } from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'
import { useConfirm } from '@/components/ConfirmDialog'
import { FormField, useFormErrors } from '@/components/form/FormField'
import { RecordList, type RecordColumn } from '@/components/RecordList'

interface Item {
  id: number
  model_code: string
  name: string
  unit: string
}
interface Location {
  id: number
  code: string
  zone: string
}
interface Record {
  id: number
  source: string
  inbound_date: string
  model_code: string
  item_name: string
  quantity: number
  remaining_qty: number
  location_code: string
  zone: string
  operator_name: string
  unit: string
  remark?: string
}

type InboundForm = {
  source: string
  inbound_date: string
  item_id: string
  quantity: string
  location_id: string
  remark: string
}

export default function Inbound() {
  const [items, setItems] = useState<Item[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [records, setRecords] = useState<Record[]>([])
  const [keyword, setKeyword] = useState('')

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<InboundForm>({
    source: '',
    inbound_date: new Date().toISOString().slice(0, 10),
    item_id: '',
    quantity: '',
    location_id: '',
    remark: '',
  })

  const { errors, register, validate, clear } = useFormErrors<InboundForm>()

  const fileInput = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()

  const loadAll = async () => {
    const [i, l, r] = await Promise.all([
      apiClient.post('/items/list', {}),
      apiClient.post('/locations/list', {}),
      apiClient.post('/inbound/list', { keyword }),
    ])
    if (i.data.success) setItems(i.data.data)
    if (l.data.success) setLocations(l.data.data)
    if (r.data.success) setRecords(r.data.data)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const search = async () => {
    const { data } = await apiClient.post('/inbound/list', { keyword })
    if (data.success) setRecords(data.data)
  }

  const submit = async () => {
    const ok = validate(form, {
      source: { required: '请填写来源' },
      inbound_date: { required: '请选择入库日期' },
      item_id: { required: '请选择物品型号' },
      location_id: { required: '请选择存放位置' },
      quantity: {
        required: '请输入数量',
        validate: (v) => (Number(v) > 0 ? null : '数量必须大于 0'),
      },
    })
    if (!ok) {
      toast.error('存在未填写或错误项，请检查')
      return
    }
    try {
      const { data } = await apiClient.post('/inbound/create', {
        ...form,
        item_id: Number(form.item_id),
        location_id: Number(form.location_id),
        quantity: Number(form.quantity),
      })
      if (data.success) {
        toast.success('入库成功')
        setOpen(false)
        setForm({
          source: '',
          inbound_date: new Date().toISOString().slice(0, 10),
          item_id: '',
          quantity: '',
          location_id: '',
          remark: '',
        })
        clear()
        loadAll()
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const setField = <K extends keyof InboundForm>(k: K, v: InboundForm[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }))
    clear(k)
  }

  const del = async (r: Record) => {
    const ok = await confirm({
      title: '删除入库记录',
      description: `确定删除 ${r.inbound_date} 的入库记录 (${r.model_code} × ${r.quantity})？`,
      danger: true,
    })
    if (!ok) return
    try {
      const { data } = await apiClient.post('/inbound/delete', { id: r.id })
      if (data.success) {
        toast.success('删除成功')
        loadAll()
      } else toast.error(data.message)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['来源', '入库日期(YYYY-MM-DD)', '物品型号', '数量', '存放位置编号', '备注'],
      ['华东供应商', '2026-01-15', 'SKU-A001', 100, 'A-01-01', '示例数据'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '入库导入模板')
    XLSX.writeFile(wb, '入库导入模板.xlsx')
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<any>(ws)

    const parsed = rows.map((r) => {
      const item = items.find((i) => i.model_code === String(r['物品型号']).trim())
      const loc = locations.find((l) => l.code === String(r['存放位置编号']).trim())
      return {
        source: r['来源'],
        inbound_date: r['入库日期(YYYY-MM-DD)'] || r['入库日期'],
        item_id: item?.id,
        quantity: Number(r['数量']),
        location_id: loc?.id,
        remark: r['备注'] || '',
      }
    })

    const valid = parsed.filter((p) => p.source && p.item_id && p.location_id && p.quantity)
    if (!valid.length) {
      toast.error('未识别到有效数据行，请检查型号和库位编号')
      return
    }
    try {
      const { data } = await apiClient.post('/inbound/batchImport', { rows: valid })
      if (data.success) {
        toast.success(
          `导入成功 ${data.data.imported} 条${
            data.data.errors.length ? `，${data.data.errors.length} 条失败` : ''
          }`
        )
        loadAll()
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div>
      <PageHeader
        title="入库管理"
        description="登记物品入库并支持 Excel 批量导入"
        actions={
          <>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              ref={fileInput}
              onChange={handleUpload}
            />
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileDown className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">模板下载</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <Upload className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">批量导入</span>
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              新增入库
            </Button>
          </>
        }
      />

      <div className="p-3 md:p-6 lg:p-8 space-y-3 md:space-y-4">
        <FadeIn>
          <Card className="p-3 md:p-4">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="搜索来源 / 型号 / 名称"
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
            emptyText="暂无入库记录"
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
                  header: '入库日期',
                  meta: true,
                  cell: (r) => r.inbound_date,
                },
                {
                  key: 'source',
                  header: '来源',
                  cell: (r) => r.source,
                },
                {
                  key: 'quantity',
                  header: '数量',
                  align: 'right',
                  mobileLabel: '入库数量',
                  cell: (r) => (
                    <span>
                      {r.quantity} {r.unit}
                    </span>
                  ),
                },
                {
                  key: 'remaining',
                  header: '剩余可出',
                  align: 'right',
                  cell: (r) => (
                    <span
                      className={
                        r.remaining_qty === r.quantity
                          ? 'text-success'
                          : r.remaining_qty === 0
                            ? 'text-muted-foreground'
                            : 'text-warning'
                      }
                    >
                      {r.remaining_qty}
                    </span>
                  ),
                },
                {
                  key: 'location',
                  header: '库位',
                  cell: (r) => (
                    <span className="text-xs">
                      {r.location_code}
                      <span className="text-muted-foreground ml-1">({r.zone})</span>
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
              <Button
                size="icon"
                variant="ghost"
                onClick={() => del(r)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            mobileAction={(r) => (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => del(r)}
                className="text-destructive hover:text-destructive h-8"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除
              </Button>
            )}
          />
        </FadeIn>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) clear() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新增入库</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="来源" required error={errors.source}>
              <Input
                ref={register('source') as any}
                value={form.source}
                onChange={(e) => setField('source', e.target.value)}
                placeholder="供应商 / 客户名称"
              />
            </FormField>
            <FormField label="入库日期" required error={errors.inbound_date}>
              <Input
                ref={register('inbound_date') as any}
                type="date"
                value={form.inbound_date}
                onChange={(e) => setField('inbound_date', e.target.value)}
              />
            </FormField>
            <FormField label="物品型号" required error={errors.item_id}>
              <Select
                value={form.item_id}
                onValueChange={(v) => setField('item_id', v)}
              >
                <SelectTrigger ref={register('item_id') as any} className="w-full">
                  <SelectValue placeholder="选择型号" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.model_code} - {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="数量" required error={errors.quantity}>
              <Input
                ref={register('quantity') as any}
                type="number"
                inputMode="numeric"
                value={form.quantity}
                onChange={(e) => setField('quantity', e.target.value)}
              />
            </FormField>
            <FormField label="存放位置" required error={errors.location_id} className="sm:col-span-2">
              <Select
                value={form.location_id}
                onValueChange={(v) => setField('location_id', v)}
              >
                <SelectTrigger ref={register('location_id') as any} className="w-full">
                  <SelectValue placeholder="选择库位" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.code} ({l.zone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="备注" className="sm:col-span-2">
              <Textarea
                value={form.remark}
                onChange={(e) => setField('remark', e.target.value)}
                rows={2}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="sm:w-auto w-full">
              取消
            </Button>
            <Button onClick={submit} className="sm:w-auto w-full">
              确定入库
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
