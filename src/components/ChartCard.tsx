/* ============================================================
   <ChartCard>
   ----------------------------------------------------------------
   ECharts 卡片容器：eyebrow + title + (extra) + separator + chart
   spec 来源: PAGES_SPEC.md §共享组件 3
   ============================================================ */
import { Spin } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

export interface ChartCardProps {
  /** eyebrow text，比如 "CHART · C-01" */
  eyebrow?: string
  /** 主标题，大写 */
  title: string
  /** 标题右侧的附加内容（filter / legend toggle 等） */
  extra?: ReactNode
  /** ECharts option，对应 setOption */
  option: EChartsOption
  /** 图表高度（默认 320） */
  height?: number | string
  /** loading 状态 */
  loading?: boolean
  /** 自定义额外底部 footer（如 stats row） */
  footer?: ReactNode
  /** 控制是否需要 wordcloud 注册 — ECharts 6 + echarts-wordcloud */
  notMerge?: boolean
  /** 自定义外层样式 */
  style?: CSSProperties
  /** click handler on echarts events */
  onEvents?: Record<string, (...args: unknown[]) => void>
}

export default function ChartCard({
  eyebrow,
  title,
  extra,
  option,
  height = 320,
  loading = false,
  footer,
  notMerge = true,
  style,
  onEvents,
}: ChartCardProps) {
  return (
    <section
      style={{
        background: 'var(--ink-850)',
        border: '1px solid var(--hairline-soft)',
        borderRadius: 12,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          paddingBottom: 16,
          borderBottom: '1px solid var(--hairline-soft)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <div
              className="u-eyebrow"
              style={{
                color: 'var(--text-3)',
                marginBottom: 8,
                fontSize: 10,
                letterSpacing: 1.8,
              }}
            >
              {eyebrow}
            </div>
          )}
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--text-1)',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </h3>
        </div>
        {extra && <div style={{ flexShrink: 0 }}>{extra}</div>}
      </header>

      <div style={{ position: 'relative', minHeight: height }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(10,10,13,0.4)',
              backdropFilter: 'blur(2px)',
              zIndex: 1,
              borderRadius: 8,
            }}
          >
            <Spin />
          </div>
        )}
        <ReactECharts
          option={option}
          notMerge={notMerge}
          lazyUpdate
          style={{ height, width: '100%' }}
          opts={{ renderer: 'canvas' }}
          onEvents={onEvents}
        />
      </div>

      {footer && (
        <footer
          style={{
            paddingTop: 16,
            borderTop: '1px solid var(--hairline-soft)',
          }}
        >
          {footer}
        </footer>
      )}
    </section>
  )
}
