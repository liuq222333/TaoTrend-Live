/* ============================================================
   P07 / /app/anchors/:id — ANCHOR DETAIL
   PAGES_SPEC.md §P07
   ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Empty, Table, message } from 'antd'
import type { TableProps } from 'antd'
import dayjs from 'dayjs'
import type { EChartsOption } from 'echarts'
import PageHero from '@/components/PageHero'
import KpiTile from '@/components/KpiTile'
import ChartCard from '@/components/ChartCard'
import AnchorAvatar from '@/components/AnchorAvatar'
import PlatformBadge from '@/components/PlatformBadge'
import { baseDarkOption, darkAxis, pulseFlameGradient } from '@/lib/chart'
import { anchorApi } from '@/api/services'
import type { Anchor, LiveStream } from '@/api/types'

export default function AnchorDetailPage() {
  const params = useParams<{ id: string }>()
  const nav = useNavigate()
  const id = params.id
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [streams, setStreams] = useState<LiveStream[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    anchorApi
      .detail(id)
      .then((r) => {
        if (!alive) return
        setAnchor(r.data)
        setStreams(r.recent_streams ?? [])
      })
      .catch((err) => {
        console.error(err)
        message.error('主播信息加载失败')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  /* ---------- 近 30 天 GMV 趋势 mock 自 streams ---------- */
  const trendOption: EChartsOption = useMemo(() => {
    // 按 start_at 日期聚合
    const byDate: Record<string, number> = {}
    for (const s of streams) {
      const d = dayjs(s.start_at).format('MM-DD')
      byDate[d] = (byDate[d] ?? 0) + Number(s.gmv ?? 0)
    }
    const sortedDates = Object.keys(byDate).sort()
    const values = sortedDates.map((d) => byDate[d])
    return {
      ...baseDarkOption,
      grid: { left: 56, right: 24, top: 24, bottom: 36 },
      tooltip: {
        ...baseDarkOption.tooltip,
        trigger: 'axis',
        valueFormatter: (v) => `¥${(Number(v) / 1e4).toFixed(2)} 万`,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: sortedDates,
        ...darkAxis(),
      },
      yAxis: {
        type: 'value',
        ...darkAxis(),
        axisLabel: {
          ...darkAxis().axisLabel,
          formatter: (v: number) => `${(v / 1e4).toFixed(0)}万`,
        },
      },
      series: [
        {
          name: 'GMV',
          type: 'line',
          smooth: true,
          data: values,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#a855f7' },
          lineStyle: { color: '#a855f7', width: 2 },
          areaStyle: { color: pulseFlameGradient },
        },
      ],
    }
  }, [streams])

  const streamCols: TableProps<LiveStream>['columns'] = useMemo(
    () => [
      {
        title: '#',
        dataIndex: 'id',
        width: 80,
        render: (id: number) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
            L-{String(id).padStart(5, '0')}
          </span>
        ),
      },
      {
        title: 'TITLE',
        dataIndex: 'title',
        render: (t: string, row) => (
          <Link
            to={`/app/livestreams/${row.id}`}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-1)',
              display: 'block',
              maxWidth: 360,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t}
          </Link>
        ),
      },
      {
        title: 'START',
        dataIndex: 'start_at',
        width: 160,
        render: (t: string) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>
            {dayjs(t).format('MM-DD HH:mm')}
          </span>
        ),
      },
      {
        title: 'DURATION',
        dataIndex: 'duration_min',
        width: 100,
        align: 'right',
        render: (n: number) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{n} min</span>
        ),
      },
      {
        title: 'GMV',
        dataIndex: 'gmv',
        width: 130,
        align: 'right',
        render: (n: number) => (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: 'var(--accent-pulse)',
            }}
          >
            ¥{(Number(n) / 1e4).toFixed(1)}{' '}
            <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>万</span>
          </span>
        ),
      },
      {
        title: 'CONV.',
        dataIndex: 'conversion_rate',
        width: 90,
        align: 'right',
        render: (n: number) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {(Number(n) * 100).toFixed(2)}%
          </span>
        ),
      },
    ],
    [],
  )

  if (!anchor && !loading) {
    return (
      <div>
        <PageHero
          eyebrow={`ANCHOR · A-${id ?? '???'}`}
          title="NOT FOUND"
          description="未找到该主播"
        />
        <Empty description="主播不存在或已被归档" />
      </div>
    )
  }

  return (
    <div>
      <PageHero
        eyebrow={
          anchor
            ? `${anchor.platform.toUpperCase()} · ${anchor.fans.toLocaleString()} FANS`
            : 'LOADING...'
        }
        title={anchor?.nickname ?? '...'}
        description={`主播 ID · A-${anchor?.id ?? '???'} · 已聚合最近 ${streams.length} 场直播数据`}
        right={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {anchor && (
              <AnchorAvatar
                seed={anchor.avatar_seed || `a-${anchor.id}`}
                initial={anchor.nickname?.[0]}
                size={96}
                status="live"
              />
            )}
            <button
              type="button"
              onClick={() => nav(-1)}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: '1px solid var(--hairline-strong)',
                borderRadius: 999,
                fontFamily: 'var(--font-display)',
                fontSize: 11,
                letterSpacing: 1.2,
                color: 'var(--text-2)',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              ← BACK
            </button>
          </div>
        }
      />

      {/* Row 1 — KPI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KpiTile
          eyebrow="K-01 · AVG GMV"
          value={(Number(anchor?.avg_gmv ?? 0)) / 1e4}
          decimals={2}
          prefix="¥"
          unit="万"
          accent="pulse"
          index={1}
          hint="每场平均成交"
        />
        <KpiTile
          eyebrow="K-02 · RETURN RATE"
          value={(anchor?.return_rate ?? 0) * 100}
          decimals={2}
          unit="%"
          accent={(anchor?.return_rate ?? 0) > 0.1 ? 'flame' : 'lime'}
          index={2}
          hint="累计退货率"
        />
        <KpiTile
          eyebrow="K-03 · STREAMS"
          value={anchor?.total_streams ?? streams.length}
          unit="场"
          accent="pulse"
          index={3}
          hint="近 30 天场次"
        />
        <KpiTile
          eyebrow="K-04 · FANS"
          value={(anchor?.fans ?? 0) / 1e4}
          decimals={1}
          unit="万"
          accent="pulse"
          index={4}
          hint={anchor ? <PlatformBadge platform={anchor.platform} variant="cn" /> : '—'}
        />
      </div>

      {/* Row 2 — GMV trend chart */}
      <ChartCard
        eyebrow="CHART · AD-01"
        title="GMV TREND · LAST 30 DAYS"
        option={trendOption}
        height={300}
        loading={loading}
        style={{ marginBottom: 24 }}
      />

      {/* Row 3 — recent streams */}
      <section
        style={{
          background: 'var(--ink-850)',
          border: '1px solid var(--hairline-soft)',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingBottom: 16,
            borderBottom: '1px solid var(--hairline-soft)',
            marginBottom: 12,
          }}
        >
          <div>
            <div
              className="u-eyebrow"
              style={{ color: 'var(--text-3)', fontSize: 10, marginBottom: 8 }}
            >
              RECENT · UP TO 10
            </div>
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: 'var(--text-1)',
              }}
            >
              LATEST LIVESTREAMS
            </h3>
          </div>
        </header>
        <Table<LiveStream>
          rowKey="id"
          dataSource={streams.slice(0, 10)}
          columns={streamCols}
          pagination={false}
          locale={{ emptyText: <Empty description="该主播暂无直播记录" /> }}
        />
      </section>
    </div>
  )
}
