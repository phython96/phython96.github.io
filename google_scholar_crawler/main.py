import json
import os
from datetime import datetime, timezone

from scholarly import scholarly

author_id = os.environ.get("GOOGLE_SCHOLAR_ID", "").strip()
if not author_id:
    raise SystemExit("GOOGLE_SCHOLAR_ID env var is required")

author = scholarly.search_author_id(author_id)
author = scholarly.fill(author, sections=["basics", "indices", "counts"])

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
