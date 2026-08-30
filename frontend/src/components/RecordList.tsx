import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * 一份"数据"在桌面端渲染为表格行、在移动端渲染为卡片。
 *
 * 使用者只需描述每一列/每一字段：
 *   - header: 表头文案
 *   - cell: 单元格内容
 *   - mobileLabel: 手机卡片中显示的字段名（缺省 = header）
 *   - primary: 手机卡片顶部大字标题（每行只应设 1 处）
 *   - meta: 手机卡片顶部副标题（右上角、小字弱化）
 *   - hideOnMobile: 在手机端隐藏此字段（比如极不常用列）
 */
export interface RecordColumn<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  headClassName?: string
  mobileLabel?: ReactNode
  primary?: boolean
  meta?: boolean
  hideOnMobile?: boolean
}

interface Props<T> {
  data: T[]
  columns: RecordColumn<T>[]
  rowKey: (row: T) => string | number
  emptyText?: string
  /** 手机卡片右下角的操作区域（例如删除、查看详情按钮） */
  mobileAction?: (row: T) => ReactNode
  /** 桌面表格右侧的操作列，与 mobileAction 通常内容相同 */
  desktopAction?: (row: T) => ReactNode
  desktopActionHeader?: ReactNode
  /** 手机卡片点击行为，例如整卡跳详情 */
  onRowClick?: (row: T) => void
}

const alignClass = (a?: 'left' | 'right' | 'center') =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : ''

export function RecordList<T>({
  data,
  columns,
  rowKey,
  emptyText = '暂无数据',
  mobileAction,
  desktopAction,
  desktopActionHeader,
  onRowClick,
}: Props<T>) {
  const primaryCol = columns.find((c) => c.primary)
  const metaCol = columns.find((c) => c.meta)
  const otherCols = columns.filter(
    (c) => !c.primary && !c.meta && !c.hideOnMobile
  )

  return (
    <>
      {/* 桌面端：完整表格 */}
      <Card className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={`${alignClass(c.align)} ${c.headClassName || ''}`}
                >
                  {c.header}
                </TableHead>
              ))}
              {desktopAction && (
                <TableHead className="w-24 text-right">
                  {desktopActionHeader || ''}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={`${alignClass(c.align)} ${c.className || ''}`}
                  >
                    {c.cell(row)}
                  </TableCell>
                ))}
                {desktopAction && (
                  <TableCell className="text-right">
                    {desktopAction(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!data.length && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (desktopAction ? 1 : 0)}
                  className="text-center text-muted-foreground py-8"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 移动端：卡片流 */}
      <div className="md:hidden flex flex-col gap-2.5">
        {data.map((row) => (
          <Card
            key={rowKey(row)}
            className={`p-3.5 ${onRowClick ? 'active:bg-muted/60 transition-colors' : ''}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {/* 顶部：主标题 + 副标题（右上角） */}
            {(primaryCol || metaCol) && (
              <div className="flex items-start justify-between gap-3 mb-2 pb-2 border-b border-border/60">
                <div className="min-w-0 flex-1">
                  {primaryCol && (
                    <div className="text-sm font-semibold truncate">
                      {primaryCol.cell(row)}
                    </div>
                  )}
                </div>
                {metaCol && (
                  <div className="text-xs text-muted-foreground shrink-0">
                    {metaCol.cell(row)}
                  </div>
                )}
              </div>
            )}

            {/* 中部：其他字段 label/value 网格 */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              {otherCols.map((c) => (
                <div key={c.key} className="flex flex-col min-w-0">
                  <span className="text-muted-foreground text-[11px]">
                    {c.mobileLabel ?? c.header}
                  </span>
                  <span className="truncate">{c.cell(row)}</span>
                </div>
              ))}
            </div>

            {/* 底部：操作按钮 */}
            {mobileAction && (
              <div
                className="flex justify-end mt-2.5 pt-2 border-t border-border/60"
                onClick={(e) => e.stopPropagation()}
              >
                {mobileAction(row)}
              </div>
            )}
          </Card>
        ))}
        {!data.length && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {emptyText}
          </Card>
        )}
      </div>
    </>
  )
}
