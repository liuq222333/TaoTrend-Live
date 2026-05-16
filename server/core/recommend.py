"""基于物品的协同过滤推荐（item-based CF）。

- 维度：用户收藏 (FavoriteList)
- 维度键：商品所属品类 (category_id)
- 三层 fallback：CF -> 浏览历史 top 品类 -> 全库热门
"""
from math import sqrt

from django.db.models import Subquery, Q, Count

from core import models


def _product_to_dict(p):
    return {
        'id': p.id,
        'name': p.name,
        'category': p.category_id,
        'category_id': p.category_id,
        'category_name': p.category.name if p.category_id else '',
        'brand': p.brand,
        'price': float(p.price),
        'sales': p.sales,
        'rating': p.rating,
        'image_seed': p.image_seed,
    }


def similarity(product1_id, product2_id):
    """两个商品的余弦相似度：基于收藏过它们的用户集合。"""
    fav1 = models.FavoriteList.objects.filter(product_id=product1_id)
    n1 = fav1.count()
    n2 = models.FavoriteList.objects.filter(product_id=product2_id).count()
    if n1 == 0 or n2 == 0:
        return 0.0
    common = models.FavoriteList.objects.filter(
        user__in=Subquery(fav1.values('user')), product_id=product2_id
    ).values('user').count()
    return common / sqrt(n1 * n2)


def _fallback_browse(user_id, k):
    """fallback 1: 用户的浏览历史 top 3 品类，从该品类中抽 k 个未收藏的商品。"""
    cat_ids = list(
        models.BrowseLog.objects.filter(user_id=user_id)
        .values_list('product__category_id', flat=True)[:200]
    )
    if not cat_ids:
        return []
    counts = {}
    for cid in cat_ids:
        if cid:
            counts[cid] = counts.get(cid, 0) + 1
    top_cats = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:3]
    top_cat_ids = [c[0] for c in top_cats]

    fav_pids = set(
        models.FavoriteList.objects.filter(user_id=user_id).values_list('product_id', flat=True)
    )
    qs = (
        models.Product.objects.filter(category_id__in=top_cat_ids)
        .exclude(id__in=fav_pids)
        .select_related('category')
        .order_by('-sales')[:k * 3]
    )
    products = list(qs)
    if len(products) > k:
        # 简单打散：按销量 + 一些随机性
        import random
        random.shuffle(products)
    return [_product_to_dict(p) for p in products[:k]]


def _fallback_hot(k):
    """fallback 2: 全库热门，按 sales 倒序。"""
    qs = models.Product.objects.select_related('category').order_by('-sales')[:k]
    return [_product_to_dict(p) for p in qs]


def _fallback_hot_explained(k, exclude_ids=None):
    """fallback 2: 全库热门，带推荐解释。"""
    exclude_ids = set(exclude_ids or [])
    qs = models.Product.objects.select_related('category').exclude(id__in=exclude_ids).order_by('-sales')[:k]
    out = []
    for idx, p in enumerate(qs):
        d = _product_to_dict(p)
        d.update({
            'favorited': 0,
            'score': round(max(1.0, 100 - idx * 4 + p.sales / 100000.0), 2),
            'strategy': 'hot',
            'reason_type': 'global_hot',
            'reason': '全站高销量热门商品，适合作为冷启动参考',
        })
        out.append(d)
    return out


def _fallback_browse_explained(user_id, k, exclude_ids=None):
    """fallback 1: 浏览历史 top 品类，带推荐解释。"""
    exclude_ids = set(exclude_ids or [])
    cat_ids = list(
        models.BrowseLog.objects.filter(user_id=user_id)
        .values_list('product__category_id', flat=True)[:200]
    )
    if not cat_ids:
        return []
    counts = {}
    for cid in cat_ids:
        if cid:
            counts[cid] = counts.get(cid, 0) + 1
    top_cats = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:3]
    top_cat_ids = [c[0] for c in top_cats]
    cat_names = {
        c.id: c.name
        for c in models.Category.objects.filter(id__in=top_cat_ids)
    }

    qs = (
        models.Product.objects.filter(category_id__in=top_cat_ids)
        .exclude(id__in=exclude_ids)
        .select_related('category')
        .order_by('-sales')[:k * 3]
    )
    products = list(qs)
    if len(products) > k:
        import random
        random.shuffle(products)

    out = []
    for p in products[:k]:
        d = _product_to_dict(p)
        cat_name = cat_names.get(p.category_id, d.get('category_name') or '相关品类')
        browse_count = counts.get(p.category_id, 0)
        d.update({
            'favorited': 0,
            'score': round(55 + min(35, browse_count * 4) + p.sales / 100000.0, 2),
            'strategy': 'history',
            'reason_type': 'browse_history',
            'reason': f'根据你最近浏览的 {cat_name} 类商品推荐',
        })
        out.append(d)
    return out


