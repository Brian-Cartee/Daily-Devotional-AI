#!/usr/bin/env bash
# Repair api-server deps + build + restart (run on Lightsail from repo root).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Installing all workspace dependencies..."
pnpm install

echo "==> Verifying googleapis..."
API_DIR="$REPO_ROOT/artifacts/api-server"
if [[ ! -e "$API_DIR/node_modules/googleapis" ]] && [[ ! -e "$REPO_ROOT/node_modules/googleapis" ]]; then
  echo "Installing googleapis into api-server..."
  cd "$API_DIR"
  pnpm add googleapis@^171.4.0
  cd "$REPO_ROOT"
fi

GOOGLE_PKG="$API_DIR/node_modules/googleapis"
[[ -e "$REPO_ROOT/node_modules/googleapis" ]] && GOOGLE_PKG="$REPO_ROOT/node_modules/googleapis"
if [[ ! -f "$GOOGLE_PKG/package.json" ]]; then
  echo "ERROR: googleapis still missing after install"
  exit 1
fi
echo "OK: googleapis at $GOOGLE_PKG"

echo "==> Building api-server..."
cd "$API_DIR"
pnpm run build

echo "==> Restarting api-server..."
pm2 restart api-server || pm2 start dist/index.mjs --name api-server --cwd "$API_DIR"
sleep 3
pm2 status

API_PORT=3001
if [[ -f .env ]]; then
  _p=$(grep -E '^PORT=' .env | cut -d= -f2 | tr -d ' "' || true)
  [[ -n "$_p" ]] && API_PORT="$_p"
fi
curl -s -o /dev/null -w "API HTTP %{http_code}\n" "http://127.0.0.1:${API_PORT}/api/health"
