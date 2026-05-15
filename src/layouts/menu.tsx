import type { MenuProps } from 'antd'
import {
  CrownOutlined,
  DotChartOutlined,
  ExperimentOutlined,
  FireOutlined,
  HeartOutlined,
  HistoryOutlined,
  RadarChartOutlined,
  RiseOutlined,
  ShoppingOutlined,
  StarOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'

export const menuItems: NonNullable<MenuProps['items']> = [
  {
    type: 'group',
    label: '01 · OVERVIEW',
    children: [
      { key: '/app/overview', label: 'CONTROL', icon: <RadarChartOutlined /> },
    ],
  },
  {
    type: 'group',
    label: '02 · CATEGORY',
    children: [
      { key: '/app/categories/heatmap', label: 'HEATMAP', icon: <FireOutlined /> },
      { key: '/app/categories/growth', label: 'GROWTH', icon: <RiseOutlined /> },
    ],
  },
  {
    type: 'group',
    label: '03 · LIVE',
    children: [
      { key: '/app/livestreams', label: 'STREAMS', icon: <VideoCameraOutlined /> },
    ],
  },
  {
    type: 'group',
    label: '04 · ANCHOR',
    children: [
      { key: '/app/anchors', label: 'LEADERBOARD', icon: <CrownOutlined /> },
    ],
  },
  {
    type: 'group',
    label: '05 · PRODUCT',
    children: [
      { key: '/app/products', label: 'CATALOG', icon: <ShoppingOutlined /> },
    ],
  },
  {
    type: 'group',
    label: '06 · INTEL',
    children: [
      { key: '/app/predict', label: 'PREDICT', icon: <ExperimentOutlined /> },
      { key: '/app/wordcloud', label: 'WORDCLOUD', icon: <DotChartOutlined /> },
    ],
  },
  {
    type: 'group',
    label: '07 · ME',
    children: [
      { key: '/app/me/favorites', label: 'FAVORITES', icon: <HeartOutlined /> },
      { key: '/app/me/history', label: 'HISTORY', icon: <HistoryOutlined /> },
      { key: '/app/me/recommend', label: 'RECOMMEND', icon: <StarOutlined /> },
      { key: '/app/me/account', label: 'ACCOUNT', icon: <UserOutlined /> },
    ],
  },
]

export const titleMap: Record<string, string> = {
  '/app/overview': 'CONTROL',
  '/app/categories/heatmap': 'HEATMAP',
  '/app/categories/growth': 'GROWTH',
  '/app/livestreams': 'STREAMS',
  '/app/anchors': 'LEADERBOARD',
  '/app/products': 'CATALOG',
  '/app/predict': 'PREDICT',
  '/app/wordcloud': 'WORDCLOUD',
  '/app/me/favorites': 'FAVORITES',
  '/app/me/history': 'HISTORY',
  '/app/me/recommend': 'RECOMMEND',
  '/app/me/account': 'ACCOUNT',
}
