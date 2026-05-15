/* ============================================================
   P12 / /app/me/history — BROWSE HISTORY
   PAGES_SPEC.md §P12
   按日期 group 的时间线 + 横向滚动的 ProductCard 行
   ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { Empty, Spin, message } from 'antd'
import dayjs from 'dayjs'
import PageHero from '@/components/PageHero'
import ProductCard from '@/components/ProductCard'
import { meApi, productApi } from '@/api/services'
import type { BrowseHistoryItem } from '@/api/types'

export default function HistoryPage() {
  const [items, setItems] = useState<BrowseHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    meApi
      .browseHistory()
      .then((r) => alive && setItems(r.data ?? []))
      .catch((err) => {
        console.error(err)
        message.error('浏览历史加载失败')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, BrowseHistoryItem[]> = {}
    for (const it of items) {
      const day = dayjs(it.viewed_at).format('YYYY-MM-DD')
      if (!map[day]) map[day] = []
      map[day].push(it)
    }
    return Object.entries(map).sort(([a], [b]) => (a > b ? -1 : 1))
  }, [items])

  const handleFavorite = async (productId: number, _next: boolean) => {
    await productApi.toggleFavorite(productId)
  }

  return (
    <div>
      <PageHero
        eyebrow="07·ME · M-02"
        title="BROWSE HISTORY"
        description="按日期分组的最近 50 条商品浏览记录。每一组横向滚动查看更多。"
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
        <Empty description="还没有浏览记录" style={{ padding: 96 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {grouped.map(([day, list]) => (
            <DaySection key={day} day={day} items={list} onFavorite={handleFavorite} />
          ))}
        </div>
      )}
    </div>
  )
}

function DaySection({
  day,
  items,
  onFavorite,
}: {
  day: string
  items: BrowseHistoryItem[]
  onFavorite: (id: number, next: boolean) => Promise<void>
}) {
  const isToday = day === dayjs().format('YYYY-MM-DD')
  const isYesterday = day === dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  const human = isToday ? 'TODAY' : isYesterday ? 'YESTERDAY' : dayjs(day).format('MMM DD · ddd').toUpperCase()
  return (
    <section>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: '1px solid var(--hairline-soft)',
        }}
      >
        <div
          className="u-eyebrow"
          style={{
            fontSize: 11,
            letterSpacing: 1.8,
            color: 'var(--accent-pulse)',
            fontWeight: 600,
          }}
        >
          {human}
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-4)',
          }}
        >
          {day}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-3)',
          }}
        >
          {items.length} 条
        </span>
      </header>
      <div
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 8,
          scrollSnapType: 'x mandatory',
        }}
      >
        {items.map((p) => (
          <div
            key={`${p.id}-${p.viewed_at}`}
            style={{
              flex: '0 0 220px',
              scrollSnapAlign: 'start',
              position: 'relative',
            }}
          >
            <ProductCard product={p} onFavorite={onFavorite} />
            <div
              style={{
                marginTop: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-4)',
                letterSpacing: 0.6,
              }}
            >
              {dayjs(p.viewed_at).format('HH:mm')} · 浏览
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
