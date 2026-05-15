"""ASGI config for TaoTrend Live."""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taotrend.settings')

application = get_asgi_application()
