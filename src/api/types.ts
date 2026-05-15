/* ============================================================
   TaoTrend Live — shared TypeScript types
   Source of truth: DESIGN.md §3 (models) + §4 (API)
   ============================================================ */

export type Platform = 'taobao' | 'douyin' | 'pdd'

/* ---------- Auth ---------- */
export interface UserMe {
  code: number
  user_id?: string
  user_name?: string
  avatar_seed?: string
  msg?: string
}

/* ---------- Domain models ---------- */
export interface Category {
  id: number
  name: string
  parent_id: number | null
  icon_glyph: string
  children?: Category[]
}

export interface Anchor {
  id: number
  nickname: string
  platform: Platform
  fans: number
  avg_gmv: number
  return_rate: number
  avatar_seed: string
  total_streams?: number
  total_gmv?: number
}

export interface Product {
  id: number
  name: string
  category: number
  category_name?: string
  brand: string
  price: number
  sales: number
  rating: number
  image_seed: string
  favorited?: boolean
  created_at?: string
}

export interface LiveStream {
  id: number
  anchor_id: number
  anchor_name?: string
  anchor_avatar_seed?: string
  title: string
  platform: Platform
  start_at: string
  duration_min: number
  peak_audience: number
  gmv: number
  conversion_rate: number
}

export interface LiveStreamProduct {
  id: number
  product_id: number
  product_name: string
  brand?: string
  price: number
  sold_qty: number
  sold_gmv: number
  image_seed?: string
}

/* ---------- Dashboard ---------- */
export interface DashboardOverview {
  code: number
  total_gmv: number
  total_anchors: number
  total_products: number
  total_streams: number
  yoy_gmv?: number
  yoy_streams?: number
}

export interface GmvTrendPoint {
  date: string
  gmv: number
}

export interface GmvTrendResponse {
  code: number
  data: GmvTrendPoint[]
}

export interface PieDatum {
  name: string
  value: number
}

export interface PieResponse {
  code: number
  data: PieDatum[]
}

/* ---------- Category analytics ---------- */
export interface CategoryListResponse {
  code: number
  data: Category[]
}

export interface CategoryHeatmapCell {
  hour: number
  category: string
  value: number
}

export interface CategoryHeatmapResponse {
  code: number
  hours: number[]
  categories: string[]
  data: [number, number, number][] // [x, y, value]
}

export interface CategoryGrowthItem {
  category: string
  gmv: number
  growth: number
  rank_change?: number
}

export interface CategoryGrowthResponse {
  code: number
  data: CategoryGrowthItem[]
}

/* ---------- LiveStream / Anchor ---------- */
export interface LiveStreamListResponse {
  code: number
  count: number
  data: LiveStream[]
}

export interface LiveStreamDetail extends LiveStream {
  products: LiveStreamProduct[]
}

export interface LiveStreamDetailResponse {
  code: number
  data: LiveStreamDetail
}

export interface AnchorListResponse {
  code: number
  count: number
  data: Anchor[]
}

export interface AnchorLeaderboardItem extends Anchor {
  rank: number
  total_gmv: number
  total_streams: number
}

export interface AnchorLeaderboardResponse {
  code: number
  data: AnchorLeaderboardItem[]
}

export interface AnchorDetailResponse {
  code: number
  data: Anchor
  recent_streams: LiveStream[]
}

/* ---------- Product ---------- */
export interface ProductListResponse {
  code: number
  count: number
  data: Product[]
}

export interface ProductDetailResponse {
  code: number
  data: Product
  recent_streams?: LiveStream[]
}

export interface ToggleFavoriteResponse {
  code: number
  msg?: string
  favorited: boolean
}

/* ---------- Me / Personalized ---------- */
export interface MeListResponse {
  code: number
  count: number
  data: Product[]
}

export interface BrowseHistoryItem extends Product {
  viewed_at: string
}

export interface BrowseHistoryResponse {
  code: number
  count: number
  data: BrowseHistoryItem[]
}

export interface RecommendResponse {
  code: number
  data: Product[]
  reason?: string
}

/* ---------- Intel ---------- */
export interface SalesPredictResponse {
  code: number
  msg?: string
  avg?: number
  median?: number
  max?: number
  min?: number
  count?: number
  percentile?: number
  dist?: PieDatum[]
}

export interface WordCloudItem {
  name: string
  value: number
}

export interface WordCloudResponse {
  code: number
  data: WordCloudItem[]
}
