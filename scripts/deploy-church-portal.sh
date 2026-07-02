#!/usr/bin/env bash
# Deploy church admin portal to AWS Lightsail (does not push git — run from local or on server).
# Usage: bash scripts/deploy-church-portal.sh
#
# Prerequisites:
#   - DNS A record: admin.shepherdspathai.com → 52.42.155.185
#   - nginx site from artifacts/church-portal/nginx-admin.conf
#   - certbot for TLS (optional until DNS is live)
set -euo pipefail

LIGHTSAIL_IP="52.42.155.185"
LIGHTSAIL_USER="ubuntu"
LIGHTSAIL_KEY="$HOME/Desktop/LightsailDefaultKey-us-west-2.pem"
CHURCH_PORTAL_PORT="${CHURCH_PORTAL_PORT:-3003}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -f "$LIGHTSAIL_KEY" ]]; then
  echo "ERROR: SSH key not found at $LIGHTSAIL_KEY"
  exit 1
fi

echo "==> Deploying church-portal on Lightsail ($LIGHTSAIL_IP)..."

ssh -i "$LIGHTSAIL_KEY" -o ConnectTimeout=15 "$LIGHTSAIL_USER@$LIGHTSAIL_IP" bash -s <<REMOTE
set -euo pipefail

export PATH="\$HOME/.npm-global/bin:\$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:\$(npm root -g 2>/dev/null || true)/../../bin:\$PATH"

REPO_ROOT="/home/ubuntu/Daily-Devotional-AI"
CHURCH_PORTAL_PORT="${CHURCH_PORTAL_PORT}"
cd "\$REPO_ROOT"

echo "==> Pulling latest..."
git fetch origin
git reset --hard origin/main

echo "==> Installing dependencies..."
if command -v pnpm >/dev/null 2>&1 && [[ -f pnpm-lock.yaml ]]; then
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
fi

echo "==> Building church-portal..."
cd "\$REPO_ROOT/artifacts/church-portal"
pnpm install 2>/dev/null || true
pnpm run build

echo "==> Ensuring CHURCH_PORTAL_URL in api-server .env..."
API_ENV="\$REPO_ROOT/artifacts/api-server/.env"
if [[ -f "\$API_ENV" ]]; then
  if grep -qE '^CHURCH_PORTAL_URL=' "\$API_ENV"; then
    sed -i 's|^CHURCH_PORTAL_URL=.*|CHURCH_PORTAL_URL=https://admin.shepherdspathai.com|' "\$API_ENV"
  else
    echo 'CHURCH_PORTAL_URL=https://admin.shepherdspathai.com' >> "\$API_ENV"
  fi
fi

echo "==> Restarting api-server (pick up CHURCH_PORTAL_URL)..."
if pm2 describe api-server >/dev/null 2>&1; then
  pm2 restart api-server --update-env
fi

echo "==> Installing nginx config for admin.shepherdspathai.com..."
NGINX_SITE="/etc/nginx/sites-available/admin.shepherdspathai.com"
if [[ -f "\$REPO_ROOT/artifacts/church-portal/nginx-admin.conf" ]]; then
  sudo cp "\$REPO_ROOT/artifacts/church-portal/nginx-admin.conf" "\$NGINX_SITE"
  sudo ln -sf "\$NGINX_SITE" /etc/nginx/sites-enabled/admin.shepherdspathai.com
  if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    echo "    nginx reloaded"
  else
    echo "WARN: nginx -t failed — fix config before reload (DNS/TLS may be pending)"
  fi
  # HTTP-only template overwrites certbot SSL blocks — re-attach admin cert.
  if command -v certbot >/dev/null 2>&1; then
    sudo certbot --nginx -d admin.shepherdspathai.com --non-interactive --redirect 2>/dev/null || \
      echo "WARN: certbot failed — run: sudo certbot --nginx -d admin.shepherdspathai.com"
  fi
fi

echo "==> Starting church-portal PM2 on port \$CHURCH_PORTAL_PORT..."
if pm2 describe church-portal >/dev/null 2>&1; then
  pm2 delete church-portal 2>/dev/null || true
fi
PORT="\$CHURCH_PORTAL_PORT" pm2 start serve.mjs --name church-portal \
  --cwd "\$REPO_ROOT/artifacts/church-portal"
pm2 save 2>/dev/null || true

sleep 1
curl -s -o /dev/null -w "church-portal HTTP %{http_code}\n" "http://127.0.0.1:\$CHURCH_PORTAL_PORT/" || \
  echo "WARN: church-portal health check failed — run: pm2 logs church-portal --lines 40"

echo ""
echo "==> Done. Next steps if not done yet:"
echo "  1. DNS A record: admin.shepherdspathai.com → 52.42.155.185"
echo "  2. sudo certbot --nginx -d admin.shepherdspathai.com"
echo "  3. node scripts/seed-test-church.mjs  (with API=https://admin.shepherdspathai.com or SSH on server)"
echo "  pm2 status"
REMOTE

echo ""
echo "✓ Church portal deploy script finished."
