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
from collections import Counter, defaultdict
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


def _date_param(request, key):
    v = request.GET.get(key)
    if not v:
        return None
    try:
        dt = datetime.fromisoformat(v.replace('Z', '+00:00'))
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt)
        return dt
    except Exception:
        return None


def _sort_query(qs, request, allowed, default):
    sort_by = request.GET.get('sort_by', default).strip() or default
    sort_order = request.GET.get('sort_order', 'desc').strip().lower()
    field = allowed.get(sort_by, allowed.get(default, default))
    prefix = '-' if sort_order != 'asc' else ''
    return qs.order_by(f'{prefix}{field}')


def _percentile(values, ratio):
    if not values:
        return 0
    ordered = sorted(values)
    idx = int(max(0, min(1, ratio)) * (len(ordered) - 1))
    return ordered[idx]


def _csv_response(filename):
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response.write('﻿')  # BOM for Excel
    return response


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


def _user_profile(user_id):
    fav_rows = list(
        models.FavoriteList.objects
        .filter(user_id=user_id)
        .select_related('product', 'product__category')
        .order_by('-created_at')
    )
    browse_rows = list(
        models.BrowseLog.objects
        .filter(user_id=user_id)
        .select_related('product', 'product__category')
        .order_by('-viewed_at')[:200]
    )

    category_scores = Counter()
    brand_scores = Counter()
    prices = []
    product_ids = set()

    for row in fav_rows:
        p = row.product
        if not p:
            continue
        product_ids.add(p.id)
        if p.category_id:
            category_scores[p.category_id] += 2
        if p.brand:
            brand_scores[p.brand] += 2
        prices.append(float(p.price))

    for row in browse_rows:
        p = row.product
        if not p:
            continue
        product_ids.add(p.id)
        if p.category_id:
            category_scores[p.category_id] += 1
        if p.brand:
            brand_scores[p.brand] += 1
        if not prices:
            prices.append(float(p.price))

    cat_ids = [cid for cid, _ in category_scores.most_common(5)]
    cats = {
        c.id: c
        for c in models.Category.objects.filter(id__in=cat_ids)
    }
    total_weight = sum(category_scores.values()) or 1
    top_categories = []
    for cid, score in category_scores.most_common(5):
        c = cats.get(cid)
        top_categories.append({
            'category_id': cid,
            'category_name': c.name if c else '未知品类',
            'icon_glyph': c.icon_glyph if c else '✦',
            'weight': round(score / total_weight, 4),
            'score': score,
        })

    platform_rows = []
    if product_ids:
        platform_rows = list(
            models.LiveStreamProduct.objects
            .filter(product_id__in=product_ids)
            .values('live__platform')
            .annotate(count=Count('id'), gmv=Sum('sold_gmv'))
            .order_by('-count')
        )

    if prices:
        price_range = {
            'min': round(min(prices), 2),
            'max': round(max(prices), 2),
            'avg': round(sum(prices) / len(prices), 2),
        }
    else:
        price_range = {'min': 0, 'max': 0, 'avg': 0}

    return {
        'favorite_count': len(fav_rows),
        'browse_count': len(browse_rows),
        'top_categories': top_categories,
        'price_range': price_range,
        'top_brands': [
            {'brand': brand, 'count': count}
            for brand, count in brand_scores.most_common(5)
        ],
        'platform_share': [
            {
                'platform': r['live__platform'] or 'unknown',
                'count': r['count'],
                'gmv': float(r['gmv'] or 0),
            }
            for r in platform_rows
        ],
    }


_MONITOR_CACHE = {
    'expires_at': None,
    'payload': None,
}
_MONITOR_CACHE_SECONDS = 30


