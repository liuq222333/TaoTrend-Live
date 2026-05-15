/* ============================================================
   P05 / /app/livestreams/:id — LIVESTREAM DETAIL
   PAGES_SPEC.md §P05
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
import ElectricBorder from '@/components/ElectricBorder'
import { baseDarkOption, darkAxis, pulseFlameGradient } from '@/lib/chart'
import { livestreamApi } from '@/api/services'
import type {
  LiveStreamDetail,
  LiveStreamProduct,
} from '@/api/types'
import { gradientImage } from '@/lib/placeholder'

export default function LivestreamDetailPage() {
  const params = useParams<{ id: string }>()
  const nav = useNavigate()
  const id = params.id
  const [detail, setDetail] = useState<LiveStreamDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    livestreamApi
      .detail(id)
      .then((r) => alive && setDetail(r.data))
      .catch((err) => {
        console.error(err)
        message.error('直播详情加载失败')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  /* ---------- 累积曲线 mock —— 用 duration 等分 + 商品 sold_gmv 加权 ---------- */
  const cumOption: EChartsOption = useMemo(() => {
    if (!detail) return { ...baseDarkOption, series: [] }
    const dur = detail.duration_min || 60
    const buckets = 30
    const step = dur / buckets
    const totalGmv = Number(detail.gmv ?? 0)
    // 简单的 S-curve 模拟累积
    const series: { x: string; y: number }[] = []
    for (let i = 0; i <= buckets; i++) {
      const ratio = 1 / (1 + Math.exp(-((i / buckets) - 0.45) * 8))
      series.push({
        x: `${Math.round(i * step)}m`,
        y: totalGmv * ratio,
      })
    }
    return {
      ...baseDarkOption,
      grid: { left: 56, right: 24, top: 24, bottom: 36 },
      tooltip: {
        ...baseDarkOption.tooltip,
        trigger: 'axis',
        valueFormatter: (v) => `¥${(Number(v) / 1e4).toFixed(1)} 万`,
      },
      xAxis: {
        type: 'category',
        data: series.map((p) => p.x),
        boundaryGap: false,
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
          name: 'GMV 累积',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#a855f7', width: 2 },
          areaStyle: { color: pulseFlameGradient },
          data: series.map((p) => p.y),
        },
      ],
    }
  }, [detail])

  const productsCols: TableProps<LiveStreamProduct>['columns'] = useMemo(
    () => [
      {
        title: '#',
        dataIndex: 'product_id',
        key: 'product_id',
        width: 80,
        render: (pid: number) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
            P-{String(pid).padStart(5, '0')}
          </span>
        ),
      },
      {
        title: 'PRODUCT',
        dataIndex: 'product_name',
        key: 'product_name',
        render: (_v, row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={gradientImage(row.image_seed || `lp-${row.product_id}`, row.brand ?? '商品')}
              alt={row.product_name}
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                objectFit: 'cover',
                border: '1px solid var(--hairline-soft)',
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-1)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 320,
                }}
              >
                {row.product_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{row.brand ?? '—'}</div>
            </div>
          </div>
        ),
      },
      {
        title: 'PRICE',
        dataIndex: 'price',
        key: 'price',
        width: 110,
        align: 'right',
        render: (n: number) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            ¥{Number(n).toFixed(2)}
          </span>
        ),
      },
      {
        title: 'SOLD QTY',
        dataIndex: 'sold_qty',
        key: 'sold_qty',
        width: 110,
        align: 'right',
        render: (n: number) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {n.toLocaleString('en-US')}
          </span>
        ),
      },
      {
        title: 'SOLD GMV',
        dataIndex: 'sold_gmv',
        key: 'sold_gmv',
        width: 140,
        align: 'right',
        render: (n: number) => (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: 'var(--accent-pulse)',
            }}
          >
            ¥{(Number(n) / 1e4).toFixed(2)}{' '}
            <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>万</span>
          </span>
        ),
      },
    ],
    [],
  )

  if (loading && !detail) {
    return (
      <div>
        <PageHero
          eyebrow={`LIVESTREAM · L-${id ?? '???'}`}
          title="LOADING..."
          description="正在拉取直播间详情"
        />
      </div>
    )
  }

  if (!detail) {
    return (
      <div>
        <PageHero
          eyebrow={`LIVESTREAM · L-${id ?? '???'}`}
          title="NOT FOUND"
          description="未找到这场直播。它可能已被归档或 ID 错误。"
        />
        <Empty description="直播间不存在" />
        <div style={{ marginTop: 16 }}>
          <Link to="/app/livestreams" style={{ color: 'var(--accent-pulse)' }}>
            ← 返回列表
          </Link>
        </div>
      </div>
    )
  }

  const durationMin = detail.duration_min ?? 0
  const peak = detail.peak_audience ?? 0
  const gmvYi = (Number(detail.gmv) ?? 0) / 1e8
  const gmvW = (Number(detail.gmv) ?? 0) / 1e4
  const conv = (detail.conversion_rate ?? 0) * 100
  const products = detail.products ?? []

  return (
    <div>
      <PageHero
        eyebrow={`LIVESTREAM · L-${String(detail.id).padStart(5, '0')}`}
        title={detail.title}
        description={
          <span>
            <span style={{ marginRight: 8 }}>开播于 {dayjs(detail.start_at).format('YYYY-MM-DD HH:mm')}</span>
            · 主播 {detail.anchor_name ?? '未知'}
          </span>
        }
        right={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <PlatformBadge platform={detail.platform} />
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KpiTile
          eyebrow="K-01 · DURATION"
          value={durationMin}
          unit="min"
          accent="pulse"
          index={1}
          hint="直播总时长"
        />
        <KpiTile
          eyebrow="K-02 · PEAK AUDIENCE"
          value={peak}
          unit="人"
          accent="pulse"
          index={2}
          hint="同时在线峰值"
        />
        <KpiTile
          eyebrow="K-03 · GMV"
          value={gmvYi >= 1 ? gmvYi : gmvW}
          decimals={2}
          unit={gmvYi >= 1 ? '亿' : '万'}
          prefix="¥"
          accent="pulse"
          index={3}
          hint="总成交"
        />
        <KpiTile
          eyebrow="K-04 · CONV. RATE"
          value={conv}
          decimals={2}
          unit="%"
          accent={conv >= 5 ? 'lime' : 'pulse'}
          index={4}
          hint="平均转化率"
        />
      </div>

      {/* Row 2 — cum curve + anchor card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
          gap: 24,
          marginBottom: 24,
        }}
      >
        <ChartCard
          eyebrow="CHART · LSD-01"
          title="GMV CUMULATIVE CURVE"
          option={cumOption}
          height={320}
        />
        <ElectricBorder
          color="#a855f7"
          speed={0.6}
          chaos={0.18}
          borderRadius={14}
          style={{ width: '100%' }}
        >
          <div
            style={{
              padding: 28,
              background: 'var(--ink-850)',
              border: '1px solid var(--hairline-soft)',
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              alignItems: 'center',
              textAlign: 'center',
              height: '100%',
            }}
          >
            <div
              className="u-eyebrow"
              style={{ color: 'var(--text-3)', letterSpacing: 1.8 }}
            >
              ANCHOR · CARD
            </div>
            <AnchorAvatar
              seed={detail.anchor_avatar_seed || `a-${detail.anchor_id}`}
              initial={detail.anchor_name?.[0]}
              size={96}
              status="live"
            />
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--text-1)',
              }}
            >
              {detail.anchor_name ?? '匿名主播'}
            </div>
            <PlatformBadge platform={detail.platform} variant="cn" />
            <div
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginTop: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-2)',
              }}
            >
              <Cell label="START" value={dayjs(detail.start_at).format('MM-DD HH:mm')} />
              <Cell label="DURATION" value={`${durationMin} min`} />
            </div>
            <Link
              to={`/app/anchors/${detail.anchor_id}`}
              style={{
                marginTop: 8,
                color: 'var(--accent-pulse)',
                fontFamily: 'var(--font-display)',
                fontSize: 11,
                letterSpacing: 1.4,
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              VIEW ANCHOR →
            </Link>
          </div>
        </ElectricBorder>
      </div>

      {/* Row 3 — products table */}
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
          }}
        >
          <div>
            <div
              className="u-eyebrow"
              style={{ color: 'var(--text-3)', fontSize: 10, marginBottom: 8 }}
            >
              PRODUCTS · ON-AIR CATALOG
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
              已上架商品 · {products.length} ITEMS
            </h3>
          </div>
        </header>
        <Table<LiveStreamProduct>
          rowKey={(r) => `${r.product_id}-${r.id}`}
          dataSource={products}
          columns={productsCols}
          pagination={false}
          locale={{ emptyText: <Empty description="该直播未上架商品" /> }}
          style={{ marginTop: 12 }}
        />
      </section>
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--ink-800)',
        border: '1px solid var(--hairline-soft)',
        borderRadius: 6,
        padding: '6px 10px',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: 1.4,
          color: 'var(--text-4)',
          textTransform: 'uppercase',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ color: 'var(--text-1)' }}>{value}</div>
    </div>
  )
}
