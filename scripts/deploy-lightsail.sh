#!/usr/bin/env bash
# One-command deploy on AWS Lightsail (run from repo root on the server).
# Usage: bash scripts/deploy-lightsail.sh
set -euo pipefail

# Ensure npm global bins (including pm2) are on PATH regardless of how the script is invoked
export PATH="$HOME/.npm/_npx/5f7878ce38f1eb13/node_modules/pm2/bin:$(npm root -g 2>/dev/null || true)/../../bin:$PATH"
# Also try common global install locations
for _pm2_path in "$HOME/.npm-global/bin" "$HOME/.local/bin" "/usr/local/bin" "/opt/homebrew/bin"; do
  [[ -d "$_pm2_path" ]] && export PATH="$_pm2_path:$PATH"
done

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Safe deploy preflight..."
if ! bash "$REPO_ROOT/scripts/safe-deploy-preflight.sh"; then
  echo ""
  echo "Deploy aborted. See docs/SAFE_DEPLOY.md"
  exit 1
fi

echo "==> Backing up current frontend dist..."
bash "$REPO_ROOT/scripts/backup-lightsail-dist.sh"

echo "==> Pulling latest from GitHub..."
git fetch origin
git reset --hard origin/main

echo "==> Installing dependencies (monorepo root — required for googleapis, etc.)..."
cd "$REPO_ROOT"
if command -v pnpm >/dev/null 2>&1 && [[ -f pnpm-lock.yaml ]]; then
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
else
  echo "WARN: pnpm not found; trying npm in api-server only"
fi

echo "==> Building API (artifacts/api-server)..."
bash "$REPO_ROOT/scripts/fix-api-server.sh"
DAILY_ART_API="$REPO_ROOT/artifacts/api-server/client/public/daily-art"
DAILY_ART_FALLBACK="$REPO_ROOT/artifacts/shepherds-path/public/daily-art/natural-mountain.jpg"
mkdir -p "$DAILY_ART_API"
if [[ -f "$DAILY_ART_FALLBACK" ]] && [[ ! -f "$DAILY_ART_API/natural-mountain.jpg" ]]; then
  cp "$DAILY_ART_FALLBACK" "$DAILY_ART_API/natural-mountain.jpg"
  echo "==> Copied daily-art fallback image into api-server storage"
fi
cd "$REPO_ROOT/artifacts/api-server"

echo "==> Restarting api-server..."
API_CWD="$REPO_ROOT/artifacts/api-server"
# App loads artifacts/api-server/.env via src/env.ts — do not pass --env-file here
# (breaks on Node < 20.6 and can leave api-server in PM2 "errored").
if pm2 describe api-server >/dev/null 2>&1; then
  pm2 restart api-server --update-env
else
  pm2 start dist/index.mjs --name api-server --cwd "$API_CWD" --env production
fi
sleep 2
API_PORT=3001
if [[ -f "$API_CWD/.env" ]]; then
  _p=$(grep -E '^PORT=' "$API_CWD/.env" | cut -d= -f2- | tr -d ' "' || true)
  [[ -n "$_p" ]] && API_PORT="$_p"
fi
curl -s -o /dev/null -w "API HTTP %{http_code}\n" "http://127.0.0.1:${API_PORT}/api/health" || echo "WARN: API health check failed — run: pm2 logs api-server --lines 40"

if [[ -f "$API_CWD/.env" ]]; then
  if ! grep -qE '^VAPID_PUBLIC_KEY=.+' "$API_CWD/.env" 2>/dev/null || ! grep -qE '^VAPID_PRIVATE_KEY=.+' "$API_CWD/.env" 2>/dev/null; then
    echo ""
    echo "WARN: VAPID keys missing — browser push is disabled."
    echo "  cd $REPO_ROOT/artifacts/api-server && pnpm run generate-vapid"
    echo "  # paste output into $API_CWD/.env then: pm2 restart api-server --update-env"
  else
    VAPID_CHECK=$(curl -s "http://127.0.0.1:${API_PORT}/api/push/vapid-key" 2>/dev/null || true)
    if [[ "$VAPID_CHECK" == *'"configured":true'* ]] || [[ "$VAPID_CHECK" == *'"configured": true'* ]]; then
      echo "==> Push (VAPID): configured"
    else
      echo "WARN: VAPID in .env but /api/push/vapid-key not configured — check keys and restart api-server"
    fi
  fi
fi

echo "==> Worship bed audio (stillness local)..."
if [[ ! -f "$REPO_ROOT/artifacts/shepherds-path/public/worship/morning-stillness.wav" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 "$REPO_ROOT/scripts/generate-worship-wavs.py"
  else
    echo "WARN: No worship WAV files — run: python3 scripts/generate-worship-wavs.py"
  fi
fi

echo "==> Building frontend (artifacts/shepherds-path)..."
cd "$REPO_ROOT/artifacts/shepherds-path"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install 2>/dev/null || true
  pnpm run build
else
  npm install
  npm run build
fi

echo "==> Restarting frontend (production static server)..."
if pm2 describe frontend >/dev/null 2>&1; then
  pm2 delete frontend 2>/dev/null || true
fi
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
PORT="$FRONTEND_PORT" pm2 start serve.mjs --name frontend \
  --cwd "$REPO_ROOT/artifacts/shepherds-path"

pm2 save 2>/dev/null || true

echo ""
echo "==> Verify:"
echo "  grep -c GOOGLE_SERVICE_ACCOUNT_JSON artifacts/api-server/src/googleSheets.ts"
API_PORT="${PORT:-3000}"
if [[ -f "$REPO_ROOT/artifacts/api-server/.env" ]]; then
  _p=$(grep -E '^PORT=' "$REPO_ROOT/artifacts/api-server/.env" | cut -d= -f2 | tr -d ' "' || true)
  [[ -n "$_p" ]] && API_PORT="$_p"
fi
echo "  curl -s http://127.0.0.1:${API_PORT}/api/health | head -c 400"
echo "  curl -s http://127.0.0.1:${API_PORT}/api/verses/daily | head -c 200"
echo "  pm2 status"
echo ""
echo "Done. If daily verse is still Philippians fallback, set GOOGLE_SERVICE_ACCOUNT_JSON in artifacts/api-server/.env"
