import json
import os
import sys
import time
from datetime import datetime, timezone

from scholarly import scholarly, ProxyGenerator

author_id = os.environ.get("GOOGLE_SCHOLAR_ID", "").strip()
if not author_id:
    raise SystemExit("GOOGLE_SCHOLAR_ID env var is required")


def setup_proxy():
    """Google Scholar blocks GitHub's shared runner IPs. Route through a proxy.

    Prefers ScraperAPI (reliable, free tier) if SCRAPERAPI_KEY is set, and
    otherwise falls back to best-effort free proxies. The step timeout bounds
    how long this can run.
    """
    key = os.environ.get("SCRAPERAPI_KEY", "").strip()
    pg = ProxyGenerator()
    if key:
        if pg.ScraperAPI(key):
            scholarly.use_proxy(pg)
            print("Using ScraperAPI proxy")
            return
        print("ScraperAPI setup failed; falling back to free proxies")
    try:
        if pg.FreeProxies():
            scholarly.use_proxy(pg)
            print("Using free proxies")
    except Exception as e:
        print("FreeProxies setup error:", e)


def fetch():
    author = scholarly.search_author_id(author_id)
    return scholarly.fill(author, sections=["basics", "indices", "counts"])


setup_proxy()

author = None
last_err = None
for attempt in range(1, 4):
    try:
        author = fetch()
        break
    except Exception as e:
        last_err = e
        print(f"Attempt {attempt} failed: {e}")
        time.sleep(5)

if author is None:
    print("Could not fetch Scholar data:", last_err)
    sys.exit(1)

data = {
    "name": author.get("name"),
    "citedby": author.get("citedby", 0),
    "hindex": author.get("hindex", 0),
    "i10index": author.get("i10index", 0),
    "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
}

os.makedirs("results", exist_ok=True)
with open("results/gs_data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

shieldsio = {
    "schemaVersion": 1,
    "label": "citations",
    "message": str(data["citedby"]),
    "color": "blueviolet",
}
with open("results/gs_data_shieldsio.json", "w", encoding="utf-8") as f:
    json.dump(shieldsio, f, ensure_ascii=False, indent=2)

print("Wrote citedby =", data["citedby"])
