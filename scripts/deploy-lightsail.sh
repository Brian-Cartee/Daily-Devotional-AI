#!/usr/bin/env bash
# One-command deploy on AWS Lightsail (run from repo root on the server).
# Usage: bash scripts/deploy-lightsail.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

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
if pm2 describe api-server >/dev/null 2>&1; then
  pm2 restart api-server
else
  pm2 start dist/index.mjs --name api-server --cwd "$REPO_ROOT/artifacts/api-server" \
    --env production -i 1
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
