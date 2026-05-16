# TaoTrend Live · 功能开发文档 v1

> 状态：规划稿  
> 更新日期：2026-05-16  
> 适用范围：在现有 TaoTrend Live 项目基础上继续优化功能、增强答辩亮点和业务完整度。

## 1. 文档目标

当前项目已经完成电商直播数据分析平台的主体能力，包括登录注册、数据大盘、品类分析、直播间分析、主播榜单、商品库、销量预测、词云、收藏、浏览历史和个性化推荐。

下一阶段开发目标不是重做系统，而是在现有架构上增强三类能力：

1. 让智能功能更可解释：推荐理由、用户画像、预测影响因素。
2. 让运营分析更贴近真实业务：异常监控、风险提示、自动刷新。
3. 让商品和数据链路更完整：商品详情增强、报表导出、筛选排序升级。

## 2. 当前系统基线

### 2.1 前端基线

- React 19 + TypeScript + Vite。
- Ant Design dark theme。
- ECharts 图表。
- React Router 路由。
- Axios 请求封装，`withCredentials` 支持 session 鉴权。
- 业务页面位于 `src/pages/app/`。
- API 方法位于 `src/api/services.ts`。

### 2.2 后端基线

- Django 4.2 + MySQL。
- Session-based 鉴权。
- 主要 API 位于 `server/core/api.py`。
- 推荐逻辑位于 `server/core/recommend.py`。
- 模型位于 `server/core/models.py`。

### 2.3 数据模型基线

当前核心业务表：

- `Category`：品类。
- `Anchor`：主播。
- `Product`：商品。
- `LiveStream`：直播间。
- `LiveStreamProduct`：直播间商品关联。
- `UserAccount`：前台用户。
- `FavoriteList`：收藏。
- `BrowseLog`：浏览日志。

## 3. 总体优化路线

本阶段建议按三个里程碑推进：

| 里程碑 | 目标 | 主要功能 | 预计收益 |
|---|---|---|---|
| M1 | 智能能力可解释 | 推荐理由、用户画像、预测解释 | 答辩亮点强，改动范围适中 |
| M2 | 运营监控增强 | 异常监控、风险榜、实时刷新 | 平台更像真实业务系统 |
| M3 | 商品链路完善 | 商品详情增强、筛选排序、报表导出 | 业务闭环更完整 |

推荐先做 M1，因为它最能体现“智能推荐与预测”的项目主题，也能直接复用现有数据。

## 4. 功能一：推荐理由与用户画像

### 4.1 背景

当前推荐页已经能返回商品列表，但用户无法理解推荐依据。需要把推荐系统从“只给结果”升级为“结果 + 原因 + 用户偏好”。

### 4.2 功能目标

- 在推荐页展示用户画像。
- 每个推荐商品展示推荐理由。
- 后端返回推荐分数、命中原因、来源策略。
- 冷启动用户也能看到清晰解释。

### 4.3 用户画像内容

画像指标建议包括：

- 偏好品类 Top 3。
- 偏好价格区间。
- 收藏商品数量。
- 浏览商品数量。
- 偏好品牌 Top 5。
- 偏好平台分布，可通过商品关联直播间反推。

### 4.4 推荐理由类型

| reason_type | 展示文案示例 | 触发条件 |
|---|---|---|
| `similar_favorite` | 因为你收藏过相似商品 | 协同过滤分数较高 |
| `same_category` | 符合你常看的品类偏好 | 商品品类属于用户 Top 品类 |
| `hot_in_category` | 该品类近期热销商品 | 品类命中且销量高 |
| `browse_history` | 根据你的浏览历史推荐 | 用户无收藏但有浏览 |
| `global_hot` | 全站热门商品 | 冷启动 fallback |

### 4.5 后端接口设计

新增接口：

```text
GET /api/me/profile/
GET /api/me/recommend_explain/
```

`/api/me/profile/` 返回示例：

