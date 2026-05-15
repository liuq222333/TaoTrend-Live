# TaoTrend Live · 淘潮

> **实时电商直播趋势分析与商品智能推荐平台** —— 前后端分离的企业级毕设项目。

聚合**淘宝 / 抖音 / 拼多多**三平台的直播 GMV、主播表现、品类趋势与商品数据。提供：

- 实时大盘 · 24h × 8 品类 GMV 热度图 · 主播榜单 · 商品库 · 词云
- **协同过滤推荐**（item-based · 余弦相似度，三层 fallback：CF → 浏览历史 → 全库热门）
- **销量预测**（按品类 / 价格 / 主播粉丝段 / 直播时长统计 + 百分位分析）
- 视觉风格：**Apple 克制 × Cyberpunk 调性**（pulse 紫 + flame 粉 + cyan 三色 accent，发丝线分隔，17px body + uppercase D-DIN 风格 display）

---

## 截图

> 占位 — 第一次本地启动后请补一张 `docs/screenshot-landing.png` + `docs/screenshot-overview.png`。

---

## 系统架构

```
┌──────────────────────────────┐          ┌──────────────────────────────┐
│  Vite + React 19 (TS)        │  Cookie  │  Django 4 + DRF-style JSON   │
│  AntD 6 (dark) + ECharts 6   │ ───────▶ │  + django-cors-headers       │
│  react-bits × 11 装饰组件     │ ◀─────── │  + PyMySQL                   │
│  React Router 7              │   JSON   │  Session-based 鉴权          │
│  端口 5181                    │          │  端口 8001                    │
└──────────────────────────────┘          └──────────────┬───────────────┘
                                                          │
                                                          ▼
                                          ┌──────────────────────────────┐
                                          │  MySQL 8 · 数据库 `taotrend`  │
                                          │  Category × 40                │
                                          │  Anchor × 200                 │
                                          │  Product × 25 000             │
                                          │  LiveStream × 5 000           │
                                          │  LiveStreamProduct × 35 340   │
                                          │  UserAccount × 31             │
                                          │  FavoriteList × 389           │
                                          │  BrowseLog × 794              │
                                          └──────────────────────────────┘
```

---

## 技术栈

