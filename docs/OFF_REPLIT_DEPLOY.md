# Deploy Shepherd's Path without Replit

Production API lives in **`artifacts/api-server`** on your Lightsail server.

## Required `.env` (in `artifacts/api-server/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres |
| `OPENAI_API_KEY` | Chat, TTS, daily-art |
| `STRIPE_SECRET_KEY` | Billing (must be non-empty) |
| `APP_URL` | `https://www.shepherdspathai.com` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Daily verse from Google Sheet |
| `NODE_ENV` | `production` |
| `ENABLE_EMAIL_SCHEDULER` | `true` (optional, for email digests) |

## Google Sheet setup

1. Create a Google Cloud service account with **Sheets API** enabled.
2. Download the JSON key.
3. Share your spreadsheet with the service account email (Viewer).
4. Set `GOOGLE_SERVICE_ACCOUNT_JSON` to the full JSON (one line) in `.env`.

## Deploy on server (after `git pull`)

```bash
cd ~/Daily-Devotional-AI
git pull
cd artifacts/api-server
npm run build
pm2 restart api-server
```

## Verify

```bash
curl -s http://127.0.0.1:3000/api/health
curl -s http://127.0.0.1:3000/api/verses/daily
pm2 status
```

Do **not** copy from `server/` — that folder was moved to `.migration-backup/`. Use `artifacts/api-server/src/` only.
