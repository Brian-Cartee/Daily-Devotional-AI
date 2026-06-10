#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Shepherd's Path — ONE-COMMAND DEPLOY
#  Pushes the latest code to the live server in ~30 seconds.
#
#  Usage:
#    ./deploy.sh
# ─────────────────────────────────────────────────────────────

SSH_KEY="$HOME/Desktop/LightsailDefaultKey-us-west-2.pem"
SERVER="ubuntu@52.42.155.185"
APP_DIR="/home/ubuntu/Daily-Devotional-AI"
FRONTEND_DIR="$APP_DIR/artifacts/shepherds-path"

echo ""
echo "🚀  SHEPHERD'S PATH DEPLOY"
echo "    Pulling latest and rebuilding..."
echo ""

ssh -i "$SSH_KEY" "$SERVER" bash <<EOF
set -e
cd $APP_DIR

git pull origin main 2>&1 | tail -5

echo ""
echo "── Deployed commit ─────────────────────────────────────"
git log --oneline -3
echo "────────────────────────────────────────────────────────"
echo ""

echo "Rebuilding frontend..."
cd $FRONTEND_DIR
pnpm build 2>&1 | tail -5

echo ""
echo "Restarting server..."
pm2 restart frontend

echo ""
echo "✅  DEPLOY COMPLETE"
EOF