| 层 | 选型 | 备注 |
|---|------|------|
| 后端 | Django 4.2 + PyMySQL + django-cors-headers | 端口 **8001** |
| 数据库 | MySQL 8 / utf8mb4_unicode_ci | 数据库名 `taotrend` |
| 鉴权 | Django session + 自定义 UserAccount 表 | session cookie + `SameSite=Lax` |
| 前端框架 | React 19 + TypeScript 6 + Vite 8 | 端口 **5181**，`/api` proxy 到 8001 |
| UI 库 | Ant Design 6（dark algorithm） | 主色 pulse `#a855f7` |
| 样式 | Tailwind v4 + 自定义 `@theme` | 保留原 cyberpunk 调色板 |
| 图表 | ECharts 6 + echarts-for-react + echarts-wordcloud | 暗色主题 `src/lib/chart.ts` |
| 装饰组件 | [react-bits](https://reactbits.dev) × 11 | Aurora · SplitText · CountUp · GlitchText · MagicBento · TiltedCard · SpotlightCard · ElectricBorder · GlareHover · ScrollVelocity · SplashCursor |
| 路由 | React Router 7 | landing `/` 公开 + `/app/*` 鉴权 |
| 网络 | axios（withCredentials + 401 拦截） | |

---

## 一键启动

```bash
# 1) 启 MySQL（本机已装），密码 root
# 2) 后端
cd server
./start.sh        # 自动建库 + venv + migrate + 生成 25K mock + augment seed + runserver 8001

# 3) 前端（新 shell）
cd taotrend-live
npm install --legacy-peer-deps
npm run dev       # http://localhost:5181
```

打开 **http://localhost:5181** 看 Landing。点 SIGN IN，登录 `test001 / 123456` 进入 `/app/overview`。

---

## 页面树

```
/                            Landing（cyberpunk 营销页，原 demo 保留）
/login                       登录（Aurora 玻璃卡）
/register                    注册
/app                         ProtectedRoute · 业务主区
  /overview                  控制台：4 KPI + GMV 趋势 + 平台/品类占比
  /categories
    /heatmap                 24h × 8 品类热度图
    /growth                  品类增长榜
  /livestreams               直播间列表（平台/关键词筛选）
    /:id                     直播间详情：GMV 累积 + 主播卡（ElectricBorder） + 上架商品
  /anchors                   主播榜：TOP 3 颁奖台（TiltedCard） + TOP 50 表
    /:id                     主播详情：粉丝/退货率/avg GMV + 30 天趋势 + 近 10 场
  /products                  商品库：Apple pill 搜索 + 品类树 + GlareHover 网格
  /predict                   销量预测：6 KPI + 分布 bar + 百分位 gauge
  /wordcloud                 商品词云
  /me
    /favorites               我的收藏（35 件）
    /history                 浏览历史（50 条，按日 group）
    /recommend               推荐（9 张 SpotlightCard，item-CF）
    /account                 改密
```

---

## 后端 API（22 个）

全部 `/api/` 前缀，JSON：

```
auth/         login · register · logout · me · update
dashboard/    overview · gmv_trend · platform_share · category_share
category/     list · heatmap · top_growth
livestream/   list · <id>
anchor/       list · leaderboard · <id>
product/      list · <id> · toggle_favorite
me/           favorites · browse_history · recommend
intel/        sales_predict · wordcloud
export/       products.csv
```

详见 `DESIGN.md` §4，`server/core/api.py` 提供完整实现，`server/core/recommend.py` 为推荐引擎。

---

## 项目结构

```
taotrend-live/
├── DESIGN.md                # 架构设计（业务/技术栈/数据模型/API/算法）
├── PAGES_SPEC.md            # 14 业务页视觉/交互规范（Apple × Cyberpunk）
├── README.md                # 本文件
├── package.json             # 前端
├── vite.config.ts
├── public/
├── src/                     # React 前端
│   ├── api/                 # axios + 22 端点强类型方法
│   ├── auth/                # AuthContext / ProtectedRoute
│   ├── components/          # 6 自建 + 11 react-bits
│   ├── layouts/             # AppLayout · LandingLayout · menu
│   ├── lib/                 # chart 暗色主题 · placeholder
│   ├── pages/
│   │   ├── Landing.tsx      # cyberpunk 营销页（拆自原 App.tsx）
│   │   ├── Login.tsx / Register.tsx
│   │   └── app/             # 14 业务页
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css            # Tailwind v4 @theme + AntD dark 覆写
└── server/                  # Django 后端
    ├── manage.py
    ├── requirements.txt
    ├── start.sh             # 一键启动
    ├── taotrend/            # 项目设置（settings/urls/wsgi/asgi）
    └── core/                # 单 app
        ├── models.py        # 7 个模型
        ├── api.py           # 22 个 JSON 端点
        ├── recommend.py     # item-based CF + 三层 fallback
        ├── generate_data.py # 25 000 商品 + 5 000 直播 + 35 340 关联
        ├── augment_seed.py  # 30 用户 + 389 收藏 + 794 浏览
        └── admin.py
```

---

## 视觉设计

**Apple 锚点**（来自 [voltagent/awesome-design-md/apple](https://github.com/voltagent/awesome-design-md/tree/main/design-md/apple)）：

- 单页只允许 **一个** 高饱和 accent
- 17px body / -0.374px tracking / 80px section padding
- negative letter-spacing 在 display 尺寸
- `scale(0.96)` 按下动效是系统级 micro-interaction
- 阴影只允许出现在 KPI 数字 / 商品图 / 主播头像，UI chrome 不准带阴影
- `backdrop-filter: saturate(180%) blur(20px)` 用于 sticky 顶栏

**Cyberpunk 身份**（保留原 demo）：

- pulse `#a855f7` · flame `#f43f5e` · cyan `#0ea5e9` 三色 accent
- Inter Tight + 中文回退 PingFang SC
- ink-900 `#0a0a0d` 底色 + 极光 Aurora WebGL 装饰

**每页最多 1 个 heavy 装饰**（Apple "one heavy effect" 原则）：

- Login / Register · Aurora
- Anchor 榜 · TiltedCard TOP 3 颁奖台
- Livestream 详情 · ElectricBorder 包主播卡
- Products · GlareHover 网格 hover
- Recommend · 9 张 SpotlightCard
- 其他页面纯数据，不叠加装饰

---

## 已知事项

- npm install 必须带 `--legacy-peer-deps`（echarts-wordcloud peer 声明与 echarts 6 略不兼容，运行无碍）
- 端口固定 5181 / 8001（与同仓库 JobRecommend 错开）
- MySQL root 密码假设为 `root`（与本机环境一致），修改时同步 `server/taotrend/settings.py`
- D-DIN-Bold 商用字体已用 `system-ui + uppercase + letter-spacing` 模拟工程感
- 暂未做代码分包，初始 JS 约 877KB gzipped。生产部署可按路由 `lazy()` 拆 chunk

---

## License

MIT — 毕业设计项目，欢迎参考。