def _risk_profile_for_anchor(
    anchor,
    streams=None,
    all_return_rates=None,
    all_conversions=None,
    p90_return=None,
    p50_conversion=None,
):
    if streams is None:
        streams = list(
            models.LiveStream.objects
            .filter(anchor=anchor)
            .order_by('-start_at')[:10]
        )
    else:
        streams = list(streams)
    if all_return_rates is None:
        all_return_rates = list(models.Anchor.objects.values_list('return_rate', flat=True))
    if all_conversions is None:
        all_conversions = list(models.LiveStream.objects.values_list('conversion_rate', flat=True))
    if p90_return is None:
        p90_return = _percentile(all_return_rates, 0.90)
    if p50_conversion is None:
        p50_conversion = _percentile(all_conversions, 0.50)

    avg_conversion = (
        sum(float(s.conversion_rate or 0) for s in streams) / len(streams)
        if streams else 0
    )
    gmvs = [float(s.gmv or 0) for s in streams]
    avg_gmv = sum(gmvs) / len(gmvs) if gmvs else 0
    gmv_spread = (max(gmvs) - min(gmvs)) / max(1, avg_gmv) if gmvs else 1

    return_rate_score = min(100, float(anchor.return_rate or 0) / max(0.01, p90_return or 0.01) * 100)
    low_conversion_score = max(0, (p50_conversion - avg_conversion) / max(0.01, p50_conversion or 0.01) * 100)
    instability_score = min(100, gmv_spread * 35)
    activity_score = max(0, (10 - len(streams)) * 10)
    risk_score = round(
        return_rate_score * 0.45
        + low_conversion_score * 0.30
        + instability_score * 0.15
        + activity_score * 0.10,
        1,
    )

    if risk_score >= 80:
        risk_level = 'high'
    elif risk_score >= 50:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    reasons = []
    if float(anchor.return_rate or 0) >= p90_return:
        reasons.append('退货率高于 90% 主播')
    if streams and avg_conversion < p50_conversion:
        reasons.append('近 10 场直播转化率低于平台中位数')
    if gmv_spread > 1.2:
        reasons.append('近 10 场 GMV 波动较大')
    if len(streams) < 5:
        reasons.append('近期直播样本偏少')
    if not reasons:
        reasons.append('风险指标处于可控区间')

    suggestions = []
    if risk_level == 'high':
        suggestions.append('建议先以小预算测试，不直接投放核心商品')
        suggestions.append('合作时设置退货率与转化率观察阈值')
    elif risk_level == 'medium':
        suggestions.append('建议选择中低客单商品验证转化稳定性')
    else:
        suggestions.append('风险较低，可结合品类匹配度安排合作')

    return {
        'anchor_id': anchor.id,
        'risk_score': risk_score,
        'risk_level': risk_level,
        'return_rate_rank': round(1 if not all_return_rates else len([v for v in all_return_rates if v <= anchor.return_rate]) / len(all_return_rates), 4),
        'conversion_rank': round(0 if not all_conversions else len([v for v in all_conversions if v <= avg_conversion]) / len(all_conversions), 4),
        'gmv_stability': round(max(0, 1 - min(1, gmv_spread / 2)), 4),
        'recent_stream_count': len(streams),
        'avg_conversion_rate': round(avg_conversion, 4),
        'risk_reasons': reasons,
        'suggestions': suggestions,
    }


def _monitor_payload_cached():
    now = timezone.now()
    if _MONITOR_CACHE['payload'] and _MONITOR_CACHE['expires_at'] and _MONITOR_CACHE['expires_at'] > now:
        return _MONITOR_CACHE['payload']
    payload = _monitor_payload()
    _MONITOR_CACHE['payload'] = payload
    _MONITOR_CACHE['expires_at'] = now + timedelta(seconds=_MONITOR_CACHE_SECONDS)
    return payload


