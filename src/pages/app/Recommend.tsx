/* ============================================================
   P13 / /app/me/recommend — BUILT FOR YOU
   PAGES_SPEC.md §P13
   9 张 SpotlightCard 网格，3 列。单页唯一 heavy 装饰。
   ============================================================ */
import { useEffect, useState } from 'react'
import { Empty, Spin, message } from 'antd'
import { HeartFilled, HeartOutlined, StarFilled } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import PageHero from '@/components/PageHero'
import SpotlightCard from '@/components/SpotlightCard'
import { meApi, productApi } from '@/api/services'
import type { RecommendedProduct, UserProfile } from '@/api/types'
import { gradientImage } from '@/lib/placeholder'

export default function RecommendPage() {
  const [items, setItems] = useState<RecommendedProduct[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [reason, setReason] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [profileResult, recommendResult] = await Promise.all([
        meApi.profile(),
        meApi.recommendExplain(),
      ])
      setProfile(profileResult.data ?? null)
      setItems(recommendResult.data ?? [])
      setReason(recommendResult.reason ?? '')
    } catch (err) {
      console.error(err)
      message.error('推荐结果加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div>
      <PageHero
        eyebrow="07·ME · M-03"
        title="BUILT FOR YOU"
        description={
          reason ||
          '基于你近期收藏与浏览，由 item-based 协同过滤算法生成个性化推荐，并解释每件商品的命中原因。'
        }
      />

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 96,
          }}
        >
          <Spin size="large" />
        </div>
      ) : items.length === 0 ? (
        <Empty
          description={
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'var(--text-3)' }}>暂时没有推荐 — 多收藏几件商品再来试试</span>
              <Link
                to="/app/products"
                style={{
                  color: 'var(--accent-pulse)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                去发现 →
              </Link>
            </div>
          }
          style={{ padding: 96 }}
        />
      ) : (
        <>
          {profile && <ProfilePanel profile={profile} />}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {items.map((p, i) => (
              <SpotlightProductCard key={p.id} product={p} rank={i + 1} onChange={load} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ProfilePanel({ profile }: { profile: UserProfile }) {
  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.35fr) minmax(260px, 0.65fr)',
        gap: 20,
        padding: 24,
        marginBottom: 24,
        background: 'var(--ink-850)',
        border: '1px solid var(--hairline-soft)',
        borderRadius: 12,
      }}
    >
      <div>
        <div className="u-eyebrow" style={{ color: 'var(--text-3)', fontSize: 10, marginBottom: 16 }}>
          PROFILE · PREFERENCE SIGNALS
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {(profile.top_categories ?? []).slice(0, 4).map((cat) => (
            <div key={cat.category_id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 7,
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  color: 'var(--text-2)',
                }}
              >
                <span>
                  {cat.icon_glyph ?? '✦'} {cat.category_name}
                </span>
                <span style={{ color: 'var(--accent-pulse)' }}>
                  {(cat.weight * 100).toFixed(1)}%
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(8, cat.weight * 100)}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #a855f7, #0ea5e9)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        <ProfileMetric label="FAVORITES" value={profile.favorite_count} />
        <ProfileMetric label="VIEWS" value={profile.browse_count} />
        <ProfileMetric label="AVG PRICE" value={`¥${Number(profile.price_range?.avg ?? 0).toFixed(0)}`} />
        <ProfileMetric label="BRANDS" value={profile.top_brands?.length ?? 0} />
      </div>
    </section>
  )
}

function ProfileMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        padding: 16,
        background: 'var(--ink-800)',
        border: '1px solid var(--hairline-soft)',
        borderRadius: 10,
      }}
    >
      <div className="u-eyebrow" style={{ fontSize: 9, color: 'var(--text-4)', marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text-1)',
          fontFeatureSettings: '"tnum"',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function SpotlightProductCard({
  product,
  rank,
  onChange,
}: {
  product: RecommendedProduct
  rank: number
  onChange: () => void
}) {
  const [favLocal, setFavLocal] = useState(Boolean(product.favorited))
  const [busy, setBusy] = useState(false)

  const handleFav = async () => {
    if (busy) return
    setBusy(true)
    try {
      setFavLocal((v) => !v)
      await productApi.toggleFavorite(product.id)
      onChange()
    } catch (err) {
      console.error(err)
      setFavLocal((v) => !v)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SpotlightCard
      spotlightColor="rgba(168, 85, 247, 0.35)"
      className="!bg-[var(--ink-850)] !border-[var(--hairline-soft)] !rounded-xl !p-0"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: 20,
          gap: 14,
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
            className="u-eyebrow"
            style={{
              fontSize: 10,
              color: 'var(--accent-pulse)',
              fontWeight: 600,
              letterSpacing: 1.6,
            }}
          >
            REC · #{String(rank).padStart(2, '0')}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: product.strategy === 'cf' ? 'var(--accent-pulse)' : 'var(--text-4)',
            }}
          >
            {strategyLabel(product.strategy)}
          </span>
        </div>

        <div
          style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--ink-800)',
            border: '1px solid var(--hairline-soft)',
          }}
        >
          <img
            src={gradientImage(product.image_seed || `r-${product.id}`, product.brand ?? '商品')}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>

        <div>
          <div
            className="u-eyebrow"
            style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 4 }}
          >
            {product.brand || '—'}
          </div>
          <h4
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-1)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.name}
          </h4>
          {product.reason && (
            <p
              style={{
                margin: '10px 0 0',
                minHeight: 38,
                color: 'var(--text-3)',
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              {product.reason}
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 2,
              fontFamily: 'var(--font-display)',
              color: 'var(--accent-pulse)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.8 }}>¥</span>
            <span
              style={{
                fontSize: 22,
                fontFeatureSettings: '"tnum"',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Number(product.price ?? 0).toFixed(2)}
            </span>
          </div>
          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-3)',
            }}
          >
            <span>
              <StarFilled style={{ color: '#fbbf24', marginRight: 4 }} />
              {Number(product.rating ?? 0).toFixed(1)}
            </span>
            {typeof product.score === 'number' && (
              <span style={{ color: 'var(--text-4)', fontSize: 10 }}>
                SCORE {product.score.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleFav}
          disabled={busy}
          style={{
            marginTop: 4,
            padding: '10px 16px',
            borderRadius: 999,
            border: `1px solid ${favLocal ? 'var(--accent-flame)' : 'var(--accent-pulse)'}`,
            background: favLocal ? 'rgba(244,63,94,0.12)' : 'rgba(168,85,247,0.10)',
            color: favLocal ? 'var(--accent-flame)' : 'var(--accent-pulse)',
            fontFamily: 'var(--font-display)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            cursor: busy ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all .2s ease',
          }}
        >
          {favLocal ? (
            <>
              <HeartFilled /> SAVED
            </>
          ) : (
            <>
              <HeartOutlined /> ADD TO FAVORITES
            </>
          )}
        </button>
      </div>
    </SpotlightCard>
  )
}

function strategyLabel(strategy?: string) {
  if (strategy === 'cf') return 'ITEM-CF'
  if (strategy === 'history') return 'HISTORY'
  if (strategy === 'hot') return 'HOT'
  return 'RECOMMEND'
}
