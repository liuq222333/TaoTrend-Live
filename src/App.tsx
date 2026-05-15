import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider, App as AntdApp, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'

import { AuthProvider } from '@/auth/AuthContext'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'

import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'

import OverviewPage from '@/pages/app/Overview'
import CategoryHeatmapPage from '@/pages/app/CategoryHeatmap'
import CategoryGrowthPage from '@/pages/app/CategoryGrowth'
import LivestreamsPage from '@/pages/app/Livestreams'
import LivestreamDetailPage from '@/pages/app/LivestreamDetail'
import AnchorLeaderboardPage from '@/pages/app/AnchorLeaderboard'
import AnchorDetailPage from '@/pages/app/AnchorDetail'
import ProductsPage from '@/pages/app/Products'
import SalesPredictPage from '@/pages/app/SalesPredict'
import WordcloudPage from '@/pages/app/Wordcloud'
import FavoritesPage from '@/pages/app/Favorites'
import HistoryPage from '@/pages/app/History'
import RecommendPage from '@/pages/app/Recommend'
import AccountPage from '@/pages/app/Account'

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#a855f7',
          colorInfo: '#0ea5e9',
          colorSuccess: '#84cc16',
          colorWarning: '#fbbf24',
          colorError: '#f43f5e',
          colorBgBase: '#0a0a0d',
          colorBgContainer: '#11111a',
          colorBgElevated: '#16161f',
          colorBgLayout: '#0a0a0d',
          colorText: '#f5f5f7',
          colorTextSecondary: '#a1a1aa',
          colorBorder: '#2a2a36',
          colorBorderSecondary: '#1f1f28',
          borderRadius: 6,
          borderRadiusLG: 10,
          borderRadiusSM: 4,
          fontFamily:
            "'Inter Tight', system-ui, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
          fontSize: 14,
          wireframe: false,
        },
        components: {
          Button: {
            borderRadius: 9999,
            controlHeight: 40,
            controlHeightLG: 48,
            fontWeight: 600,
          },
          Card: { borderRadiusLG: 10 },
          Table: {
            headerBg: '#11111a',
            headerColor: '#a1a1aa',
            rowHoverBg: '#16161f',
            borderColor: '#1f1f28',
          },
          Input: {
            activeBorderColor: '#a855f7',
            hoverBorderColor: '#7e22ce',
            activeShadow: '0 0 0 2px rgba(168,85,247,0.18)',
          },
          Select: {
            optionSelectedBg: 'rgba(168,85,247,0.18)',
            optionSelectedColor: '#ffffff',
          },
          Menu: {
            darkItemSelectedBg: 'rgba(168,85,247,0.18)',
            darkItemSelectedColor: '#ffffff',
            darkItemHoverBg: 'rgba(255,255,255,0.04)',
          },
          Tabs: {
            inkBarColor: '#a855f7',
            itemActiveColor: '#ffffff',
            itemHoverColor: '#ffffff',
            itemSelectedColor: '#ffffff',
          },
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<OverviewPage />} />
                <Route path="categories/heatmap" element={<CategoryHeatmapPage />} />
                <Route path="categories/growth" element={<CategoryGrowthPage />} />
                <Route path="livestreams" element={<LivestreamsPage />} />
                <Route path="livestreams/:id" element={<LivestreamDetailPage />} />
                <Route path="anchors" element={<AnchorLeaderboardPage />} />
                <Route path="anchors/:id" element={<AnchorDetailPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="predict" element={<SalesPredictPage />} />
                <Route path="wordcloud" element={<WordcloudPage />} />
                <Route path="me/favorites" element={<FavoritesPage />} />
                <Route path="me/history" element={<HistoryPage />} />
                <Route path="me/recommend" element={<RecommendPage />} />
                <Route path="me/account" element={<AccountPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}