def recommend_for_user(user_id, k=9):
    """主入口：返回 k 个推荐商品（dict 列表）。"""
    # 1. 用户收藏过的商品
    fav_ids = list(
        models.FavoriteList.objects.filter(user_id=user_id)
        .values_list('product_id', flat=True)
    )

    # 完全冷启动 → fallback 链
    if not fav_ids:
        result = _fallback_browse(user_id, k)
        if len(result) >= k:
            return result
        # 补全
        hot = _fallback_hot(k * 2)
        seen = {r['id'] for r in result}
        for h in hot:
            if h['id'] not in seen:
                result.append(h)
            if len(result) >= k:
                break
        return result[:k]

    # 2. 收藏商品的 top 3 品类
    fav_products = list(
        models.Product.objects.filter(id__in=fav_ids).values('id', 'category_id')
    )
    cat_counts = {}
    for fp in fav_products:
        cid = fp['category_id']
        if cid:
            cat_counts[cid] = cat_counts.get(cid, 0) + 1
    top_cats = [c for c, _ in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:3]]

    if not top_cats:
        return _fallback_hot(k)

    # 3. 候选集：top 品类下，用户没收藏过的商品（随机抽 60 个降低计算量）
    candidates = list(
        models.Product.objects
        .filter(category_id__in=top_cats)
        .exclude(id__in=fav_ids)
        .select_related('category')
        .order_by('?')[:60]
    )
    if not candidates:
        return _fallback_browse(user_id, k) or _fallback_hot(k)

    # 4. 对每个候选商品 c，累加 Σ similarity(c, p) for p in fav
    scored = []
    for c in candidates:
        score = 0.0
        for fid in fav_ids:
            score += similarity(c.id, fid)
        # 热门权重：在 similarity 都是 0 的情况下让销量更高的排前
        score = score * 100 + (c.sales / 10000.0)
        scored.append((score, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:k]
    result = [_product_to_dict(c) for _, c in top]

    # 5. 不够 k 个 → 用 fallback 补
    if len(result) < k:
        seen = {r['id'] for r in result}
        hot = _fallback_hot(k * 2)
        for h in hot:
            if h['id'] not in seen:
                result.append(h)
            if len(result) >= k:
                break
    return result[:k]


def recommend_for_user_explained(user_id, k=9):
    """返回带推荐原因的商品列表。

    策略顺序与 recommend_for_user 保持一致：
    CF -> 浏览历史 -> 全库热门。
    """
    fav_ids = list(
        models.FavoriteList.objects.filter(user_id=user_id)
        .values_list('product_id', flat=True)
    )
    fav_set = set(fav_ids)

    if not fav_ids:
        result = _fallback_browse_explained(user_id, k, exclude_ids=fav_set)
        if len(result) < k:
            seen = {r['id'] for r in result} | fav_set
            result.extend(_fallback_hot_explained(k * 2, exclude_ids=seen))
        return result[:k]

    fav_products = list(
        models.Product.objects.filter(id__in=fav_ids)
        .select_related('category')
        .values('id', 'category_id', 'category__name')
    )
    cat_counts = {}
    cat_names = {}
    for fp in fav_products:
        cid = fp['category_id']
        if cid:
            cat_counts[cid] = cat_counts.get(cid, 0) + 1
            cat_names[cid] = fp.get('category__name') or '相关品类'
    top_cats = [c for c, _ in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:3]]

    if not top_cats:
        return _fallback_hot_explained(k, exclude_ids=fav_set)

    candidates = list(
        models.Product.objects
        .filter(category_id__in=top_cats)
        .exclude(id__in=fav_set)
        .select_related('category')
        .order_by('?')[:60]
    )
    if not candidates:
        result = _fallback_browse_explained(user_id, k, exclude_ids=fav_set)
        if len(result) < k:
            seen = {r['id'] for r in result} | fav_set
            result.extend(_fallback_hot_explained(k * 2, exclude_ids=seen))
        return result[:k]

    scored = []
    for c in candidates:
        similarity_score = 0.0
        for fid in fav_ids:
            similarity_score += similarity(c.id, fid)
        category_hits = cat_counts.get(c.category_id, 0)
        hot_score = c.sales / 10000.0
        score = similarity_score * 100 + category_hits * 6 + hot_score
        scored.append((score, similarity_score, category_hits, c))
    scored.sort(key=lambda x: x[0], reverse=True)

    result = []
    for score, similarity_score, category_hits, p in scored[:k]:
        d = _product_to_dict(p)
        cat_name = d.get('category_name') or cat_names.get(p.category_id, '相关品类')
        if similarity_score > 0:
            reason_type = 'similar_favorite'
            reason = f'因为你收藏过与它相似的 {cat_name} 类商品'
        elif category_hits > 0:
            reason_type = 'same_category'
            reason = f'因为你收藏过 {category_hits} 件 {cat_name} 类商品'
        else:
            reason_type = 'hot_in_category'
            reason = f'{cat_name} 类近期热销商品，与你的偏好接近'
        d.update({
            'favorited': 0,
            'score': round(score, 2),
            'strategy': 'cf',
            'reason_type': reason_type,
            'reason': reason,
        })
        result.append(d)

    if len(result) < k:
        seen = {r['id'] for r in result} | fav_set
        for item in _fallback_browse_explained(user_id, k, exclude_ids=seen):
            if item['id'] not in seen:
                result.append(item)
                seen.add(item['id'])
            if len(result) >= k:
                break
        if len(result) < k:
            for item in _fallback_hot_explained(k * 2, exclude_ids=seen):
                if item['id'] not in seen:
                    result.append(item)
                    seen.add(item['id'])
                if len(result) >= k:
                    break
    return result[:k]


if __name__ == '__main__':
    import os, django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taotrend.settings')
    django.setup()
    print(recommend_for_user('test001', 9))
