# TaoTrend Live · 业务页视觉设计 SPEC

> 配套 `DESIGN.md`。本文件是 **14 个业务页的设计规范**，由架构师（Claude）自审通过后才发给业务页 agent 执行。
> **质感目标：Apple 的克制 × TaoTrend 的赛博朋克。** 每一页的视觉判断都已经写死，agent 不要二次创作 — 严格执行。

---

## 全局视觉原则（**Apple 锚点**，每页都必须遵守）

| 原则 | 来源 | 落地 |
|---|---|---|
| **单一 accent** | Apple Action Blue 哲学 | 单页只允许 **一个** 高饱和强调色：默认 pulse `#a855f7`，少数页可改 flame `#f43f5e` 或 cyan `#0ea5e9`。`palette[]` 仅在多系列图表里用。 |
| **17px body, -0.374px tracking** | Apple body | 不动 `body` 全局 |
| **80px section padding** | Apple tile | `<PageHero>` 顶部空 48-64px、与下一 section 间距 48-80px |
| **negative letter-spacing on display** | Apple tight | `.u-display-*` 已具备，**不要**用 antd Typography 替代 |
| **uppercase eyebrow + tabular nums** | SpaceX × Apple | 每页必有 `eyebrow` 编号（如 `02·CATEGORY · A-01`） |
| **No decorative shadow on UI chrome** | Apple shadow discipline | 只有 KPI 数字 / 商品卡片 / 主播头像 才有阴影；卡片用 1px hairline `rgba(255,255,255,0.06)` |
| **scale(0.96) press** | Apple universal | 已在 `.ant-btn:active` 里全局设置 |
| **Backdrop-blur 用在 sticky** | Apple sub-nav-frosted | sticky filter bar / sticky CTA 才用 |
| **One heavy effect per page** | react-bits notes | **每页最多一个** WebGL/3D/heavy 装饰（Aurora/Particles/MagicBento/TiltedCard），不叠加 |

### 节奏

- 页面横向 padding 与 AppLayout 一致（24-32px）
- Hero 标题: `u-display-xxl`（72-96px）+ eyebrow + 一句 description
- 主区 grid gap: 16px (sm) / 24px (md) / 32px (lg)
- 卡片内 padding: 24px
- 表格行高: 56px（密集）/ 72px（含 thumbnail）

### 颜色精修

| token | hex | 用途 |
|---|---|---|
| `--ink-900` | `#0a0a0d` | 页面 canvas |
| `--ink-850` | `#101015` | section 卡 background |
| `--ink-800` | `#16161b` | 嵌套元素 / hover 卡 |
| `--hairline-soft` | `rgba(255,255,255,0.06)` | 大部分卡片边 |
| `--hairline` | `rgba(255,255,255,0.10)` | hero 下分隔 / 表头底 |
| `--hairline-strong` | `rgba(255,255,255,0.16)` | active 状态边 |
| `--accent-pulse` | `#a855f7` | KPI 数字 / active tab / primary btn |
| `--accent-flame` | `#f43f5e` | 警告 / 退货率 / 跌幅 |
| `--accent-cyan` | `#0ea5e9` | secondary chart |
| `--accent-lime` | `#84cc16` | success / 涨幅 |
| `--text-1` | `#f8f8fa` | 主文字 |
| `--text-2` | `#cccccc` | 二级 |
| `--text-3` | `#a1a1aa` | 三级 |
| `--text-4` | `#71717a` | hint / fine print |

如这些 token 在 `index.css` 还缺，**让 agent 第一件事是补上**。

---

## 共享组件（**先建好这 6 个**）

在 `src/components/` 新建（参考 JobRecommend 的 `ChartCard`/`PageHeader` 但要带 TaoTrend 视觉）：

### 1. `<PageHero>`
```
<section style={{ padding: '48px 0 56px', borderBottom: '1px solid var(--hairline)', marginBottom: 32 }}>
  <div className="u-eyebrow" style={{ marginBottom: 14 }}>{eyebrow}</div>
  <h1 className="u-display-xxl" style={{ margin: 0 }}>{title}</h1>
  {description && <p className="text-body" style={{ marginTop: 20, maxWidth: 640, color: 'var(--text-2)' }}>{description}</p>}
  {extra && <div style={{ marginTop: 24 }}>{extra}</div>}
</section>
```

