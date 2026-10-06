import os
import sys
import django

sys.path.insert(0, r"D:\CMS\Language_lab\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
import psycopg

cfg = settings.DATABASES['default']
conn = psycopg.connect(
    dbname='languagelab',
    user=cfg.get('USER'),
    password=cfg.get('PASSWORD'),
    host=cfg.get('HOST') or '127.0.0.1',
    port=cfg.get('PORT') or 5432
)

with conn.cursor() as cur:
    cur.execute("SELECT schema_name FROM information_schema.schemata;")
    schemas = [r[0] for r in cur.fetchall()]
    print("Schemas in languagelab:", schemas)
    for s in schemas:
        cur.execute(f"SELECT table_name FROM information_schema.tables WHERE table_schema='{s}';")
        tables = [r[0] for r in cur.fetchall()]
        print(f"Schema {s}: {len(tables)} tables")
        for t in tables:
            cur.execute(f"SELECT COUNT(*) FROM \"{s}\".\"{t}\";")
            cnt = cur.fetchone()[0]
            if cnt > 0:
                print(f"  {s}.{t}: {cnt}")

conn.close()
