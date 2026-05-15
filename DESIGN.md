# TaoTrend Live · 设计文档 v1

> **状态**：v1 · 待评审通过后开工
> **作者**：Architect（Claude）
> **更新**：2026-05-16

---

## 0. TL;DR

把 `taotrend-live`（当前是个赛博朋克风的纯前端 demo）扩展为**前后端分离的企业级毕设答辩项目**：

- **业务主题**：电商直播趋势分析与商品智能推荐平台（TaoTrend Live · Real-time E-commerce Live-streaming Analytics & Recommendation）
- **关键词**：直播间监控 / 品类趋势 / 商品库 / 协同过滤推荐 / 销量预测
- **后端**：Django 4 + DRF-style JSON API + MySQL + session 鉴权 + 模拟爬虫
- **前端**：保留现有 React 19 + Vite + Tailwind v4 + 8 个 react-bits 装饰组件 + 新增 AntD 6 (dark) + ECharts 6 + React Router 7 + Axios
- **页面**：原 SPA landing 作为 `/`（未登录可访问），认证后进入 `/app/*` 的 14 个业务页
- **视觉**：保留 cyberpunk 调性（pulse 紫 + flame 粉红 + ink 黑）+ 新增数据 dashboard 的工程感（hairline / 大写 eyebrow / mono 数字）

---

## 1. 业务背景与价值

### 1.1 场景

直播电商已成为中国电商核心增量。淘宝、天猫、拼多多、抖音四大平台 2025 年直播 GMV 突破 5 万亿。商家面临三类决策：

1. **品类决策**：哪个细分品类正在崛起？应该投放多少预算？
2. **主播决策**：哪些主播的转化率/退货率/客单价匹配自己的商品？
3. **商品决策**：商品上架后预计能卖多少？应该和谁合作？

### 1.2 系统价值

本平台提供：

- **数据采集**：模拟接入淘宝 / 抖音 / 拼多多三平台的直播间 + 商品数据
- **多维分析**：品类销售额、时段分布、主播榜单、退货率、转化率等 7 类可视化
- **智能推荐**：基于用户收藏行为的 item-based 协同过滤，推荐相关商品
- **销量预测**：基于品类、主播、定价、时长等条件预测商品 GMV 与百分位
- **个人工作台**：收藏、浏览历史、关注主播、警报订阅

### 1.3 目标用户

电商运营、品牌商家、MCN 机构数据分析师。

---

## 2. 技术选型

| 层 | 选型 | 理由 |
|---|------|------|
| 后端框架 | Django 4.2 | 与 JobRecommend 一致，作者已熟悉；Admin、ORM、session、migrations 完备 |
| 数据库 | MySQL 8 | 与 JobRecommend 复用同一实例 |
| ORM 驱动 | PyMySQL | 与 JobRecommend 一致 |
| CORS | django-cors-headers | 跨端口（5173/8001 ↔ 5181） |
| 鉴权 | Django session + 自定义 UserList | 与 JobRecommend 一致，session cookie + withCredentials |
| 模拟数据 | 自写 generator | 25 000 条商品 + 5 000 场直播 + 200 主播 |
| 前端框架 | React 19 + TS 6 | 沿用 |
| 构建 | Vite 8（端口 5181） | 错开 JobRecommend 的 5180 |
| 路由 | React Router 7 | 客户端路由，landing 与 app 分离 |
| UI 库 | Ant Design 6 dark algorithm | 后台数据组件齐全 |
| 样式 | Tailwind v4 + 自定义 @theme | 保留 ink/pulse/flame/lime 调色板 |
| 图表 | ECharts 6 + echarts-for-react | 与 JobRecommend 一致 |
| 装饰 | 现有 8 个 react-bits 组件 + 按需新增 | 不重新发明轮子 |
| HTTP | axios（withCredentials） | 与 JobRecommend 一致 |
| 状态 | React Context（轻量）| 项目规模够用，不引 zustand |

### 端口分配

- MySQL: 3306（共用本机实例，密码 root）
- TaoTrend Backend: **8001**（错开 JobRecommend 的 8000）
- TaoTrend Frontend: **5181**（错开 JobRecommend 的 5180）

---

## 3. 数据模型（MySQL · 数据库名 `taotrend`）

5 张主表 + 2 张关联表。

### 3.1 ERD

```
UserAccount ──┬── FavoriteList ── Product ──── Category
              └── BrowseLog  ──┬── Product
                               └── LiveStream ── Anchor
                                                  │
                                       LiveStreamProduct (M:N)
```

### 3.2 表定义

