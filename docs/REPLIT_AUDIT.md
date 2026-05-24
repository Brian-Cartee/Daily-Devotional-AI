# Replit dependency audit (Shepherd's Path)

Last updated after Lightsail migration work.

## Production (must work without Replit)

| Area | Location | Status |
|------|----------|--------|
| Daily verse (Google Sheet) | `artifacts/api-server/src/googleSheets.ts` | **Fixed** — uses `GOOGLE_SERVICE_ACCOUNT_JSON` first |
| OpenAI (chat, TTS, images) | `artifacts/api-server/src/routes/routes.ts`, `config.ts` | **Fixed** — uses `OPENAI_API_KEY` |
| Email (Resend) | `artifacts/api-server/src/resend.ts` | **Fixed** — uses `RESEND_API_KEY` first |
| Email scheduler | `config.shouldRunSchedulers` | **Fixed** — `NODE_ENV=production` or `ENABLE_EMAIL_SCHEDULER=true` |
| App links in email | `emailScheduler.ts`, routes | **Fixed** — `APP_URL` default `https://www.shepherdspathai.com` |
| Frontend URLs | `artifacts/shepherds-path/index.html`, modals | **Fixed** — canonical domain |
| Deploy | `scripts/deploy-lightsail.sh` | **Added** |

## Optional legacy fallbacks (harmless if Replit env vars unset)

- `googleSheets.ts` / `resend.ts` — Replit connector code path only runs without service account / Resend key
- `artifacts/shepherds-path/vite.config.ts` — Replit Vite plugins only load when `REPL_ID` is set (not on Lightsail)

## Not required for website on Lightsail

| Area | Notes |
|------|--------|
| `scripts/src/*RevenueCat*` | Admin/ops scripts; uses Replit RevenueCat connector — only if you run those scripts |
| `artifacts/shepherds-path-mobile/` | Expo mobile build; uses Replit domains when building on Replit |
| `.migration-backup/` | Old layout archive — not deployed |
| `artifacts/api-server/src/replit_integrations/` | Folder name is legacy; **image client uses `OPENAI_API_KEY`**, not Replit proxy |

## Required server `.env` (minimum)

See `artifacts/api-server/.env.example`.

**Critical:** `DATABASE_URL`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY` (non-empty), `GOOGLE_SERVICE_ACCOUNT_JSON`, `APP_URL`, `NODE_ENV=production`.

## Verify after deploy

```bash
bash scripts/deploy-lightsail.sh
curl -s http://127.0.0.1:3000/api/health
curl -s http://127.0.0.1:3000/api/verses/daily
```
