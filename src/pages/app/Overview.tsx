/* ============================================================
   P01 / /app/overview — MISSION CONTROL
   PAGES_SPEC.md §P01
   - Row 1: 4 KpiTile  (GMV / 主播 / 商品 / 直播场次)
   - Row 2: 1.6:1  GMV trend line + platform donut
   - Row 3: full   category rose
   ============================================================ */
import { useCallback, useEffect, useState } from 'react'
import { Button, Empty, Switch, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { EChartsOption } from 'echarts'
import PageHero, { LivePill } from '@/components/PageHero'
import KpiTile from '@/components/KpiTile'
import ChartCard from '@/components/ChartCard'
import {
  baseDarkOption,
  darkAxis,
  palette,
  platformColors,
  pulseFlameGradient,
} from '@/lib/chart'
import { dashboardApi } from '@/api/services'
import type {
  DashboardOverview,
  GmvTrendPoint,
  PieDatum,
} from '@/api/types'

export default function OverviewPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [trend, setTrend] = useState<GmvTrendPoint[]>([])
  const [platforms, setPlatforms] = useState<PieDatum[]>([])
  const [categories, setCategories] = useState<PieDatum[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    try {
      const [ov, tr, pl, cat] = await Promise.all([
      dashboardApi.overview(),
      dashboardApi.gmvTrend(),
      dashboardApi.platformShare(),
      dashboardApi.categoryShare(),
      ])
      setOverview(ov)
      setTrend(tr.data ?? [])
      setPlatforms(pl.data ?? [])
      setCategories(cat.data ?? [])
      setLastUpdatedAt(new Date())
    } catch (err) {
      console.error(err)
      message.warning('总览数据刷新失败，已保留上一版数据')
    } finally {
      if (initial) setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return undefined
    const timer = window.setInterval(() => {
      void load(false)
    }, 30000)
    return () => {
      window.clearInterval(timer)
    }
  }, [autoRefresh, load])

  /* ---------- KPI 行 ---------- */
  const totalGmvYi = (overview?.total_gmv ?? 0) / 1e8 // 元 → 亿
  const totalAnchors = overview?.total_anchors ?? 0
  const totalProducts = overview?.total_products ?? 0
  const totalStreams = overview?.total_streams ?? 0
  const yoy = overview?.yoy_gmv

  /* ---------- 趋势 ---------- */
  const trendOption: EChartsOption = {
    ...baseDarkOption,
    grid: { left: 56, right: 24, top: 24, bottom: 36 },
    tooltip: {
      ...baseDarkOption.tooltip,
      trigger: 'axis',
      valueFormatter: (v) =>
        `¥${(Number(v) / 1e8).toFixed(2)} 亿`,
    },
    xAxis: {
      type: 'category',
      data: trend.map((p) => p.date),
      boundaryGap: false,
      ...darkAxis(),
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...darkAxis().axisLabel, formatter: (v: number) => `${(v / 1e8).toFixed(0)}亿` },
      splitLine: darkAxis().splitLine,
      axisLine: darkAxis().axisLine,
      axisTick: darkAxis().axisTick,
    },
    series: [
      {
        name: 'GMV',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: '#a855f7', width: 2 },
        itemStyle: { color: '#a855f7', borderColor: '#fff', borderWidth: 1 },
        areaStyle: { color: pulseFlameGradient },
        data: trend.map((p) => p.gmv),
        emphasis: { focus: 'series' },
      },
    ],
  }

  /* ---------- 平台饼 ---------- */
  const platformOption: EChartsOption = {
    ...baseDarkOption,
    color: platforms.map((p) => platformColors[p.name] || '#a855f7'),
    tooltip: { ...baseDarkOption.tooltip, trigger: 'item', formatter: '{b} · {d}%' },
    legend: {
      ...baseDarkOption.legend,
      orient: 'horizontal',
      bottom: 8,
      icon: 'circle',
    },
    series: [
      {
        type: 'pie',
        radius: ['56%', '78%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: '#0a0a0d',
          borderWidth: 3,
        },
        label: {
          show: false,
        },
        data: platforms.map((p) => ({
          name: nameToCN(p.name),
          value: p.value,
        })),
      },
    ],
  }

  /* ---------- 品类玫瑰图 ---------- */
  const roseOption: EChartsOption = {
    ...baseDarkOption,
    color: palette,
    tooltip: { ...baseDarkOption.tooltip, trigger: 'item', formatter: '{b} · {c}' },
    legend: {
      ...baseDarkOption.legend,
      orient: 'horizontal',
      bottom: 4,
      itemGap: 14,
    },
    series: [
      {
        type: 'pie',
        radius: [40, 160],
        center: ['50%', '50%'],
        roseType: 'area',
        itemStyle: {
          borderRadius: 4,
          borderColor: '#0a0a0d',
          borderWidth: 2,
        },
        label: {
          color: '#a1a1aa',
          fontSize: 11,
        },
        data: categories,
      },
    ],
  }

  return (
    <div>
      <PageHero
        eyebrow="01·OVERVIEW · CONTROL"
        title="MISSION CONTROL"
        description="实时聚合淘宝、抖音、拼多多三平台的直播 GMV、主播规模、商品分布与场次密度，为运营提供秒级总览。"
        right={<LivePill label="LIVE · 3S" />}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Switch checked={autoRefresh} onChange={setAutoRefresh} />
            <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              AUTO · 30S
            </span>
            <Button icon={<ReloadOutlined />} loading={refreshing} onClick={() => void load(false)}>
              REFRESH
            </Button>
            <span style={{ color: 'var(--text-4)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              UPDATED · {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString('zh-CN', { hour12: false }) : '--:--:--'}
            </span>
          </div>
        }
      />

      {/* Row 1 — KPI grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KpiTile
          eyebrow="K-01 · TOTAL GMV"
          value={totalGmvYi}
          decimals={2}
          unit="亿"
          prefix="¥"
          accent="pulse"
          index={1}
          hint={
            yoy != null ? (
              <span>同比 {yoy >= 0 ? '+' : ''}{(yoy * 100).toFixed(1)}%</span>
            ) : (
              '近 90 天滚动'
            )
          }
        />
        <KpiTile
          eyebrow="K-02 · ANCHORS"
          value={totalAnchors}
          unit="人"
          accent="pulse"
          index={2}
          hint="活跃主播 (近 30 天)"
        />
        <KpiTile
          eyebrow="K-03 · PRODUCTS"
          value={totalProducts}
          unit="件"
          accent="pulse"
          index={3}
          hint="入库 SKU"
        />
        <KpiTile
          eyebrow="K-04 · STREAMS"
          value={totalStreams}
          unit="场"
          accent="pulse"
          index={4}
          hint="直播场次"
        />
      </div>

      {/* Row 2 — trend + platform pie */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 24,
          marginBottom: 24,
        }}
      >
        <ChartCard
          eyebrow="CHART · C-01"
          title="GMV TREND · 90 DAYS"
          option={trendOption}
          height={340}
          loading={loading}
        />
        <ChartCard
          eyebrow="CHART · C-02"
          title="PLATFORM SHARE"
          option={platformOption}
          height={340}
          loading={loading}
          footer={
            platforms.length === 0 && !loading ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无平台数据"
                style={{ margin: 0 }}
              />
            ) : null
          }
        />
      </div>

      {/* Row 3 — category rose */}
      <ChartCard
        eyebrow="CHART · C-03"
        title="CATEGORY SHARE · ROSE"
        option={roseOption}
        height={420}
        loading={loading}
      />
    </div>
  )
}

function nameToCN(name: string) {
  const map: Record<string, string> = {
    taobao: '淘宝',
    douyin: '抖音',
    pdd: '拼多多',
  }
  return map[name] ?? name
}
