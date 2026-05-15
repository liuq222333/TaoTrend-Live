/* ============================================================
   P03 / /app/categories/growth — GROWTH LEADERS
   PAGES_SPEC.md §P03
   横向 bar — 正用 lime / 负用 flame，按 abs desc。
   ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import type { EChartsOption } from 'echarts'
import PageHero from '@/components/PageHero'
import ChartCard from '@/components/ChartCard'
import { baseDarkOption, darkAxis } from '@/lib/chart'
import { categoryApi } from '@/api/services'
import type { CategoryGrowthItem } from '@/api/types'

export default function CategoryGrowthPage() {
  const [items, setItems] = useState<CategoryGrowthItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    categoryApi
      .topGrowth()
      .then((r) => alive && setItems(r.data ?? []))
      .catch((err) => {
        console.error(err)
        message.error('品类增长数据加载失败')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => Math.abs(b.growth ?? 0) - Math.abs(a.growth ?? 0),
      ),
    [items],
  )

  const option: EChartsOption = useMemo(() => {
    const labels = sorted.map((s) => s.category)
    const values = sorted.map((s) => (s.growth ?? 0) * 100)
    const colors = sorted.map((s) =>
      (s.growth ?? 0) >= 0 ? '#84cc16' : '#f43f5e',
    )

    return {
      ...baseDarkOption,
      grid: { left: 110, right: 80, top: 16, bottom: 24 },
      tooltip: {
        ...baseDarkOption.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const arr = params as Array<{
            value: number
            dataIndex: number
          }>
          if (!arr.length) return ''
          const p = arr[0]
          const item = sorted[p.dataIndex]
          if (!item) return ''
          return `<div style="font-family:'Inter Tight',sans-serif;">
            <div style="color:#a1a1aa;font-size:10px;letter-spacing:1.2px;margin-bottom:4px;">CATEGORY</div>
            <div style="color:#fff;font-weight:600;margin-bottom:6px;">${item.category}</div>
            <div style="font-size:11px;color:#a1a1aa;">GMV · ¥${(item.gmv / 1e8).toFixed(2)} 亿</div>
            <div style="font-size:13px;font-weight:700;margin-top:2px;color:${
              (item.growth ?? 0) >= 0 ? '#bef264' : '#fda4af'
            };">GROWTH · ${(item.growth * 100).toFixed(2)}%</div>
          </div>`
        },
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          ...darkAxis().axisLabel,
          formatter: (v: number) => `${v.toFixed(0)}%`,
        },
        splitLine: darkAxis().splitLine,
        axisLine: darkAxis().axisLine,
        axisTick: darkAxis().axisTick,
      },
      yAxis: {
        type: 'category',
        data: labels,
        inverse: true,
        ...darkAxis(),
        axisLabel: { ...darkAxis().axisLabel, fontSize: 12 },
      },
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({
            value: v,
            itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] },
          })),
          barWidth: 18,
          label: {
            show: true,
            position: 'right',
            formatter: (p) => {
              const v = p.value as number
              return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
            },
            color: '#f5f5f7',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'Inter Tight',
          },
        },
      ],
    }
  }, [sorted])

  const dynamicHeight = Math.max(360, sorted.length * 38 + 80)

  return (
    <div>
      <PageHero
        eyebrow="02·CATEGORY · A-02"
        title="GROWTH LEADERS"
        description="近 7 天 vs 上一周期的 GMV 增长率。正向增长用青柠色标记，下滑用赤焰色标记，绝对涨跌从上至下递减。"
      />

      <ChartCard
        eyebrow="CHART · CGW-01"
        title="WEEK-OVER-WEEK GROWTH"
        option={option}
        height={dynamicHeight}
        loading={loading}
      />

      <div
        style={{
          marginTop: 24,
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '16px 20px',
          background: 'var(--ink-850)',
          border: '1px solid var(--hairline-soft)',
          borderRadius: 10,
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          color: 'var(--text-3)',
        }}
      >
        <span className="u-eyebrow" style={{ color: 'var(--text-3)' }}>
          LEGEND
        </span>
        <LegendDot color="#84cc16" label="正向增长 · UPTREND" />
        <LegendDot color="#f43f5e" label="负向增长 · DECLINE" />
        <span style={{ marginLeft: 'auto', fontSize: 11 }}>
          数据来源：90 天 LiveStream GMV 聚合
        </span>
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      <span style={{ color: 'var(--text-2)', letterSpacing: 0.8 }}>{label}</span>
    </span>
  )
}
