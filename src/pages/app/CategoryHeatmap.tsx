/* ============================================================
   P02 / /app/categories/heatmap — TIME HEATMAP
   PAGES_SPEC.md §P02
   24h × 8 一级品类 GMV 热度图。
   ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import type { EChartsOption } from 'echarts'
import PageHero from '@/components/PageHero'
import ChartCard from '@/components/ChartCard'
import { baseDarkOption, darkAxis } from '@/lib/chart'
import { categoryApi } from '@/api/services'
import type { CategoryHeatmapResponse } from '@/api/types'

export default function CategoryHeatmapPage() {
  const [resp, setResp] = useState<CategoryHeatmapResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    categoryApi
      .heatmap()
      .then((r) => alive && setResp(r))
      .catch((err) => {
        console.error(err)
        message.error('热度数据加载失败')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const stats = useMemo(() => {
    if (!resp) return null
    const data = resp.data ?? []
    if (data.length === 0) return null
    let peak = data[0]
    let perHour: number[] = Array(resp.hours.length).fill(0)
    let perCat: number[] = Array(resp.categories.length).fill(0)
    for (const [x, y, v] of data) {
      if (v > peak[2]) peak = [x, y, v]
      perHour[x] = (perHour[x] ?? 0) + v
      perCat[y] = (perCat[y] ?? 0) + v
    }
    const peakHour = perHour.indexOf(Math.max(...perHour))
    const peakCat = perCat.indexOf(Math.max(...perCat))
    return {
      peakHour,
      peakCategory: resp.categories[peakCat] ?? '—',
      hottestCellGmv: peak[2],
      hottestCellLabel: `${resp.categories[peak[1]]} · ${peak[0]}:00`,
    }
  }, [resp])

  const maxValue = useMemo(() => {
    if (!resp) return 100
    return Math.max(100, ...resp.data.map((d) => d[2]))
  }, [resp])

  const option: EChartsOption = useMemo(() => {
    if (!resp) {
      return { ...baseDarkOption, series: [] }
    }
    return {
      ...baseDarkOption,
      grid: { left: 100, right: 32, top: 16, bottom: 80 },
      tooltip: {
        ...baseDarkOption.tooltip,
        position: 'top',
        formatter: (params) => {
          const p = params as unknown as { data: [number, number, number] }
          const [x, y, v] = p.data
          return `<div style="font-family:'Inter Tight',sans-serif;">
            <div style="color:#a1a1aa;font-size:10px;letter-spacing:1.2px;margin-bottom:4px;">CELL · ${String(
              x,
            ).padStart(2, '0')}:00</div>
            <div style="color:#fff;font-weight:600;">${resp.categories[y]}</div>
            <div style="margin-top:4px;color:#c084fc;font-weight:700;font-size:14px;">
              ¥${(v / 1e6).toFixed(2)} M GMV
            </div>
          </div>`
        },
      },
      xAxis: {
        type: 'category',
        data: resp.hours.map((h) => `${String(h).padStart(2, '0')}`),
        ...darkAxis(),
        axisLabel: { ...darkAxis().axisLabel, fontSize: 10 },
        splitArea: { show: false },
      },
      yAxis: {
        type: 'category',
        data: resp.categories,
        ...darkAxis(),
        axisLabel: { ...darkAxis().axisLabel, fontSize: 12, padding: [0, 8, 0, 0] },
        splitArea: { show: false },
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 12,
        textStyle: { color: '#a1a1aa', fontSize: 11, letterSpacing: 0.8 },
        inRange: {
          color: [
            '#0f0f15',
            '#3b1465',
            '#7e22ce',
            '#a855f7',
            '#ec4899',
            '#f43f5e',
            '#fbbf24',
          ],
        },
        itemWidth: 14,
        itemHeight: 220,
      },
      series: [
        {
          type: 'heatmap',
          data: resp.data,
          itemStyle: { borderRadius: 3, borderColor: '#0a0a0d', borderWidth: 1 },
          emphasis: {
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 1.5,
              shadowBlur: 12,
              shadowColor: 'rgba(168,85,247,0.65)',
            },
          },
        },
      ],
    }
  }, [resp, maxValue])

  return (
    <div>
      <PageHero
        eyebrow="02·CATEGORY · A-01"
        title="TIME HEATMAP"
        description="24 小时 × 8 一级品类的直播热度（GMV 求和）。颜色越亮代表该时段该品类的成交越集中。"
      />

      <ChartCard
        eyebrow="CHART · CTH-01"
        title="HOURLY × CATEGORY"
        option={option}
        height={520}
        loading={loading}
      />

      {/* Stats row */}
      <div
        style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        <StatBar
          label="PEAK HOUR"
          value={stats ? `${String(stats.peakHour).padStart(2, '0')}:00` : '—'}
          hint="累计 GMV 最高的小时"
        />
        <StatBar
          label="PEAK CATEGORY"
          value={stats ? stats.peakCategory : '—'}
          hint="累计 GMV 最高的品类"
        />
        <StatBar
          label="HOTTEST CELL"
          value={stats ? `¥${(stats.hottestCellGmv / 1e6).toFixed(2)} M` : '—'}
          hint={stats ? stats.hottestCellLabel : '—'}
        />
      </div>
    </div>
  )
}

function StatBar({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'var(--ink-850)',
        border: '1px solid var(--hairline-soft)',
        borderRadius: 10,
        padding: '18px 20px',
      }}
    >
      <div
        className="u-eyebrow"
        style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1.6 }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--accent-pulse)',
          fontFeatureSettings: '"tnum"',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{hint}</div>
    </div>
  )
}
