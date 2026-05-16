import { useEffect, useMemo, useState } from 'react'
import { Button, Empty, Table, message } from 'antd'
import type { TableProps } from 'antd'
import { HeartFilled, HeartOutlined } from '@ant-design/icons'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import type { EChartsOption } from 'echarts'
import PageHero from '@/components/PageHero'
import KpiTile from '@/components/KpiTile'
import ChartCard from '@/components/ChartCard'
import ProductCard from '@/components/ProductCard'
import PlatformBadge from '@/components/PlatformBadge'
import { baseDarkOption, darkAxis, pulseFlameGradient } from '@/lib/chart'
import { gradientImage } from '@/lib/placeholder'
import { productApi } from '@/api/services'
import type { ProductDetail, ProductLiveRecord, RecommendedProduct } from '@/api/types'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const r = await productApi.detail(id)
      setProduct(r.data)
    } catch (err) {
      console.error(err)
      message.error('商品详情加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const liveOption: EChartsOption = useMemo(() => {
    const lives = product?.recent_lives ?? []
    return {
      ...baseDarkOption,
      grid: { left: 56, right: 24, top: 24, bottom: 48 },
      tooltip: { ...baseDarkOption.tooltip, trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: lives.map((l) => dayjs(l.start_at).format('MM-DD')),
        ...darkAxis(),
      },
      yAxis: {
        type: 'value',
        ...darkAxis(),
        axisLabel: { ...darkAxis().axisLabel, formatter: (v: number) => `${(v / 1e4).toFixed(0)}万` },
      },
      series: [
        {
          name: '成交 GMV',
          type: 'line',
          smooth: true,
          data: lives.map((l) => l.sold_gmv),
          lineStyle: { color: '#a855f7', width: 2 },
          itemStyle: { color: '#a855f7' },
          areaStyle: { color: pulseFlameGradient },
        },
      ],
    }
  }, [product])

  const columns: TableProps<ProductLiveRecord>['columns'] = [
    {
      title: '直播间',
      dataIndex: 'title',
      render: (title, row) => (
        <Link to={`/app/livestreams/${row.id || row.live_id}`} style={{ color: 'var(--text-1)' }}>
          {title}
        </Link>
      ),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      width: 120,
      render: (p) => <PlatformBadge platform={p} />,
    },
    {
      title: '主播',
      dataIndex: 'anchor_name',
      width: 140,
      render: (name, row) => row.anchor_id ? (
        <Link to={`/app/anchors/${row.anchor_id}`} style={{ color: 'var(--accent-pulse)' }}>
          {name}
        </Link>
      ) : name,
    },
    {
      title: '销量',
      dataIndex: 'sold_qty',
      align: 'right',
      width: 110,
      render: (v) => Number(v).toLocaleString(),
    },
    {
      title: 'GMV',
      dataIndex: 'sold_gmv',
      align: 'right',
      width: 130,
      render: (v) => `¥${(Number(v) / 1e4).toFixed(1)} 万`,
    },
    {
      title: '开播',
      dataIndex: 'start_at',
      width: 150,
      render: (v) => dayjs(v).format('MM-DD HH:mm'),
    },
  ]

  const handleFavorite = async () => {
    if (!product || busy) return
    setBusy(true)
    try {
      const r = await productApi.toggleFavorite(product.id)
      setProduct({ ...product, favorited: Boolean(r.favorited) })
      message.success(r.msg ?? '操作成功')
    } catch (err) {
      console.error(err)
      message.error('收藏操作失败')
    } finally {
      setBusy(false)
    }
  }

  if (!product && !loading) {
    return (
      <div>
        <PageHero eyebrow={`PRODUCT · P-${id ?? '???'}`} title="NOT FOUND" description="未找到该商品" />
        <Empty description="商品不存在或已下架" />
      </div>
    )
  }

  return (
    <div>
      <PageHero
        eyebrow={product ? `${product.brand || 'BRAND'} · ${product.category_name ?? 'CATEGORY'}` : 'LOADING'}
        title={product?.name ?? '...'}
        description="商品详情连接直播间、主播、相似商品与收藏行为，用于判断商品投放和合作价值。"
        right={
          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={() => nav(-1)}>BACK</Button>
            {product && (
              <Button
                type={product.favorited ? 'default' : 'primary'}
                icon={product.favorited ? <HeartFilled /> : <HeartOutlined />}
                loading={busy}
                onClick={handleFavorite}
              >
                {product.favorited ? 'SAVED' : 'SAVE'}
              </Button>
            )}
          </div>
        }
      />

      {product && (
        <>
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 360px) minmax(0, 1fr)',
              gap: 24,
              marginBottom: 24,
            }}
          >
            <img
              src={gradientImage(product.image_seed || `p-${product.id}`, product.brand)}
              alt={product.name}
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                objectFit: 'cover',
                borderRadius: 12,
                border: '1px solid var(--hairline-soft)',
              }}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: 16,
                alignContent: 'start',
              }}
            >
              <KpiTile eyebrow="P-01 · PRICE" value={Number(product.price)} decimals={2} prefix="¥" accent="pulse" index={1} hint="当前售价" />
              <KpiTile eyebrow="P-02 · SALES" value={product.sales ?? 0} unit="件" accent="lime" index={2} hint="累计销量" />
              <KpiTile eyebrow="P-03 · LIVE" value={product.live_count ?? 0} unit="场" accent="cyan" index={3} hint="关联直播" />
              <KpiTile eyebrow="P-04 · LIVE GMV" value={(product.total_sold_gmv ?? 0) / 1e4} decimals={1} prefix="¥" unit="万" accent="pulse" index={4} hint="直播成交" />
              <KpiTile eyebrow="P-05 · FAVORITES" value={product.fav_count ?? 0} unit="人" accent="flame" index={5} hint="收藏人数" />
              <KpiTile eyebrow="P-06 · RATING" value={product.rating ?? 0} decimals={1} unit="/5" accent="pulse" index={6} hint="商品评分" />
            </div>
          </section>

          <ChartCard
            eyebrow="PRODUCT · LIVE GMV"
            title="RECENT LIVESTREAM SALES"
            option={liveOption}
            height={300}
            loading={loading}
            style={{ marginBottom: 24 }}
          />

          <section
            style={{
              background: 'var(--ink-850)',
              border: '1px solid var(--hairline-soft)',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <div className="u-eyebrow" style={{ color: 'var(--text-3)', fontSize: 10, marginBottom: 16 }}>
              RELATED · LIVESTREAMS
            </div>
            <Table<ProductLiveRecord>
              rowKey={(row) => String(row.id || row.live_id)}
              dataSource={product.recent_lives ?? []}
              columns={columns}
              pagination={false}
              locale={{ emptyText: <Empty description="暂无关联直播" /> }}
            />
          </section>

          <section>
            <div className="u-eyebrow" style={{ color: 'var(--text-3)', fontSize: 10, marginBottom: 16 }}>
              SIMILAR · PRODUCTS
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 18,
              }}
            >
              {(product.similar_products ?? []).map((p: RecommendedProduct) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  badge={p.score != null ? `SCORE ${p.score.toFixed(1)}` : undefined}
                  onClick={(item) => nav(`/app/products/${item.id}`)}
                  onFavorite={async (pid) => {
                    await productApi.toggleFavorite(pid)
                  }}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
