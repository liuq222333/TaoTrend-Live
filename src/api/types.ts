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
  fav_count?: number
  live_count?: number
  total_sold_qty?: number
  total_sold_gmv?: number
}

export type RecommendationStrategy = 'cf' | 'history' | 'hot' | string

export type RecommendationReasonType =
  | 'similar_favorite'
  | 'same_category'
  | 'hot_in_category'
  | 'browse_history'
  | 'global_hot'
  | string

export interface RecommendedProduct extends Product {
  score?: number
  strategy?: RecommendationStrategy
  reason_type?: RecommendationReasonType
  reason?: string
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

export interface ProductLiveRecord {
  id: number
  live_id?: number
  title: string
  platform: Platform
  anchor_id?: number
  anchor_name?: string
  start_at: string
  sold_qty: number
  sold_gmv: number
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

export interface CategoryOpportunity {
  category_id: number
  category_name: string
  icon_glyph?: string
  gmv: number
  growth_rate: number
  avg_price: number
  stream_count: number
  anchor_count: number
  competition_index: number
  conversion_rate: number
  opportunity_score: number
  reason: string
}

export interface CategoryOpportunityResponse {
  code: number
  data: CategoryOpportunity[]
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

export interface AnchorRiskProfile {
  anchor_id: number
  risk_score: number
  risk_level: 'high' | 'medium' | 'low'
  return_rate_rank: number
  conversion_rank: number
  gmv_stability: number
  recent_stream_count: number
  avg_conversion_rate?: number
  risk_reasons: string[]
  suggestions: string[]
}

export interface AnchorRiskProfileResponse {
  code: number
  data: AnchorRiskProfile
}

export interface MonitorSummary {
  alert_count: number
  high_risk_count: number
  opportunity_count: number
  category_signal_count: number
}

export interface MonitorSummaryResponse {
  code: number
  data: MonitorSummary
}

export type MonitorAlertType =
  | 'gmv_spike'
  | 'high_conversion'
  | 'low_efficiency'
  | 'return_risk'
  | 'category_growth'
  | string

export interface MonitorAlert {
  id: string
  type: MonitorAlertType
  level: 'high' | 'medium' | 'low'
  title: string
  message: string
  target_type: 'livestream' | 'anchor' | 'category'
  target_id: number
  metric: number
  created_at?: string
}

export interface MonitorAlertsResponse {
  code: number
  data: MonitorAlert[]
}

export interface MonitorLiveSpike extends LiveStream {
  spike_ratio: number
  signal: string
}

export interface MonitorLiveSpikesResponse {
  code: number
  data: MonitorLiveSpike[]
}

export interface MonitorRiskAnchor extends Anchor, AnchorRiskProfile {
  risk_reasons: string[]
}

export interface MonitorRiskAnchorsResponse {
  code: number
  data: MonitorRiskAnchor[]
}

/* ---------- Product ---------- */
export interface ProductListResponse {
  code: number
  count: number
  data: Product[]
}

export interface ProductDetail extends Product {
  recent_lives?: ProductLiveRecord[]
  similar_products?: RecommendedProduct[]
}

export interface ProductDetailResponse {
  code: number
  data: ProductDetail
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
  count?: number
  data: Product[]
  reason?: string
}

export interface UserProfileCategory {
  category_id: number
  category_name: string
  icon_glyph?: string
  weight: number
  score: number
}

export interface UserProfileBrand {
  brand: string
  count: number
}

export interface UserProfilePlatform {
  platform: Platform | 'unknown'
  count: number
  gmv: number
}

export interface UserProfile {
  favorite_count: number
  browse_count: number
  top_categories: UserProfileCategory[]
  price_range: {
    min: number
    max: number
    avg: number
  }
  top_brands: UserProfileBrand[]
  platform_share: UserProfilePlatform[]
}

export interface UserProfileResponse {
  code: number
  data: UserProfile
}

export interface RecommendExplainResponse {
  code: number
  count: number
  data: RecommendedProduct[]
  reason?: string
  strategies?: Record<string, number>
}

/* ---------- Intel ---------- */
export interface SalesPredictDriver {
  name: string
  impact: number
  direction: 'positive' | 'negative'
  text: string
}

export interface SalesPredictResponse {
  code: number
  msg?: string
  avg?: number
  median?: number
  max?: number
  min?: number
  count?: number
  percentile?: number
  percentile_ratio?: number
  dist?: PieDatum[]
  predicted_sales?: number
  predicted_gmv?: number
  confidence?: number
  drivers?: SalesPredictDriver[]
  suggestions?: string[]
  sample_summary?: {
    avg_price?: number | null
    avg_duration?: number | null
    avg_fans?: number | null
  }
}

export interface WordCloudItem {
  name: string
  value: number
}

export interface WordCloudResponse {
  code: number
  data: WordCloudItem[]
}