### 2. `<KpiTile>`
```
props: { eyebrow, value: number, unit?, hint?, index, accent? = 'pulse' }
- 内部用 react-bits CountUp 渲染 value
- 数字字号 56px，字体 mono，颜色取 accent
- 卡片：1px hairline + corner ticks（参考 JobRecommend 的 cornerTick） + ink-850 bg
```

### 3. `<ChartCard>`
```
props: { eyebrow, title, extra?, option, height?, loading? }
- 顶部 eyebrow + uppercase 标题
- 分隔线，再下 ECharts
- 整体 1px hairline + ink-850
```

### 4. `<ProductCard>`
```
props: { product: Product, onFavorite?, onClick? }
- 顶部 1:1 占位图：用 product.image_seed 生成 SVG 渐变（参考 Landing 里 gradientImage()）
- 标题 14px 600，brand 12px text-3
- 底栏：左 price (mono pulse 色)，右 rating（星 + 数字）
- 收藏 icon-button 浮在右上角
- 整体 1px hairline，hover 时 hairline 变 strong（不要用 shadow）
```

### 5. `<AnchorAvatar>`
```
props: { seed: string, size?: 40 | 64 | 96 }
- DiceBear 替代：用 seed 字符串 hash → 1 个 pulse/flame/cyan 渐变圆 + 首字母
- 圆形 1px hairline-soft
```

### 6. `<PlatformBadge>`
```
props: { platform: 'taobao'|'douyin'|'pdd' }
- pill 形 11px × 8px，colorMap = { taobao: flame, douyin: pulse, pdd: amber }
- 1px hairline、text uppercase 10px tracking 1.4px
```

---

## 14 个业务页详细 SPEC

> 字段含义：
> **Hero** = 页面顶部，**Layout** = 主区布局，**Chart** = ECharts 类型，**RB** = react-bits 装饰，**AntD** = 用到的 AntD 组件，**API** = 来自 services 的方法

### P01 / `/app/overview` — **OVERVIEW · CONTROL**
- **Hero**：eyebrow `01·OVERVIEW · CONTROL` / title "MISSION CONTROL" / desc "实时聚合三平台直播指标"。Hero 右侧贴一个 `LIVE · 3S` pulse 点。
- **Layout**：
  - Row 1: 4 个 `<KpiTile>` — 总 GMV (亿) / 主播数 / 商品数 / 直播场次。accent 都是 pulse。
  - Row 2: 2 列 — 左占 1.6，右占 1
    - 左：`<ChartCard>` "GMV 趋势 · 90 天" line chart，pulseFlameGradient 填色
    - 右：`<ChartCard>` "PLATFORM SHARE" 环形 pie，使用 `platformColors`
  - Row 3: 1 列 `<ChartCard>` "CATEGORY SHARE" 玫瑰图（roseType 'area'）
- **RB**：仅 KpiTile 内的 CountUp。**不要**在 hero 背景叠 Aurora（控制台太花了不像 Apple）。
- **API**：`dashboardApi.overview` / `gmvTrend` / `platformShare` / `categoryShare`
- **AntD**：无 — 整页纯卡片 + chart

### P02 / `/app/categories/heatmap` — **CATEGORY HEATMAP**
- **Hero**：eyebrow `02·CATEGORY · A-01` / title "TIME HEATMAP" / desc "24 小时 × 8 一级品类的直播热度（GMV 求和）"
- **Layout**：
  - 单个全宽 `<ChartCard>` ECharts heatmap，y 轴 8 品类，x 轴 0-23 小时
  - heatmap visualMap 取 pulse → flame → 黄；右侧自带 legend
  - 下方 1 个 stats row：今日 peak hour / peak category / hottest cell GMV，3 个紧凑数据条
- **Chart**：heatmap
- **API**：`categoryApi.heatmap`

### P03 / `/app/categories/growth` — **CATEGORY GROWTH**
- **Hero**：eyebrow `02·CATEGORY · A-02` / title "GROWTH LEADERS" / desc "近 7 天 vs 上一周期的 GMV 增长率"
- **Layout**：
  - 单个 `<ChartCard>` 横向 bar：正增长用 lime，负增长用 flame
  - 数字标在条尾，按 abs(growth) desc
- **Chart**：horizontal bar with conditional color
- **API**：`categoryApi.topGrowth`