```python
class Category(models.Model):
    """品类：美妆/数码/服饰/家居/食品/母婴/运动/图书"""
    id = AutoField(pk=True)
    name = CharField(64, unique=True)
    parent = ForeignKey(self, null=True)  # 二级品类
    icon_glyph = CharField(8, default='✦')

class Anchor(models.Model):
    """主播"""
    id = AutoField(pk=True)
    nickname = CharField(64)
    platform = CharField(16)  # taobao/douyin/pdd
    fans = BigIntegerField()
    avg_gmv = DecimalField(14, 2)
    return_rate = FloatField()  # 退货率
    avatar_seed = CharField(16)  # 用于 DiceBear 生成头像

class Product(models.Model):
    """商品"""
    id = AutoField(pk=True)
    name = CharField(255)
    category = ForeignKey(Category)
    brand = CharField(64)
    price = DecimalField(10, 2)
    sales = IntegerField()  # 累计销量
    rating = FloatField()  # 评分 1-5
    image_seed = CharField(16)  # gradient 占位图 seed
    created_at = DateTimeField(auto_now_add=True)

class LiveStream(models.Model):
    """直播间记录"""
    id = AutoField(pk=True)
    anchor = ForeignKey(Anchor)
    title = CharField(255)
    platform = CharField(16)
    start_at = DateTimeField()
    duration_min = IntegerField()
    peak_audience = IntegerField()
    gmv = DecimalField(14, 2)
    conversion_rate = FloatField()

class LiveStreamProduct(models.Model):
    """直播间-商品关联"""
    live = ForeignKey(LiveStream)
    product = ForeignKey(Product)
    sold_qty = IntegerField()
    sold_gmv = DecimalField(12, 2)

class UserAccount(models.Model):
    """前台用户（不复用 Django auth.User，保持与 JobRecommend 一致风格）"""
    user_id = CharField(11, pk=True)
    user_name = CharField(64)
    pass_word = CharField(64)
    avatar_seed = CharField(16)
    created_at = DateTimeField(auto_now_add=True)

class FavoriteList(models.Model):
    user = ForeignKey(UserAccount)
    product = ForeignKey(Product)
    created_at = DateTimeField(auto_now_add=True)
    class Meta: unique_together = ('user', 'product')

class BrowseLog(models.Model):
    user = ForeignKey(UserAccount)
    product = ForeignKey(Product)
    viewed_at = DateTimeField(auto_now_add=True)
```

### 3.3 Mock 数据规模

| 表 | 数量 | 备注 |
|----|------|------|
| Category | 8（一级）+ 32（二级） | 美妆/数码/服饰/家居/食品/母婴/运动/图书 |
| Anchor | 200 | 三平台均匀分布 |
| Product | 25 000 | 加权分布在 8 大品类 |
| LiveStream | 5 000 | 时间分布近 90 天 |
| LiveStreamProduct | ~30 000 | 平均每场 6 个商品 |

---

## 4. 后端 API（全部 `/api/` 前缀，JSON）

22 个端点，分 5 个域。

### 4.1 鉴权（5）

```
POST  /api/auth/login/         {user, password}
POST  /api/auth/register/      {user, password, user_name}
POST  /api/auth/logout/
GET   /api/auth/me/
POST  /api/auth/update/        {user_name, old_pass, pass_word}
```

### 4.2 仪表盘（4）

```
GET   /api/dashboard/overview/        # 总 GMV / 主播数 / 商品数 / 直播场次
GET   /api/dashboard/gmv_trend/       # 90 天 GMV 趋势
GET   /api/dashboard/platform_share/  # 三平台占比 pie
GET   /api/dashboard/category_share/  # 一级品类占比 pie
```

### 4.3 品类分析（3）

```
GET   /api/category/list/             # 树形结构
GET   /api/category/heatmap/          # 24h × 8 品类热度图
GET   /api/category/top_growth/       # 增长率 top
```

### 4.4 直播间 & 主播（4）

```
GET   /api/livestream/list/?platform&page&limit
GET   /api/livestream/<id>/           # 单场详情含商品
GET   /api/anchor/list/?platform&page&limit
GET   /api/anchor/leaderboard/        # 主播榜单 TOP 50
```

### 4.5 商品（3）

```
GET   /api/product/list/?keyword&category&min_price&max_price&page&limit
GET   /api/product/<id>/              # 详情，写入 BrowseLog
POST  /api/product/toggle_favorite/   # 收藏/取消
```

### 4.6 个性化（3）

```
GET   /api/me/favorites/              # 我的收藏
GET   /api/me/browse_history/         # 浏览历史 (最近 50)
GET   /api/me/recommend/              # item-CF 推荐 9 个
```

### 4.7 智能（2）

```
GET   /api/intel/sales_predict/?category&price&anchor_tier&duration  # 销量预测
GET   /api/intel/wordcloud/                                          # 商品名词云
```

