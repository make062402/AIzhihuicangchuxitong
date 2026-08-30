import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, Package } from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'
import { useConfirm } from '@/components/ConfirmDialog'

interface Item {
  id: number
  model_code: string
  name: string
  unit: string
  category: string
  stock: number
}

export default function AdminItems() {
  const [items, setItems] = useState<Item[]>([])
  const confirm = useConfirm()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<any>({
    id: 0,
    model_code: '',
    name: '',
    unit: '件',
    category: '',
  })

  const load = async () => {
    const { data } = await apiClient.post('/items/list', {})
    if (data.success) setItems(data.data)
  }
  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    if (!form.model_code || !form.name) {
      toast.error('型号编号和名称必填')
      return
    }
    try {
      const url = form.id ? '/items/update' : '/items/create'
      const { data } = await apiClient.post(url, form)
      if (data.success) {
        toast.success('保存成功')
        setOpen(false)
        load()
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const del = async (i: Item) => {
    const ok = await confirm({
      title: '删除物品',
      description: `确定删除 "${i.model_code} - ${i.name}"？`,
      danger: true,
    })
    if (!ok) return
    try {
      const { data } = await apiClient.post('/items/delete', { id: i.id })
      if (data.success) {
        toast.success('已删除')
        load()
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div>
      <PageHeader
        title="物品型号"
        description="维护仓储物品的基础信息"
        actions={
          <Button
            onClick={() => {
              setForm({ id: 0, model_code: '', name: '', unit: '件', category: '' })
              setOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> 新增型号
          </Button>
        }
      />

      <div className="p-4 md:p-6 lg:p-8">
        {/* 移动端卡片 */}
        <FadeIn className="md:hidden">
          <div className="grid grid-cols-1 gap-3">
            {items.map((i) => (
              <Card key={i.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono text-sm font-semibold">{i.model_code}</div>
                      <div className="text-xs text-muted-foreground">{i.name}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setForm({ ...i })
                        setOpen(true)
                      }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => del(i)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex gap-2">
                    <Badge variant="outline">{i.unit}</Badge>
                    {i.category && <Badge variant="secondary">{i.category}</Badge>}
                  </div>
                  <div className="font-semibold">
                    库存 {i.stock}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </FadeIn>

        {/* 桌面表格 */}
        <FadeIn className="hidden md:block">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>型号编号</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead className="text-right">当前库存</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono">{i.model_code}</TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell>{i.unit}</TableCell>
                    <TableCell>
                      {i.category ? (
                        <Badge variant="outline">{i.category}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {i.stock.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setForm({ ...i })
                            setOpen(true)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => del(i)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!items.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      暂无物品数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </FadeIn>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? '编辑' : '新增'}物品</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>型号编号 *</Label>
              <Input
                value={form.model_code}
                onChange={(e) => setForm({ ...form, model_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>单位</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
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