### P04 / `/app/livestreams` — **LIVESTREAMS**
- **Hero**：eyebrow `03·LIVE · L-01` / title "LIVESTREAM LOG" / desc "5 000 场直播记录 · 支持平台/时间筛选"
- **Layout**：
  - 顶部 sticky filter bar (backdrop-blur)：Select 平台 / DatePicker.RangePicker / 搜索框
  - 表格：列 `#` / `TITLE`（主播头像+昵称+title） / `PLATFORM`（PlatformBadge） / `START` / `DURATION (min)` / `PEAK AUDIENCE` / `GMV` / `CONV.` / 操作（DETAIL 链接）
  - 行高 72px（含 avatar）
- **AntD**：Table（pagination 服务端） / Select / DatePicker / Input
- **API**：`livestreamApi.list({platform, start, end, page, limit})`

### P05 / `/app/livestreams/:id` — **LIVESTREAM DETAIL**
- **Hero**：title 用直播标题，eyebrow `LIVESTREAM · L-${id}` + PlatformBadge
- **Layout**：
  - Row 1: 4 个 `<KpiTile>` — 时长 / peak audience / GMV / conv rate
  - Row 2: 左 1.5 `<ChartCard>` "GMV 累积曲线"（用 mock 数据模拟分钟级累积），右 1 列 `<AnchorAvatar>` size 96 + 主播信息卡（昵称、平台、fans、avg_gmv、return_rate）
  - Row 3: Table "上架商品" 列：缩略图(用 image_seed) / 名称 / 价格 / 售出件数 / 售出 GMV
- **RB**：右上主播头像下用一个**温和**的 ElectricBorder（仅这一处装饰）
- **API**：`livestreamApi.detail(id)`

### P06 / `/app/anchors` — **ANCHOR LEADERBOARD**
- **Hero**：eyebrow `04·ANCHOR · A-LB` / title "ANCHOR LEAGUE" / desc "按 avg_gmv 排名 TOP 50"
- **Layout**：
  - Row 1: TOP 3 podium，3 张 `<TiltedCard>` 并排（**这是这一页的 single heavy effect**）。每张卡显示 rank #1/#2/#3、avatar、nickname、avg_gmv、platform、fans。#1 卡 accent pulse、#2 cyan、#3 amber。
  - Row 2: 完整 TOP 50 表格 — `#` / avatar+nickname / platform / fans / avg_gmv / return_rate
- **RB**：TiltedCard (TOP 3)
- **API**：`anchorApi.leaderboard`

### P07 / `/app/anchors/:id` — **ANCHOR DETAIL**
- **Hero**：左 `<AnchorAvatar size=96>`、右 nickname (display-lg) + eyebrow `${platform.toUpperCase()} · ${fans.toLocaleString()} FANS`
- **Layout**：
  - Row 1: 3 KpiTile (avg_gmv / return_rate / total_streams)
  - Row 2: ChartCard "近 30 天 GMV 趋势"（line）
  - Row 3: 该主播的最近 10 场直播 Table（标题、时间、duration、gmv、conv）
- **API**：`anchorApi.detail(id)`

### P08 / `/app/products` — **PRODUCTS**
- **Hero**：eyebrow `05·PRODUCT · P-01` / title "PRODUCT VAULT" / desc "25 000 条商品 · 支持关键词/品类/价格筛选"
  - Hero 内嵌大号 Apple 风 pill 搜索框（44px 高，1px hairline，🔍 icon），后面紧跟 Select 品类
- **Layout**：
  - 左 sidebar 240px：CategoryTree（用 antd Tree，从 `categoryApi.list` 拉）
  - 右主区：网格 4 列 `<ProductCard>` (响应式)
  - 底部 Pagination
- **RB**：ProductCard 的 hover 改为 hairline-strong + 微弱 GlareHover（**轻装饰**，不要拖累 grid 性能）
- **API**：`productApi.list({keyword, category, min_price, max_price, page, limit})` + `productApi.toggleFavorite`

### P09 / `/app/predict` — **SALES PREDICT**
- **Hero**：eyebrow `06·INTEL · I-01` / title "SALES PREDICT" / desc "根据品类、价格段、主播等级、时长预测商品 GMV"
- **Layout**：
  - 顶部参数 Form：Select 品类 / InputNumber 价格 / Select 主播等级 / Slider 时长 / 提交按钮 (primary pulse)
  - 结果区只在提交后展示：
    - Row 1: 6 个 `<KpiTile>` (AVG / MEDIAN / MAX / MIN / SAMPLES / PERCENTILE)，AVG/PERCENTILE 用 pulse
    - Row 2: 左 1.6 `<ChartCard>` "DISTRIBUTION" bar，右 1 列 `<ChartCard>` "PERCENTILE" gauge (radius dashboard)