def _monitor_payload():
    streams = list(
        models.LiveStream.objects
        .select_related('anchor')
        .order_by('-start_at')[:300]
    )
    platform_avgs = {}
    for platform in ('taobao', 'douyin', 'pdd'):
        vals = [float(s.gmv or 0) for s in streams if s.platform == platform][:50]
        platform_avgs[platform] = sum(vals) / len(vals) if vals else 0

    conversions = [float(s.conversion_rate or 0) for s in streams]
    audiences = [int(s.peak_audience or 0) for s in streams]
    p90_conv = _percentile(conversions, 0.90)
    p30_conv = _percentile(conversions, 0.30)
    p80_audience = _percentile(audiences, 0.80)

    alerts = []
    live_spikes = []
    for s in streams[:120]:
        avg = platform_avgs.get(s.platform, 0)
        ratio = float(s.gmv or 0) / avg if avg else 0
        if ratio >= 2:
            alerts.append({
                'id': f'gmv_spike_{s.id}',
                'type': 'gmv_spike',
                'level': 'high',
                'title': '直播间 GMV 高速增长',
                'message': f'{s.title} GMV 高于同平台均值 {ratio:.1f} 倍',
                'target_type': 'livestream',
                'target_id': s.id,
                'metric': round(ratio, 2),
                'created_at': s.start_at.isoformat() if s.start_at else None,
            })
            live_spikes.append({
                **_live_to_dict(s),
                'spike_ratio': round(ratio, 2),
                'signal': 'gmv_spike',
            })
        if float(s.conversion_rate or 0) >= p90_conv:
            alerts.append({
                'id': f'high_conversion_{s.id}',
                'type': 'high_conversion',
                'level': 'medium',
                'title': '高转化直播间',
                'message': f'{s.title} 转化率达到 {(float(s.conversion_rate) * 100):.2f}%',
                'target_type': 'livestream',
                'target_id': s.id,
                'metric': round(float(s.conversion_rate or 0), 4),
                'created_at': s.start_at.isoformat() if s.start_at else None,
            })
        if int(s.peak_audience or 0) >= p80_audience and float(s.conversion_rate or 0) <= p30_conv:
            alerts.append({
                'id': f'low_efficiency_{s.id}',
                'type': 'low_efficiency',
                'level': 'high',
                'title': '高流量低转化',
                'message': f'{s.title} 观众峰值高，但转化率低于 P30',
                'target_type': 'livestream',
                'target_id': s.id,
                'metric': round(float(s.conversion_rate or 0), 4),
                'created_at': s.start_at.isoformat() if s.start_at else None,
            })

    anchors = list(models.Anchor.objects.all())
    return_rates = [float(a.return_rate or 0) for a in anchors]
    p90_return = _percentile(return_rates, 0.90)
    all_conversions = list(models.LiveStream.objects.values_list('conversion_rate', flat=True))
    p50_conversion = _percentile(all_conversions, 0.50)
    recent_streams_by_anchor = defaultdict(list)
    anchor_ids = [a.id for a in anchors]
    for s in (
        models.LiveStream.objects
        .filter(anchor_id__in=anchor_ids)
        .order_by('anchor_id', '-start_at')
    ):
        bucket = recent_streams_by_anchor[s.anchor_id]
        if len(bucket) < 10:
            bucket.append(s)
    risk_anchors = []
    for a in anchors:
        profile = _risk_profile_for_anchor(
            a,
            streams=recent_streams_by_anchor.get(a.id, []),
            all_return_rates=return_rates,
            all_conversions=all_conversions,
            p90_return=p90_return,
            p50_conversion=p50_conversion,
        )
        if float(a.return_rate or 0) >= p90_return or profile['risk_score'] >= 55:
            item = _anchor_to_dict(a)
            item.update(profile)
            item['risk_reasons'] = profile['risk_reasons']
            risk_anchors.append(item)
            if profile['risk_level'] in ('high', 'medium'):
                alerts.append({
                    'id': f'return_risk_{a.id}',
                    'type': 'return_risk',
                    'level': profile['risk_level'],
                    'title': '高退货风险主播',
                    'message': f'{a.nickname} 风险分 {profile["risk_score"]}，{profile["risk_reasons"][0]}',
                    'target_type': 'anchor',
                    'target_id': a.id,
                    'metric': profile['risk_score'],
                    'created_at': timezone.now().isoformat(),
                })
    risk_anchors.sort(key=lambda x: x['risk_score'], reverse=True)

    growth_resp = []
    now = timezone.now()
    this_week_start = now - timedelta(days=7)
    last_week_start = now - timedelta(days=14)
    for c in models.Category.objects.filter(parent__isnull=True):
        sub_ids = list(models.Category.objects.filter(parent=c).values_list('id', flat=True))
        ids = [c.id] + sub_ids
        this_w = float(models.LiveStreamProduct.objects.filter(product__category_id__in=ids, live__start_at__gte=this_week_start).aggregate(s=Sum('sold_gmv'))['s'] or 0)
        last_w = float(models.LiveStreamProduct.objects.filter(product__category_id__in=ids, live__start_at__gte=last_week_start, live__start_at__lt=this_week_start).aggregate(s=Sum('sold_gmv'))['s'] or 0)
        growth = (this_w - last_w) / last_w if last_w > 0 else (1 if this_w > 0 else 0)
        if growth >= 0.5:
            growth_resp.append({
                'category_id': c.id,
                'category_name': c.name,
                'growth_rate': round(growth, 4),
                'gmv': round(this_w, 2),
            })
            alerts.append({
                'id': f'category_growth_{c.id}',
                'type': 'category_growth',
                'level': 'medium',
                'title': '品类异常增长',
                'message': f'{c.name} 本周 GMV 较上周增长 {growth * 100:.1f}%',
                'target_type': 'category',
                'target_id': c.id,
                'metric': round(growth, 4),
                'created_at': now.isoformat(),
            })

    alerts.sort(key=lambda x: ({'high': 0, 'medium': 1, 'low': 2}.get(x['level'], 3), -float(x.get('metric') or 0)))
    summary = {
        'alert_count': len(alerts),
        'high_risk_count': len([a for a in alerts if a['level'] == 'high']),
        'opportunity_count': len(live_spikes),
        'category_signal_count': len(growth_resp),
    }
    return {
        'summary': summary,
        'alerts': alerts[:80],
        'live_spikes': live_spikes[:20],
        'risk_anchors': risk_anchors[:20],
    }


