# Railway (jubilant-stillness) — what to do

**Production today:** `shepherdspathai.com` runs on **AWS Lightsail** (`scripts/deploy-lightsail.sh`).  
**Railway** is a separate, optional host. Failed Railway builds do **not** take down the live site — they only send email noise when GitHub pushes trigger a deploy.

---

## Recommended: stop failed build emails (Option A)

If you are not using Railway for production:

1. Open [railway.app](https://railway.app) → project **jubilant-stillness**
2. Click the **`Daily-Devotional-AI`** service (not Postgres)
3. **Settings** → **Source** / **GitHub**
4. **Disconnect** the repo, or turn off **Deploy on push** / **Automatic deployments**
5. Cancel any in-progress deploy under **Deployments**

Leave **Postgres-6oXr** alone unless you are sure nothing uses its `DATABASE_URL` (Lightsail `.env` should not point at `*.railway.app`).

Result: pushes to `main` no longer trigger Railway builds or “Build failed” emails.

---

## Optional: keep Railway as API backup (Option B)

This repo is configured for **Dockerfile** builds (not Nixpacks `frozen-lockfile`):

| File | Role |
|------|------|
| `railway.json` | Builder = `DOCKERFILE`, health `/api/healthz` |
| `railway.toml` | Same, for Railway CLI |
| `Dockerfile` | Slim API-only image (`@workspace/api-server`) |
| `nixpacks.toml` | Legacy; ignored when Dockerfile builder is active |

### Railway service settings

On **`Daily-Devotional-AI`** → **Settings**:

- **Builder:** Dockerfile (path `Dockerfile`)
- **Start command:** (leave empty — use image `CMD`)  
  or: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
- **Health check:** `/api/healthz`

### Required variables (Variables tab)

Copy from Lightsail `artifacts/api-server/.env` as needed, especially:

- `DATABASE_URL` — Railway Postgres **or** external DB (must match where data lives)
- `OPENAI_API_KEY`, `RESEND_API_KEY`, `STRIPE_*`, etc.
- `APP_URL` = `https://www.shepherdspathai.com`
- `PORT` — Railway sets this automatically; do not hardcode `3000` only

Redeploy after env vars are set.

### Verify a good deploy

Build logs should show:

```text
pnpm install --no-frozen-lockfile
pnpm --filter @workspace/api-server run build
```

Deploy logs should show the server listening (no crash loop).  
Hit: `https://<your-railway-domain>/api/healthz` → `{"status":"ok"}`

---

## Local Docker test (before pushing)

```bash
cd ~/Daily-Devotional-AI
docker build -t sp-api-railway .
docker run --rm -p 8080:8080 -e PORT=8080 -e DATABASE_URL="..." sp-api-railway
curl -s http://127.0.0.1:8080/api/healthz
```

---

## Quick decision

| Goal | Action |
|------|--------|
| Stop emails, Lightsail only | **Option A** — disconnect GitHub on Railway |
| Backup API on Railway | **Option B** — fix env vars + redeploy with current `Dockerfile` |
| Unsure about Postgres | Do **not** delete Postgres until you confirm `DATABASE_URL` on Lightsail |

After Option A, you can ignore Railway entirely and keep deploying with:

```bash
cd ~/Daily-Devotional-AI && git pull && bash scripts/deploy-lightsail.sh
```
