"""WSGI config for TaoTrend Live."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taotrend.settings')

application = get_wsgi_application()
