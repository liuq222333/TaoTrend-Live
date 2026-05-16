"""TaoTrend Live URL Configuration (22 endpoints)."""
from django.contrib import admin
from django.urls import path

from core import api


urlpatterns = [
    path('admin/', admin.site.urls),

    # ----- 4.1 鉴权（5） -----
    path('api/auth/login/', api.api_login),
    path('api/auth/register/', api.api_register),
    path('api/auth/logout/', api.api_logout),
    path('api/auth/me/', api.api_me),
    path('api/auth/update/', api.api_update_info),

    # ----- 4.2 仪表盘（4） -----
    path('api/dashboard/overview/', api.api_dashboard_overview),
    path('api/dashboard/gmv_trend/', api.api_dashboard_gmv_trend),
    path('api/dashboard/platform_share/', api.api_dashboard_platform_share),
    path('api/dashboard/category_share/', api.api_dashboard_category_share),

    # ----- 4.3 品类分析（3） -----
    path('api/category/list/', api.api_category_list),
    path('api/category/heatmap/', api.api_category_heatmap),
    path('api/category/top_growth/', api.api_category_top_growth),
    path('api/category/opportunity/', api.api_category_opportunity),

    # ----- 4.4 直播间 & 主播（4） -----
    path('api/livestream/list/', api.api_livestream_list),
    path('api/livestream/<int:live_id>/', api.api_livestream_detail),
    path('api/anchor/list/', api.api_anchor_list),
    path('api/anchor/leaderboard/', api.api_anchor_leaderboard),
    path('api/anchor/<int:anchor_id>/risk_profile/', api.api_anchor_risk_profile),
    path('api/anchor/<int:anchor_id>/', api.api_anchor_detail),

    # ----- 4.4+ 运营监控 -----
    path('api/monitor/summary/', api.api_monitor_summary),
    path('api/monitor/alerts/', api.api_monitor_alerts),
    path('api/monitor/live_spikes/', api.api_monitor_live_spikes),
    path('api/monitor/risk_anchors/', api.api_monitor_risk_anchors),

    # ----- 4.5 商品（3） -----
    path('api/product/list/', api.api_product_list),
    path('api/product/toggle_favorite/', api.api_product_toggle_favorite),
    path('api/product/<int:product_id>/', api.api_product_detail),

    # ----- 4.6 个性化（3） -----
    path('api/me/favorites/', api.api_me_favorites),
    path('api/me/browse_history/', api.api_me_browse_history),
    path('api/me/profile/', api.api_me_profile),
    path('api/me/recommend/', api.api_me_recommend),
    path('api/me/recommend_explain/', api.api_me_recommend_explain),

    # ----- 4.7 智能（2） -----
    path('api/intel/sales_predict/', api.api_intel_sales_predict),
    path('api/intel/wordcloud/', api.api_intel_wordcloud),

    # ----- 4.8 导出（1） -----
    path('api/export/products.csv', api.api_export_products),
    path('api/export/anchors.csv', api.api_export_anchors),
    path('api/export/livestreams.csv', api.api_export_livestreams),
    path('api/export/predict.csv', api.api_export_predict),
]
