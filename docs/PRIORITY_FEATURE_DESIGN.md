# TaoTrend Live · 高/中优先级功能开发设计文档

> 状态：开发设计稿  
> 更新日期：2026-05-16  
> 范围：只覆盖下一阶段高优先级和中优先级功能，不包含低优先级工程体验项。  
> 当前基线：推荐解释、用户画像、销量预测解释已完成第一版。

## 1. 目标与边界

本阶段目标是把 TaoTrend Live 从“数据展示 + 智能推荐”继续升级为“运营决策辅助平台”。功能设计重点放在两类价值上：

1. 主动发现风险与机会，而不是只让用户自己看图表。
2. 打通商品、直播间、主播、品类之间的分析链路。

本阶段不重构技术栈，不新增大型外部服务，不引入复杂机器学习训练流程。所有功能优先复用当前 MySQL 数据、Django API、React 页面和 ECharts 可视化。

## 2. 优先级总览

### 2.1 高优先级

| 编号 | 功能 | 路由 / 入口 | 核心价值 |
|---|---|---|---|
| H1 | 直播异常监控页 | `/app/monitor` | 主动发现 GMV 突增、高转化、低效流量、高退货风险 |
| H2 | 商品详情页增强 | `/app/products/:id` | 让商品成为连接直播、主播、推荐、收藏的中心节点 |
| H3 | 大盘自动刷新 | `/app/overview` | 强化实时直播趋势平台定位 |

### 2.2 中优先级

| 编号 | 功能 | 路由 / 入口 | 核心价值 |
|---|---|---|---|
| M1 | 列表筛选排序增强 | 商品、直播间、主播页 | 提升运营查询效率 |
| M2 | 报表导出增强 | 列表页导出按钮 | 支持运营复盘和外部分析 |
| M3 | 风险主播画像 | 主播详情 / 监控页 | 识别高退货、低转化、高流量低效率主播 |
| M4 | 品类机会分析 | `/app/categories/opportunity` | 发现高增长、低竞争、高客单价机会品类 |

## 3. 统一设计原则

### 3.1 API 规范

新增 API 继续遵守当前风格：

```json
{
  "code": 0,
  "data": {}
}
```

列表类接口统一返回：

```json
{
  "code": 0,
  "count": 100,
  "page": 1,
  "limit": 20,
  "data": []
}
```

错误返回：

```json
{
  "code": 1,
  "msg": "错误原因"
}
```

未登录返回：

```json
{
  "code": 401,
  "msg": "未登录"
}
```

### 3.2 前端规范

新增页面统一使用：

- `PageHero`
- `KpiTile`
- `ChartCard`
- AntD `Table` / `Select` / `Input` / `DatePicker` / `Button`
- 暗色主题，不新增大面积新配色
- 每页最多一个强视觉装饰
- loading、error、empty 状态完整

### 3.3 文件落点

后端：

- API：`server/core/api.py`
- URL：`server/taotrend/urls.py`
- 复杂算法可单独新建：`server/core/monitor.py`、`server/core/opportunity.py`

前端：

- 类型：`src/api/types.ts`
- 服务：`src/api/services.ts`
- 路由：`src/App.tsx`
- 菜单：`src/layouts/menu.tsx`
- 页面：`src/pages/app/*.tsx`

## 4. H1 直播异常监控页

### 4.1 功能目标

新增运营监控页面，自动识别直播业务中的机会和风险：

- GMV 突增直播间
- 高转化直播间
- 高流量低转化直播间
- 高退货风险主播
- 异常增长品类

### 4.2 新增路由与菜单

前端路由：

```text
/app/monitor
```

菜单建议放在 `01 · OVERVIEW` 分组下：

```ts
{ key: '/app/monitor', label: 'MONITOR', icon: <AlertOutlined /> }
```

页面文件：

```text
src/pages/app/Monitor.tsx
```

### 4.3 后端接口设计

新增接口：

```text
GET /api/monitor/summary/
GET /api/monitor/alerts/
GET /api/monitor/live_spikes/
GET /api/monitor/risk_anchors/
```

#### 4.3.1 `/api/monitor/summary/`

返回监控页顶部 KPI。

```json
{
  "code": 0,
  "data": {
    "alert_count": 24,
    "high_risk_count": 6,
    "opportunity_count": 12,
    "category_signal_count": 5
  }
}
```

