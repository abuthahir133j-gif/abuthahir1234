import os
import sys
import django

sys.path.insert(0, r"D:\CMS\Language_lab\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
import psycopg

cfg = settings.DATABASES['default']
dbs = ["postgres", "mydb", "languagelab", "studentdb", "schooldb"]

for db_name in dbs:
    try:
        conn = psycopg.connect(
            dbname=db_name,
            user=cfg.get('USER'),
            password=cfg.get('PASSWORD'),
            host=cfg.get('HOST') or '127.0.0.1',
            port=cfg.get('PORT') or 5432
        )
        with conn.cursor() as cur:
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
            tables = [r[0] for r in cur.fetchall()]
            print(f"\n--- DB: {db_name} (Tables: {len(tables)}) ---")
            for t in tables:
                try:
                    cur.execute(f"SELECT COUNT(*) FROM \"{t}\";")
                    cnt = cur.fetchone()[0]
                    if cnt > 0:
                        print(f"  {t}: {cnt}")
                except Exception as e:
                    pass
        conn.close()
    except Exception as e:
        print(f"Error connecting to {db_name}: {e}")