### 4.8 导出（1）

```
GET   /api/export/products.csv
```

---

## 5. 推荐与预测算法

### 5.1 商品推荐 — item-based CF

参考 JobRecommend，但维度从"投递"换为"收藏"：

```
similarity(p1, p2) = |U_p1 ∩ U_p2| / sqrt(|U_p1| × |U_p2|)
where U_p = 收藏过该商品的用户集合

for user u:
  preferred_categories = top 3 of u 收藏过的品类
  candidates = ~Q(favorited by u) AND category in preferred_categories
  rank by Σ similarity(c, p) for p in u.favorited
  fallback 1: u.browse_log top categories
  fallback 2: 整体热门
```

### 5.2 销量预测 — 多条件统计

输入 `category, price_band, anchor_tier, duration_min`，从 LiveStreamProduct 历史数据中过滤匹配样本，输出 `avg, median, max, min, count, percentile, distribution`。

不引 ML 模型——遵循 JobRecommend 的处理：基于全库分位数 + 直方图分布。简单可解释，答辩好讲。

---

## 6. 前端架构

### 6.1 路由树

```
/                                  # Landing（保留现有 cyberpunk demo）
/app                              ↘ ProtectedRoute
  ├ /overview                     总览（KPI + GMV 趋势 + 平台占比）
  ├ /categories
  │   ├ /heatmap                  品类 24h 热度
  │   └ /growth                   增长榜
  ├ /livestreams                  直播间列表 + 详情
  │   └ /:id                      单场详情
  ├ /anchors
  │   ├ /                         主播榜
  │   └ /:id                      单主播详情
  ├ /products                     商品库（搜索 + 列表 + 详情侧栏）
  ├ /predict                      销量预测
  ├ /wordcloud                    商品词云
  ├ /me
  │   ├ /favorites                我的收藏
  │   ├ /history                  浏览历史
  │   ├ /recommend                推荐商品
  │   └ /account                  账号设置
/login                            登录
/register                         注册
```

总计 **landing 1 + 业务 14 + 鉴权 2 = 17 页**。

### 6.2 目录结构

```
src/
├ api/
│  ├ client.ts             # axios 实例 + 401 拦截
│  ├ services.ts           # 强类型 API 调用
│  └ types.ts              # 后端响应类型
├ auth/
│  ├ AuthContext.tsx
│  └ ProtectedRoute.tsx
├ layouts/
│  ├ AppLayout.tsx         # 侧栏 + 顶栏（cyberpunk + 工程感）
│  ├ LandingLayout.tsx     # 沿用现有 NavBar/Footer
│  └ menu.tsx
├ components/
│  ├ Aurora.tsx 等 8 个     # 现有 react-bits（不动）
│  ├ + 新增：ChartCard, PageHero, KpiTile, PlatformBadge, AnchorAvatar, ProductCard ...
├ pages/
│  ├ Landing.tsx           # 拆自现有 App.tsx
│  ├ Login.tsx, Register.tsx
│  └ app/                  # 14 个业务页
│     ├ Overview.tsx
│     ├ CategoryHeatmap.tsx
│     ├ CategoryGrowth.tsx
│     ├ LiveStreamList.tsx
│     ├ LiveStreamDetail.tsx
│     ├ AnchorLeaderboard.tsx
│     ├ AnchorDetail.tsx
│     ├ Products.tsx
│     ├ SalesPredict.tsx
│     ├ WordCloud.tsx
│     ├ Favorites.tsx
│     ├ History.tsx
│     ├ Recommend.tsx
│     └ Account.tsx
├ lib/
│  ├ chart.ts              # 暗色 ECharts 主题（pulse/flame 调色板）
│  └ utils.ts
├ App.tsx, main.tsx, index.css
```

### 6.3 设计语言

**保留现有 cyberpunk mood**，但叠加工程感作为 admin 模块的辅助语汇。两套并存不冲突：