#### 4.3.2 `/api/monitor/alerts/`

返回统一预警流。

```json
{
  "code": 0,
  "data": [
    {
      "id": "gmv_spike_1208",
      "type": "gmv_spike",
      "level": "high",
      "title": "直播间 GMV 高速增长",
      "message": "抖音直播间「春季美妆专场」GMV 高于同平台均值 2.3 倍",
      "target_type": "livestream",
      "target_id": 1208,
      "metric": 2.3,
      "created_at": "2026-05-16T16:00:00+08:00"
    }
  ]
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | string | `gmv_spike` / `high_conversion` / `low_efficiency` / `return_risk` / `category_growth` |
| `level` | string | `high` / `medium` / `low` |
| `target_type` | string | `livestream` / `anchor` / `category` |
| `target_id` | number | 跳转详情页使用 |
| `metric` | number | 异常强度 |

#### 4.3.3 `/api/monitor/live_spikes/`

返回直播机会榜。

```json
{
  "code": 0,
  "data": [
    {
      "id": 1208,
      "title": "春季美妆专场",
      "platform": "douyin",
      "anchor_id": 18,
      "anchor_name": "小鹿",
      "gmv": 1280000,
      "conversion_rate": 0.184,
      "peak_audience": 82000,
      "spike_ratio": 2.3,
      "signal": "gmv_spike"
    }
  ]
}
```

#### 4.3.4 `/api/monitor/risk_anchors/`

返回风险主播榜。

```json
{
  "code": 0,
  "data": [
    {
      "id": 42,
      "nickname": "潮流一哥",
      "platform": "taobao",
      "fans": 2100000,
      "return_rate": 0.31,
      "avg_gmv": 320000,
      "risk_score": 86.5,
      "risk_reasons": ["退货率高于 P90", "近 10 场转化率低于均值"]
    }
  ]
}
```

### 4.4 异常规则

| 规则 | 计算方式 | level |
|---|---|---|
| GMV 突增 | 直播 GMV > 同平台近 50 场均值 × 2 | high |
| 高转化 | 转化率 >= 全站 P90 | medium |
| 低效流量 | 峰值观众 >= P80 且转化率 <= P30 | high |
| 高退货风险 | 主播退货率 >= P90 | high |
| 品类异常增长 | 本周 GMV > 上周 GMV × 1.5 | medium |

### 4.5 前端页面结构

页面模块：

1. `PageHero`
   - eyebrow：`01·OVERVIEW · MONITOR`
   - title：`SIGNAL MONITOR`
   - description：主动识别直播机会和风险。
2. KPI 四宫格
   - 今日预警
   - 高风险主播
   - 机会直播间
   - 异常品类
3. 预警流
   - 按 level 显示高、中、低风险标签
   - 点击跳转详情
4. 机会直播间表格
   - 直播间、平台、主播、GMV、转化率、异常倍数
5. 风险主播表格
   - 主播、平台、粉丝、退货率、风险分、原因

### 4.6 改动文件

```text
server/core/api.py
server/core/monitor.py
server/taotrend/urls.py
src/api/types.ts
src/api/services.ts
src/App.tsx
src/layouts/menu.tsx
src/pages/app/Monitor.tsx
```

### 4.7 验收标准

- `/app/monitor` 可从侧边栏进入。
- 页面至少展示 4 类异常信号。
- 预警项可跳转到直播详情、主播详情或品类页。
- 空数据时展示“当前无异常信号”。
- `npm run build` 通过。
- `python manage.py check` 通过。

## 5. H2 商品详情页增强

### 5.1 功能目标

把商品从“列表项”升级为完整分析对象，展示商品与直播、主播、相似商品、收藏行为的关系。

### 5.2 新增路由

```text
/app/products/:id
```

新增页面文件：

```text
src/pages/app/ProductDetail.tsx
```

商品库卡片点击后跳转到详情页。

### 5.3 后端接口设计

沿用并扩展：

```text
GET /api/product/<product_id>/
```

返回结构：

```json
{
  "code": 0,
  "data": {
    "id": 101,
    "name": "轻奢保湿精华套装",
    "category": 3,
    "category_name": "美妆-护肤",
    "brand": "MIST",
    "price": 199,
    "sales": 12890,
    "rating": 4.8,
    "image_seed": "p101",
    "favorited": 1,
    "fav_count": 32,
    "live_count": 12,
    "total_sold_qty": 3200,
    "total_sold_gmv": 636800,
    "recent_lives": [],
    "similar_products": []
  }
}
```

`recent_lives` 子项：

```json
{
  "id": 88,
  "title": "春季美妆专场",
  "platform": "douyin",
  "anchor_id": 7,
  "anchor_name": "小鹿",
  "start_at": "2026-05-12T20:00:00+08:00",
  "sold_qty": 320,
  "sold_gmv": 63680
}
```

`similar_products` 子项复用 `Product` 结构，增加：

```json
{
  "reason": "同品类高销量商品",
  "score": 78.2
}
```

### 5.4 相似商品规则

第一版不引入复杂模型，使用轻量规则：

1. 同品类商品优先。
2. 价格在当前商品 ±40% 范围内。
3. 排除当前商品。
4. 按销量和评分综合排序。

综合分：

```text
score = sales_rank_score * 0.7 + rating_score * 0.3
```

### 5.5 前端页面结构

1. `PageHero`
   - 商品名
   - 品牌、品类、收藏按钮
2. 商品视觉区
   - 商品占位图
   - 价格、评分、销量
3. KPI 四宫格
   - 累计销量
   - 关联直播场次
   - 直播成交 GMV
   - 收藏人数
4. 关联直播表格
   - 直播间、平台、主播、销量、成交 GMV、开播时间
5. 相似商品区域
   - 复用 ProductCard 或当前卡片视觉

### 5.6 改动文件

```text
server/core/api.py
src/api/types.ts
src/api/services.ts
src/App.tsx
src/pages/app/Products.tsx
src/pages/app/ProductDetail.tsx
```

### 5.7 验收标准

- 商品库点击商品能进入 `/app/products/:id`。
- 页面能展示商品详情、关联直播、相似商品。
- 收藏按钮可用，状态能刷新。
- 浏览商品详情时继续写入 `BrowseLog`。
- 关联直播可跳转到直播详情页。

## 6. H3 大盘自动刷新

### 6.1 功能目标

增强 Overview 页实时感：

- 自动刷新核心数据。
- 展示最后更新时间。
- 支持用户开关自动刷新。
- 刷新失败不清空旧数据。

### 6.2 前端改动

目标文件：

```text
src/pages/app/Overview.tsx
```

新增状态：

```ts
const [autoRefresh, setAutoRefresh] = useState(true)
const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
const [refreshing, setRefreshing] = useState(false)
```

刷新策略：

- 默认 30 秒刷新一次。
- 用户离开页面时清除 timer。
- 手动刷新按钮可立即触发。
- API 失败时保留旧数据，并使用 `message.warning` 轻提示。

### 6.3 可选聚合接口

第一版可以复用现有多个 dashboard API。第二版可新增聚合接口减少请求：

```text
GET /api/dashboard/realtime/
```

返回：

```json
{
  "code": 0,
  "overview": {},
  "gmv_trend": [],
  "platform_share": [],
  "category_share": [],
  "server_time": "2026-05-16T16:00:00+08:00"
}
```

### 6.4 页面交互

Hero extra 区域增加：

- `LIVE · AUTO`
- 自动刷新 Switch
- 手动刷新按钮
- 最后更新时间

### 6.5 验收标准

- 进入 Overview 默认开启自动刷新。
- 每 30 秒刷新数据。
- 关闭开关后不再自动刷新。
- 手动刷新可用。
- 刷新时图表不白屏、不重置布局。

## 7. M1 列表筛选排序增强

### 7.1 功能目标

增强商品、直播间、主播列表的筛选和排序能力，适配运营查询场景。

### 7.2 通用查询参数

列表接口统一支持：

```text
page
limit
sort_by
sort_order
```

`sort_order` 可选：

```text
asc
desc
```

后端必须使用白名单，禁止直接把前端字段拼进 `order_by`。

### 7.3 商品列表增强

接口：

```text
GET /api/product/list/
```

新增参数：

```text
min_sales
max_sales
min_rating
max_rating
brand
sort_by=sales|price|rating|created_at
sort_order=asc|desc
```

前端：

- 商品页筛选条增加销量、评分、品牌、排序。
- 当前筛选条件同步到 URL query。

### 7.4 直播间列表增强

接口：

```text
GET /api/livestream/list/
```

新增参数：

```text
keyword
start_date
end_date
min_gmv
max_gmv
min_audience
max_audience
min_conversion
max_conversion
sort_by=start_at|gmv|conversion_rate|peak_audience
sort_order=asc|desc
```

### 7.5 主播列表增强

接口：

```text
GET /api/anchor/list/
```

新增参数：

```text
keyword
min_fans
max_fans
min_avg_gmv
max_avg_gmv
min_return_rate
max_return_rate
sort_by=fans|avg_gmv|return_rate
sort_order=asc|desc
```

### 7.6 改动文件

```text
server/core/api.py
src/api/types.ts
src/api/services.ts
src/pages/app/Products.tsx
src/pages/app/Livestreams.tsx
src/pages/app/AnchorLeaderboard.tsx
```

### 7.7 验收标准

- 筛选、排序、分页可组合使用。
- 非法排序字段不会导致后端报错。
- 刷新页面后筛选条件可从 URL 恢复。
- 空结果展示 Empty 状态。

## 8. M2 报表导出增强

### 8.1 功能目标

把导出能力从商品扩展到主播、直播间、预测结果，支持运营复盘。

### 8.2 新增接口

```text
GET /api/export/products.csv
GET /api/export/anchors.csv
GET /api/export/livestreams.csv
GET /api/export/predict.csv
```

当前已有 `products.csv`，需要增强为支持筛选条件。

### 8.3 导出规则

- CSV 使用 UTF-8 BOM，避免 Excel 中文乱码。
- 导出最多 5000 行。
- 导出接口复用列表页筛选参数。
- 文件名包含业务名和日期。

示例文件名：

```text
taotrend_livestreams_20260516.csv
```

### 8.4 前端入口

列表页右上角增加导出按钮：

- 商品库：导出商品
- 直播间：导出直播间
- 主播榜：导出主播榜
- 预测页：导出本次预测结果

### 8.5 验收标准

- CSV 可直接用 Excel 打开。
- 中文不乱码。
- 导出数据与当前筛选条件一致。
- 大数据量导出不会导致服务卡死。

## 9. M3 风险主播画像

### 9.1 功能目标

在主播详情和监控页提供风险判断，帮助运营识别“不适合合作”的主播。

### 9.2 接口设计

新增接口：

```text
GET /api/anchor/<anchor_id>/risk_profile/
```

返回：

```json
{
  "code": 0,
  "data": {
    "anchor_id": 42,
    "risk_score": 86.5,
    "risk_level": "high",
    "return_rate_rank": 0.93,
    "conversion_rank": 0.22,
    "gmv_stability": 0.41,
    "recent_stream_count": 10,
    "risk_reasons": [
      "退货率高于 90% 主播",
      "近 10 场直播转化率低于平台均值"
    ],
    "suggestions": [
      "建议优先小预算测试，不建议直接投放核心商品",
      "合作时应设置退货率观察指标"
    ]
  }
}
```

### 9.3 风险分计算

建议第一版规则：

```text
risk_score =
  return_rate_score * 0.45 +
  low_conversion_score * 0.30 +
  gmv_instability_score * 0.15 +
  low_recent_activity_score * 0.10