```json
{
  "code": 0,
  "data": {
    "favorite_count": 31,
    "browse_count": 88,
    "top_categories": [
      { "category_id": 1, "category_name": "美妆", "weight": 0.36 },
      { "category_id": 5, "category_name": "食品", "weight": 0.22 }
    ],
    "price_range": { "min": 49, "max": 399, "avg": 188 },
    "top_brands": [
      { "brand": "MIST", "count": 5 }
    ]
  }
}
```

`/api/me/recommend_explain/` 返回示例：

```json
{
  "code": 0,
  "count": 9,
  "data": [
    {
      "id": 101,
      "name": "轻奢保湿精华套装",
      "category_name": "美妆",
      "brand": "MIST",
      "price": 199,
      "sales": 12890,
      "rating": 4.8,
      "image_seed": "p101",
      "score": 86.4,
      "strategy": "cf",
      "reason_type": "similar_favorite",
      "reason": "因为你收藏过 3 件美妆类相似商品"
    }
  ]
}
```

### 4.6 前端页面调整

调整页面：

- `src/pages/app/Recommend.tsx`

新增展示模块：

- 顶部用户画像摘要。
- 偏好品类条形图或 tag 列表。
- 推荐卡片上展示推荐理由。
- 推荐来源标记：`CF`、`HISTORY`、`HOT`。

### 4.7 验收标准

- 登录用户进入推荐页可看到用户画像。
- 每个推荐商品都有推荐理由。
- 无收藏用户仍可得到推荐并显示 fallback 原因。
- API 返回结构稳定，前端空状态友好。

## 5. 功能二：销量预测解释面板

### 5.1 背景

当前销量预测已经能根据品类、价格、主播等级、直播时长返回预测结果。但预测结果缺少解释，业务用户难以判断可信度。

### 5.2 功能目标

- 展示预测销量和 GMV。
- 展示样本数量、分位数、置信区间。
- 展示影响因素贡献。
- 给出运营建议。

### 5.3 预测解释指标

建议返回：

- `predicted_sales`：预测销量。
- `predicted_gmv`：预测 GMV。
- `sample_count`：匹配样本数量。
- `percentile`：当前条件所在分位数。
- `confidence`：可信度，按样本数量和离散程度估算。
- `drivers`：影响因素列表。
- `suggestions`：运营建议文案。

### 5.4 后端接口调整

沿用并扩展：

```text
GET /api/intel/sales_predict/
```

新增返回字段示例：

```json
{
  "code": 0,
  "predicted_sales": 1560,
  "predicted_gmv": 310440,
  "sample_count": 248,
  "percentile": 72,
  "confidence": 0.82,
  "drivers": [
    {
      "name": "品类热度",
      "impact": 0.34,
      "direction": "positive",
      "text": "该品类近 24 小时 GMV 高于均值"
    },
    {
      "name": "价格区间",
      "impact": -0.12,
      "direction": "negative",
      "text": "当前价格略高于同品类热销区间"
    }
  ],
  "suggestions": [
    "建议优先匹配中腰部主播，以控制投放成本",
    "价格可下调 5% 到 10%，提高转化概率"
  ]
}
```

### 5.5 前端页面调整

调整页面：

- `src/pages/app/SalesPredict.tsx`

新增展示模块：

- 预测可信度进度条。
- 影响因素贡献条形图。
- 运营建议列表。
- 样本质量提示。

### 5.6 验收标准

- 预测提交后展示解释面板。
- 样本不足时提示“样本不足，预测可信度较低”。
- 影响因素至少包含品类、价格、主播等级、直播时长。
- 页面 loading、错误、空结果状态完整。

## 6. 功能三：直播异常监控

### 6.1 背景

数据分析平台除了展示历史数据，还应帮助运营人员发现异常机会和风险。

### 6.2 功能目标

新增一个运营监控页面，展示：

- GMV 突增直播间。
- 高转化直播间。
- 低转化高流量直播间。
- 高退货风险主播。
- 品类异常增长。

### 6.3 新增路由

```text
/app/monitor
```

菜单位置建议：

- 放在 `01 · OVERVIEW` 下，命名为 `MONITOR`。

### 6.4 后端接口设计

新增接口：