- **Landing**：100% 现有视觉（Aurora 极光、SplashCursor、MagicBento、TiltedCard）
- **App 业务页**：
  - 主色保留 `pulse-500` (#a855f7) + `flame-500` (#f43f5e) 但只用于 KPI 数字和重要 accent
  - 整体仍是 ink 深色系（`#0a0a0d`）
  - 卡片用 1px hairline 而非 shadow（吸收 SpaceX 工程感）
  - 表格 / 表单 / 大写小标签 eyebrow（继承 JobRecommend 经验）
  - 数字大写 mono 字体（CountUp）

设计语言一致性：landing 是"营销+视觉冲击"，app 是"赛博工程师的工作台"——同源不同声音。

---

## 7. 实现里程碑（Agent 团队分工）

> 全部并行可独立完成，整合在 Phase 4。

### Phase 1 · 设计（本文档）✅

### Phase 2 · 后端（Backend Agent）

任务：
1. 新建 `taotrend-live/server/` Django 项目
2. 5 张表 + 2 张关联表的 models.py + migrations
3. `core/api.py` 实现 22 个端点
4. `core/recommend.py` item-CF
5. `core/generate_data.py` mock 数据
6. settings.py CORS + session + MySQL (`taotrend` 数据库) + 端口 8001
7. requirements.txt
8. 自验证：`python manage.py check && migrate && generate_data`

### Phase 3 · 前端基建（Foundation Agent）

任务：
1. 装依赖：`antd echarts echarts-for-react echarts-wordcloud axios react-router-dom dayjs`
2. `src/api/client.ts` + `services.ts` + `types.ts`
3. `src/auth/AuthContext.tsx` + `ProtectedRoute.tsx`
4. `src/layouts/AppLayout.tsx`（侧栏 + 顶栏，cyberpunk 调） + `LandingLayout.tsx`（包现有 NavBar/Footer）
5. `src/App.tsx` 重构为 React Router（landing + auth + app routes）
6. `src/pages/Login.tsx`, `Register.tsx` — 用 Aurora 作背景，保持 cyberpunk
7. 把现有 App.tsx 内容拆到 `src/pages/Landing.tsx`
8. `src/lib/chart.ts`：暗色 ECharts 主题（pulse/flame palette）
9. Vite 端口改 5181

### Phase 4 · 前端业务页（Pages Agent）

任务（14 页）：依次实现 Overview / CategoryHeatmap / CategoryGrowth / LiveStreamList / LiveStreamDetail / AnchorLeaderboard / AnchorDetail / Products / SalesPredict / WordCloud / Favorites / History / Recommend / Account。

每个页面规范：
- 顶部 `PageHero`（eyebrow + 大写标题 + 描述）
- ECharts 图表通过 `ChartCard` 组件
- KPI 用 react-bits CountUp
- 商品卡片用 SVG gradient 占位图
- 推荐页用 SpotlightCard 或 TiltedCard
- 数据全部通过 `api/services.ts` 拉取

### Phase 5 · 联调（我亲自）

1. 起 MySQL，确认 `taotrend` 数据库存在
2. cd server && migrate && generate_data
3. 起 Django (8001) + Vite (5181)
4. 注册 test001 / 123456
5. 跑全流程：登录→Overview→品类→直播间→商品搜索→收藏→推荐→预测→词云→个人中心
6. 修任何报错

---

## 8. 风险与对策

| 风险 | 概率 | 对策 |
|------|------|------|
| MySQL `taotrend` 数据库不存在 | 中 | 启动脚本自动 CREATE DATABASE IF NOT EXISTS |
| 端口 5181/8001 被占 | 低 | strictPort + 文档明确 |
| react-bits 与新装 antd 样式冲突 | 中 | Tailwind v4 不用 preflight、antd ConfigProvider dark + cyberpunk token 覆写 |
| Item-CF 在新用户冷启动给空结果 | 高 | 三层 fallback：CF → 浏览历史 → 整体热门 |
| Mock 数据生成耗时长 | 中 | 用 bulk_create，每批 1000 条 |
| Agents 并行写同一文件 | 中 | 严格分工，后端只动 server/，前端基建只动 src/api+auth+layouts，业务页只动 src/pages/app/ |
| Vite HMR 在大量并行写入时混乱 | 低 | 让 agent 做完一批再统一启动 |

---

## 9. 验收标准（毕设答辩级）

✅ 数据库 7 张表，>30 000 条 mock 数据
✅ 后端 22 个 JSON 端点，Django check 通过
✅ 前端 17 个页面（landing + auth + 14 业务）
✅ 完整登录 / 注册 / 登出
✅ 至少 8 张 ECharts 不同类型图表（pie / bar / line / heatmap / scatter / wordcloud / radar / gauge）
✅ item-CF 推荐能给出非空结果
✅ 销量预测能输出 6 维统计 + 分布图
✅ 个人中心：收藏 / 浏览历史 / 推荐 / 改密
✅ Landing 页保留所有 react-bits 视觉
✅ `tsc -b` 0 error，`vite build` 通过
✅ MySQL 启动后 `./start.sh` 一键起服务
✅ README + DESIGN.md 完整

---

## 10. 自审结论

**通过**。设计能在 1 个 session 内由 3 个并行 agent 完成核心代码（后端 + 前端基建 + 前端业务页），最后由我亲自联调。

风险点已识别并有对策。Scope 与 JobRecommend 对齐（17 页 vs 17 页，22 端点 vs 25 端点），属于可执行的毕设级体量。

**正式启动 Phase 2~4。**