def _category_opportunities():
    parents = list(models.Category.objects.filter(parent__isnull=True))
    rows = []
    now = timezone.now()
    this_week_start = now - timedelta(days=7)
    last_week_start = now - timedelta(days=14)

    raw = []
    for c in parents:
        sub_ids = list(models.Category.objects.filter(parent=c).values_list('id', flat=True))
        ids = [c.id] + sub_ids
        this_w = float(models.LiveStreamProduct.objects.filter(product__category_id__in=ids, live__start_at__gte=this_week_start).aggregate(s=Sum('sold_gmv'))['s'] or 0)
        last_w = float(models.LiveStreamProduct.objects.filter(product__category_id__in=ids, live__start_at__gte=last_week_start, live__start_at__lt=this_week_start).aggregate(s=Sum('sold_gmv'))['s'] or 0)
        growth = (this_w - last_w) / last_w if last_w > 0 else (1 if this_w > 0 else 0)
        avg_price = float(models.Product.objects.filter(category_id__in=ids).aggregate(v=Avg('price'))['v'] or 0)
        stream_count = models.LiveStreamProduct.objects.filter(product__category_id__in=ids).values('live_id').distinct().count()
        anchor_count = models.LiveStream.objects.filter(live_products__product__category_id__in=ids).values('anchor_id').distinct().count()
        conversion = float(models.LiveStream.objects.filter(live_products__product__category_id__in=ids).aggregate(v=Avg('conversion_rate'))['v'] or 0)
        raw.append({
            'category_id': c.id,
            'category_name': c.name,
            'icon_glyph': c.icon_glyph,
            'gmv': this_w,
            'growth_rate': growth,
            'avg_price': avg_price,
            'stream_count': stream_count,
            'anchor_count': anchor_count,
            'conversion_rate': conversion,
        })

    max_gmv = max([r['gmv'] for r in raw] or [1])
    max_price = max([r['avg_price'] for r in raw] or [1])
    max_growth = max([max(0, r['growth_rate']) for r in raw] or [1])
    max_comp = max([(r['stream_count'] * 0.6 + r['anchor_count'] * 0.4) for r in raw] or [1])
    max_conversion = max([r['conversion_rate'] for r in raw] or [1])

    for r in raw:
        competition = (r['stream_count'] * 0.6 + r['anchor_count'] * 0.4) / max(1, max_comp)
        growth_score = max(0, r['growth_rate']) / max(0.01, max_growth)
        gmv_score = r['gmv'] / max(1, max_gmv)
        price_score = r['avg_price'] / max(1, max_price)
        conversion_score = r['conversion_rate'] / max(0.001, max_conversion)
        score = (
            growth_score * 0.35
            + gmv_score * 0.20
            + price_score * 0.15
            + conversion_score * 0.15
            + (1 - competition) * 0.15
        ) * 100
        reasons = []
        if growth_score >= 0.75:
            reasons.append('增长快')
        if competition <= 0.55:
            reasons.append('竞争适中')
        if price_score >= 0.6:
            reasons.append('客单价高')
        if conversion_score >= 0.7:
            reasons.append('转化表现好')
        if not reasons:
            reasons.append('指标均衡')
        rows.append({
            **r,
            'gmv': round(r['gmv'], 2),
            'growth_rate': round(r['growth_rate'], 4),
            'avg_price': round(r['avg_price'], 2),
            'competition_index': round(competition, 4),
            'conversion_rate': round(r['conversion_rate'], 4),
            'opportunity_score': round(score, 1),
            'reason': '、'.join(reasons),
        })
    rows.sort(key=lambda x: x['opportunity_score'], reverse=True)
    return rows


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


def api_category_opportunity(request):
    return JsonResponse({'code': 0, 'data': _category_opportunities()})


# ============================================================
# 4.4 直播间 & 主播（4）
# ============================================================