```text
GET /api/monitor/alerts/
GET /api/monitor/live_spikes/
GET /api/monitor/risk_anchors/
```

`/api/monitor/alerts/` 返回示例：

```json
{
  "code": 0,
  "data": [
    {
      "type": "gmv_spike",
      "level": "high",
      "title": "直播间 GMV 高速增长",
      "message": "抖音直播间「春季美妆专场」GMV 高于同平台均值 2.3 倍",
      "target_type": "livestream",
      "target_id": 1208,
      "metric": 2.3
    }
  ]
}
```

### 6.5 异常规则建议

| 规则 | 判断逻辑 |
|---|---|
| GMV 突增 | 直播间 GMV 高于同平台近 50 场均值 2 倍 |
| 高转化 | 转化率高于 P90 |
| 低效流量 | 峰值观众高于 P80 且转化率低于 P30 |
| 高退货风险 | 主播退货率高于 P90 |
| 品类增长 | 品类今日 GMV 高于近 7 日均值 1.5 倍 |

### 6.6 前端页面设计

新增文件：

- `src/pages/app/Monitor.tsx`

页面结构：

- PageHero：`01·OVERVIEW · MONITOR`
- KPI：今日预警数、高风险主播、机会直播间、异常品类。
- Alert 列表：按 level 分类展示。
- 图表：风险主播条形图、机会直播间表格。

### 6.7 验收标准

- 菜单可进入监控页。
- 至少展示 4 类异常。
- 异常项可点击跳转到直播间或主播详情。
- 后端异常规则可稳定返回数据。

## 7. 功能四：商品详情页增强

### 7.1 背景

当前商品库已有商品列表和商品详情 API，但商品详情的业务价值还可以增强。商品应成为连接“品类、直播、主播、推荐”的中心节点。

### 7.2 功能目标

新增或增强商品详情页：

- 商品基本信息。
- 收藏状态和收藏操作。
- 商品出现过的直播间。
- 商品销售表现。
- 相似商品推荐。
- 推荐解释。

### 7.3 新增路由

```text
/app/products/:id
```

### 7.4 后端接口调整

沿用：

```text
GET /api/product/<id>/
```

建议扩展返回：

```json
{
  "code": 0,
  "data": {
    "id": 101,
    "name": "轻奢保湿精华套装",
    "category_name": "美妆",
    "brand": "MIST",
    "price": 199,
    "sales": 12890,
    "rating": 4.8,
    "favorited": 1,
    "live_streams": [
      {
        "id": 88,
        "title": "春季美妆专场",
        "anchor_name": "小鹿",
        "platform": "douyin",
        "sold_qty": 320,
        "sold_gmv": 63680
      }
    ],
    "similar_products": []
  }
}
```

### 7.5 前端页面设计

新增文件：

- `src/pages/app/ProductDetail.tsx`

页面结构：

- Hero：商品名、品牌、品类、收藏按钮。
- KPI：价格、销量、评分、出现直播场次。
- 图表：关联直播 GMV 排名。
- 表格：出现过的直播间。
- 商品卡片：相似商品。

### 7.6 验收标准

- 商品库点击商品可进入详情页。
- 商品详情页可收藏或取消收藏。
- 关联直播间可点击进入直播详情。
- 数据为空时显示专业空状态。

## 8. 功能五：大盘自动刷新

### 8.1 背景

项目定位是实时电商直播趋势分析平台，大盘页面应体现“实时”。

### 8.2 功能目标

- Overview 页面支持自动刷新。
- 用户可开关自动刷新。
- 展示最后更新时间。
- 刷新时不造成页面跳动。

### 8.3 前端实现建议

调整页面：

- `src/pages/app/Overview.tsx`

新增状态：

```ts
const [autoRefresh, setAutoRefresh] = useState(true)
const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
```

刷新策略：

- 默认每 30 秒刷新一次。
- 用户离开页面后清除 timer。
- 刷新失败时保留旧数据，并显示轻量提示。

### 8.4 后端调整

第一阶段无需新增接口，沿用现有 dashboard API。

