import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import apiClient from '@/lib/api-client'
import PageHeader from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FileDown, Search } from 'lucide-react'
import { FadeIn } from '@/components/MotionPrimitives'
import { RecordList, type RecordColumn } from '@/components/RecordList'

interface FeeRow {
  id: number
  outbound_date: string
  destination: string
  model_code: string
  item_name: string
  quantity: number
  storage_fee: number
  manual_fee: number
  total_fee: number
}

export default function Fees() {
  const [rows, setRows] = useState<FeeRow[]>([])
  const [keyword, setKeyword] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = async () => {
    const { data } = await apiClient.post('/billing/fees/list', { keyword, from, to })
    if (data.success) setRows(data.data)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalStorage = rows.reduce((s, r) => s + (r.storage_fee || 0), 0)
  const totalManual = rows.reduce((s, r) => s + (r.manual_fee || 0), 0)
  const totalFee = rows.reduce((s, r) => s + (r.total_fee || 0), 0)

  const exportExcel = () => {
    const data = rows.map((r) => ({
      出库日期: r.outbound_date,
      去向: r.destination,
      型号: r.model_code,
      物品: r.item_name,
      数量: r.quantity,
      存储费: r.storage_fee,
      人工附加费: r.manual_fee,
      总费用: r.total_fee,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '费用明细')
    XLSX.writeFile(wb, `费用明细_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div>
      <PageHeader
        title="费用明细"
        description="所有出库批次的自动计费与人工费汇总"
        actions={
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileDown className="w-4 h-4 md:mr-1" />
            <span className="hidden md:inline">导出 Excel</span>
            <span className="md:hidden">导出</span>
          </Button>
        }
      />
      <div className="p-3 md:p-6 lg:p-8 space-y-3 md:space-y-4">
        <FadeIn>
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <Card className="p-3 md:p-4">
              <div className="text-[11px] md:text-xs text-muted-foreground">存储费合计</div>
              <div className="font-bold text-base md:text-xl mt-1">
                ¥{totalStorage.toFixed(2)}
              </div>
            </Card>
            <Card className="p-3 md:p-4">
              <div className="text-[11px] md:text-xs text-muted-foreground">人工/附加</div>
              <div className="font-bold text-base md:text-xl mt-1">
                ¥{totalManual.toFixed(2)}
              </div>
            </Card>
            <Card className="p-3 md:p-4 bg-primary text-primary-foreground">
              <div className="text-[11px] md:text-xs opacity-80">总计</div>
              <div className="font-bold text-base md:text-xl mt-1">
                ¥{totalFee.toFixed(2)}
              </div>
            </Card>
          </div>
        </FadeIn>

        <FadeIn>
          <Card className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <Input
                placeholder="搜索去向 / 型号"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="md:w-56"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="flex-1 md:flex-none"
                />
                <span className="text-muted-foreground text-xs">至</span>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="flex-1 md:flex-none"
                />
              </div>
              <Button variant="outline" onClick={load} className="shrink-0">
                <Search className="w-4 h-4 mr-1" />
                查询
              </Button>
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <RecordList<FeeRow>
            data={rows}
            rowKey={(r) => r.id}
            emptyText="暂无费用记录"
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
                  cell: (r) => r.quantity,
                },
                {
                  key: 'storage_fee',
                  header: '存储费',
                  align: 'right',
                  cell: (r) => `¥${r.storage_fee?.toFixed(2)}`,
                },
                {
                  key: 'manual_fee',
                  header: '人工/附加',
                  align: 'right',
                  cell: (r) => `¥${r.manual_fee?.toFixed(2)}`,
                },
                {
                  key: 'total_fee',
                  header: '总费用',
                  align: 'right',
                  cell: (r) => (
                    <span className="font-semibold text-primary">
                      ¥{r.total_fee?.toFixed(2)}
                    </span>
                  ),
                },
              ] as RecordColumn<FeeRow>[]
            }
          />
        </FadeIn>
      </div>
    </div>
  )
}