def api_livestream_list(request):
    platform = request.GET.get('platform', '').strip()
    keyword = request.GET.get('keyword', '').strip()
    min_gmv = _float_param(request, 'min_gmv')
    max_gmv = _float_param(request, 'max_gmv')
    min_audience = _int_param(request, 'min_audience', 0)
    max_audience = _int_param(request, 'max_audience', 0)
    min_conversion = _float_param(request, 'min_conversion')
    max_conversion = _float_param(request, 'max_conversion')
    start_date = _date_param(request, 'start_date')
    end_date = _date_param(request, 'end_date')
    page = max(1, _int_param(request, 'page', 1))
    limit = min(100, max(1, _int_param(request, 'limit', 20)))

    qs = models.LiveStream.objects.select_related('anchor')
    if platform:
        qs = qs.filter(platform=platform)
    if keyword:
        qs = qs.filter(Q(title__icontains=keyword) | Q(anchor__nickname__icontains=keyword))
    if start_date:
        qs = qs.filter(start_at__gte=start_date)
    if end_date:
        qs = qs.filter(start_at__lte=end_date)
    if min_gmv is not None:
        qs = qs.filter(gmv__gte=min_gmv)
    if max_gmv is not None:
        qs = qs.filter(gmv__lte=max_gmv)
    if min_audience:
        qs = qs.filter(peak_audience__gte=min_audience)
    if max_audience:
        qs = qs.filter(peak_audience__lte=max_audience)
    if min_conversion is not None:
        qs = qs.filter(conversion_rate__gte=min_conversion)
    if max_conversion is not None:
        qs = qs.filter(conversion_rate__lte=max_conversion)
    qs = _sort_query(
        qs,
        request,
        {
            'start_at': 'start_at',
            'gmv': 'gmv',
            'conversion_rate': 'conversion_rate',
            'peak_audience': 'peak_audience',
        },
        'start_at',
    )
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
    keyword = request.GET.get('keyword', '').strip()
    min_fans = _int_param(request, 'min_fans', 0)
    max_fans = _int_param(request, 'max_fans', 0)
    min_avg_gmv = _float_param(request, 'min_avg_gmv')
    max_avg_gmv = _float_param(request, 'max_avg_gmv')
    min_return_rate = _float_param(request, 'min_return_rate')
    max_return_rate = _float_param(request, 'max_return_rate')
    page = max(1, _int_param(request, 'page', 1))
    limit = min(100, max(1, _int_param(request, 'limit', 20)))

    qs = models.Anchor.objects.all()
    if platform:
        qs = qs.filter(platform=platform)
    if keyword:
        qs = qs.filter(nickname__icontains=keyword)
    if min_fans:
        qs = qs.filter(fans__gte=min_fans)
    if max_fans:
        qs = qs.filter(fans__lte=max_fans)
    if min_avg_gmv is not None:
        qs = qs.filter(avg_gmv__gte=min_avg_gmv)
    if max_avg_gmv is not None:
        qs = qs.filter(avg_gmv__lte=max_avg_gmv)
    if min_return_rate is not None:
        qs = qs.filter(return_rate__gte=min_return_rate)
    if max_return_rate is not None:
        qs = qs.filter(return_rate__lte=max_return_rate)
    qs = _sort_query(
        qs,
        request,
        {
            'fans': 'fans',
            'avg_gmv': 'avg_gmv',
            'return_rate': 'return_rate',
        },
        'fans',
    )
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
    platform = request.GET.get('platform', '').strip()
    keyword = request.GET.get('keyword', '').strip()
    min_fans = _int_param(request, 'min_fans', 0)
    max_fans = _int_param(request, 'max_fans', 0)
    min_return_rate = _float_param(request, 'min_return_rate')
    max_return_rate = _float_param(request, 'max_return_rate')
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
    anchor_qs = models.Anchor.objects.filter(id__in=anchor_ids)
    if platform:
        anchor_qs = anchor_qs.filter(platform=platform)
    if keyword:
        anchor_qs = anchor_qs.filter(nickname__icontains=keyword)
    if min_fans:
        anchor_qs = anchor_qs.filter(fans__gte=min_fans)
    if max_fans:
        anchor_qs = anchor_qs.filter(fans__lte=max_fans)
    if min_return_rate is not None:
        anchor_qs = anchor_qs.filter(return_rate__gte=min_return_rate)
    if max_return_rate is not None:
        anchor_qs = anchor_qs.filter(return_rate__lte=max_return_rate)
    anchors = {a.id: a for a in anchor_qs}
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


def api_anchor_risk_profile(request, anchor_id):
    anchor = models.Anchor.objects.filter(id=anchor_id).first()
    if not anchor:
        return JsonResponse({'code': 1, 'msg': '主播不存在'}, status=404)
    return JsonResponse({'code': 0, 'data': _risk_profile_for_anchor(anchor)})


# ============================================================
# 4.4+ 运营监控
# ============================================================

def api_monitor_summary(request):
    payload = _monitor_payload_cached()
    return JsonResponse({'code': 0, 'data': payload['summary']})


def api_monitor_alerts(request):
    payload = _monitor_payload_cached()
    return JsonResponse({'code': 0, 'data': payload['alerts']})


def api_monitor_live_spikes(request):
    payload = _monitor_payload_cached()
    return JsonResponse({'code': 0, 'data': payload['live_spikes']})


def api_monitor_risk_anchors(request):
    payload = _monitor_payload_cached()
    return JsonResponse({'code': 0, 'data': payload['risk_anchors']})


# ============================================================
# 4.5 商品（3）
# ============================================================

