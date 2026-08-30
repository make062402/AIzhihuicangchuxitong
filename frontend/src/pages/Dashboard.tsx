import { useEffect, useState } from 'react'
import apiClient from '@/lib/api-client'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { FadeIn, Stagger } from '@/components/MotionPrimitives'
import {
  Boxes,
  PackagePlus,
  PackageMinus,
  TrendingUp,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Package,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

interface Summary {
  totalStock: number
  skuCount: number
  locationUsed: number
  locationTotal: number
  todayIn: number
  todayOut: number
  monthFee: number
  trend: Array<{ date: string; inbound: number; outbound: number }>
  topItems: Array<{ model_code: string; name: string; stock: number }>
  locationDist: Array<{ code: string; zone: string; capacity: number; used: number }>
}

interface FeeItem {
  id: number
  outbound_date: string
  destination: string
  model_code: string
  item_name: string
  storage_fee: number
  manual_fee: number
  total_fee: number
}

/**
 * 统计卡配色规则（静态类名以确保 Tailwind 生成）：
 * - 库存：primary（品牌蓝）
 * - SKU：info（浅蓝）
 * - 入库：success（绿）
 * - 出库：warning（琥珀）
 */
const STAT_CARDS = [
  {
    key: 'totalStock' as const,
    label: '当前总库存',
    icon: Boxes,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    unit: '件',
  },
  {
    key: 'skuCount' as const,
    label: '在库 SKU 数',
    icon: TrendingUp,
    iconBg: 'bg-info/10',
    iconColor: 'text-info',
    unit: '种',
  },
  {
    key: 'todayIn' as const,
    label: '今日入库',
    icon: PackagePlus,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    unit: '件',
  },
  {
    key: 'todayOut' as const,
    label: '今日出库',
    icon: PackageMinus,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    unit: '件',
  },
]

const TOP_COLORS = ['bg-primary', 'bg-info', 'bg-success', 'bg-warning', 'bg-destructive/70']

export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null)
  const [fees, setFees] = useState<FeeItem[]>([])

  const load = async () => {
    const [sum, fee] = await Promise.all([
      apiClient.post('/inventory/summary', {}),
      apiClient.post('/billing/fees/list', {}),
    ])
    if (sum.data.success) setData(sum.data.data)
    if (fee.data.success) setFees(fee.data.data)
  }
  useEffect(() => {
    load()
  }, [])

  const usageRate = data ? (data.locationUsed / Math.max(data.locationTotal, 1)) * 100 : 0

  // 本月费用相关计算
  const now = new Date()
  const thisMonth = now.toISOString().slice(0, 7)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7)
  const thisMonthFees = fees.filter((f) => f.outbound_date?.startsWith(thisMonth))
  const lastMonthFees = fees.filter((f) => f.outbound_date?.startsWith(lastMonth))
  const thisMonthTotal = thisMonthFees.reduce((s, f) => s + (f.total_fee || 0), 0)
  const lastMonthTotal = lastMonthFees.reduce((s, f) => s + (f.total_fee || 0), 0)
  const thisMonthStorage = thisMonthFees.reduce((s, f) => s + (f.storage_fee || 0), 0)
  const thisMonthManual = thisMonthFees.reduce((s, f) => s + (f.manual_fee || 0), 0)
  const momChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0
  const avgDaily = thisMonthTotal / Math.max(now.getDate(), 1)

  // 本月每日费用趋势
  const dailyFeeMap: Record<string, number> = {}
  thisMonthFees.forEach((f) => {
    dailyFeeMap[f.outbound_date] = (dailyFeeMap[f.outbound_date] || 0) + f.total_fee
  })
  const feeDaily: Array<{ date: string; fee: number }> = []
  for (let d = 1; d <= now.getDate(); d++) {
    const ds = `${thisMonth}-${String(d).padStart(2, '0')}`
    feeDaily.push({ date: String(d), fee: Number((dailyFeeMap[ds] || 0).toFixed(2)) })
  }

  const maxStock = Math.max(...(data?.topItems?.map((t) => t.stock) || [1]))

  return (
    <div>
      <PageHeader title="库存总览" description="实时监控仓储核心运营指标" />

      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
        {/* 关键指标 4 张卡 */}
        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {STAT_CARDS.map((s) => {
            const val = data ? (data[s.key] as number) : 0
            return (
              <FadeIn key={s.key}>
                <Card className="p-4 md:p-5 hover:shadow-md transition-shadow overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground truncate">{s.label}</div>
                      <div className="mt-1 font-bold text-xl md:text-2xl lg:text-3xl leading-tight break-all">
                        {val?.toLocaleString?.() || 0}
                        <span className="text-muted-foreground font-normal text-sm ml-1">
                          {s.unit}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`shrink-0 w-9 h-9 md:w-11 md:h-11 rounded-lg ${s.iconBg} ${s.iconColor} flex items-center justify-center`}
                    >
                      <s.icon className="w-4.5 h-4.5 md:w-5 md:h-5" />
                    </div>
                  </div>
                </Card>
              </FadeIn>
            )
          })}
        </Stagger>

        {/* 费用看板 —— 大板块 */}
        <FadeIn>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-5 min-w-0">
              {/* 左侧：本月费用摘要 */}
              <div
                className="lg:col-span-2 p-4 md:p-6 relative overflow-hidden min-w-0"
                style={{
                  background:
                    'linear-gradient(135deg, var(--primary) 0%, oklch(0.36 0.16 258) 100%)',
                }}
              >
                <div className="relative z-10 text-primary-foreground min-w-0">
                  <div className="flex items-center gap-2 opacity-90">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span className="text-sm truncate">
                      本月费用（{now.getMonth() + 1} 月）
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2 min-w-0">
                    <span className="font-bold text-2xl md:text-3xl lg:text-4xl break-all leading-tight">
                      ¥{thisMonthTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {momChange !== 0 ? (
                      <>
                        {momChange > 0 ? (
                          <span className="inline-flex items-center gap-0.5 bg-white/20 px-2 py-0.5 rounded">
                            <ArrowUpRight className="w-3 h-3" />
                            {momChange.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 bg-white/20 px-2 py-0.5 rounded">
                            <ArrowDownRight className="w-3 h-3" />
                            {Math.abs(momChange).toFixed(1)}%
                          </span>
                        )}
                        <span className="opacity-70">较上月</span>
                      </>
                    ) : (
                      <span className="opacity-70">暂无同比数据</span>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 md:gap-3 text-sm">
                    <div className="bg-white/10 rounded-md p-2.5 md:p-3 backdrop-blur min-w-0">
                      <div className="opacity-70 text-xs truncate">存储费</div>
                      <div className="font-semibold mt-1 break-all text-sm md:text-base leading-tight">
                        ¥{thisMonthStorage.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-md p-2.5 md:p-3 backdrop-blur min-w-0">
                      <div className="opacity-70 text-xs truncate">人工/附加</div>
                      <div className="font-semibold mt-1 break-all text-sm md:text-base leading-tight">
                        ¥{thisMonthManual.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-md p-2.5 md:p-3 backdrop-blur min-w-0">
                      <div className="opacity-70 text-xs truncate">日均费用</div>
                      <div className="font-semibold mt-1 break-all text-sm md:text-base leading-tight">¥{avgDaily.toFixed(2)}</div>
                    </div>
                    <div className="bg-white/10 rounded-md p-2.5 md:p-3 backdrop-blur min-w-0">
                      <div className="opacity-70 text-xs truncate">本月出库</div>
                      <div className="font-semibold mt-1 text-sm md:text-base leading-tight">{thisMonthFees.length} 单</div>
                    </div>
                  </div>
                </div>
                {/* 装饰圆 */}
                <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute right-4 top-4 w-12 h-12 rounded-full bg-white/5 pointer-events-none" />
              </div>

              {/* 右侧：费用趋势 + 明细 */}
              <div className="lg:col-span-3 p-4 md:p-6 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">本月每日费用趋势</h3>
                  <Badge variant="outline" className="text-xs">
                    {now.getDate()} 天
                  </Badge>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={feeDaily}>
                    <defs>
                      <linearGradient id="feeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `¥${v}`}
                    />
                    <Tooltip
                      formatter={(v: number) => [`¥${v.toFixed(2)}`, '费用']}
                      labelFormatter={(l) => `${now.getMonth() + 1}月${l}日`}
                    />
                    <Line
                      type="monotone"
                      dataKey="fee"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#feeFill)"
                      dot={{ r: 3, fill: 'var(--primary)' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">最近扣费明细</h4>
                    <span className="text-xs text-muted-foreground">
                      共 {thisMonthFees.length} 条
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {thisMonthFees.slice(0, 5).map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 py-1.5 border-b last:border-0"
                      >
                        <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">
                            <span className="font-mono text-xs mr-1">{f.model_code}</span>
                            <span className="text-muted-foreground">→ {f.destination}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {f.outbound_date}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-primary shrink-0">
                          ¥{f.total_fee?.toFixed(2)}
                        </div>
                      </div>
                    ))}
                    {!thisMonthFees.length && (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        本月暂无费用记录
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </FadeIn>

        {/* 库位占用 */}
        <FadeIn>
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-info shrink-0" />
                <h3 className="text-sm font-semibold">库位占用</h3>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground shrink-0">总体占用率</span>
                <span className="text-lg font-bold shrink-0">{usageRate.toFixed(1)}%</span>
                <div className="w-20 md:w-24 shrink-0">
                  <Progress value={usageRate} className="h-2" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {data?.locationDist?.map((l) => {
                const rate = (l.used / Math.max(l.capacity, 1)) * 100
                const hot =
                  rate > 80 ? 'destructive' : rate > 50 ? 'warning' : rate > 0 ? 'info' : 'muted'
                const barCls =
                  hot === 'destructive'
                    ? 'bg-destructive'
                    : hot === 'warning'
                      ? 'bg-warning'
                      : hot === 'info'
                        ? 'bg-info'
                        : 'bg-muted-foreground/30'
                return (
                  <div
                    key={l.code}
                    className="border rounded-md p-3 hover:shadow-sm transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold">{l.code}</span>
                      <span className="text-[10px] text-muted-foreground">{l.zone}</span>
                    </div>
                    <div className="text-lg font-bold mt-1">{l.used}</div>
                    <div className="text-[11px] text-muted-foreground">/{l.capacity}</div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${barCls} transition-all`}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </FadeIn>

        {/* 出入库趋势 + 热销 TOP 5 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 min-w-0">
          {/* 趋势 */}
          <FadeIn className="lg:col-span-3 min-w-0">
            <Card className="p-5 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">近 14 天出入库趋势</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    入库
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    出库
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data?.trend || []}>
                  <defs>
                    <linearGradient id="cIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--warning)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="inbound"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#cIn)"
                    name="入库"
                  />
                  <Area
                    type="monotone"
                    dataKey="outbound"
                    stroke="var(--warning)"
                    strokeWidth={2}
                    fill="url(#cOut)"
                    name="出库"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </FadeIn>

          {/* TOP 5 —— 全新设计：条形卡片 */}
          <FadeIn className="lg:col-span-2 min-w-0">
            <Card className="p-5 h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">库存排行 TOP 5</h3>
                <Badge variant="outline" className="text-xs">
                  按库存量
                </Badge>
              </div>
              <div className="space-y-3">
                {data?.topItems?.map((t, idx) => {
                  const pct = (t.stock / maxStock) * 100
                  return (
                    <div key={t.model_code} className="group">
                      <div className="flex items-center gap-3">
                        <div
                          className={`shrink-0 w-7 h-7 rounded-full ${
                            idx === 0
                              ? 'bg-primary'
                              : idx === 1
                                ? 'bg-info'
                                : idx === 2
                                  ? 'bg-success'
                                  : 'bg-muted-foreground/40'
                          } text-white flex items-center justify-center text-xs font-bold`}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs truncate">{t.model_code}</span>
                            <span className="text-sm font-bold shrink-0">
                              {t.stock.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {t.name}
                          </div>
                        </div>
                      </div>
                      <div className="ml-10 mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${TOP_COLORS[idx] || 'bg-muted-foreground/40'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {!data?.topItems?.length && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    暂无库存数据
                  </div>
                )}
              </div>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  )
}
