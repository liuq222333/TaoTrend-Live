#!/bin/bash
# TaoTrend Live · 后端一键启动脚本
set -e
cd "$(dirname "$0")"

echo ">>> 1. 创建 MySQL 数据库 taotrend ..."
mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS taotrend DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

echo ">>> 2. 准备 Python 虚拟环境 ..."
if [ ! -d venv ]; then
  python3 -m venv venv
fi
venv/bin/pip install -q -r requirements.txt

echo ">>> 3. 执行 Django migrate ..."
venv/bin/python manage.py migrate --noinput

echo ">>> 4. 检查数据，必要时生成 mock 数据 ..."
COUNT=$(venv/bin/python -c "import os,django; os.environ.setdefault('DJANGO_SETTINGS_MODULE','taotrend.settings'); django.setup(); from core.models import Product; print(Product.objects.count())")
if [ "$COUNT" -eq "0" ]; then
  echo "    无数据，开始生成..."
  venv/bin/python core/generate_data.py
else
  echo "    已有 $COUNT 件商品，跳过数据生成。"
fi

echo ">>> 5. 扩充种子数据（30 用户 / ~390 收藏 / ~800 浏览）..."
venv/bin/python core/augment_seed.py

echo ">>> 6. 启动 Django runserver :8001 ..."
venv/bin/python manage.py runserver 0.0.0.0:8001
