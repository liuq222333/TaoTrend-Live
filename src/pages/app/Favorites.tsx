/* ============================================================
   P11 / /app/me/favorites — SAVED ITEMS
   PAGES_SPEC.md §P11
   ============================================================ */
import { useEffect, useState } from 'react'
import { Empty, Spin, message } from 'antd'
import { Link } from 'react-router-dom'
import PageHero from '@/components/PageHero'
import ProductCard from '@/components/ProductCard'
import { meApi, productApi } from '@/api/services'
import type { Product } from '@/api/types'

export default function FavoritesPage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await meApi.favorites()
      setItems(r.data ?? [])
    } catch (err) {
      console.error(err)
      message.error('收藏列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleFavorite = async (productId: number, _next: boolean) => {
    await productApi.toggleFavorite(productId)
    // 立刻 reload
    void load()
  }

  return (
    <div>
      <PageHero
        eyebrow="07·ME · M-01"
        title={`${items.length} SAVED ITEMS`}
        description="你收藏的商品列表。推荐引擎正以此为锚点训练你的偏好画像——收藏得越多，推荐越准。"
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
                gap: 16,
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'var(--text-3)' }}>暂无收藏</span>
              <Link
                to="/app/products"
                style={{
                  display: 'inline-block',
                  padding: '8px 20px',
                  borderRadius: 999,
                  border: '1px solid var(--accent-pulse)',
                  color: 'var(--accent-pulse)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  letterSpacing: 1.4,
                  fontWeight: 600,
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 20,
          }}
        >
          {items.map((p) => (
            <ProductCard
              key={p.id}
              product={{ ...p, favorited: true }}
              onFavorite={handleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
