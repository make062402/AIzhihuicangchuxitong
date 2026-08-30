import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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
import { Plus, Edit, Trash2, MapPin } from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'
import { useConfirm } from '@/components/ConfirmDialog'

interface Location {
  id: number
  code: string
  zone: string
  capacity: number
  used: number
}

export default function AdminLocations() {
  const [locations, setLocations] = useState<Location[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<any>({ id: 0, code: '', zone: '', capacity: 1000 })
  const confirm = useConfirm()

  const load = async () => {
    const { data } = await apiClient.post('/locations/list', {})
    if (data.success) setLocations(data.data)
  }
  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    if (!form.code) {
      toast.error('库位编号必填')
      return
    }
    try {
      const url = form.id ? '/locations/update' : '/locations/create'
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

  const del = async (l: Location) => {
    const ok = await confirm({
      title: '删除库位',
      description: `确定删除库位 "${l.code}"？`,
      danger: true,
    })
    if (!ok) return
    try {
      const { data } = await apiClient.post('/locations/delete', { id: l.id })
      if (data.success) {
        toast.success('已删除')
        load()
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const totalCapacity = locations.reduce((s, l) => s + l.capacity, 0)
  const totalUsed = locations.reduce((s, l) => s + l.used, 0)
  const usageRate = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0

  return (
    <div>
      <PageHeader
        title="库位管理"
        description="维护仓库的所有存储库位与区域划分"
        actions={
          <Button
            onClick={() => {
              setForm({ id: 0, code: '', zone: '', capacity: 1000 })
              setOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> 新增库位
          </Button>
        }
      />

      <div className="p-4 md:p-6 lg:p-8 space-y-4">
        {/* 库位汇总卡 */}
        <FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">库位总数</div>
              <div className="mt-1 text-2xl font-bold">{locations.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">总容量</div>
              <div className="mt-1 text-2xl font-bold">{totalCapacity.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">已使用</div>
              <div className="mt-1 text-2xl font-bold text-primary">
                {totalUsed.toLocaleString()}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">占用率</div>
              <div className="mt-1 text-2xl font-bold">{usageRate.toFixed(1)}%</div>
              <Progress value={usageRate} className="h-1.5 mt-1" />
            </Card>
          </div>
        </FadeIn>

        {/* 卡片式库位（移动端友好） */}
        <FadeIn className="md:hidden">
          <div className="grid grid-cols-2 gap-3">
            {locations.map((l) => {
              const rate = (l.used / Math.max(l.capacity, 1)) * 100
              return (
                <Card key={l.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-info" />
                      <span className="font-mono text-sm font-semibold">{l.code}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{l.zone}</div>
                  <div className="mt-2 text-lg font-bold">
                    {l.used}
                    <span className="text-muted-foreground text-xs font-normal">
                      /{l.capacity}
                    </span>
                  </div>
                  <Progress value={rate} className="h-1.5 mt-1" />
                  <div className="mt-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => {
                        setForm({ ...l })
                        setOpen(true)
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => del(l)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </FadeIn>

        {/* 桌面端表格 */}
        <FadeIn className="hidden md:block">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>库位编号</TableHead>
                  <TableHead>区域</TableHead>
                  <TableHead className="text-right">容量</TableHead>
                  <TableHead className="text-right">已占用</TableHead>
                  <TableHead className="w-40">占用率</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((l) => {
                  const rate = (l.used / Math.max(l.capacity, 1)) * 100
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono font-semibold">{l.code}</TableCell>
                      <TableCell>{l.zone}</TableCell>
                      <TableCell className="text-right">{l.capacity.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">
                        {l.used.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={rate} className="h-2 flex-1" />
                          <span className="text-xs w-10 text-right">{rate.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setForm({ ...l })
                              setOpen(true)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => del(l)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!locations.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      暂无库位数据
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
            <DialogTitle>{form.id ? '编辑' : '新增'}库位</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>库位编号 *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="如 A-01-01"
              />
            </div>
            <div className="space-y-2">
              <Label>区域</Label>
              <Input
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
                placeholder="如 A区"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>容量</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
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
