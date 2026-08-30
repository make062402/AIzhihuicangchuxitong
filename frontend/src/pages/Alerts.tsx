import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { AlertTriangle, TrendingDown, TrendingUp, Clock, Settings2, XCircle } from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'
import { useAuth } from '@/hooks/use-auth'
import { RecordList, type RecordColumn } from '@/components/RecordList'

interface Alert {
  id: number
  model_code: string
  name: string
  unit: string
  category?: string
  stock: number
  oldest_days: number
  low_threshold: number
  high_threshold: number
  aging_days: number
  levels: Array<'out_of_stock' | 'low' | 'high' | 'aging'>
}

interface Stats {
  out_of_stock: number
  low: number
  high: number
  aging: number
}

interface Threshold {
  item_id: number
  model_code: string
  name: string
  unit: string
  low_threshold: number
  high_threshold: number
  aging_days: number
}

const LEVEL_META: Record<Alert['levels'][number], { label: string; className: string }> = {
  out_of_stock: { label: '已断货', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  low: { label: '库存偏低', className: 'bg-warning/15 text-warning border-warning/30' },
  high: { label: '库存过高', className: 'bg-info/15 text-info border-info/30' },
  aging: { label: '滞留过久', className: 'bg-primary/15 text-primary border-primary/30' },
}

export default function Alerts() {
  const { isAdmin } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<Stats>({ out_of_stock: 0, low: 0, high: 0, aging: 0 })
  const [thresholds, setThresholds] = useState<Threshold[]>([])
  const [thOpen, setThOpen] = useState(false)
  const [editing, setEditing] = useState<Threshold | null>(null)

  const load = async () => {
    const { data } = await apiClient.post('/alerts/summary', {})
    if (data.success) {
      setAlerts(data.data.alerts)
      setStats(data.data.stats)
    }
  }
  const loadThresholds = async () => {
    const { data } = await apiClient.post('/alerts/thresholds/list', {})
    if (data.success) setThresholds(data.data)
  }
  useEffect(() => {
    load()
  }, [])

  const openThresholds = async () => {
    await loadThresholds()
    setEditing(null)
    setThOpen(true)
  }

  const save = async (t: Threshold) => {
    try {
      const { data } = await apiClient.post('/alerts/thresholds/upsert', {
        item_id: t.item_id,
        low_threshold: t.low_threshold,
        high_threshold: t.high_threshold,
        aging_days: t.aging_days,
      })
      if (data.success) {
        toast.success('已更新阈值')
        setEditing(null)
        loadThresholds()
        load()
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const KPI = [
    {
      key: 'out_of_stock',
      label: '断货物品',
      value: stats.out_of_stock,
      Icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      key: 'low',
      label: '库存偏低',
      value: stats.low,
      Icon: TrendingDown,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      key: 'high',
      label: '库存过高',
      value: stats.high,
      Icon: TrendingUp,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      key: 'aging',
      label: '滞留过久',
      value: stats.aging,
      Icon: Clock,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ] as const

  return (
    <div>
      <PageHeader
        title="库存预警"
        description="库存断货、偏低、积压和滞留监控看板"
        actions={
          isAdmin ? (
            <Button variant="outline" size="sm" onClick={openThresholds}>
              <Settings2 className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">阈值设置</span>
              <span className="md:hidden">阈值</span>
            </Button>
          ) : null
        }
      />

      <div className="p-3 md:p-6 lg:p-8 space-y-3 md:space-y-4">
        {/* KPI 卡 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {KPI.map((k) => (
            <FadeIn key={k.key}>
              <Card className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-md flex items-center justify-center shrink-0 ${k.bg} ${k.color}`}
                >
                  <k.Icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] md:text-xs text-muted-foreground truncate">
                    {k.label}
                  </div>
                  <div className="text-lg md:text-2xl font-bold">{k.value}</div>
                </div>
              </Card>
            </FadeIn>
          ))}
        </div>

        <FadeIn>
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold">预警清单</span>
            <span className="ml-auto text-xs text-muted-foreground">共 {alerts.length} 条</span>
          </div>
        </FadeIn>

        <FadeIn>
          {alerts.length === 0 ? (
            <Card className="py-10 flex flex-col items-center gap-2">
              <Badge variant="secondary">全部正常</Badge>
              <span className="text-xs text-muted-foreground">当前无库存预警</span>
            </Card>
          ) : (
            <RecordList<Alert>
              data={alerts}
              rowKey={(a) => a.id}
              columns={
                [
                  {
                    key: 'name',
                    header: '物品',
                    primary: true,
                    cell: (a) => (
                      <span>
                        <span className="font-mono text-xs text-muted-foreground mr-2">
                          {a.model_code}
                        </span>
                        {a.name}
                        {a.category && (
                          <span className="text-[11px] text-muted-foreground ml-1">
                            · {a.category}
                          </span>
                        )}
                      </span>
                    ),
                  },
                  {
                    key: 'stock',
                    header: '当前库存',
                    align: 'right',
                    meta: true,
                    cell: (a) => (
                      <span className="font-semibold text-foreground">
                        {a.stock} {a.unit}
                      </span>
                    ),
                  },
                  {
                    key: 'oldest',
                    header: '最长存放',
                    align: 'right',
                    cell: (a) => (a.oldest_days > 0 ? `${a.oldest_days} 天` : '-'),
                  },
                  {
                    key: 'threshold',
                    header: '阈值',
                    mobileLabel: '阈值(低/高/老化)',
                    cell: (a) => (
                      <span className="text-xs text-muted-foreground">
                        低 {a.low_threshold} / 高 {a.high_threshold} / 老化 {a.aging_days}d
                      </span>
                    ),
                  },
                  {
                    key: 'levels',
                    header: '预警类型',
                    cell: (a) => (
                      <div className="flex flex-wrap gap-1">
                        {a.levels.map((l) => (
                          <span
                            key={l}
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] border ${LEVEL_META[l].className}`}
                          >
                            {LEVEL_META[l].label}
                          </span>
                        ))}
                      </div>
                    ),
                  },
                ] as RecordColumn<Alert>[]
              }
            />
          )}
        </FadeIn>
      </div>

      <Dialog open={thOpen} onOpenChange={setThOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>库存预警阈值</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground mb-2">
            低阈值：库存低于该值触发"偏低/断货"预警；高阈值：库存超过触发"过高"预警；老化天数：存放超过该值触发"滞留"预警。
          </div>

          {/* 桌面：表格 */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>型号</TableHead>
                  <TableHead>物品</TableHead>
                  <TableHead className="text-right">低</TableHead>
                  <TableHead className="text-right">高</TableHead>
                  <TableHead className="text-right">老化(天)</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thresholds.map((t) => {
                  const isEdit = editing?.item_id === t.item_id
                  const view = isEdit ? editing! : t
                  return (
                    <TableRow key={t.item_id}>
                      <TableCell className="font-mono text-xs">{t.model_code}</TableCell>
                      <TableCell>{t.name}</TableCell>
                      <TableCell className="text-right">
                        {isEdit ? (
                          <Input
                            className="w-20 h-8 text-right"
                            type="number"
                            value={view.low_threshold}
                            onChange={(e) =>
                              setEditing({ ...view, low_threshold: Number(e.target.value) })
                            }
                          />
                        ) : (
                          t.low_threshold
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEdit ? (
                          <Input
                            className="w-20 h-8 text-right"
                            type="number"
                            value={view.high_threshold}
                            onChange={(e) =>
                              setEditing({ ...view, high_threshold: Number(e.target.value) })
                            }
                          />
                        ) : (
                          t.high_threshold
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEdit ? (
                          <Input
                            className="w-20 h-8 text-right"
                            type="number"
                            value={view.aging_days}
                            onChange={(e) =>
                              setEditing({ ...view, aging_days: Number(e.target.value) })
                            }
                          />
                        ) : (
                          t.aging_days
                        )}
                      </TableCell>
                      <TableCell>
                        {isEdit ? (
                          <Button size="sm" onClick={() => save(view)}>
                            保存
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                            编辑
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* 移动：卡片 */}
          <div className="md:hidden space-y-2">
            {thresholds.map((t) => {
              const isEdit = editing?.item_id === t.item_id
              const view = isEdit ? editing! : t
              return (
                <Card key={t.item_id} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{t.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {t.model_code}
                      </div>
                    </div>
                    {isEdit ? (
                      <Button size="sm" onClick={() => save(view)} className="h-8">
                        保存
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(t)}
                        className="h-8"
                      >
                        编辑
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground mb-1">低阈值</div>
                      {isEdit ? (
                        <Input
                          className="h-8 text-sm"
                          type="number"
                          inputMode="numeric"
                          value={view.low_threshold}
                          onChange={(e) =>
                            setEditing({ ...view, low_threshold: Number(e.target.value) })
                          }
                        />
                      ) : (
                        <div className="font-semibold text-sm">{t.low_threshold}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">高阈值</div>
                      {isEdit ? (
                        <Input
                          className="h-8 text-sm"
                          type="number"
                          inputMode="numeric"
                          value={view.high_threshold}
                          onChange={(e) =>
                            setEditing({ ...view, high_threshold: Number(e.target.value) })
                          }
                        />
                      ) : (
                        <div className="font-semibold text-sm">{t.high_threshold}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">老化(天)</div>
                      {isEdit ? (
                        <Input
                          className="h-8 text-sm"
                          type="number"
                          inputMode="numeric"
                          value={view.aging_days}
                          onChange={(e) =>
                            setEditing({ ...view, aging_days: Number(e.target.value) })
                          }
                        />
                      ) : (
                        <div className="font-semibold text-sm">{t.aging_days}</div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setThOpen(false)}
              className="sm:w-auto w-full"
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