- **API**：`intelApi.salesPredict`

### P10 / `/app/wordcloud` — **PRODUCT WORDCLOUD**
- **Hero**：eyebrow `06·INTEL · I-02` / title "TOKEN CLOUD" / desc "全部商品名称提取的高频词"
- **Layout**：单个全宽 `<ChartCard>` 用 `echarts-wordcloud`，shape circle，sizeRange [14, 72]，textStyle.color 随机从 palette 取
- **API**：`intelApi.wordcloud`

### P11 / `/app/me/favorites` — **FAVORITES**
- **Hero**：eyebrow `07·ME · M-01` / title `${count} SAVED ITEMS`（count 从 api 拿） / desc "你收藏的商品 · 推荐引擎以此训练"
- **Layout**：网格 `<ProductCard>` 4 列；空状态用 Empty + "去发现 →" 跳到 /app/products
- **API**：`meApi.favorites`

### P12 / `/app/me/history` — **HISTORY**
- **Hero**：eyebrow `07·ME · M-02` / title "BROWSE HISTORY" / desc "最近 50 条浏览记录"
- **Layout**：按日期 group 的时间线 — 每天一个分组（顶部日期 eyebrow），下面横向滚动 `<ProductCard>` 行（无装饰）
- **API**：`meApi.browseHistory`

### P13 / `/app/me/recommend` — **RECOMMEND**
- **Hero**：eyebrow `07·ME · M-03` / title "BUILT FOR YOU" / desc "基于你的收藏与浏览，由 item-CF 算法推荐 9 件"
- **Layout**：9 张 SpotlightCard 网格（**这是这页的 single heavy effect**），3 列。卡片内同 ProductCard 内容 + 显著的 "ADD TO FAVORITES" 按钮
- **RB**：SpotlightCard（spotlightColor pulse 紫的 rgba）
- **API**：`meApi.recommend`

### P14 / `/app/me/account` — **ACCOUNT**
- **Hero**：eyebrow `07·ME · M-04` / title "OPERATOR PROFILE" / desc `OPERATOR · ${user_id}`
- **Layout**：单卡 max-width 640px：Form 含 `user_name` / `old_pass` / `pass_word` / `confirm`，primary btn "SAVE"
- **AntD**：Form / Input / Input.Password / Button
- **API**：`authApi.update`

---

## 需要新装的 react-bits 组件（**业务页 agent 第一件事**）

按 SpaceX 风格 "engineering > decoration" 原则，**整个 14 页只多装 3 个**：

```bash
npx shadcn@latest add @react-bits/SpotlightCard-TS-TW --yes      # P13 Recommend 用
npx shadcn@latest add @react-bits/ElectricBorder-TS-TW --yes     # P05 LivestreamDetail 用
npx shadcn@latest add @react-bits/GlareHover-TS-TW --yes         # P08 Products 网格 hover 用
```

CountUp / TiltedCard / Aurora 已在 `src/components/` 里，直接 import。

---

## 自审 checklist（agent 完成后我会逐项核对）

每页都要满足：
- [ ] PageHero 三件套（eyebrow / display 标题 / desc）齐
- [ ] 至少 1 张 ECharts 图表（除了 P14 Account）
- [ ] 颜色合规：单页主 accent ≤ 1 个高饱和色
- [ ] 不滥用 shadow（仅 KPI 数字、商品卡 hover 可有微弱 glow）
- [ ] **每页最多 1 个 heavy 装饰**（TiltedCard / SpotlightCard / ElectricBorder / WebGL bg 算 heavy）
- [ ] 全部数据通过 `api/services.ts`（不要 fetch 别的）
- [ ] 401 / 空数据 / loading 都有 graceful 状态
- [ ] tsc -b 0 error

---

## 自审结论（架构师）

✅ **通过**。

设计达到 Apple 质感的关键：单 accent / 17px body / 80px section / 大写 eyebrow / negative tracking / 一页一装饰 / hairline 代替 shadow。同时保留 TaoTrend 的 cyberpunk identity（pulse + flame 调色板、Inter Tight 字体、grid 背景）。

执行风险点：
1. 主播头像 / 商品图占位：用 SVG gradient + seed hash 解决，不依赖外网 CDN
2. wordcloud 在 `echarts-wordcloud` 与 echarts 6 的 peer 警告：`--legacy-peer-deps` 已处理
3. ProductCard 网格在 25 000 行下分页 OK，不要尝试虚拟滚动

**Ready to dispatch pages agent.**
