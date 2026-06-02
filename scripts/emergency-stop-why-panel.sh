#!/usr/bin/env bash
# Emergency: stop “Why we built this” auto-popup in the iOS/Android app (no new App Store build).
# Run ON THE LIGHTSAIL SERVER from repo root after: git pull origin main
#
# Option A — full deploy (recommended):
#   bash scripts/deploy-lightsail.sh
#
# Option B — fastest (updates serve.mjs only, keeps existing JS build):
#   bash scripts/emergency-stop-why-panel.sh

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Pull latest..."
git fetch origin
git reset --hard origin/main

echo "==> Restart frontend (serve.mjs injects why-panel block into HTML)..."
if pm2 describe frontend >/dev/null 2>&1; then
  pm2 delete frontend 2>/dev/null || true
fi
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
PORT="$FRONTEND_PORT" pm2 start serve.mjs --name frontend \
  --cwd "$REPO_ROOT/artifacts/shepherds-path"
pm2 save 2>/dev/null || true

echo ""
echo "==> Verify (must include __SP_DISABLE_WHY_AUTO_OPEN):"
curl -sS "http://127.0.0.1:${FRONTEND_PORT}/?native=1&enter=1" | head -c 4000 | grep -o '__SP_DISABLE_WHY_AUTO_OPEN' || {
  echo "WARN: block not found in HTML — run full deploy: bash scripts/deploy-lightsail.sh"
  exit 1
}
echo ""
echo "OK. Force-quit the app and reopen — purple sheet should NOT auto-open."
