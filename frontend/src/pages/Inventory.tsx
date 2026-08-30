import { useEffect, useState } from 'react'
import apiClient from '@/lib/api-client'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'
import { RecordList, type RecordColumn } from '@/components/RecordList'

interface InvRow {
  id: number
  inbound_date: string
  source: string
  quantity: number
  remaining_qty: number
  model_code: string
  item_name: string
  unit: string
  location_code: string
  zone: string
  days_stored: number
}

export default function Inventory() {
  const [rows, setRows] = useState<InvRow[]>([])
  const [keyword, setKeyword] = useState('')

  const load = async () => {
    const { data } = await apiClient.post('/inventory/details', { keyword })
    if (data.success) setRows(data.data)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <PageHeader title="库存明细" description="按批次追踪的实时可出库存" />
      <div className="p-3 md:p-6 lg:p-8 space-y-3 md:space-y-4">
        <FadeIn>
          <Card className="p-3 md:p-4">
            <div className="flex gap-2">
              <Input
                placeholder="搜索型号或名称"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                className="flex-1 md:max-w-sm"
              />
              <Button variant="outline" onClick={load} className="shrink-0">
                <Search className="w-4 h-4 md:mr-1" />
                <span className="hidden md:inline">搜索</span>
              </Button>
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <RecordList<InvRow>
            data={rows}
            rowKey={(r) => r.id}
            emptyText="当前无可出库库存"
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
                  key: 'batch',
                  header: '批次号',
                  meta: true,
                  cell: (r) => (
                    <span className="font-mono">
                      B{String(r.id).padStart(6, '0')}
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
                  key: 'inbound_date',
                  header: '入库日期',
                  cell: (r) => r.inbound_date,
                },
                {
                  key: 'source',
                  header: '来源',
                  cell: (r) => <span className="text-xs">{r.source}</span>,
                },
                {
                  key: 'quantity',
                  header: '原始数量',
                  align: 'right',
                  cell: (r) => (
                    <span>
                      {r.quantity} {r.unit}
                    </span>
                  ),
                },
                {
                  key: 'remaining',
                  header: '可出库存',
                  align: 'right',
                  cell: (r) => (
                    <span className="font-semibold text-primary">
                      {r.remaining_qty}
                    </span>
                  ),
                },
                {
                  key: 'days',
                  header: '已存放天数',
                  align: 'right',
                  cell: (r) => (
                    <Badge
                      variant={
                        r.days_stored > 30
                          ? 'destructive'
                          : r.days_stored > 15
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {r.days_stored} 天
                    </Badge>
                  ),
                },
              ] as RecordColumn<InvRow>[]
            }
          />
        </FadeIn>
      </div>
    </div>
  )
}