```

风险等级：

| 分数 | 等级 |
|---|---|
| 80-100 | high |
| 50-79 | medium |
| 0-49 | low |

### 9.4 前端展示

主播详情页新增模块：

- 风险分 Gauge
- 风险原因列表
- 合作建议
- 近 10 场 GMV 稳定性说明

监控页风险主播表格复用该分数。

### 9.5 改动文件

```text
server/core/api.py
server/core/monitor.py
server/taotrend/urls.py
src/api/types.ts
src/api/services.ts
src/pages/app/AnchorDetail.tsx
src/pages/app/Monitor.tsx
```

### 9.6 验收标准

- 主播详情页能看到风险画像。
- 高风险主播有明确原因。
- 风险分和监控页一致。
- 无近期直播时有合理提示。

## 10. M4 品类机会分析

### 10.1 功能目标

帮助运营发现“值得投入”的品类，而不是只看增长榜。机会品类需要综合增长、竞争、成交、价格空间。

### 10.2 新增路由

```text
/app/categories/opportunity
```

菜单放在 `02 · CATEGORY` 下：

```ts
{ key: '/app/categories/opportunity', label: 'OPPORTUNITY', icon: <BulbOutlined /> }
```

### 10.3 接口设计

新增接口：

```text
GET /api/category/opportunity/
```

返回：

```json
{
  "code": 0,
  "data": [
    {
      "category_id": 3,
      "category_name": "美妆",
      "gmv": 12800000,
      "growth_rate": 0.42,
      "avg_price": 168,
      "stream_count": 420,
      "anchor_count": 56,
      "competition_index": 0.64,
      "conversion_rate": 0.12,
      "opportunity_score": 82.5,
      "reason": "增长快、客单价高、竞争适中"
    }
  ]
}
```

### 10.4 机会分计算

建议第一版：

```text
opportunity_score =
  growth_score * 0.35 +
  gmv_score * 0.20 +
  avg_price_score * 0.15 +
  conversion_score * 0.15 +
  (1 - competition_index) * 0.15