def api_product_list(request):
    keyword = request.GET.get('keyword', '').strip()
    brand = request.GET.get('brand', '').strip()
    category = _int_param(request, 'category', 0)
    min_price = _float_param(request, 'min_price')
    max_price = _float_param(request, 'max_price')
    min_sales = _int_param(request, 'min_sales', 0)
    max_sales = _int_param(request, 'max_sales', 0)
    min_rating = _float_param(request, 'min_rating')
    max_rating = _float_param(request, 'max_rating')
    page = max(1, _int_param(request, 'page', 1))
    limit = min(100, max(1, _int_param(request, 'limit', 20)))

    qs = models.Product.objects.select_related('category').all()
    if keyword:
        qs = qs.filter(Q(name__icontains=keyword) | Q(brand__icontains=keyword))
    if brand:
        qs = qs.filter(brand__icontains=brand)
    if category:
        # 既支持直接选一级，也支持选二级
        sub_ids = list(models.Category.objects.filter(parent_id=category).values_list('id', flat=True))
        ids = [category] + sub_ids
        qs = qs.filter(category_id__in=ids)
    if min_price is not None:
        qs = qs.filter(price__gte=min_price)
    if max_price is not None:
        qs = qs.filter(price__lte=max_price)
    if min_sales:
        qs = qs.filter(sales__gte=min_sales)
    if max_sales:
        qs = qs.filter(sales__lte=max_sales)
    if min_rating is not None:
        qs = qs.filter(rating__gte=min_rating)
    if max_rating is not None:
        qs = qs.filter(rating__lte=max_rating)
    qs = _sort_query(
        qs,
        request,
        {
            'sales': 'sales',
            'price': 'price',
            'rating': 'rating',
            'created_at': 'created_at',
        },
        'sales',
    )
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
            'id': s.id,
            'live_id': s.id,
            'title': s.title,
            'platform': s.platform,
            'anchor_id': s.anchor_id,
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
    agg = models.LiveStreamProduct.objects.filter(product=p).aggregate(
        live_count=Count('live', distinct=True),
        total_sold_qty=Sum('sold_qty'),
        total_sold_gmv=Sum('sold_gmv'),
    )
    low = float(p.price) * 0.6
    high = float(p.price) * 1.4
    similar = (
        models.Product.objects
        .filter(category_id=p.category_id, price__gte=low, price__lte=high)
        .exclude(id=p.id)
        .select_related('category')
        .order_by('-sales', '-rating')[:8]
    )
    similar_products = []
    max_sales = max([sp.sales for sp in similar] or [1])
    for sp in similar:
        sd = _product_to_dict(sp)
        sales_score = sp.sales / max(1, max_sales) * 70
        rating_score = float(sp.rating or 0) / 5 * 30
        sd.update({
            'favorited': int(
                bool(user_id)
                and models.FavoriteList.objects.filter(user_id=user_id, product=sp).exists()
            ),
            'score': round(sales_score + rating_score, 1),
            'reason': '同品类且价格接近的高销量商品',
        })
        similar_products.append(sd)
    d['favorited'] = favorited
    d['fav_count'] = fav_count
    d['live_count'] = agg['live_count'] or 0
    d['total_sold_qty'] = int(agg['total_sold_qty'] or 0)
    d['total_sold_gmv'] = float(agg['total_sold_gmv'] or 0)
    d['recent_lives'] = lives
    d['similar_products'] = similar_products
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


def api_me_profile(request):
    user_id, err = _require_login(request)
    if err:
        return err
    return JsonResponse({'code': 0, 'data': _user_profile(user_id)})


def api_me_recommend(request):
    user_id, err = _require_login(request)
    if err:
        return err
    data = recommend.recommend_for_user(user_id, 9)
    return JsonResponse({'code': 0, 'data': data, 'count': len(data)})


