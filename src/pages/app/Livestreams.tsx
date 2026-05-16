/* ============================================================
   P04 / /app/livestreams — LIVESTREAM LOG
   PAGES_SPEC.md §P04
   sticky filter bar + AntD Table (server pagination).
   ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Select, Table, message } from 'antd'
import type { TableProps } from 'antd'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import PageHero from '@/components/PageHero'
import AnchorAvatar from '@/components/AnchorAvatar'
import PlatformBadge from '@/components/PlatformBadge'
import { exportUrl, livestreamApi } from '@/api/services'
import type { LiveStream, Platform } from '@/api/types'

const PAGE_SIZE_OPTS = ['10', '20', '50']

export default function LivestreamsPage() {
  const [data, setData] = useState<LiveStream[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState('start_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    livestreamApi
      .list({ platform, keyword, sort_by: sortBy, sort_order: sortOrder, page, limit: pageSize })
      .then((r) => {
        if (!alive) return
        setData(r.data ?? [])
        setTotal(r.count ?? 0)
      })
      .catch((err) => {
        console.error(err)
        message.error('直播间列表加载失败')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [platform, page, pageSize, keyword, sortBy, sortOrder])

  const exportLivestreams = () => {
    const params = new URLSearchParams()
    if (platform) params.set('platform', platform)
    if (keyword) params.set('keyword', keyword)
    params.set('sort_by', sortBy)
    params.set('sort_order', sortOrder)
    window.open(`${exportUrl('livestreams')}?${params.toString()}`, '_blank')
  }

  const columns: TableProps<LiveStream>['columns'] = useMemo(
    () => [
      {
        title: '#',
        dataIndex: 'id',
        key: 'id',
        width: 80,
        render: (id: number) => (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-3)',
            }}
          >
            L-{String(id).padStart(5, '0')}
          </span>
        ),
      },
      {
        title: 'TITLE',
        dataIndex: 'title',
        key: 'title',
        render: (_v, row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AnchorAvatar
              seed={row.anchor_avatar_seed || `anchor-${row.anchor_id}`}
              initial={row.anchor_name?.[0]}
              size={40}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-1)',
                  marginBottom: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 380,
                }}
              >
                {row.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-3)',
                  letterSpacing: 0.6,
                }}
              >
                {row.anchor_name ?? '匿名主播'}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'PLATFORM',
        dataIndex: 'platform',
        key: 'platform',
        width: 130,
        render: (p: Platform) => <PlatformBadge platform={p} />,
      },
      {
        title: 'START',
        dataIndex: 'start_at',
        key: 'start_at',
        width: 170,
        render: (t: string) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>
            {dayjs(t).format('MM-DD HH:mm')}
          </span>
        ),
      },
      {
        title: 'DURATION',
        dataIndex: 'duration_min',
        key: 'duration_min',
        width: 110,
        align: 'right',
        render: (n: number) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {n} <span style={{ color: 'var(--text-3)' }}>min</span>
          </span>
        ),
      },
      {
        title: 'PEAK AUD.',
        dataIndex: 'peak_audience',
        key: 'peak_audience',
        width: 120,
        align: 'right',
        render: (n: number) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {n.toLocaleString('en-US')}
          </span>
        ),
      },
      {
        title: 'GMV',
        dataIndex: 'gmv',
        key: 'gmv',
        width: 140,
        align: 'right',
        render: (n: number) => (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: 'var(--accent-pulse)',
              fontFeatureSettings: '"tnum"',
              fontVariantNumeric: 'tabular-nums',
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
        key: 'conversion_rate',
        width: 100,
        align: 'right',
        render: (n: number) => (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: n >= 0.05 ? '#bef264' : 'var(--text-2)',
            }}
          >
            {(Number(n) * 100).toFixed(2)}%
          </span>
        ),
      },
      {
        title: 'ACTION',
        key: 'op',
        width: 90,
        align: 'right',
        render: (_v, row) => (
          <Link
            to={`/app/livestreams/${row.id}`}
            style={{
              color: 'var(--accent-pulse)',
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              letterSpacing: 1.2,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            DETAIL →
          </Link>
        ),
      },
    ],
    [],
  )

  return (
    <div>
      <PageHero
        eyebrow="03·LIVE · L-01"
        title="LIVESTREAM LOG"
        description="5,000 场直播间记录 · 支持按平台、关键词检索。点击 DETAIL 进入单场详情查看商品交易明细。"
      />

      {/* Sticky filter bar */}
      <div
        style={{
          position: 'sticky',
          top: 64,
          zIndex: 5,
          marginBottom: 16,
          padding: '12px 16px',
          background: 'rgba(16,16,21,0.78)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          border: '1px solid var(--hairline-soft)',
          borderRadius: 10,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span
          className="u-eyebrow"
          style={{ color: 'var(--text-3)', marginRight: 4 }}
        >
          FILTER
        </span>
        <Select
          allowClear
          placeholder="平台"
          value={platform || undefined}
          onChange={(v) => {
            setPlatform((v as Platform) ?? '')
            setPage(1)
          }}
          options={[
            { label: '淘宝 · TAOBAO', value: 'taobao' },
            { label: '抖音 · DOUYIN', value: 'douyin' },
            { label: '拼多多 · PDD', value: 'pdd' },
          ]}
          style={{ width: 180 }}
        />
        <Input
          allowClear
          placeholder="搜索标题 / 主播昵称"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value)
            setPage(1)
          }}
          style={{ width: 280 }}
        />
        <Select
          value={sortBy}
          onChange={(v) => {
            setSortBy(v)
            setPage(1)
          }}
          options={[
            { label: '开播时间', value: 'start_at' },
            { label: 'GMV', value: 'gmv' },
            { label: '转化率', value: 'conversion_rate' },
            { label: '峰值观众', value: 'peak_audience' },
          ]}
          style={{ width: 140 }}
        />
        <Select
          value={sortOrder}
          onChange={(v) => {
            setSortOrder(v)
            setPage(1)
          }}
          options={[
            { label: '降序', value: 'desc' },
            { label: '升序', value: 'asc' },
          ]}
          style={{ width: 100 }}
        />
        <Button icon={<DownloadOutlined />} onClick={exportLivestreams}>
          EXPORT
        </Button>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-3)',
          }}
        >
          <span>{total.toLocaleString()}</span>
          <span style={{ letterSpacing: 1.4 }}>STREAMS</span>
        </div>
      </div>

      <Table<LiveStream>
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        size="middle"
        rowClassName={() => 'tt-tall-row'}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTS,
          showTotal: (t, range) => `${range[0]}-${range[1]} / 共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
        style={{
          background: 'var(--ink-850)',
          border: '1px solid var(--hairline-soft)',
          borderRadius: 10,
          padding: '0 4px',
        }}
      />
      <style>{`
        .tt-tall-row > td { padding-top: 14px !important; padding-bottom: 14px !important; }
      `}</style>
    </div>
  )
}
