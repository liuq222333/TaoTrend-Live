"""TaoTrend Live 数据模型（7 张表）。"""
from django.db import models


class Category(models.Model):
    """品类：美妆/数码/服饰/家居/食品/母婴/运动/图书 + 二级品类"""
    id = models.AutoField('品类ID', primary_key=True)
    name = models.CharField('品类名称', max_length=64, unique=True)
    parent = models.ForeignKey(
        'self', models.SET_NULL, blank=True, null=True,
        related_name='children', verbose_name='父品类',
    )
    icon_glyph = models.CharField('图标', max_length=8, default='✦')

    class Meta:
        managed = True
        db_table = 'category'
        verbose_name = '品类'
        verbose_name_plural = '品类'

    def __str__(self):
        return self.name


class Anchor(models.Model):
    """主播"""
    id = models.AutoField('主播ID', primary_key=True)
    nickname = models.CharField('昵称', max_length=64)
    platform = models.CharField('平台', max_length=16)  # taobao/douyin/pdd
    fans = models.BigIntegerField('粉丝数', default=0)
    avg_gmv = models.DecimalField('平均GMV', max_digits=14, decimal_places=2, default=0)
    return_rate = models.FloatField('退货率', default=0.0)
    avatar_seed = models.CharField('头像种子', max_length=16, default='seed')

    class Meta:
        managed = True
        db_table = 'anchor'
        verbose_name = '主播'
        verbose_name_plural = '主播'

    def __str__(self):
        return f'{self.nickname}({self.platform})'


class Product(models.Model):
    """商品"""
    id = models.AutoField('商品ID', primary_key=True)
    name = models.CharField('商品名称', max_length=255)
    category = models.ForeignKey(
        Category, models.DO_NOTHING, blank=True, null=True,
        related_name='products', verbose_name='品类',
    )
    brand = models.CharField('品牌', max_length=64, blank=True, default='')
    price = models.DecimalField('价格', max_digits=10, decimal_places=2, default=0)
    sales = models.IntegerField('累计销量', default=0)
    rating = models.FloatField('评分', default=4.5)
    image_seed = models.CharField('占位图种子', max_length=16, default='seed')
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'product'
        verbose_name = '商品'
        verbose_name_plural = '商品'
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['-sales']),
        ]

    def __str__(self):
        return self.name


class LiveStream(models.Model):
    """直播间记录"""
    id = models.AutoField('直播ID', primary_key=True)
    anchor = models.ForeignKey(
        Anchor, models.DO_NOTHING, blank=True, null=True,
        related_name='livestreams', verbose_name='主播',
    )
    title = models.CharField('直播标题', max_length=255)
    platform = models.CharField('平台', max_length=16)
    start_at = models.DateTimeField('开播时间')
    duration_min = models.IntegerField('时长(分)', default=60)
    peak_audience = models.IntegerField('峰值观众', default=0)
    gmv = models.DecimalField('GMV', max_digits=14, decimal_places=2, default=0)
    conversion_rate = models.FloatField('转化率', default=0.0)

    class Meta:
        managed = True
        db_table = 'live_stream'
        verbose_name = '直播间'
        verbose_name_plural = '直播间'
        indexes = [
            models.Index(fields=['-start_at']),
            models.Index(fields=['platform']),
        ]

    def __str__(self):
        return self.title


class LiveStreamProduct(models.Model):
    """直播间-商品关联"""
    id = models.AutoField(primary_key=True)
    live = models.ForeignKey(
        LiveStream, models.CASCADE,
        related_name='live_products', verbose_name='直播间',
    )
    product = models.ForeignKey(
        Product, models.CASCADE,
        related_name='live_products', verbose_name='商品',
    )
    sold_qty = models.IntegerField('售出数量', default=0)
    sold_gmv = models.DecimalField('售出GMV', max_digits=12, decimal_places=2, default=0)

    class Meta:
        managed = True
        db_table = 'live_stream_product'
        verbose_name = '直播间商品'
        verbose_name_plural = '直播间商品'
        indexes = [
            models.Index(fields=['live']),
            models.Index(fields=['product']),
        ]


class UserAccount(models.Model):
    """前台用户（不复用 Django auth.User）"""
    user_id = models.CharField('用户ID', primary_key=True, max_length=11)
    user_name = models.CharField('用户名', max_length=64, blank=True, default='')
    pass_word = models.CharField('密码', max_length=64, blank=True, default='')
    avatar_seed = models.CharField('头像种子', max_length=16, default='seed')
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'user_account'
        verbose_name = '前台用户'
        verbose_name_plural = '前台用户'

    def __str__(self):
        return f'{self.user_name}({self.user_id})'


class FavoriteList(models.Model):
    """收藏"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        UserAccount, models.CASCADE,
        related_name='favorites', verbose_name='用户',
    )
    product = models.ForeignKey(
        Product, models.CASCADE,
        related_name='favorited_by', verbose_name='商品',
    )
    created_at = models.DateTimeField('收藏时间', auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'favorite_list'
        verbose_name = '收藏'
        verbose_name_plural = '收藏'
        unique_together = ('user', 'product')


class BrowseLog(models.Model):
    """浏览日志（不去重，按时间）"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        UserAccount, models.CASCADE,
        related_name='browse_logs', verbose_name='用户',
    )
    product = models.ForeignKey(
        Product, models.CASCADE,
        related_name='browse_logs', verbose_name='商品',
    )
    viewed_at = models.DateTimeField('浏览时间', auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'browse_log'
        verbose_name = '浏览日志'
        verbose_name_plural = '浏览日志'
        indexes = [
            models.Index(fields=['user', '-viewed_at']),
        ]
