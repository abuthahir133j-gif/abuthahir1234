import os
import sys
import django

# Add backend to path
sys.path.insert(0, r"D:\CMS\Language_lab\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.urls import get_resolver
from django.db import connection

print("=== RESOLVED URL PATTERNS ===")
resolver = get_resolver()
def list_urls(patterns, prefix=""):
    for p in patterns:
        if hasattr(p, 'url_patterns'):
            list_urls(p.url_patterns, prefix + str(p.pattern))
        else:
            print(f"{prefix}{p.pattern} -> {p.callback}")

list_urls(resolver.url_patterns)

print("\n=== POSTGRESQL DATABASES ===")
with connection.cursor() as cursor:
    cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
    for row in cursor.fetchall():
        print(f"DB: {row[0]}")

print("\n=== CONTENT STUDIO / LMS MODELS ===")
from django.apps import apps
for model in apps.get_models():
    cnt = model.objects.count()
    if cnt > 0 or "content" in model._meta.app_label or "lms" in model._meta.app_label or "super_admin" in model._meta.app_label:
        print(f"{model._meta.app_label}.{model.__name__}: {cnt}")
