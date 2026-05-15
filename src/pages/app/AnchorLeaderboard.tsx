/* ============================================================
   P06 / /app/anchors — ANCHOR LEAGUE
   PAGES_SPEC.md §P06
   Row 1 TOP 3 podium (TiltedCard, single heavy effect)
   Row 2 TOP 50 表格
   ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table, message } from 'antd'
import type { TableProps } from 'antd'
import PageHero from '@/components/PageHero'
import AnchorAvatar from '@/components/AnchorAvatar'
import PlatformBadge from '@/components/PlatformBadge'
import TiltedCard from '@/components/TiltedCard'
import { anchorApi } from '@/api/services'
import type { AnchorLeaderboardItem } from '@/api/types'
import { gradientImage } from '@/lib/placeholder'

const PODIUM_ACCENT = ['#a855f7', '#0ea5e9', '#fbbf24'] as const

export default function AnchorLeaderboardPage() {
  const [items, setItems] = useState<AnchorLeaderboardItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    anchorApi
      .leaderboard()
      .then((r) => alive && setItems(r.data ?? []))
      .catch((err) => {
        console.error(err)
        message.error('主播榜数据加载失败')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const top3 = useMemo(() => items.slice(0, 3), [items])
  const rest = useMemo(() => items.slice(0, 50), [items])

  const columns: TableProps<AnchorLeaderboardItem>['columns'] = useMemo(
    () => [
      {
        title: '#',
        dataIndex: 'rank',
        key: 'rank',
        width: 70,
        render: (rank: number) => (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color:
                rank <= 3
                  ? PODIUM_ACCENT[rank - 1]
                  : 'var(--text-2)',
              fontWeight: rank <= 3 ? 700 : 500,
            }}
          >
            #{String(rank).padStart(2, '0')}
          </span>
        ),
      },
      {
        title: 'ANCHOR',
        dataIndex: 'nickname',
        key: 'nickname',
        render: (_v, row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AnchorAvatar
              seed={row.avatar_seed || `a-${row.id}`}
              initial={row.nickname?.[0]}
              size={40}
            />
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-1)',
                  marginBottom: 2,
                }}
              >
                {row.nickname}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>ID · {row.id}</div>
            </div>
          </div>
        ),
      },
      {
        title: 'PLATFORM',
        dataIndex: 'platform',
        key: 'platform',
        width: 130,
        render: (p) => <PlatformBadge platform={p} />,
      },
      {
        title: 'FANS',
        dataIndex: 'fans',
        key: 'fans',
        width: 120,
        align: 'right',
        render: (n: number) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {(n / 1e4).toFixed(1)}{' '}
            <span style={{ color: 'var(--text-3)' }}>万</span>
          </span>
        ),
      },
      {
        title: 'AVG GMV',
        dataIndex: 'avg_gmv',
        key: 'avg_gmv',
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
            ¥{(Number(n) / 1e4).toFixed(1)}{' '}
            <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>万</span>
          </span>
        ),
      },
      {
        title: 'RETURN RATE',
        dataIndex: 'return_rate',
        key: 'return_rate',
        width: 130,
        align: 'right',
        render: (n: number) => (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: n > 0.1 ? '#fda4af' : '#bef264',
            }}
          >
            {(Number(n) * 100).toFixed(2)}%
          </span>
        ),
      },
      {
        title: 'ACTION',
        key: 'op',
        width: 100,
        align: 'right',
        render: (_v, row) => (
          <Link
            to={`/app/anchors/${row.id}`}
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
        eyebrow="04·ANCHOR · A-LB"
        title="ANCHOR LEAGUE"
        description="按 avg_gmv 排名的 TOP 50 主播榜单。前三甲使用 3D Tilted 卡片展示——这是本页唯一的 heavy 装饰。"
      />

      {/* Row 1 — Podium */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 24,
          marginBottom: 32,
        }}
      >
        {top3.map((a, i) => (
          <PodiumCard key={a.id} anchor={a} rank={i + 1} />
        ))}
        {top3.length < 3 && (
          <div
            style={{
              gridColumn: `span ${3 - top3.length}`,
              opacity: 0.4,
              padding: 24,
              border: '1px dashed var(--hairline-strong)',
              borderRadius: 12,
              color: 'var(--text-3)',
              fontFamily: 'var(--font-display)',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            数据加载中
          </div>
        )}
      </div>

      {/* Row 2 — Table */}
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
              FULL LEAGUE
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
              TOP 50 ANCHORS
            </h3>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-3)',
              letterSpacing: 0.8,
            }}
          >
            {rest.length} / {items.length}
          </span>
        </header>
        <Table<AnchorLeaderboardItem>
          rowKey="id"
          loading={loading}
          dataSource={rest}
          columns={columns}
          pagination={false}
          scroll={{ y: 480 }}
        />
      </section>
    </div>
  )
}

function PodiumCard({ anchor, rank }: { anchor: AnchorLeaderboardItem; rank: number }) {
  const accent = PODIUM_ACCENT[rank - 1]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TiltedCard
        imageSrc={gradientImage(
          anchor.avatar_seed || `a-${anchor.id}`,
          `#${rank}`,
        )}
        altText={anchor.nickname}
        containerHeight="320px"
        containerWidth="100%"
        imageHeight="320px"
        imageWidth="100%"
        rotateAmplitude={10}
        scaleOnHover={1.04}
        showMobileWarning={false}
        showTooltip={false}
        displayOverlayContent
        overlayContent={
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 22,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                className="u-eyebrow-bright"
                style={{
                  fontSize: 11,
                  letterSpacing: 1.6,
                  color: accent,
                  background: 'rgba(0,0,0,0.4)',
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: `1px solid ${accent}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                RANK · {String(rank).padStart(2, '0')}
              </span>
              <PlatformBadge platform={anchor.platform} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  color: '#fff',
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  textShadow: '0 4px 24px rgba(0,0,0,0.6)',
                }}
              >
                {anchor.nickname}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  gap: 16,
                  alignItems: 'baseline',
                  fontFamily: 'var(--font-display)',
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#fff',
                    fontFeatureSettings: '"tnum"',
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: '0 4px 24px rgba(0,0,0,0.55)',
                  }}
                >
                  ¥{(Number(anchor.avg_gmv) / 1e4).toFixed(1)}
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginLeft: 4 }}>
                    万 / 场
                  </span>
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                  {(anchor.fans / 1e4).toFixed(0)} 万粉丝
                </span>
              </div>
            </div>
          </div>
        }
      />
      <Link
        to={`/app/anchors/${anchor.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--text-2)',
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        <span>VIEW PROFILE</span>
        <span style={{ color: accent }}>→</span>
      </Link>
    </div>
  )
}