def api_me_recommend_explain(request):
    user_id, err = _require_login(request)
    if err:
        return err
    data = recommend.recommend_for_user_explained(user_id, 9)
    strategies = Counter(item.get('strategy', 'unknown') for item in data)
    if strategies.get('cf'):
        reason = '基于你的收藏记录和相似商品关系生成推荐'
    elif strategies.get('history'):
        reason = '当前收藏较少，优先根据浏览历史品类推荐'
    else:
        reason = '当前个性化行为较少，展示全站热门商品'
    return JsonResponse({
        'code': 0,
        'data': data,
        'count': len(data),
        'reason': reason,
        'strategies': dict(strategies),
    })


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
            'long_tail': (0, 1_000_000),
            'mid': (1_000_000, 5_000_000),
            'top': (5_000_000, 10**12),
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

    sample = list(
        qs.values_list(
            'sold_qty',
            'sold_gmv',
            'product__price',
            'live__duration_min',
            'live__anchor__fans',
        )[:1000]
    )
    if not sample:
        return JsonResponse({'code': 1, 'msg': '没有匹配的样本'})
    qtys = [s[0] for s in sample if s[0] is not None]
    gmvs = [float(s[1] or 0) for s in sample]
    sample_prices = [float(s[2] or 0) for s in sample if s[2] is not None]
    sample_durations = [int(s[3] or 0) for s in sample if s[3] is not None]
    sample_fans = [int(s[4] or 0) for s in sample if s[4] is not None]
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

    global_avg_qty = (
        models.LiveStreamProduct.objects.aggregate(avg=Avg('sold_qty'))['avg'] or avg_qty
    )
    global_avg_qty = float(global_avg_qty or avg_qty)
    sample_avg_price = sum(sample_prices) / len(sample_prices) if sample_prices else None
    sample_avg_duration = sum(sample_durations) / len(sample_durations) if sample_durations else None
    sample_avg_fans = sum(sample_fans) / len(sample_fans) if sample_fans else None

    spread = (max_qty - min_qty) / max(1, avg_qty)
    sample_factor = min(0.45, n / 600)
    stability_factor = max(0.0, 0.35 - min(0.35, spread / 20))
    confidence = round(min(0.96, 0.35 + sample_factor + stability_factor), 2)

    drivers = []
    category_delta = (avg_qty - global_avg_qty) / max(1, global_avg_qty)
    drivers.append({
        'name': '品类热度' if category else '整体热度',
        'impact': round(max(-0.45, min(0.45, category_delta)), 3),
        'direction': 'positive' if category_delta >= 0 else 'negative',
        'text': '匹配样本销量高于全局均值' if category_delta >= 0 else '匹配样本销量低于全局均值',
    })
    if price is not None and price > 0 and sample_avg_price:
        price_delta = (sample_avg_price - price) / max(1, sample_avg_price)
        drivers.append({
            'name': '价格区间',
            'impact': round(max(-0.35, min(0.35, price_delta)), 3),
            'direction': 'positive' if price_delta >= 0 else 'negative',
            'text': '当前价格低于相似样本均价' if price_delta >= 0 else '当前价格高于相似样本均价',
        })
    if anchor_tier:
        tier_labels = {
            'long_tail': '腰尾部主播',
            'mid': '中部主播',
            'top': '头部主播',
            'small': '小主播',
            'medium': '中型主播',
            'big': '大主播',
            'super': '超级主播',
        }
        tier_impact = 0.22 if anchor_tier in ('top', 'super') else 0.12 if anchor_tier in ('mid', 'big') else -0.06
        drivers.append({
            'name': '主播等级',
            'impact': tier_impact,
            'direction': 'positive' if tier_impact >= 0 else 'negative',
            'text': f'{tier_labels.get(anchor_tier, "所选主播")}样本匹配完成',
        })
    if duration > 0 and sample_avg_duration:
        duration_delta = (duration - sample_avg_duration) / max(1, sample_avg_duration)
        duration_impact = 0.12 if -0.25 <= duration_delta <= 0.35 else -0.08
        drivers.append({
            'name': '直播时长',
            'impact': duration_impact,
            'direction': 'positive' if duration_impact >= 0 else 'negative',
            'text': '直播时长接近高匹配样本区间' if duration_impact >= 0 else '直播时长偏离样本常见区间',
        })

    suggestions = []
    if confidence < 0.65:
        suggestions.append('匹配样本偏少，建议放宽品类、价格或时长条件后再对比')
    if price is not None and sample_avg_price and price > sample_avg_price * 1.15:
        suggestions.append('当前价格高于相似样本均价，可考虑小幅降价提升转化')
    if percentile >= 75:
        suggestions.append('预测表现处于较高分位，可优先安排重点直播资源')
    elif percentile <= 35:
        suggestions.append('预测表现偏保守，建议先用中腰部主播小规模测试')
    if anchor_tier in ('long_tail', 'small') and sample_avg_fans and sample_avg_fans > 1_000_000:
        suggestions.append('相似高销量样本主播粉丝量更高，可尝试升级主播档位')
    if not suggestions:
        suggestions.append('当前参数较均衡，可结合预算选择中部主播进行投放验证')

    return JsonResponse({
        'code': 0,
        # 前端契约
        'avg': avg_qty,
        'median': int(median_qty),
        'max': int(max_qty),
        'min': int(min_qty),
        'count': n,
        'percentile': percentile,
        'percentile_ratio': round(percentile / 100, 4),
        'dist': dist,
        'predicted_sales': avg_qty,
        'predicted_gmv': round(target_gmv, 2),
        'confidence': confidence,
        'drivers': drivers,
        'suggestions': suggestions,
        'sample_summary': {
            'avg_price': round(sample_avg_price, 2) if sample_avg_price else None,
            'avg_duration': round(sample_avg_duration, 1) if sample_avg_duration else None,
            'avg_fans': round(sample_avg_fans, 0) if sample_avg_fans else None,
        },
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
    response = _csv_response('taotrend_products.csv')
    writer = csv.writer(response)
    writer.writerow(['ID', '商品名', '品类', '品牌', '价格', '累计销量', '评分'])
    keyword = request.GET.get('keyword', '').strip()
    brand = request.GET.get('brand', '').strip()
    category = _int_param(request, 'category', 0)
    min_price = _float_param(request, 'min_price')
    max_price = _float_param(request, 'max_price')
    min_sales = _int_param(request, 'min_sales', 0)
    max_sales = _int_param(request, 'max_sales', 0)
    min_rating = _float_param(request, 'min_rating')
    max_rating = _float_param(request, 'max_rating')
    qs = models.Product.objects.select_related('category').all()
    if keyword:
        qs = qs.filter(Q(name__icontains=keyword) | Q(brand__icontains=keyword))
    if brand:
        qs = qs.filter(brand__icontains=brand)
    if category:
        sub_ids = list(models.Category.objects.filter(parent_id=category).values_list('id', flat=True))
        qs = qs.filter(category_id__in=[category] + sub_ids)
    if min_price is not None:
        qs = qs.filter(price__gte=min_price)
    if max_price is not None:
        qs = qs.filter(price__lte=max_price)
    if min_sales:
        qs = qs.filter(sales__gte=min_sales)
    if max_sales:
        qs = qs.filter(sales__lte=max_sales)
    if min_rating is not None:
        qs = qs.filter(rating__gte=min_rating)
    if max_rating is not None:
        qs = qs.filter(rating__lte=max_rating)
    qs = _sort_query(
        qs,
        request,
        {'sales': 'sales', 'price': 'price', 'rating': 'rating', 'created_at': 'created_at'},
        'sales',
    )[:5000]
    for p in qs:
        writer.writerow([
            p.id, p.name,
            p.category.name if p.category_id else '',
            p.brand, float(p.price), p.sales, p.rating,
        ])
    return response


def api_export_livestreams(request):
    response = _csv_response('taotrend_livestreams.csv')
    writer = csv.writer(response)
    writer.writerow(['ID', '标题', '平台', '主播', '开播时间', '时长(分)', '峰值观众', 'GMV', '转化率'])
    platform = request.GET.get('platform', '').strip()
    keyword = request.GET.get('keyword', '').strip()
    qs = models.LiveStream.objects.select_related('anchor')
    if platform:
        qs = qs.filter(platform=platform)
    if keyword:
        qs = qs.filter(Q(title__icontains=keyword) | Q(anchor__nickname__icontains=keyword))
    qs = _sort_query(
        qs,
        request,
        {'start_at': 'start_at', 'gmv': 'gmv', 'conversion_rate': 'conversion_rate', 'peak_audience': 'peak_audience'},
        'start_at',
    )[:5000]
    for s in qs:
        writer.writerow([
            s.id, s.title, s.platform,
            s.anchor.nickname if s.anchor_id else '',
            timezone.localtime(s.start_at).strftime('%Y-%m-%d %H:%M:%S') if s.start_at else '',
            s.duration_min, s.peak_audience, float(s.gmv), s.conversion_rate,
        ])
    return response


def api_export_anchors(request):
    response = _csv_response('taotrend_anchors.csv')
    writer = csv.writer(response)
    writer.writerow(['ID', '主播', '平台', '粉丝数', '平均GMV', '退货率', '风险分', '风险等级'])
    platform = request.GET.get('platform', '').strip()
    keyword = request.GET.get('keyword', '').strip()
    qs = models.Anchor.objects.all()
    if platform:
        qs = qs.filter(platform=platform)
    if keyword:
        qs = qs.filter(nickname__icontains=keyword)
    anchors = list(_sort_query(qs, request, {'fans': 'fans', 'avg_gmv': 'avg_gmv', 'return_rate': 'return_rate'}, 'fans')[:5000])
    all_return_rates = list(models.Anchor.objects.values_list('return_rate', flat=True))
    all_conversions = list(models.LiveStream.objects.values_list('conversion_rate', flat=True))
    p90_return = _percentile(all_return_rates, 0.90)
    p50_conversion = _percentile(all_conversions, 0.50)
    recent_streams_by_anchor = defaultdict(list)
    for s in (
        models.LiveStream.objects
        .filter(anchor_id__in=[a.id for a in anchors])
        .order_by('anchor_id', '-start_at')
    ):
        bucket = recent_streams_by_anchor[s.anchor_id]
        if len(bucket) < 10:
            bucket.append(s)
    for a in anchors:
        risk = _risk_profile_for_anchor(
            a,
            streams=recent_streams_by_anchor.get(a.id, []),
            all_return_rates=all_return_rates,
            all_conversions=all_conversions,
            p90_return=p90_return,
            p50_conversion=p50_conversion,
        )
        writer.writerow([
            a.id, a.nickname, a.platform, a.fans, float(a.avg_gmv),
            a.return_rate, risk['risk_score'], risk['risk_level'],
        ])
    return response


def api_export_predict(request):
    response = _csv_response('taotrend_predict.csv')
    writer = csv.writer(response)
    payload = json.loads(api_intel_sales_predict(request).content.decode('utf-8'))
    writer.writerow(['字段', '值'])
    for key in ['predicted_sales', 'predicted_gmv', 'confidence', 'count', 'percentile', 'msg']:
        if key in payload:
            writer.writerow([key, payload[key]])
    writer.writerow([])
    writer.writerow(['影响因素', '影响值', '方向', '说明'])
    for d in payload.get('drivers', []):
        writer.writerow([d.get('name'), d.get('impact'), d.get('direction'), d.get('text')])
    writer.writerow([])
    writer.writerow(['建议'])
    for s in payload.get('suggestions', []):
        writer.writerow([s])
    return response