```

竞争指数：

```text
competition_index = normalize(stream_count * 0.6 + anchor_count * 0.4)
```

### 10.5 前端页面结构

1. `PageHero`
   - title：`CATEGORY OPPORTUNITY`
2. KPI
   - 高机会品类数
   - 平均增长率
   - 最高机会分
   - 低竞争品类数
3. 图表
   - 机会分横向条形图
   - 增长率 vs 竞争指数散点图
4. 表格
   - 品类、GMV、增长率、竞争指数、机会分、原因

### 10.6 改动文件

```text
server/core/api.py
server/core/opportunity.py
server/taotrend/urls.py
src/api/types.ts
src/api/services.ts
src/App.tsx
src/layouts/menu.tsx
src/pages/app/CategoryOpportunity.tsx
```

### 10.7 验收标准

- 菜单可进入机会分析页。
- 页面展示机会分、增长率、竞争指数。
- 表格可按机会分排序。
- 数据为空时展示 Empty。

## 11. 推荐开发顺序

### 11.1 第一批：高优先级闭环

1. H1 直播异常监控页
2. H2 商品详情页增强
3. H3 大盘自动刷新

原因：

- H1 直接提升平台主动分析能力。
- H2 打通商品业务链路。
- H3 强化实时平台观感，开发成本低。

### 11.2 第二批：中优先级增强

1. M1 列表筛选排序增强
2. M2 报表导出增强
3. M3 风险主播画像
4. M4 品类机会分析

原因：

- M1 是 M2 的基础，导出需要复用筛选条件。
- M3 可复用 H1 的风险规则。
- M4 可复用品类增长已有逻辑。

## 12. 测试与验收策略

### 12.1 后端 smoke test

每次新增接口后至少验证：

```powershell
.\venv\Scripts\python.exe manage.py check
```

登录态接口用测试账号：

```text
test001 / 123456
```

### 12.2 前端构建

```powershell
npm run build
```

### 12.3 浏览器验证

至少验证：

- 新菜单能打开。
- 页面 loading 结束后有数据。
- 表格分页正常。
- 点击跳转正常。
- 控制台无新增运行时错误。

## 13. 风险与约束

### 13.1 统计规则不是实时流计算

当前数据是 MySQL mock 数据，不是实时 Kafka/Flink 流。页面文案应使用“近 30 天”“当前样本”“模拟实时”等表达，避免过度宣称真实流式计算。

### 13.2 异常规则需要可解释

异常监控必须给出 `reason` 或 `risk_reasons`，不能只给分数。否则用户无法判断行动依据。

### 13.3 查询性能

列表筛选、监控聚合、机会分计算要注意：

- 使用 `select_related`
- 控制返回数量
- 避免大表无条件 Python 循环
- 对高频筛选字段补索引时需要生成 migration

### 13.4 页面复杂度

新增页面不要堆太多装饰。监控页、机会分析页应偏数据工具风格，重点是清晰排序、跳转、解释。

## 14. 最小可交付版本

如果时间有限，建议最小交付：

1. H1 直播异常监控页
   - summary
   - alerts
   - risk anchors
2. H2 商品详情页
   - 商品信息
   - 关联直播
   - 相似商品
3. H3 Overview 自动刷新
4. M1 商品列表排序增强
5. M2 商品、直播间、主播 CSV 导出

这组功能完成后，系统会形成更完整闭环：

```text
大盘发现趋势 -> 监控发现异常 -> 进入直播/主播/商品详情 -> 收藏或推荐 -> 导出复盘
```
