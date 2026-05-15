/* ============================================================
   <ProductCard>
   ----------------------------------------------------------------
   商品卡 — 1:1 占位图 + 品牌 + 名称 + 价格 + 收藏按钮 + rating
   hover: hairline-soft → hairline-strong, no shadow
   spec 来源: PAGES_SPEC.md §共享组件 4
   ============================================================ */
import { useState, type CSSProperties, type MouseEvent } from 'react'
import { HeartFilled, HeartOutlined, StarFilled } from '@ant-design/icons'
import { App as AntdApp } from 'antd'
import type { Product } from '@/api/types'
import { gradientImage } from '@/lib/placeholder'

export interface ProductCardProps {
  product: Product
  /** 收藏切换回调，应该调 productApi.toggleFavorite */
  onFavorite?: (id: number, next: boolean) => Promise<void> | void
  /** 点击主体（一般跳到详情或打开详情面板） */
  onClick?: (p: Product) => void
  /** override 角色，比如商品详情侧栏可以传 small */
  size?: 'sm' | 'md'
  /** 自定义额外角标，例如排名 */
  badge?: string
  /** 外层 style */
  style?: CSSProperties
}

export default function ProductCard({
  product,
  onFavorite,
  onClick,
  size = 'md',
  badge,
  style,
}: ProductCardProps) {
  const { message } = AntdApp.useApp()
  const [hover, setHover] = useState(false)
  const [favLocal, setFavLocal] = useState<boolean>(Boolean(product.favorited))
  const [busy, setBusy] = useState(false)

  const seed = product.image_seed || `p-${product.id}`
  const label = product.category_name || product.brand || ''
  const img = gradientImage(seed, label)

  const padding = size === 'sm' ? 14 : 16

  const handleFav = async (e: MouseEvent) => {
    e.stopPropagation()
    if (busy || !onFavorite) return
    setBusy(true)
    try {
      const next = !favLocal
      setFavLocal(next)
      await onFavorite(product.id, next)
    } catch (err: unknown) {
      setFavLocal((v) => !v)
      message.error('收藏操作失败')
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  const formatPrice = (n: number) =>
    n.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onClick?.(product)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--ink-850)',
        border: `1px solid ${
          hover ? 'var(--hairline-strong)' : 'var(--hairline-soft)'
        }`,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .2s ease, transform .2s ease',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        ...style,
      }}
    >
      {/* image */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          background: 'var(--ink-800)',
          overflow: 'hidden',
        }}
      >
        <img
          src={img}
          alt={product.name}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform .3s ease',
            transform: hover ? 'scale(1.04)' : 'scale(1)',
          }}
        />
        {badge && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(10,10,13,0.75)',
              border: '1px solid var(--hairline-strong)',
              backdropFilter: 'blur(8px)',
              fontFamily: 'var(--font-display)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: 'var(--text-1)',
            }}
          >
            {badge}
          </span>
        )}
        {onFavorite && (
          <button
            type="button"
            onClick={handleFav}
            disabled={busy}
            aria-label={favLocal ? '取消收藏' : '收藏'}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(10,10,13,0.75)',
              border: '1px solid var(--hairline-strong)',
              backdropFilter: 'blur(8px)',
              color: favLocal ? '#f43f5e' : 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all .2s ease',
            }}
          >
            {favLocal ? <HeartFilled /> : <HeartOutlined />}
          </button>
        )}
      </div>

      {/* meta */}
      <div
        style={{
          padding,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flex: 1,
        }}
      >
        <div
          className="u-eyebrow"
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            color: 'var(--text-4)',
          }}
        >
          {product.brand || '—'}
        </div>
        <h4
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.4,
            color: 'var(--text-1)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 39,
          }}
        >
          {product.name}
        </h4>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 8,
            paddingTop: 8,
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
                fontSize: 20,
                fontFeatureSettings: '"tnum"',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatPrice(Number(product.price ?? 0))}
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
            <StarFilled style={{ color: '#fbbf24', fontSize: 11 }} />
            {Number(product.rating ?? 0).toFixed(1)}
          </div>
        </div>
      </div>
    </article>
  )
}