后续可新增：

```text
GET /api/dashboard/realtime/
```

用于一次性返回 Overview 所需的所有数据，减少并发请求数量。

### 8.5 验收标准

- Overview 显示最后更新时间。
- 可开关自动刷新。
- 自动刷新不会重置用户滚动位置。
- API 失败时页面不白屏。

## 9. 功能六：筛选排序增强

### 9.1 背景

当前列表页有基础筛选，但运营场景通常需要更丰富的排序和区间筛选。

### 9.2 商品库增强

新增筛选：

- 价格区间。
- 销量区间。
- 评分区间。
- 品牌。
- 排序：销量、价格、评分、创建时间。

### 9.3 直播间增强

新增筛选：

- 时间范围。
- GMV 区间。
- 峰值观众区间。
- 转化率区间。
- 排序：GMV、开播时间、转化率、观众数。

### 9.4 主播榜增强

新增筛选：

- 平台。
- 粉丝区间。
- 平均 GMV 区间。
- 退货率区间。
- 排序：综合分、GMV、粉丝数、退货率。

### 9.5 接口设计原则

列表接口统一支持：

```text
page
limit
sort_by
sort_order
```

示例：

```text
GET /api/product/list/?keyword=口红&min_price=50&max_price=300&sort_by=sales&sort_order=desc&page=1&limit=24
```

### 9.6 验收标准

- 前端筛选条件和 URL 查询参数可以同步。
- 后端对非法排序字段有白名单保护。
- 分页、筛选、排序组合后结果稳定。

## 10. 功能七：报表导出增强

### 10.1 背景

当前已有商品 CSV 导出接口，但数据分析平台通常需要导出更多业务报表。

### 10.2 新增导出项

建议新增：

- 商品列表导出。
- 主播榜导出。
- 直播间列表导出。
- 预测结果导出。
- 用户收藏导出。

### 10.3 接口设计

```text
GET /api/export/products.csv
GET /api/export/anchors.csv
GET /api/export/livestreams.csv
GET /api/export/predict.csv
```

导出接口应复用当前页面筛选条件。

### 10.4 验收标准

- 导出的 CSV 可用 Excel 打开。
- 中文字段不乱码，建议使用 UTF-8 BOM。
- 导出内容和当前筛选条件一致。

## 11. 工程优化项

### 11.1 安全优化

当前用户密码存储在自定义字段 `pass_word` 中，建议改为哈希：

- 使用 Django `make_password` 和 `check_password`。
- 新注册用户写入哈希。
- 兼容旧明文密码：首次登录成功后迁移为哈希。

### 11.2 配置优化

建议新增 `.env`：

```text
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=taotrend
MYSQL_USER=root
MYSQL_PASSWORD=root
DJANGO_SECRET_KEY=...
```

后端 `settings.py` 从环境变量读取。

### 11.3 性能优化

- 前端路由使用 `React.lazy` 拆包。
- 后端列表接口增加必要索引。
- Dashboard 聚合结果可短暂缓存 30 秒。
- 推荐接口避免 `order_by('?')` 在大数据量下拖慢查询。

### 11.4 开发体验优化

- 新增 Windows 启动脚本。
- 新增 `docker-compose.yml` 启动 MySQL。
- 新增后端 smoke test。
- README 增加 PowerShell 启动说明。

## 12. 建议开发顺序

### 第一阶段：智能解释能力

1. 后端新增用户画像计算方法。
2. 后端扩展推荐结果，增加 `reason` 和 `strategy`。
3. 前端推荐页增加画像和推荐理由。
4. 扩展销量预测返回解释字段。
5. 前端预测页增加解释面板。

### 第二阶段：运营监控能力

1. 后端新增异常规则计算。
2. 新增监控 API。
3. 前端新增 Monitor 页面。
4. 菜单和路由接入。
5. 支持从异常项跳转详情页。

### 第三阶段：商品链路完善

1. 新增 ProductDetail 页面。
2. 商品库卡片接入详情跳转。
3. 商品详情 API 扩展关联直播和相似商品。
4. 商品详情页接入收藏操作。

