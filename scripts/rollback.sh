#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Shepherd's Path — ONE-COMMAND ROLLBACK
#  Rolls back the last deploy on the live server in ~30 seconds.
#
#  Usage:
#    ./rollback.sh          # undo the last 1 commit
#    ./rollback.sh 2        # undo the last 2 commits
# ─────────────────────────────────────────────────────────────

SSH_KEY="$HOME/Desktop/LightsailDefaultKey-us-west-2.pem"
SERVER="ubuntu@52.42.155.185"
APP_DIR="/home/ubuntu/Daily-Devotional-AI"
FRONTEND_DIR="$APP_DIR/artifacts/shepherds-path"
N="${1:-1}"

echo ""
echo "🔄  SHEPHERD'S PATH ROLLBACK"
echo "    Rolling back $N commit(s) on the live server..."
echo ""

ssh -i "$SSH_KEY" "$SERVER" bash <<EOF
set -e
cd $APP_DIR

echo "── Recent commits ──────────────────────────────────────"
git log --oneline -8
echo "────────────────────────────────────────────────────────"
echo ""
echo "Rolling back $N commit(s)..."
git reset --hard HEAD~$N

echo ""
echo "── Now at ──────────────────────────────────────────────"
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
echo "✅  ROLLBACK COMPLETE"
EOF
