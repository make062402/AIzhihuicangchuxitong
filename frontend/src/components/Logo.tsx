/**
 * 智慧仓储管理系统 Logo v2
 *
 * 设计理念：
 * - 抽象立体箱：等距视角(2.5D isometric) 呈现堆叠的两个货箱
 * - 顶部箱代表"入库/新数据"，底部箱代表"库存/沉淀"
 * - 内部菱形高光模拟金属亮面，右下角小圆点隐喻"智能/传感"节点
 * - 使用 --primary + 深色渐变，天然适配深浅背景
 */

interface Props {
  size?: number
  className?: string
  variant?: 'onDark' | 'onLight'
}

export default function Logo({ size = 40, className, variant = 'onDark' }: Props) {
  const onDark = variant === 'onDark'

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.26,
        background: onDark
          ? 'linear-gradient(140deg, oklch(0.68 0.16 258) 0%, oklch(0.42 0.19 258) 55%, oklch(0.28 0.14 258) 100%)'
          : 'linear-gradient(140deg, oklch(0.72 0.17 258) 0%, oklch(0.52 0.2 258) 55%, oklch(0.38 0.16 258) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow:
          '0 6px 18px oklch(0.35 0.18 258 / 0.45), inset 0 1px 0 oklch(1 0 0 / 0.28), inset 0 -1px 0 oklch(0 0 0 / 0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label="智慧仓储 Logo"
    >
      {/* 顶部高光斜面 */}
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '55%',
          background:
            'linear-gradient(180deg, oklch(1 0 0 / 0.22) 0%, oklch(1 0 0 / 0) 100%)',
          pointerEvents: 'none',
        }}
      />
      {/* 底部投影 */}
      <span
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '25%',
          background:
            'linear-gradient(0deg, oklch(0 0 0 / 0.18) 0%, oklch(0 0 0 / 0) 100%)',
          pointerEvents: 'none',
        }}
      />

      <svg
        width={size * 0.68}
        height={size * 0.68}
        viewBox="0 0 32 32"
        fill="none"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* 底层货箱 — 等距立方体 */}
        <g>
          {/* 顶面 */}
          <path
            d="M16 15L26 19L16 23L6 19L16 15Z"
            fill="white"
            fillOpacity="0.95"
          />
          {/* 左面 */}
          <path
            d="M6 19L16 23V29L6 25V19Z"
            fill="white"
            fillOpacity="0.55"
          />
          {/* 右面 */}
          <path
            d="M26 19L16 23V29L26 25V19Z"
            fill="white"
            fillOpacity="0.32"
          />
          {/* 顶面中线（象征封箱胶带） */}
          <path
            d="M11 17L21 21"
            stroke="oklch(0.42 0.19 258)"
            strokeOpacity="0.55"
            strokeWidth="0.6"
          />
        </g>

        {/* 顶层小箱 — 稍偏左，制造堆叠感 */}
        <g>
          <path
            d="M13 4L21 7.2L13 10.4L5 7.2L13 4Z"
            fill="white"
            fillOpacity="0.98"
          />
          <path
            d="M5 7.2L13 10.4V15.6L5 12.4V7.2Z"
            fill="white"
            fillOpacity="0.6"
          />
          <path
            d="M21 7.2L13 10.4V15.6L21 12.4V7.2Z"
            fill="white"
            fillOpacity="0.38"
          />
          <path
            d="M9 5.6L17 8.8"
            stroke="oklch(0.42 0.19 258)"
            strokeOpacity="0.55"
            strokeWidth="0.55"
          />
        </g>

        {/* 右下"智能节点" */}
        <circle
          cx="25"
          cy="10"
          r="2.2"
          fill="oklch(0.85 0.16 90)"
          stroke="white"
          strokeWidth="0.6"
          strokeOpacity="0.9"
        />
        <circle cx="25" cy="10" r="0.8" fill="white" fillOpacity="0.95" />
      </svg>
    </div>
  )
}
