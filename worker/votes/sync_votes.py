#!/usr/bin/env python3
"""Синк голосов из Cloudflare Worker (ds-votes) в Postgres gar_core.site_votes.
Запуск: python3 sync_votes.py (cron раз в час). Токен: ~/.ds-votes-token."""
import json, os, subprocess

URL = "https://ds-votes.sazurov.workers.dev/export"
TOKEN = open(os.path.expanduser("~/.ds-votes-token")).read().strip()
PSQL = ["docker", "exec", "-i", "docker-db_postgres-1", "psql", "-U", "postgres", "-d", "gar_core", "-tA", "-v", "ON_ERROR_STOP=1"]

def psql(sql):
    return subprocess.run(PSQL, input=sql, capture_output=True, text=True, check=True).stdout.strip()

psql("CREATE TABLE IF NOT EXISTS site_votes (doc_id text NOT NULL, voter text NOT NULL, kind text NOT NULL, "
     "vote smallint NOT NULL, ts bigint NOT NULL, PRIMARY KEY (doc_id, voter)); "
     "CREATE INDEX IF NOT EXISTS site_votes_doc ON site_votes (doc_id);")
since = int(psql("SELECT COALESCE(max(ts),0) FROM site_votes;") or 0)
total = 0
while True:
    out = subprocess.run(["/mnt/c/Windows/System32/curl.exe", "-sS", "-m", "30", "-H", f"Authorization: Bearer {TOKEN}", f"{URL}?since={since}"],
                         capture_output=True, text=True, check=True).stdout
    rows = json.loads(out)
    if not rows:
        break
    vals = ",".join("('%s','%s','%s',%d,%d)" % (r["doc_id"], r["voter"], r["kind"], r["vote"], r["ts"]) for r in rows)
    psql("INSERT INTO site_votes (doc_id,voter,kind,vote,ts) VALUES " + vals +
         " ON CONFLICT (doc_id,voter) DO UPDATE SET vote=EXCLUDED.vote, ts=EXCLUDED.ts, kind=EXCLUDED.kind;")
    total += len(rows)
    since = max(r["ts"] for r in rows)
    if len(rows) < 5000:
        break
print("synced", total)