### 第四阶段：体验与工程优化

1. Overview 自动刷新。
2. 列表筛选排序增强。
3. 报表导出增强。
4. 密码哈希和环境变量改造。
5. 路由懒加载和性能优化。

## 13. 验收清单

### 13.1 功能验收

- 推荐页能解释为什么推荐每个商品。
- 销量预测能展示可信度和影响因素。
- 监控页能发现至少 4 类异常。
- 商品详情页能串联商品、直播间、主播和推荐。
- Overview 能自动刷新并显示更新时间。

### 13.2 数据验收

- 新接口返回 `code` 字段，和现有风格一致。
- 分页接口返回 `count`、`page`、`limit`、`data`。
- 登录态接口未登录时返回 401。
- 空数据场景有明确返回，不抛 500。

### 13.3 前端验收

- 所有新增页面接入 `ProtectedRoute`。
- 暗色主题统一。
- loading、error、empty 状态完整。
- 表格分页、筛选、排序行为稳定。
- 页面不出现明显布局溢出。

### 13.4 工程验收

- `npm run build` 通过。
- 后端 `python manage.py check` 通过。
- 新增接口可用测试账号 `test001 / 123456` 验证。
- git 工作区只包含本次功能相关改动。

## 14. 风险与注意事项

### 14.1 推荐解释风险

推荐算法当前基于收藏行为，部分用户收藏数据少时协同过滤分数会偏低。因此需要清晰标记 fallback 来源，避免给用户造成“算法很确定”的错觉。

### 14.2 预测可信度风险

当前预测本质上是基于历史样本的统计估计，不是训练出来的机器学习模型。文案应使用“预测”“估算”“样本参考”，不要宣称绝对准确。

### 14.3 性能风险

商品量已有 25,000 条，随机排序、复杂聚合、无索引筛选可能影响响应速度。新增接口应尽量：

- 使用 `select_related`。
- 控制返回数量。
- 避免全表 Python 循环。
- 对常用筛选字段加索引。

### 14.4 视觉一致性风险

新增页面应遵守 `PAGES_SPEC.md` 的视觉原则：

- 每页最多一个重装饰效果。
- 使用 `PageHero`、`KpiTile`、`ChartCard` 等现有组件。
- 不新增大面积不一致的配色。

## 15. 开发任务拆分建议

| 任务 | 文件范围 | 复杂度 |
|---|---|---|
| 推荐结果增加解释字段 | `server/core/recommend.py`, `server/core/api.py`, `src/api/types.ts`, `src/pages/app/Recommend.tsx` | 中 |
| 用户画像接口 | `server/core/api.py`, `server/taotrend/urls.py`, `src/api/services.ts` | 中 |
| 预测解释字段 | `server/core/api.py`, `src/pages/app/SalesPredict.tsx` | 中 |
| 监控页与接口 | `server/core/api.py`, `server/taotrend/urls.py`, `src/pages/app/Monitor.tsx`, `src/App.tsx`, `src/layouts/menu.tsx` | 中高 |
| 商品详情页 | `src/pages/app/ProductDetail.tsx`, `src/pages/app/Products.tsx`, `server/core/api.py` | 中 |
| 自动刷新 | `src/pages/app/Overview.tsx` | 低 |
| 筛选排序增强 | 列表页 + 对应 API | 中 |
| 密码哈希 | `server/core/api.py`, `server/core/models.py` 可不改字段 | 中 |

## 16. 推荐先做的最小闭环

为了快速看到效果，建议先实现以下最小闭环：

1. `/api/me/profile/`
2. `/api/me/recommend_explain/`
3. 推荐页画像卡片。
4. 推荐卡片理由文案。
5. 销量预测解释字段。
6. 销量预测解释面板。

完成后，系统可以明确展示：

- 用户喜欢什么。
- 为什么推荐这些商品。
- 为什么预测这个销量。
- 预测结果有多可信。

这组功能最贴合“趋势分析与商品智能推荐平台”的主题，也最适合作为下一步开发起点。
