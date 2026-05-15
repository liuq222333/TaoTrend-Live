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
import type { Product } from '@/api/types'
import { gradientImage } from '@/lib/placeholder'

export default function RecommendPage() {
  const [items, setItems] = useState<Product[]>([])
  const [reason, setReason] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await meApi.recommend()
      setItems(r.data ?? [])
      setReason(r.reason ?? '')
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
          '基于你近期收藏与浏览，由 item-based 协同过滤算法生成的 9 件个性化推荐——每张卡片随鼠标产生光斑。'
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
      )}
    </div>
  )
}

function SpotlightProductCard({
  product,
  rank,
  onChange,
}: {
  product: Product
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
              color: 'var(--text-4)',
            }}
          >
            ITEM-CF
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
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-3)',
            }}
          >
            <StarFilled style={{ color: '#fbbf24' }} />
            {Number(product.rating ?? 0).toFixed(1)}
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
