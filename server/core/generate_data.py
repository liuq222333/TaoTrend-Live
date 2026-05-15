#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TaoTrend Live mock 数据生成器。

规模目标（来自 DESIGN.md §3.3）：
  Category          : 8 一级 + 32 二级
  Anchor            : 200（taobao 4 : douyin 4 : pdd 2）
  Product           : 25 000
  LiveStream        : 5 000（近 90 天）
  LiveStreamProduct : ~30 000（每场 4-10 个商品）
  UserAccount       : 1（test001 测试账号）

幂等：每次会清空并重建（用 TRUNCATE / bulk_create）。
"""
import os
import sys
import random
from datetime import timedelta
from decimal import Decimal

# Django bootstrap
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taotrend.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django  # noqa: E402
django.setup()

from django.utils import timezone  # noqa: E402

from core.models import (  # noqa: E402
    Category, Anchor, Product, LiveStream, LiveStreamProduct,
    UserAccount, FavoriteList, BrowseLog,
)


# ============================================================
# 配置：8 个一级品类（icon + 价格区间 + 二级 + 词根 + 品牌）
# ============================================================

CATEGORY_TREE = {
    '美妆': {
        'icon': '✦',
        'weight': 14,
        'price_range': (50, 3000),
        'children': ['口红', '粉底', '面膜', '香水'],
        'words_prefix': ['雪域', '玫瑰', '丝绒', '焦糖', '蜜桃', '原野', '森林', '极光', '羽柔', '细雾'],
        'words_suffix': ['限定', '礼盒', '小样', '套装', '精华', '滋润型', '哑光', '镜面', '气垫', '修护'],
        'brands': ['Estée Lauder', 'Lancôme', 'YSL', 'Dior', '花西子', '完美日记', '雅诗兰黛', 'SK-II'],
    },
    '数码': {
        'icon': '◈',
        'weight': 16,
        'price_range': (200, 30000),
        'children': ['手机', '笔记本', '耳机', '智能穿戴'],
        'words_prefix': ['极光', '星河', '量子', '深空', '矩阵', '锐影', '飞翼', '焰红', '冰川', '渡鸦'],
        'words_suffix': ['Pro', 'Ultra', 'Max', 'Lite', '青春版', '电竞版', '商务版', '尊享版', '影像旗舰', '5G'],
        'brands': ['Apple', '华为', '小米', 'OPPO', 'vivo', '荣耀', 'Sony', 'Bose', 'Lenovo', 'DELL'],
    },
    '服饰': {
        'icon': '◆',
        'weight': 18,
        'price_range': (80, 4000),
        'children': ['连衣裙', '外套', '运动鞋', '内衣'],
        'words_prefix': ['复古', '法式', '小香风', '街头', '极简', '奶油', '英伦', '渐变', '宽松', '修身'],
        'words_suffix': ['长款', '短款', '夹棉', '加绒', '高腰', '直筒', '羊毛', '亚麻', '透气', '修身款'],
        'brands': ['UR', 'Zara', 'H&M', 'Uniqlo', 'GAP', '波司登', '安踏', '李宁', 'Nike', 'Adidas'],
    },
    '家居': {
        'icon': '⌂',
        'weight': 12,
        'price_range': (30, 8000),
        'children': ['厨具', '床品', '清洁', '小家电'],
        'words_prefix': ['日式', '北欧', '极简', '原木', '工业风', '复古', '现代', '田园', '禅意', '美式'],
        'words_suffix': ['四件套', '套装', '可折叠', '加大码', '加厚', '隔水', '加湿', '收纳', '智能', '静音'],
        'brands': ['MUJI', '宜家', '九阳', '美的', '苏泊尔', '小熊', '戴森', '飞利浦', '荣耀生活', '南极人'],
    },
    '食品': {
        'icon': '✷',
        'weight': 11,
        'price_range': (15, 1500),
        'children': ['零食', '茶饮', '生鲜', '保健'],
        'words_prefix': ['新疆', '云南', '北海道', '阿拉斯加', '黑松露', '日式', '韩式', '原产地', '冷链', '冰鲜'],
        'words_suffix': ['礼盒', '罐装', '袋装', '直供', '即食', '速食', '冷藏', '原切', '调味', '低脂'],
        'brands': ['三只松鼠', '良品铺子', '百草味', '李子柒', '元气森林', '蜜雪', '钟薛高', '盒马', '海底捞', '统一'],
    },
    '母婴': {
        'icon': '✿',
        'weight': 8,
        'price_range': (40, 5000),
        'children': ['奶粉', '尿不湿', '玩具', '童装'],
        'words_prefix': ['婴幼儿', '新生儿', '0-3岁', '3-6岁', '宝宝', '婴儿', '幼儿', '童年', '萌系', '小恐龙'],
        'words_suffix': ['段位', '配方', '加大码', '加厚', '透气', '亲肤', '抑菌', '可水洗', '益智', '安抚'],
        'brands': ['爱他美', '惠氏', '飞鹤', '美素佳儿', '帮宝适', '好奇', '乐高', '迪士尼', '巴拉巴拉', '安奈儿'],
    },
    '运动': {
        'icon': '★',
        'weight': 9,
        'price_range': (60, 6000),
        'children': ['户外', '健身', '球类', '游泳'],
        'words_prefix': ['专业', '入门', '进阶', '徒步', '骑行', '登山', '夜跑', '室内', '户外', '极地'],
        'words_suffix': ['Pro', '速干', '透气', '防水', '减震', '弹力', '碳板', '便携', '可折叠', '专业款'],
        'brands': ['Nike', 'Adidas', '李宁', '安踏', 'Under Armour', 'New Balance', 'Asics', 'Speedo', 'Salomon', 'Decathlon'],
    },
    '图书': {
        'icon': '✦',
        'weight': 12,
        'price_range': (20, 800),
        'children': ['文学', '科技', '童书', '考研'],
        'words_prefix': ['当代', '诺奖', '经典', '畅销', '名家', '入门', '深度', '图解', '通识', '高分'],
        'words_suffix': ['全集', '套装', '精装', '修订版', '注释版', '导读', '插图本', '彩绘版', '英文原版', '考点速记'],
        'brands': ['人民文学', '中信', '商务印书馆', '新经典', '理想国', '上海译文', '后浪', '华章', '机械工业', '清华大学'],
    },
}

# 平台分配
PLATFORM_WEIGHTS = [
    ('taobao', 4),
    ('douyin', 4),
    ('pdd', 2),
]

ANCHOR_NICK_PREFIX = [
    '主播', '小', '老', '阿', '阿宝', '大哥', '姐姐', '老板', '掌柜', '直播间',
    'Mr.', 'Miss.', 'King', 'Queen', '红人', '达人', '小仙女', '老司机', '总监',
]
ANCHOR_NICK_NAME = [
    '雷', '阳', '辰', '欣', '璐', '青', '璇', '岚', '霁', '舟',
    '南风', '北野', '青城', '白露', '初晴', '云溪', '星河', '半夏', '七月', '宫野',
    '李佳', '薇娅', '罗永浩', '辛巴', '小杨', '潘子', '彩虹', '骆王宇', '一姐', '一哥',
]


# ============================================================
# 工具
# ============================================================

def _pick_platform():
    items, weights = zip(*PLATFORM_WEIGHTS)
    return random.choices(items, weights=weights)[0]


def _gen_seed(n=8):
    return ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=n))


# ============================================================
# 数据构造
# ============================================================

def gen_categories():
    Category.objects.all().delete()
    parents = {}
    for name, conf in CATEGORY_TREE.items():
        p = Category.objects.create(name=name, icon_glyph=conf['icon'])
        parents[name] = p
    children_to_create = []
    for name, conf in CATEGORY_TREE.items():
        for child_name in conf['children']:
            children_to_create.append(Category(
                name=f'{name}-{child_name}', parent=parents[name], icon_glyph=conf['icon'],
            ))
    Category.objects.bulk_create(children_to_create, batch_size=200)
    print(f'  Category    : {Category.objects.count()} 行 '
          f'({len(parents)} 一级 + {len(children_to_create)} 二级)')
    return parents


def gen_anchors():
    Anchor.objects.all().delete()
    rows = []
    used_nick = set()
    for i in range(200):
        platform = _pick_platform()
        while True:
            nick = random.choice(ANCHOR_NICK_PREFIX) + random.choice(ANCHOR_NICK_NAME)
            if random.random() < 0.4:
                nick += str(random.randint(1, 99))
            if nick not in used_nick:
                used_nick.add(nick)
                break
        # 粉丝分层：少量 super big、一些 big、大量 medium、长尾 small
        r = random.random()
        if r < 0.05:
            fans = random.randint(5_000_000, 50_000_000)  # super
        elif r < 0.2:
            fans = random.randint(1_000_000, 5_000_000)   # big
        elif r < 0.6:
            fans = random.randint(100_000, 1_000_000)     # medium
        else:
            fans = random.randint(1_000, 100_000)         # small
        # 平均 GMV 与 fans 正相关 + 噪声
        avg_gmv = fans * random.uniform(0.4, 2.0)
        # 退货率：8% ~ 28%，大主播稍低
        ret = random.uniform(0.06, 0.28) - (fans / 50_000_000) * 0.08
        ret = max(0.03, round(ret, 4))
        rows.append(Anchor(
            nickname=nick, platform=platform, fans=fans,
            avg_gmv=Decimal(round(avg_gmv, 2)),
            return_rate=ret, avatar_seed=_gen_seed(),
        ))
    Anchor.objects.bulk_create(rows, batch_size=500)
    print(f'  Anchor      : {Anchor.objects.count()} 行')


def gen_products(parents):
    Product.objects.all().delete()
    # 把权重转成累积分布
    names = list(CATEGORY_TREE.keys())
    weights = [CATEGORY_TREE[n]['weight'] for n in names]
    # 每个一级品类下，再抽其某个二级品类
    sub_cache = {n: list(Category.objects.filter(parent=parents[n])) for n in names}

    rows = []
    target = 25000
    for i in range(target):
        parent_name = random.choices(names, weights=weights)[0]
        conf = CATEGORY_TREE[parent_name]
        sub = random.choice(sub_cache[parent_name])
        prefix = random.choice(conf['words_prefix'])
        suffix = random.choice(conf['words_suffix'])
        brand = random.choice(conf['brands'])
        name = f'{brand} {prefix}{sub.name.split("-")[-1]} {suffix}'
        # 价格在品类区间内偏对数分布
        lo, hi = conf['price_range']
        # 70% 落在前 40% 价位
        if random.random() < 0.7:
            price = random.uniform(lo, lo + (hi - lo) * 0.4)
        else:
            price = random.uniform(lo + (hi - lo) * 0.4, hi)
        price = round(price, 2)
        # 销量：低价高销，高价低销，再加噪声
        rel_price = (price - lo) / max(1, hi - lo)
        base_sales = int(50000 * (1 - rel_price) ** 2 + 10)
        sales = max(0, int(base_sales * random.uniform(0.2, 2.5)))
        rating = round(random.uniform(3.5, 5.0), 2)
        rows.append(Product(
            name=name, category=sub, brand=brand,
            price=Decimal(str(price)), sales=sales, rating=rating,
            image_seed=_gen_seed(),
        ))
        if len(rows) >= 1000:
            Product.objects.bulk_create(rows, batch_size=1000)
            rows = []
        if (i + 1) % 5000 == 0:
            print(f'    已生成 {i + 1} 件商品')
    if rows:
        Product.objects.bulk_create(rows, batch_size=1000)
    print(f'  Product     : {Product.objects.count()} 行')


def gen_livestreams_and_links():
    LiveStreamProduct.objects.all().delete()
    LiveStream.objects.all().delete()
    anchors = list(Anchor.objects.all())
    if not anchors:
        return
    # 按品类预拉商品 id 池，给挂商品时按品类相关性选
    all_products = list(Product.objects.values('id', 'price', 'category_id'))
    products_by_cat = {}
    for p in all_products:
        products_by_cat.setdefault(p['category_id'], []).append(p)
    cat_ids = list(products_by_cat.keys())

    now = timezone.now()
    target = 5000
    live_rows = []
    print('  正在生成 LiveStream ...')
    for i in range(target):
        anchor = random.choice(anchors)
        # 时间分布近 90 天
        day_offset = random.randint(0, 89)
        # 直播时间偏向晚上 19-23 点
        hour_pool = [19, 20, 20, 21, 21, 21, 22, 22, 12, 14, 15, 16, 17, 18, 23, 10]
        hour = random.choice(hour_pool)
        minute = random.choice([0, 15, 30, 45])
        start_at = now - timedelta(days=day_offset, hours=now.hour - hour, minutes=now.minute - minute)
        # 修正：精准回到 day_offset 天前的 hour:minute
        start_at = (now - timedelta(days=day_offset)).replace(
            hour=hour, minute=minute, second=0, microsecond=0
        )
        duration = random.choice([60, 90, 120, 150, 180, 240, 300])
        # 峰值观众与粉丝挂钩
        peak = int(anchor.fans * random.uniform(0.01, 0.2))
        peak = max(peak, 100)
        # GMV 与粉丝、时长、转化率正相关
        conv = round(random.uniform(0.01, 0.18), 4)
        gmv = peak * conv * random.uniform(50, 500) + float(anchor.avg_gmv) * random.uniform(0.05, 0.3)
        gmv = round(max(gmv, 100), 2)
        # 标题模板
        title = random.choice([
            f'【{anchor.nickname}】今晚直播 福利专场',
            f'{anchor.nickname}直播间｜年度大促',
            f'{anchor.platform}独家｜{anchor.nickname}爆款盛典',
            f'{anchor.nickname}带你逛｜限时秒杀',
            f'{anchor.nickname} · {random.choice(["美妆", "数码", "服饰", "家居", "食品"])}专场',
        ])
        live_rows.append(LiveStream(
            anchor=anchor, title=title, platform=anchor.platform,
            start_at=start_at, duration_min=duration, peak_audience=peak,
            gmv=Decimal(str(gmv)), conversion_rate=conv,
        ))
        if len(live_rows) >= 1000:
            LiveStream.objects.bulk_create(live_rows, batch_size=1000)
            live_rows = []
    if live_rows:
        LiveStream.objects.bulk_create(live_rows, batch_size=1000)
    print(f'  LiveStream  : {LiveStream.objects.count()} 行')

    # 挂商品
    print('  正在生成 LiveStreamProduct ...')
    lives = list(LiveStream.objects.values('id', 'gmv'))
    link_rows = []
    for lv in lives:
        n_products = random.randint(4, 10)
        # 随机抽几个品类
        chosen_cats = random.sample(cat_ids, k=min(3, len(cat_ids)))
        pool = []
        for c in chosen_cats:
            pool.extend(products_by_cat[c])
        if not pool:
            pool = all_products
        chosen_products = random.sample(pool, k=min(n_products, len(pool)))
        live_gmv = float(lv['gmv'])
        share = [random.random() for _ in range(len(chosen_products))]
        total_share = sum(share) or 1.0
        for p, s in zip(chosen_products, share):
            product_gmv = live_gmv * (s / total_share) * random.uniform(0.6, 1.2)
            price = float(p['price']) or 1.0
            qty = max(1, int(product_gmv / price))
            link_rows.append(LiveStreamProduct(
                live_id=lv['id'], product_id=p['id'],
                sold_qty=qty, sold_gmv=Decimal(str(round(product_gmv, 2))),
            ))
            if len(link_rows) >= 1000:
                LiveStreamProduct.objects.bulk_create(link_rows, batch_size=1000)
                link_rows = []
    if link_rows:
        LiveStreamProduct.objects.bulk_create(link_rows, batch_size=1000)
    print(f'  LiveStreamProduct: {LiveStreamProduct.objects.count()} 行')


def gen_user_and_seed():
    # 预置测试账号
    FavoriteList.objects.all().delete()
    BrowseLog.objects.all().delete()
    UserAccount.objects.all().delete()
    UserAccount.objects.create(
        user_id='test001', user_name='测试用户', pass_word='123456', avatar_seed='test001',
    )
    # 给测试账号种 6 个收藏 + 8 条浏览，让推荐有种子
    hot_products = list(Product.objects.order_by('-sales')[:60])
    if hot_products:
        seed_favs = random.sample(hot_products, k=min(6, len(hot_products)))
        for p in seed_favs:
            FavoriteList.objects.get_or_create(user_id='test001', product_id=p.id)
        seed_browse = random.sample(hot_products, k=min(8, len(hot_products)))
        for p in seed_browse:
            BrowseLog.objects.create(user_id='test001', product_id=p.id)
    print(f'  UserAccount : {UserAccount.objects.count()} 行（test001 / 123456）')
    print(f'  FavoriteList: {FavoriteList.objects.count()} 行')
    print(f'  BrowseLog   : {BrowseLog.objects.count()} 行')


def main():
    random.seed(20260516)
    print('=' * 60)
    print('TaoTrend Live · Mock 数据生成')
    print('=' * 60)
    parents = gen_categories()
    gen_anchors()
    gen_products(parents)
    gen_livestreams_and_links()
    gen_user_and_seed()
    print('=' * 60)
    print('数据生成完成。')
    print(f'  Category          : {Category.objects.count()}')
    print(f'  Anchor            : {Anchor.objects.count()}')
    print(f'  Product           : {Product.objects.count()}')
    print(f'  LiveStream        : {LiveStream.objects.count()}')
    print(f'  LiveStreamProduct : {LiveStreamProduct.objects.count()}')
    print(f'  UserAccount       : {UserAccount.objects.count()}')
    print(f'  FavoriteList      : {FavoriteList.objects.count()}')
    print(f'  BrowseLog         : {BrowseLog.objects.count()}')
    print('=' * 60)


if __name__ == '__main__':
    main()
