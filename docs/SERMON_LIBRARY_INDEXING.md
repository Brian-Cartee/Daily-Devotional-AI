# Sermon library indexing (daily devotional clips)

The **“A message was found for you”** card at the end of the devotional uses a **library-first, YouTube-fallback** flow:

1. **AI** reads today’s verse + reflection → theme, preacher, **emotion tags**, YouTube search query, framing copy.
2. **Indexed library** (`sermon_segments` table) — match emotion tags to transcript segments with known `startSeconds` / `endSeconds`.
3. **YouTube API** — if the library is empty or no match, same trusted-channel search as before.

This is a **supporting feature** (content lives on YouTube). The index makes clips **more accurate** when populated; the app still works without it.

---

## One-time: seed the starter library

### Option A — Admin UI (recommended)

1. Deploy latest API + web app.
2. Open **`/admin/sermons`** (Sermon Segment Library).
3. Log in with `ADMIN_PASSWORD`.
4. **Curated List** tab → **Seed library (server)**  
   - Runs all videos in `artifacts/api-server/src/curatedSermonSeed.ts`  
   - ~1.5s between each (transcript fetch + GPT segmenting)  
   - Expect **~15–25 minutes** for 10 sermons.

### Option B — curl on Lightsail

```bash
curl -s -X POST "https://YOUR_DOMAIN/api/admin/sermons/seed-curated" \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_ADMIN_PASSWORD" \
  -d '{"delayMs":1500}' | jq .
```

Check status:

```bash
curl -s "https://YOUR_DOMAIN/api/admin/sermons/curated?adminPassword=YOUR_ADMIN_PASSWORD" | jq .stats
```

You want `segmentCount` > 0 and `readyForDailyMatching: true`.

---

## Growing the library

- **Search YouTube** tab: find Tier 1–3 pastors (`pastorTiers.ts`), queue sermons, ingest.
- Add IDs to **`curatedSermonSeed.ts`** for repeatable batch seeds.
- Re-run **Seed library** — already-ingested videos are skipped (`segmentsCreated: 0`).

**Requirements per video**

- Public YouTube captions/transcript (ingestion uses `youtube-transcript`).
- Full sermon or long teaching (first ~45 minutes are analyzed).

---

## How daily matching works

| Source | When | User experience |
|--------|------|-----------------|
| `library` | Segment match on emotion tags | Embed starts at **exact moment**; title = moment title |
| `youtube` | No library / no match | Full video from search; same as before |

Logs: API does not expose source to users; optional `source` field on `/api/sermon/daily` for debugging.

---

## Deploy after changes

```bash
git pull && bash scripts/deploy-lightsail.sh
```

Force-quit the app if testing in the native WebView shell.

---

## Edit curated seed list

`artifacts/api-server/src/curatedSermonSeed.ts` — single source for admin curated tab + `seed-curated` endpoint.

Prefer **Tier 1** channels in `artifacts/api-server/src/pastorTiers.ts` for daily devotional tone.
