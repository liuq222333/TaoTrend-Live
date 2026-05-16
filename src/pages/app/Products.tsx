/* ============================================================
   P08 / /app/products — PRODUCT VAULT
   PAGES_SPEC.md §P08
   左侧 240px CategoryTree + 右侧 ProductCard 网格
   ============================================================ */
import { useEffect, useMemo, useState } from 'react'
import { Button, Empty, InputNumber, Pagination, Select, Spin, Tree, message } from 'antd'
import type { TreeDataNode } from 'antd'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHero from '@/components/PageHero'
import ProductCard from '@/components/ProductCard'
import GlareHover from '@/components/GlareHover'
import { categoryApi, exportUrl, productApi } from '@/api/services'
import type { Category, Product } from '@/api/types'

export default function ProductsPage() {
  const nav = useNavigate()
  const [tree, setTree] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [category, setCategory] = useState<number | ''>('')
  const [brand, setBrand] = useState('')
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [minSales, setMinSales] = useState<number | ''>('')
  const [minRating, setMinRating] = useState<number | ''>('')
  const [sortBy, setSortBy] = useState('sales')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(false)

  // load tree once
  useEffect(() => {
    let alive = true
    categoryApi
      .list()
      .then((r) => alive && setTree(r.data ?? []))
      .catch((err) => {
        console.error(err)
        message.error('品类树加载失败')
      })
    return () => {
      alive = false
    }
  }, [])

  // load products on filter change
  useEffect(() => {
    let alive = true
    setLoading(true)
    productApi
      .list({
        keyword,
        brand,
        category,
        min_price: minPrice,
        max_price: maxPrice,
        min_sales: minSales,
        min_rating: minRating,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit: pageSize,
      })
      .then((r) => {
        if (!alive) return
        setProducts(r.data ?? [])
        setTotal(r.count ?? 0)
      })
      .catch((err) => {
        console.error(err)
        message.error('商品列表加载失败')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [keyword, brand, category, minPrice, maxPrice, minSales, minRating, sortBy, sortOrder, page, pageSize])

  const treeData = useMemo<TreeDataNode[]>(() => categoriesToTree(tree), [tree])

  const handleFavorite = async (productId: number, _next: boolean) => {
    await productApi.toggleFavorite(productId)
  }

  const handleSearch = () => {
    setKeyword(keywordInput.trim())
    setPage(1)
  }

  const exportProducts = () => {
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (brand) params.set('brand', brand)
    if (category !== '') params.set('category', String(category))
    if (minPrice !== '') params.set('min_price', String(minPrice))
    if (maxPrice !== '') params.set('max_price', String(maxPrice))
    if (minSales !== '') params.set('min_sales', String(minSales))
    if (minRating !== '') params.set('min_rating', String(minRating))
    params.set('sort_by', sortBy)
    params.set('sort_order', sortOrder)
    window.open(`${exportUrl('products')}?${params.toString()}`, '_blank')
  }

  return (
    <div>
      <PageHero
        eyebrow="05·PRODUCT · P-01"
        title="PRODUCT VAULT"
        description="25,000 件商品 · 支持关键词、品类与价格筛选。点击卡片右上角的心形按钮可即刻加入个人收藏。"
        extra={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                position: 'relative',
                flex: '1 1 360px',
                maxWidth: 560,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px 8px 16px',
                height: 50,
                background: 'var(--ink-850)',
                border: '1px solid var(--hairline-strong)',
                borderRadius: 999,
              }}
            >
              <SearchOutlined style={{ color: 'var(--text-3)', fontSize: 16 }} />
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索商品名 · 品牌 · 关键词"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--text-1)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  letterSpacing: '-0.01em',
                }}
              />
              <button
                type="button"
                onClick={handleSearch}
                style={{
                  padding: '6px 16px',
                  borderRadius: 999,
                  border: 'none',
                  background: 'var(--accent-pulse)',
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                SEARCH
              </button>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-3)',
                letterSpacing: 0.8,
              }}
            >
              {total.toLocaleString()} 件 · 页 {page}
            </div>
            <Button icon={<DownloadOutlined />} onClick={exportProducts}>
              EXPORT
            </Button>
          </div>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 240px) minmax(0, 1fr)',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* CategoryTree */}
        <aside
          style={{
            background: 'var(--ink-850)',
            border: '1px solid var(--hairline-soft)',
            borderRadius: 12,
            padding: 20,
            position: 'sticky',
            top: 88,
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
          }}
        >
          <div
            className="u-eyebrow"
            style={{
              color: 'var(--text-3)',
              fontSize: 10,
              letterSpacing: 1.8,
              marginBottom: 12,
            }}
          >
            CATEGORY
          </div>
          <div
            onClick={() => {
              setCategory('')
              setPage(1)
            }}
            style={{
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: 6,
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 500,
              color: category === '' ? 'var(--accent-pulse)' : 'var(--text-2)',
              background: category === '' ? 'rgba(168,85,247,0.10)' : 'transparent',
              marginBottom: 8,
              letterSpacing: 0.8,
            }}
          >
            ALL · 全部
          </div>
          <Tree
            treeData={treeData}
            selectable
            selectedKeys={category === '' ? [] : [String(category)]}
            onSelect={(keys) => {
              const k = keys[0]
              if (k != null) {
                setCategory(Number(k))
                setPage(1)
              }
            }}
            defaultExpandAll
            blockNode
            style={{ background: 'transparent', fontSize: 12 }}
          />
        </aside>

        {/* Product Grid */}
        <main>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
              marginBottom: 16,
              padding: 16,
              background: 'rgba(16,16,21,0.78)',
              border: '1px solid var(--hairline-soft)',
              borderRadius: 10,
            }}
          >
            <input
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value)
                setPage(1)
              }}
              placeholder="品牌"
              style={{
                height: 32,
                borderRadius: 6,
                border: '1px solid var(--hairline-soft)',
                background: 'var(--ink-800)',
                color: 'var(--text-1)',
                padding: '0 10px',
              }}
            />
            <InputNumber placeholder="最低价" min={0} value={minPrice || undefined} onChange={(v) => { setMinPrice(v ?? ''); setPage(1) }} />
            <InputNumber placeholder="最高价" min={0} value={maxPrice || undefined} onChange={(v) => { setMaxPrice(v ?? ''); setPage(1) }} />
            <InputNumber placeholder="最低销量" min={0} value={minSales || undefined} onChange={(v) => { setMinSales(v ?? ''); setPage(1) }} />
            <InputNumber placeholder="最低评分" min={0} max={5} step={0.1} value={minRating || undefined} onChange={(v) => { setMinRating(v ?? ''); setPage(1) }} />
            <Select
              value={sortBy}
              onChange={(v) => setSortBy(v)}
              options={[
                { label: '销量排序', value: 'sales' },
                { label: '价格排序', value: 'price' },
                { label: '评分排序', value: 'rating' },
                { label: '上架时间', value: 'created_at' },
              ]}
            />
            <Select
              value={sortOrder}
              onChange={(v) => setSortOrder(v)}
              options={[
                { label: '降序', value: 'desc' },
                { label: '升序', value: 'asc' },
              ]}
            />
          </div>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 80,
              }}
            >
              <Spin size="large" />
            </div>
          ) : products.length === 0 ? (
            <Empty
              description="没有匹配的商品"
              style={{ padding: 80 }}
            />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 20,
                marginBottom: 24,
              }}
            >
              {products.map((p) => (
                <GlareHover
                  key={p.id}
                  width="100%"
                  height="auto"
                  background="transparent"
                  borderColor="transparent"
                  borderRadius="12px"
                  glareColor="#ffffff"
                  glareOpacity={0.12}
                  glareSize={180}
                  transitionDuration={650}
                  style={{ display: 'block' }}
                >
                  <ProductCard
                    product={p}
                    onFavorite={handleFavorite}
                    onClick={(item) => nav(`/app/products/${item.id}`)}
                  />
                </GlareHover>
              ))}
            </div>
          )}

          {total > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: 16,
                borderTop: '1px solid var(--hairline-soft)',
              }}
            >
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                pageSizeOptions={['12', '20', '40', '60']}
                showTotal={(t, range) => `${range[0]}-${range[1]} / 共 ${t} 件`}
                onChange={(p, ps) => {
                  setPage(p)
                  setPageSize(ps)
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function categoriesToTree(cats: Category[]): TreeDataNode[] {
  return cats.map((c) => ({
    key: String(c.id),
    title: (
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          letterSpacing: 0.6,
          color: 'inherit',
        }}
      >
        {c.icon_glyph ?? '✦'} {c.name}
      </span>
    ),
    children: c.children?.length ? categoriesToTree(c.children) : undefined,
  }))
}
