from django.contrib import admin

from core import models


@admin.register(models.Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'parent', 'icon_glyph')
    list_filter = ('parent',)
    search_fields = ('name',)


@admin.register(models.Anchor)
class AnchorAdmin(admin.ModelAdmin):
    list_display = ('id', 'nickname', 'platform', 'fans', 'avg_gmv', 'return_rate')
    list_filter = ('platform',)
    search_fields = ('nickname',)


@admin.register(models.Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category', 'brand', 'price', 'sales', 'rating')
    list_filter = ('category', 'brand')
    search_fields = ('name', 'brand')


@admin.register(models.LiveStream)
class LiveStreamAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'anchor', 'platform', 'start_at', 'gmv')
    list_filter = ('platform',)
    search_fields = ('title',)


@admin.register(models.LiveStreamProduct)
class LiveStreamProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'live', 'product', 'sold_qty', 'sold_gmv')


@admin.register(models.UserAccount)
class UserAccountAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'user_name', 'created_at')
    search_fields = ('user_id', 'user_name')


@admin.register(models.FavoriteList)
class FavoriteListAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'product', 'created_at')


@admin.register(models.BrowseLog)
class BrowseLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'product', 'viewed_at')
