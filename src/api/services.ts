import { http } from './client'
import type {
  AnchorDetailResponse,
  AnchorLeaderboardResponse,
  AnchorListResponse,
  BrowseHistoryResponse,
  CategoryGrowthResponse,
  CategoryHeatmapResponse,
  CategoryListResponse,
  DashboardOverview,
  GmvTrendResponse,
  LiveStreamDetailResponse,
  LiveStreamListResponse,
  MeListResponse,
  PieResponse,
  Platform,
  ProductDetailResponse,
  ProductListResponse,
  RecommendResponse,
  SalesPredictResponse,
  ToggleFavoriteResponse,
  UserMe,
  WordCloudResponse,
} from './types'

/* ---------- 4.1 Auth (5) ---------- */
export const authApi = {
  login: (user: string, password: string) =>
    http.post<UserMe>('/auth/login/', { user, password }).then((r) => r.data),
  register: (user: string, password: string, user_name: string) =>
    http
      .post<UserMe>('/auth/register/', { user, password, user_name })
      .then((r) => r.data),
  logout: () => http.post<UserMe>('/auth/logout/').then((r) => r.data),
  me: () => http.get<UserMe>('/auth/me/').then((r) => r.data),
  update: (user_name: string, old_pass: string, pass_word: string) =>
    http
      .post<UserMe>('/auth/update/', { user_name, old_pass, pass_word })
      .then((r) => r.data),
}

/* ---------- 4.2 Dashboard (4) ---------- */
export const dashboardApi = {
  overview: () => http.get<DashboardOverview>('/dashboard/overview/').then((r) => r.data),
  gmvTrend: () => http.get<GmvTrendResponse>('/dashboard/gmv_trend/').then((r) => r.data),
  platformShare: () =>
    http.get<PieResponse>('/dashboard/platform_share/').then((r) => r.data),
  categoryShare: () =>
    http.get<PieResponse>('/dashboard/category_share/').then((r) => r.data),
}

/* ---------- 4.3 Category (3) ---------- */
export const categoryApi = {
  list: () => http.get<CategoryListResponse>('/category/list/').then((r) => r.data),
  heatmap: () =>
    http.get<CategoryHeatmapResponse>('/category/heatmap/').then((r) => r.data),
  topGrowth: () =>
    http.get<CategoryGrowthResponse>('/category/top_growth/').then((r) => r.data),
}

/* ---------- 4.4 LiveStream & Anchor (4) ---------- */
export const livestreamApi = {
  list: (params: { platform?: Platform | ''; page: number; limit: number }) =>
    http
      .get<LiveStreamListResponse>('/livestream/list/', { params })
      .then((r) => r.data),
  detail: (id: number | string) =>
    http.get<LiveStreamDetailResponse>(`/livestream/${id}/`).then((r) => r.data),
}

export const anchorApi = {
  list: (params: { platform?: Platform | ''; page: number; limit: number }) =>
    http.get<AnchorListResponse>('/anchor/list/', { params }).then((r) => r.data),
  detail: (id: number | string) =>
    http.get<AnchorDetailResponse>(`/anchor/${id}/`).then((r) => r.data),
  leaderboard: () =>
    http.get<AnchorLeaderboardResponse>('/anchor/leaderboard/').then((r) => r.data),
}

/* ---------- 4.5 Product (3) ---------- */
export const productApi = {
  list: (params: {
    keyword?: string
    category?: number | ''
    min_price?: number | ''
    max_price?: number | ''
    page: number
    limit: number
  }) =>
    http.get<ProductListResponse>('/product/list/', { params }).then((r) => r.data),
  detail: (id: number | string) =>
    http.get<ProductDetailResponse>(`/product/${id}/`).then((r) => r.data),
  toggleFavorite: (product_id: number) =>
    http
      .post<ToggleFavoriteResponse>('/product/toggle_favorite/', { product_id })
      .then((r) => r.data),
}

/* ---------- 4.6 Me / Personalized (3) ---------- */
export const meApi = {
  favorites: () => http.get<MeListResponse>('/me/favorites/').then((r) => r.data),
  browseHistory: () =>
    http.get<BrowseHistoryResponse>('/me/browse_history/').then((r) => r.data),
  recommend: () => http.get<RecommendResponse>('/me/recommend/').then((r) => r.data),
}

/* ---------- 4.7 Intel (2) ---------- */
export const intelApi = {
  salesPredict: (params: {
    category?: number | ''
    price?: number | ''
    anchor_tier?: string
    duration?: number | ''
  }) =>
    http
      .get<SalesPredictResponse>('/intel/sales_predict/', { params })
      .then((r) => r.data),
  wordcloud: () => http.get<WordCloudResponse>('/intel/wordcloud/').then((r) => r.data),
}

/* ---------- 4.8 Export (1) ---------- */
export const exportUrl = () => `${http.defaults.baseURL}/export/products.csv`
