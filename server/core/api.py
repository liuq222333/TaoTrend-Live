"""TaoTrend Live JSON API（22 个端点）。

约定：
- 所有路径以 /api/ 为前缀，统一返回 JsonResponse
- 成功：{"code": 0, ...}
- 失败：{"code": 1, "msg": "..."}
- 未登录：{"code": 401, "msg": "未登录"}，HTTP 401
"""
import csv
import json
import re
from collections import Counter
from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Avg, F, Q
from django.http import JsonResponse, HttpResponse
from django.utils import timezone

from core import models, recommend


# ============================================================
# 工具函数
# ============================================================

def _parse_body(request):
    if request.content_type and 'application/json' in request.content_type:
        try:
            return json.loads((request.body or b'{}').decode('utf-8') or '{}')
        except Exception:
            return {}
    return request.POST


def _require_login(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return None, JsonResponse({'code': 401, 'msg': '未登录'}, status=401)
    return user_id, None


def _int_param(request, key, default):
    try:
        return int(request.GET.get(key, default))
    except Exception:
        return default


def _float_param(request, key, default=None):
    v = request.GET.get(key)
    if v is None or v == '':
        return default
    try:
        return float(v)
    except Exception:
        return default


def _product_to_dict(p):
    return {
        'id': p.id,
        'name': p.name,
        # 前端 Product.category 取数字 id；保留 category_id 别名向后兼容
        'category': p.category_id,
        'category_id': p.category_id,
        'category_name': getattr(p.category, 'name', '') if p.category_id else '',
        'brand': p.brand,
        'price': float(p.price),
        'sales': p.sales,
        'rating': p.rating,
        'image_seed': p.image_seed,
        'created_at': p.created_at.isoformat() if p.created_at else None,
    }


def _anchor_to_dict(a):
    return {
        'id': a.id,
        'nickname': a.nickname,
        'platform': a.platform,
        'fans': a.fans,
        'avg_gmv': float(a.avg_gmv),
        'return_rate': a.return_rate,
        'avatar_seed': a.avatar_seed,
    }


def _live_to_dict(s):
    return {
        'id': s.id,
        'anchor_id': s.anchor_id,
        'anchor_name': getattr(s.anchor, 'nickname', '') if s.anchor_id else '',
        'title': s.title,
        'platform': s.platform,
        'start_at': s.start_at.isoformat() if s.start_at else None,
        'duration_min': s.duration_min,
        'peak_audience': s.peak_audience,
        'gmv': float(s.gmv),
        'conversion_rate': s.conversion_rate,
    }


# ============================================================
# 4.1 鉴权（5）
# ============================================================

def api_login(request):
    if request.method != 'POST':
        return JsonResponse({'code': 1, 'msg': '仅支持 POST'}, status=405)
    data = _parse_body(request)
    user = data.get('user')
    pass_word = data.get('password')
    if not user or not pass_word:
        return JsonResponse({'code': 1, 'msg': '账号和密码必填'})
    if not models.UserAccount.objects.filter(user_id=user).exists():
        return JsonResponse({'code': 1, 'msg': '该账号不存在'})
    user_obj = models.UserAccount.objects.filter(user_id=user, pass_word=pass_word).first()
    if not user_obj:
        return JsonResponse({'code': 1, 'msg': '密码错误'})
    request.session['user_id'] = user
    request.session['user_name'] = user_obj.user_name
    return JsonResponse({
        'code': 0, 'msg': '登录成功',
        'user_id': user, 'user_name': user_obj.user_name,
        'avatar_seed': user_obj.avatar_seed,
    })


def api_register(request):
    if request.method != 'POST':
        return JsonResponse({'code': 1, 'msg': '仅支持 POST'}, status=405)
    data = _parse_body(request)
    user = data.get('user')
    pass_word = data.get('password')
    user_name = data.get('user_name')
    if not user or not pass_word or not user_name:
        return JsonResponse({'code': 1, 'msg': '账号、密码、用户名必填'})
    if models.UserAccount.objects.filter(user_id=user).exists():
        return JsonResponse({'code': 1, 'msg': '该账号已存在'})
    models.UserAccount.objects.create(
        user_id=user, user_name=user_name, pass_word=pass_word,
        avatar_seed=user,
    )
    request.session['user_id'] = user
    request.session['user_name'] = user_name
    return JsonResponse({
        'code': 0, 'msg': '注册成功',
        'user_id': user, 'user_name': user_name, 'avatar_seed': user,
    })


def api_logout(request):
    request.session.flush()
    return JsonResponse({'code': 0, 'msg': '已退出'})


def api_me(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return JsonResponse({'code': 401, 'msg': '未登录'}, status=401)
    user_obj = models.UserAccount.objects.filter(user_id=user_id).first()
    if not user_obj:
        return JsonResponse({'code': 401, 'msg': '账号已失效'}, status=401)
    return JsonResponse({
        'code': 0, 'user_id': user_obj.user_id, 'user_name': user_obj.user_name,
        'avatar_seed': user_obj.avatar_seed,
        'created_at': user_obj.created_at.isoformat() if user_obj.created_at else None,
    })


def api_update_info(request):
    user_id, err = _require_login(request)
    if err:
        return err
    if request.method != 'POST':
        return JsonResponse({'code': 1, 'msg': '仅支持 POST'}, status=405)
    data = _parse_body(request)
    user_name = data.get('user_name')
    old_pass = data.get('old_pass')
    pass_word = data.get('pass_word')
    user_obj = models.UserAccount.objects.filter(user_id=user_id).first()
    if not user_obj:
        return JsonResponse({'code': 1, 'msg': '用户不存在'})
    if old_pass != user_obj.pass_word:
        return JsonResponse({'code': 1, 'msg': '原密码错误'})
    user_obj.user_name = user_name or user_obj.user_name
    user_obj.pass_word = pass_word or user_obj.pass_word
    user_obj.save()
    if user_name:
        request.session['user_name'] = user_name
    return JsonResponse({'code': 0, 'msg': '修改成功'})


# ============================================================
# 4.2 仪表盘（4）
# ============================================================

def api_dashboard_overview(request):
    total_gmv = models.LiveStream.objects.aggregate(s=Sum('gmv'))['s'] or 0
    total_anchors = models.Anchor.objects.count()
    total_products = models.Product.objects.count()
    total_streams = models.LiveStream.objects.count()

    now = timezone.now()
    last7 = now - timedelta(days=7)
    last7_gmv = float(models.LiveStream.objects.filter(start_at__gte=last7).aggregate(s=Sum('gmv'))['s'] or 0)
    prev7_start = now - timedelta(days=14)
    prev7_gmv = float(
        models.LiveStream.objects
        .filter(start_at__gte=prev7_start, start_at__lt=last7)
        .aggregate(s=Sum('gmv'))['s'] or 0
    )
    yoy_gmv = ((last7_gmv - prev7_gmv) / prev7_gmv) if prev7_gmv > 0 else None
    last7_streams = models.LiveStream.objects.filter(start_at__gte=last7).count()
    prev7_streams = models.LiveStream.objects.filter(start_at__gte=prev7_start, start_at__lt=last7).count()
    yoy_streams = ((last7_streams - prev7_streams) / prev7_streams) if prev7_streams > 0 else None

    return JsonResponse({
        'code': 0,
        'total_gmv': float(total_gmv),
        'total_anchors': total_anchors,
        'total_products': total_products,
        'total_streams': total_streams,
        'yoy_gmv': round(yoy_gmv, 4) if yoy_gmv is not None else None,
        'yoy_streams': round(yoy_streams, 4) if yoy_streams is not None else None,
        # 旧字段保留向后兼容
        'anchor_count': total_anchors,
        'product_count': total_products,
        'live_count': total_streams,
        'last7_gmv': last7_gmv,
        'last30_gmv': float(models.LiveStream.objects.filter(start_at__gte=now - timedelta(days=30)).aggregate(s=Sum('gmv'))['s'] or 0),
    })


def api_dashboard_gmv_trend(request):
    """最近 90 天的 GMV 趋势。返回 [{date, gmv}, ...]"""
    now = timezone.now()
    start = (now - timedelta(days=89)).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = list(
        models.LiveStream.objects
        .filter(start_at__gte=start)
        .values_list('start_at', 'gmv')
    )
    buckets = {}
    for i in range(90):
        d = (start + timedelta(days=i)).date()
        buckets[d.isoformat()] = 0.0
    for start_at, gmv in rows:
        d = timezone.localtime(start_at).date().isoformat()
        if d in buckets:
            buckets[d] += float(gmv)
    dates = sorted(buckets.keys())
    return JsonResponse({
        'code': 0,
        'data': [{'date': d, 'gmv': round(buckets[d], 2)} for d in dates],
    })


def api_dashboard_platform_share(request):
    rows = (
        models.LiveStream.objects.values('platform')
        .annotate(gmv=Sum('gmv'), count=Count('id'))
    )
    data = [
        {'name': r['platform'], 'value': float(r['gmv'] or 0), 'count': r['count']}
        for r in rows
    ]
    return JsonResponse({'code': 0, 'data': data})


def api_dashboard_category_share(request):
    """一级品类（parent IS NULL）销售额占比，返回 [{name, value}]。"""
    cats = list(models.Category.objects.filter(parent__isnull=True))
    out = []
    for c in cats:
        sub_ids = list(models.Category.objects.filter(parent=c).values_list('id', flat=True))
        all_ids = [c.id] + sub_ids
        s = (
            models.Product.objects.filter(category_id__in=all_ids)
            .aggregate(total=Sum(F('price') * F('sales')))['total']
        ) or 0
        out.append({'name': c.name, 'value': float(s), 'icon': c.icon_glyph, 'category_id': c.id})
    out.sort(key=lambda x: x['value'], reverse=True)
    return JsonResponse({'code': 0, 'data': out})


# ============================================================
# 4.3 品类分析（3）
# ============================================================

def api_category_list(request):
    parents = list(models.Category.objects.filter(parent__isnull=True).order_by('id'))
    out = []
    for p in parents:
        children = list(models.Category.objects.filter(parent=p).order_by('id'))
        out.append({
            'id': p.id, 'name': p.name, 'icon': p.icon_glyph,
            'children': [
                {'id': c.id, 'name': c.name, 'icon': c.icon_glyph} for c in children
            ],
        })
    return JsonResponse({'code': 0, 'data': out})


def api_category_heatmap(request):
    """24h × 8 一级品类 热度图（按 LiveStreamProduct sold_qty 聚合）。"""
    cats = list(models.Category.objects.filter(parent__isnull=True).order_by('id'))
    cat_map = {c.id: c.name for c in cats}
    # 构建二级品类 → 一级品类 的反查
    sub_to_parent = {}
    for c in cats:
        sub_to_parent[c.id] = c.id
    for child in models.Category.objects.filter(parent__isnull=False):
        sub_to_parent[child.id] = child.parent_id

    # 取最近 30 天的销售数据按小时聚合
    since = timezone.now() - timedelta(days=30)
    rows = (
        models.LiveStreamProduct.objects
        .filter(live__start_at__gte=since)
        .values('product__category_id', 'live__start_at')
        .annotate(qty=Sum('sold_qty'))
    )
    matrix = {(cat.id, h): 0 for cat in cats for h in range(24)}
    for r in rows:
        sub_cid = r['product__category_id']
        parent_cid = sub_to_parent.get(sub_cid)
        if parent_cid is None:
            continue
        if r['live__start_at'] is None:
            continue
        hour = timezone.localtime(r['live__start_at']).hour
        key = (parent_cid, hour)
        if key in matrix:
            matrix[key] += int(r['qty'] or 0)
    cells = []
    for ci, c in enumerate(cats):
        for h in range(24):
            cells.append([h, ci, matrix[(c.id, h)]])
    return JsonResponse({
        'code': 0,
        'categories': [c.name for c in cats],
        'hours': list(range(24)),
        'data': cells,
    })


def api_category_top_growth(request):
    """一级品类增长率 Top：本周 vs 上周 GMV。"""
    now = timezone.now()
    this_week_start = now - timedelta(days=7)
    last_week_start = now - timedelta(days=14)

    cats = list(models.Category.objects.filter(parent__isnull=True))
    out = []
    for c in cats:
        sub_ids = list(models.Category.objects.filter(parent=c).values_list('id', flat=True))
        all_ids = [c.id] + sub_ids
        this_w = (
            models.LiveStreamProduct.objects
            .filter(product__category_id__in=all_ids, live__start_at__gte=this_week_start)
            .aggregate(s=Sum('sold_gmv'))['s']
        ) or 0
        last_w = (
            models.LiveStreamProduct.objects
            .filter(
                product__category_id__in=all_ids,
                live__start_at__gte=last_week_start,
                live__start_at__lt=this_week_start,
            ).aggregate(s=Sum('sold_gmv'))['s']
        ) or 0
        this_w = float(this_w)
        last_w = float(last_w)
        if last_w > 0:
            growth = (this_w - last_w) / last_w * 100
        elif this_w > 0:
            growth = 100.0
        else:
            growth = 0.0
        out.append({
            'category': c.name,
            'gmv': round(this_w, 2),
            'growth': round(growth, 2),  # 百分比，前端按 % 直接展示
            # 旧字段保留
            'category_id': c.id,
            'icon': c.icon_glyph,
            'this_week': round(this_w, 2),
            'last_week': round(last_w, 2),
            'growth_rate': round(growth, 2),
        })
    out.sort(key=lambda x: abs(x['growth']), reverse=True)
    return JsonResponse({'code': 0, 'data': out})


# ============================================================
# 4.4 直播间 & 主播（4）
# ============================================================

def api_livestream_list(request):
    platform = request.GET.get('platform', '').strip()
    page = max(1, _int_param(request, 'page', 1))
    limit = min(100, max(1, _int_param(request, 'limit', 20)))

    qs = models.LiveStream.objects.select_related('anchor').order_by('-start_at')
    if platform:
        qs = qs.filter(platform=platform)
    total = qs.count()
    paged = list(qs[(page - 1) * limit:page * limit])
    return JsonResponse({
        'code': 0,
        'count': total,
        'page': page,
        'limit': limit,
        'data': [_live_to_dict(s) for s in paged],
    })


def api_livestream_detail(request, live_id):
    live = models.LiveStream.objects.select_related('anchor').filter(id=live_id).first()
    if not live:
        return JsonResponse({'code': 1, 'msg': '直播间不存在'}, status=404)
    lp_rows = (
        models.LiveStreamProduct.objects
        .filter(live=live)
        .select_related('product', 'product__category')
    )
    products = []
    for lp in lp_rows:
        p = lp.product
        products.append({
            'id': lp.id,
            'product_id': p.id,
            'product_name': p.name,
            'name': p.name,  # 兼容老字段
            'category_name': p.category.name if p.category_id else '',
            'brand': p.brand,
            'price': float(p.price),
            'sold_qty': lp.sold_qty,
            'sold_gmv': float(lp.sold_gmv),
            'image_seed': p.image_seed,
        })
    live_dict = _live_to_dict(live)
    anchor_dict = _anchor_to_dict(live.anchor) if live.anchor_id else None
    if anchor_dict:
        live_dict['anchor_avatar_seed'] = anchor_dict.get('avatar_seed', '')
    return JsonResponse({
        'code': 0,
        'data': {
            **live_dict,
            'anchor': anchor_dict,
            'products': products,
        },
        # 旧字段保留以兼容
        'live': live_dict,
        'anchor': anchor_dict,
        'products': products,
    })


def api_anchor_list(request):
    platform = request.GET.get('platform', '').strip()
    page = max(1, _int_param(request, 'page', 1))
    limit = min(100, max(1, _int_param(request, 'limit', 20)))

    qs = models.Anchor.objects.all().order_by('-fans')
    if platform:
        qs = qs.filter(platform=platform)
    total = qs.count()
    paged = list(qs[(page - 1) * limit:page * limit])
    return JsonResponse({
        'code': 0,
        'count': total,
        'page': page,
        'limit': limit,
        'data': [_anchor_to_dict(a) for a in paged],
    })


def api_anchor_detail(request, anchor_id):
    """主播详情：主播信息 + 累计指标 + 最近 10 场直播。"""
    anchor = models.Anchor.objects.filter(id=anchor_id).first()
    if not anchor:
        return JsonResponse({'code': 1, 'msg': '主播不存在'}, status=404)
    streams_qs = (
        models.LiveStream.objects.filter(anchor=anchor)
        .order_by('-start_at')
    )
    total_streams = streams_qs.count()
    total_gmv = float(streams_qs.aggregate(s=Sum('gmv'))['s'] or 0)
    recent = list(streams_qs[:10])
    anchor_dict = _anchor_to_dict(anchor)
    anchor_dict['total_streams'] = total_streams
    anchor_dict['total_gmv'] = total_gmv
    return JsonResponse({
        'code': 0,
        'data': anchor_dict,
        'recent_streams': [_live_to_dict(s) for s in recent],
    })


def api_anchor_leaderboard(request):
    """主播榜单 TOP 50，按近 30 天 GMV。返回扁平 anchor + rank/total_gmv/total_streams。"""
    since = timezone.now() - timedelta(days=30)
    rows = (
        models.LiveStream.objects.filter(start_at__gte=since)
        .values('anchor_id')
        .annotate(
            gmv_sum=Sum('gmv'),
            session_count=Count('id'),
            avg_audience=Avg('peak_audience'),
        )
        .order_by('-gmv_sum')[:50]
    )
    anchor_ids = [r['anchor_id'] for r in rows if r['anchor_id']]
    anchors = {a.id: a for a in models.Anchor.objects.filter(id__in=anchor_ids)}
    out = []
    rank = 0
    for r in rows:
        a = anchors.get(r['anchor_id'])
        if not a:
            continue
        rank += 1
        flat = _anchor_to_dict(a)
        flat['rank'] = rank
        flat['total_gmv'] = float(r['gmv_sum'] or 0)
        flat['total_streams'] = r['session_count']
        flat['avg_audience'] = int(r['avg_audience'] or 0)
        # 旧字段兼容
        flat['gmv_sum'] = flat['total_gmv']
        flat['session_count'] = flat['total_streams']
        out.append(flat)
    return JsonResponse({'code': 0, 'data': out})


# ============================================================
# 4.5 商品（3）
# ============================================================

def api_product_list(request):
    keyword = request.GET.get('keyword', '').strip()
    category = _int_param(request, 'category', 0)
    min_price = _float_param(request, 'min_price')
    max_price = _float_param(request, 'max_price')
    page = max(1, _int_param(request, 'page', 1))
    limit = min(100, max(1, _int_param(request, 'limit', 20)))

    qs = models.Product.objects.select_related('category').all()
    if keyword:
        qs = qs.filter(Q(name__icontains=keyword) | Q(brand__icontains=keyword))
    if category:
        # 既支持直接选一级，也支持选二级
        sub_ids = list(models.Category.objects.filter(parent_id=category).values_list('id', flat=True))
        ids = [category] + sub_ids
        qs = qs.filter(category_id__in=ids)
    if min_price is not None:
        qs = qs.filter(price__gte=min_price)
    if max_price is not None:
        qs = qs.filter(price__lte=max_price)
    qs = qs.order_by('-sales')
    total = qs.count()
    paged = list(qs[(page - 1) * limit:page * limit])

    user_id = request.session.get('user_id')
    fav_set = set()
    if user_id:
        ids_on_page = [p.id for p in paged]
        fav_set = set(
            models.FavoriteList.objects
            .filter(user_id=user_id, product_id__in=ids_on_page)
            .values_list('product_id', flat=True)
        )
    data = []
    for p in paged:
        d = _product_to_dict(p)
        d['favorited'] = 1 if p.id in fav_set else 0
        data.append(d)
    return JsonResponse({
        'code': 0, 'count': total, 'page': page, 'limit': limit, 'data': data,
    })


def api_product_detail(request, product_id):
    p = models.Product.objects.select_related('category').filter(id=product_id).first()
    if not p:
        return JsonResponse({'code': 1, 'msg': '商品不存在'}, status=404)

    # 写入浏览日志（如果已登录）
    user_id = request.session.get('user_id')
    if user_id and models.UserAccount.objects.filter(user_id=user_id).exists():
        models.BrowseLog.objects.create(user_id=user_id, product_id=product_id)

    # 最近 5 场带过此商品的直播
    recent_lives = (
        models.LiveStreamProduct.objects.filter(product=p)
        .select_related('live', 'live__anchor')
        .order_by('-live__start_at')[:5]
    )
    lives = []
    for lp in recent_lives:
        s = lp.live
        if not s:
            continue
        lives.append({
            'live_id': s.id,
            'title': s.title,
            'platform': s.platform,
            'anchor_name': s.anchor.nickname if s.anchor_id else '',
            'start_at': s.start_at.isoformat() if s.start_at else None,
            'sold_qty': lp.sold_qty,
            'sold_gmv': float(lp.sold_gmv),
        })
    fav_count = models.FavoriteList.objects.filter(product=p).count()
    favorited = 0
    if user_id:
        favorited = int(
            models.FavoriteList.objects.filter(user_id=user_id, product=p).exists()
        )

    d = _product_to_dict(p)
    d['favorited'] = favorited
    d['fav_count'] = fav_count
    d['recent_lives'] = lives
    return JsonResponse({'code': 0, 'data': d})


def api_product_toggle_favorite(request):
    user_id, err = _require_login(request)
    if err:
        return err
    if request.method != 'POST':
        return JsonResponse({'code': 1, 'msg': '仅支持 POST'}, status=405)
    data = _parse_body(request)
    try:
        pid = int(data.get('product_id'))
    except Exception:
        return JsonResponse({'code': 1, 'msg': 'product_id 必填'})
    if not models.Product.objects.filter(id=pid).exists():
        return JsonResponse({'code': 1, 'msg': '商品不存在'})
    existing = models.FavoriteList.objects.filter(user_id=user_id, product_id=pid).first()
    if existing:
        existing.delete()
        return JsonResponse({'code': 0, 'msg': '已取消收藏', 'favorited': 0})
    models.FavoriteList.objects.create(user_id=user_id, product_id=pid)
    return JsonResponse({'code': 0, 'msg': '收藏成功', 'favorited': 1})


# ============================================================
# 4.6 个性化（3）
# ============================================================

def api_me_favorites(request):
    user_id, err = _require_login(request)
    if err:
        return err
    rows = (
        models.FavoriteList.objects
        .filter(user_id=user_id)
        .select_related('product', 'product__category')
        .order_by('-created_at')
    )
    data = []
    for f in rows:
        p = f.product
        d = _product_to_dict(p)
        d['favorited'] = 1
        d['fav_created_at'] = f.created_at.isoformat() if f.created_at else None
        data.append(d)
    return JsonResponse({'code': 0, 'count': len(data), 'data': data})


def api_me_browse_history(request):
    user_id, err = _require_login(request)
    if err:
        return err
    rows = (
        models.BrowseLog.objects
        .filter(user_id=user_id)
        .select_related('product', 'product__category')
        .order_by('-viewed_at')[:50]
    )
    data = []
    for b in rows:
        p = b.product
        d = _product_to_dict(p)
        d['viewed_at'] = b.viewed_at.isoformat() if b.viewed_at else None
        data.append(d)
    return JsonResponse({'code': 0, 'count': len(data), 'data': data})


def api_me_recommend(request):
    user_id, err = _require_login(request)
    if err:
        return err
    data = recommend.recommend_for_user(user_id, 9)
    return JsonResponse({'code': 0, 'data': data, 'count': len(data)})


# ============================================================
# 4.7 智能（2）
# ============================================================

def api_intel_sales_predict(request):
    """销量/GMV 预测：基于 LiveStreamProduct 历史数据，多条件统计。

    入参（query string）：
      - category: 一级或二级 category_id
      - price: 期望售价
      - anchor_tier: small/medium/big/super（按 fans）
      - duration: 时长（分钟）
    """
    category = _int_param(request, 'category', 0)
    price = _float_param(request, 'price')
    anchor_tier = request.GET.get('anchor_tier', '').strip()
    duration = _int_param(request, 'duration', 0)

    qs = models.LiveStreamProduct.objects.select_related(
        'product', 'live', 'live__anchor'
    ).all()
    if category:
        sub_ids = list(models.Category.objects.filter(parent_id=category).values_list('id', flat=True))
        ids = [category] + sub_ids
        qs = qs.filter(product__category_id__in=ids)
    if price is not None and price > 0:
        # 价格波动 ±40%
        low = price * 0.6
        high = price * 1.4
        qs = qs.filter(product__price__gte=low, product__price__lte=high)
    if anchor_tier:
        tier_ranges = {
            'small': (0, 100_000),
            'medium': (100_000, 1_000_000),
            'big': (1_000_000, 5_000_000),
            'super': (5_000_000, 10**12),
        }
        if anchor_tier in tier_ranges:
            lo, hi = tier_ranges[anchor_tier]
            qs = qs.filter(live__anchor__fans__gte=lo, live__anchor__fans__lt=hi)
    if duration > 0:
        lo = max(0, duration - 30)
        hi = duration + 30
        qs = qs.filter(live__duration_min__gte=lo, live__duration_min__lte=hi)

    sample = list(qs.values_list('sold_qty', 'sold_gmv')[:1000])
    if not sample:
        return JsonResponse({'code': 1, 'msg': '没有匹配的样本'})
    qtys = [s[0] for s in sample if s[0] is not None]
    gmvs = [float(s[1] or 0) for s in sample]
    if not qtys:
        return JsonResponse({'code': 1, 'msg': '样本异常'})
    qtys_sorted = sorted(qtys)
    gmvs_sorted = sorted(gmvs)
    n = len(qtys_sorted)

    def pctl(arr, p):
        if not arr:
            return 0
        idx = int(p * (len(arr) - 1))
        return arr[idx]

    avg_qty = round(sum(qtys) / n, 2)
    median_qty = qtys_sorted[n // 2]
    max_qty = max(qtys)
    min_qty = min(qtys)

    # 分布桶
    buckets = [
        ('<10', 0, 10),
        ('10-50', 10, 50),
        ('50-100', 50, 100),
        ('100-300', 100, 300),
        ('300-1000', 300, 1000),
        ('1000-3000', 1000, 3000),
        ('>3000', 3000, 10**9),
    ]
    dist = []
    for name, lo, hi in buckets:
        dist.append({
            'name': name,
            'value': len([q for q in qtys if lo <= q < hi]),
        })

    # 百分位：用户输入的预期价 × avg_qty 在 gmvs 里排第几？
    if price is not None and price > 0:
        target_gmv = price * avg_qty
        rank = len([g for g in gmvs_sorted if g <= target_gmv])
        percentile = round(rank / max(1, n) * 100, 1)
    else:
        target_gmv = avg_qty * (sum(gmvs) / n / max(1, avg_qty))
        percentile = 50.0

    return JsonResponse({
        'code': 0,
        # 前端契约
        'avg': avg_qty,
        'median': int(median_qty),
        'max': int(max_qty),
        'min': int(min_qty),
        'count': n,
        'percentile': percentile,
        'dist': dist,
        # 旧字段保留以兼容
        'avg_qty': avg_qty,
        'median_qty': int(median_qty),
        'max_qty': int(max_qty),
        'min_qty': int(min_qty),
        'avg_gmv': round(sum(gmvs) / n, 2),
        'estimated_gmv': round(target_gmv, 2),
        'distribution': dist,
    })


def api_intel_wordcloud(request):
    """商品名词云（去掉常见停用词与品牌后做简单 bigram + char 切分）。"""
    rows = list(models.Product.objects.values_list('name', flat=True)[:8000])
    stop = set('的 与 和 及 系列 套装 礼盒 限量 旗舰 经典 新款'.split())
    counter = Counter()
    for name in rows:
        if not name:
            continue
        # 简单切分：中文按 2-3 字滑窗，英文按空格
        s = name.strip()
        # 抽 2 字词
        for i in range(len(s) - 1):
            piece = s[i:i + 2]
            if len(piece) == 2 and piece not in stop and not piece.isspace():
                # 过滤纯数字 / 单字符
                if not re.fullmatch(r'[\d\W_]+', piece):
                    counter[piece] += 1
        # 抽英文整词
        for word in re.findall(r'[A-Za-z]{3,}', s):
            counter[word.lower()] += 1
    top = counter.most_common(100)
    data = [{'name': k, 'value': v} for k, v in top]
    return JsonResponse({'code': 0, 'data': data})


# ============================================================
# 4.8 导出（1）
# ============================================================

def api_export_products(request):
    """导出商品 CSV（限 5000 行避免内存爆）。"""
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = 'attachment; filename="taotrend_products.csv"'
    response.write('﻿')  # BOM for Excel
    writer = csv.writer(response)
    writer.writerow(['ID', '商品名', '品类', '品牌', '价格', '累计销量', '评分'])
    qs = models.Product.objects.select_related('category').order_by('-sales')[:5000]
    for p in qs:
        writer.writerow([
            p.id, p.name,
            p.category.name if p.category_id else '',
            p.brand, float(p.price), p.sales, p.rating,
        ])
    return response
