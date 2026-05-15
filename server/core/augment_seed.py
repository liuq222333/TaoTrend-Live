"""扩充种子数据：补 30 个用户、800+ 收藏、1500+ 浏览历史。

让 test001 拥有 20-30 收藏 + 50 浏览，并随机构造其它用户的行为，
使 item-based 协同过滤有更密集的训练信号、推荐/收藏/历史页面有更丰富展示。

运行：cd server && venv/bin/python core/augment_seed.py
幂等：检测到已有 >= 100 条 FavoriteList 时直接跳过。
"""
import os
import sys
import random
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taotrend.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django  # noqa: E402
django.setup()

from django.utils import timezone  # noqa: E402
from core import models  # noqa: E402


SEED = 20260516
random.seed(SEED)


# 扩充用户名清单（带点电商运营 / MCN / 主播粉的感觉）
NEW_USERS = [
    ('alice01', '艾莉运营'),
    ('bobby02', '小白电商'),
    ('chenc03', '陈晨直播'),
    ('dora_04', '朵拉选品'),
    ('echo_05', '回声品牌'),
    ('faye_06', '霏霏 MCN'),
    ('gigi_07', 'GIGI 美妆控'),
    ('hyao_08', '皓宇数码'),
    ('iris_09', '艾瑞斯穿搭'),
    ('jack_10', 'Jack 户外'),
    ('kate_11', '凯特母婴'),
    ('leo_12', '李欧厨房'),
    ('mark_13', '马克 3C'),
    ('nora_14', '诺拉养生'),
    ('owen_15', '欧文图书'),
    ('paul_16', '保罗运动'),
    ('queen17', '皇后美甲'),
    ('rita_18', '丽塔家居'),
    ('sam_19', 'Sam 摄影'),
    ('tina_20', '婷婷食品'),
    ('umi_21', '海未旅行'),
    ('vera_22', '薇拉服饰'),
    ('will_23', '威尔配饰'),
    ('xena_24', '希娜潮流'),
    ('yoyo_25', 'YOYO 玩具'),
    ('zoe_26', '佐伊小奢'),
    ('aria_27', '艾莉雅食材'),
    ('blake28', '布雷克健身'),
    ('cera_29', '塞拉宠物'),
    ('dean_30', '迪恩家电'),
]


def main():
    fav_existing = models.FavoriteList.objects.count()
    if fav_existing >= 100:
        print(f'已存在 {fav_existing} 条 FavoriteList，跳过 augment（如需重置请清表后再运行）')
        return

    test_user = models.UserAccount.objects.filter(user_id='test001').first()
    if not test_user:
        print('未找到 test001，先运行 generate_data.py')
        return

    # 1. 新增 30 个测试用户（密码统一 123456）
    created_users = []
    for uid, name in NEW_USERS:
        u, was_created = models.UserAccount.objects.get_or_create(
            user_id=uid,
            defaults={'user_name': name, 'pass_word': '123456', 'avatar_seed': uid},
        )
        if was_created:
            created_users.append(u)
    print(f'已新增 {len(created_users)} 个用户')

    all_users = list(models.UserAccount.objects.all())

    # 2. 给每个一级品类挑出销量 top 20 商品 + 全库 top 100，作为热门池
    top_categories = list(models.Category.objects.filter(parent__isnull=True))
    hot_pool = []
    for cat in top_categories:
        sub_ids = list(models.Category.objects.filter(parent=cat).values_list('id', flat=True))
        ids = [cat.id] + sub_ids
        hot_in_cat = list(
            models.Product.objects.filter(category_id__in=ids)
            .order_by('-sales')[:30]
        )
        hot_pool.extend(hot_in_cat)
    # 加全库热门 200 个
    global_hot = list(models.Product.objects.order_by('-sales')[:200])
    hot_pool = list({p.id: p for p in hot_pool + global_hot}.values())
    print(f'热门池 {len(hot_pool)} 个商品')

    now = timezone.now()

    # 3. test001 — 强化数据：25 收藏、80 浏览（横跨 5+ 品类，给 item-CF 训练信号）
    seed_user_prefs = random.sample(top_categories, 5)
    pref_products = []
    for cat in seed_user_prefs:
        sub_ids = list(models.Category.objects.filter(parent=cat).values_list('id', flat=True))
        ids = [cat.id] + sub_ids
        pref_products.extend(
            list(models.Product.objects.filter(category_id__in=ids).order_by('-sales')[:20])
        )

    favs_for_test = []
    for p in random.sample(pref_products, min(25, len(pref_products))):
        favs_for_test.append(models.FavoriteList(
            user=test_user, product=p,
            created_at=now - timedelta(days=random.randint(0, 60)),
        ))
    # 跳过已存在的
    existing_pairs = set(
        models.FavoriteList.objects.filter(user=test_user).values_list('product_id', flat=True)
    )
    favs_for_test = [f for f in favs_for_test if f.product_id not in existing_pairs]
    models.FavoriteList.objects.bulk_create(favs_for_test, batch_size=200, ignore_conflicts=True)
    print(f'test001 新增 {len(favs_for_test)} 条收藏')

    browse_for_test = []
    for p in random.sample(pref_products + global_hot, min(80, len(pref_products) + len(global_hot))):
        browse_for_test.append(models.BrowseLog(
            user=test_user, product=p,
            viewed_at=now - timedelta(
                days=random.randint(0, 30),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            ),
        ))
    models.BrowseLog.objects.bulk_create(browse_for_test, batch_size=200)
    print(f'test001 新增 {len(browse_for_test)} 条浏览')

    # 4. 其它用户 — 每人 8-15 收藏 + 15-40 浏览，集中在 1-3 个偏好品类
    favs_buffer = []
    browse_buffer = []
    for u in all_users:
        if u.user_id == 'test001':
            continue
        # 该用户的偏好品类
        prefs = random.sample(top_categories, random.randint(1, 3))
        pool = []
        for cat in prefs:
            sub_ids = list(models.Category.objects.filter(parent=cat).values_list('id', flat=True))
            ids = [cat.id] + sub_ids
            pool.extend(
                list(models.Product.objects.filter(category_id__in=ids).order_by('-sales')[:50])
            )
        if not pool:
            continue
        fav_count = random.randint(8, 15)
        for p in random.sample(pool, min(fav_count, len(pool))):
            favs_buffer.append(models.FavoriteList(
                user=u, product=p,
                created_at=now - timedelta(days=random.randint(0, 60)),
            ))
        browse_count = random.randint(15, 40)
        browse_pool = pool + random.sample(global_hot, min(40, len(global_hot)))
        for p in random.sample(browse_pool, min(browse_count, len(browse_pool))):
            browse_buffer.append(models.BrowseLog(
                user=u, product=p,
                viewed_at=now - timedelta(
                    days=random.randint(0, 30),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59),
                ),
            ))

    models.FavoriteList.objects.bulk_create(favs_buffer, batch_size=500, ignore_conflicts=True)
    models.BrowseLog.objects.bulk_create(browse_buffer, batch_size=500)
    print(f'其它用户共新增 {len(favs_buffer)} 收藏 + {len(browse_buffer)} 浏览')

    print('---')
    print(f'终态：UserAccount={models.UserAccount.objects.count()}')
    print(f'      FavoriteList={models.FavoriteList.objects.count()}')
    print(f'      BrowseLog={models.BrowseLog.objects.count()}')


if __name__ == '__main__':
    main()
