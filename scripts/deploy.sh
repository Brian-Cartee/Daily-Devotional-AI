#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Shepherd's Path — ONE-COMMAND DEPLOY
#  Checks server health before deploying, confirms after.
#
#  Usage:
#    ./deploy.sh
# ─────────────────────────────────────────────────────────────

SSH_KEY="$HOME/Desktop/LightsailDefaultKey-us-west-2.pem"
SERVER="ubuntu@52.42.155.185"
APP_DIR="/home/ubuntu/Daily-Devotional-AI"
FRONTEND_DIR="$APP_DIR/artifacts/shepherds-path"
SITE_URL="https://www.shepherdspathai.com"
API_URL="https://www.shepherdspathai.com/api/health"

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo ""
echo "🚀  SHEPHERD'S PATH DEPLOY"
echo ""

# ── 1. Verify local git is pushed ────────────────────────────
echo "── Pre-flight checks ───────────────────────────────────"

LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null)
REMOTE_SHA=$(git ls-remote origin HEAD 2>/dev/null | cut -f1)

if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo -e "${RED}✗ ABORT: Local commits are not pushed to GitHub.${NC}"
  echo "  Run:  git push origin main"
  echo "  Then re-run deploy."
  exit 1
fi
echo -e "${GREEN}✓ Git is in sync with GitHub${NC}"

# ── 2. Check server health BEFORE deploy ─────────────────────
echo -n "  Checking server health... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$SITE_URL" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
  echo -e "${GREEN}✓ Frontend responding ($HTTP_CODE)${NC}"
else
  echo -e "${YELLOW}⚠ Frontend returned $HTTP_CODE — deploying anyway${NC}"
fi

echo -n "  Checking API health...    "
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$API_URL" 2>/dev/null)
if [ "$API_CODE" = "200" ]; then
  echo -e "${GREEN}✓ API responding (200)${NC}"
else
  echo -e "${YELLOW}⚠ API returned $API_CODE${NC}"
  echo ""
  echo -e "${YELLOW}  NOTE: API may already be unhealthy before this deploy.${NC}"
  echo "  Check PM2 after deploy: ssh into server and run 'pm2 logs api-server --lines 30'"
fi

echo ""

# ── 3. Deploy ────────────────────────────────────────────────
ssh -i "$SSH_KEY" "$SERVER" bash <<EOF
set -e
cd $APP_DIR

echo "Pulling latest code..."
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
echo "Restarting servers..."
pm2 restart frontend

echo ""
echo "── PM2 status ──────────────────────────────────────────"
pm2 list
echo "────────────────────────────────────────────────────────"
EOF

# ── 4. Post-deploy health check (give it 5s to come up) ──────
echo ""
echo "── Post-deploy check ───────────────────────────────────"
sleep 5

echo -n "  Frontend health... "
POST_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$SITE_URL" 2>/dev/null)
if [ "$POST_CODE" = "200" ] || [ "$POST_CODE" = "301" ] || [ "$POST_CODE" = "302" ]; then
  echo -e "${GREEN}✓ Up ($POST_CODE)${NC}"
else
  echo -e "${RED}✗ Frontend returned $POST_CODE — may need investigation${NC}"
fi

echo -n "  API health...      "
POST_API=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL" 2>/dev/null)
if [ "$POST_API" = "200" ]; then
  echo -e "${GREEN}✓ Up (200)${NC}"
else
  echo -e "${RED}✗ API returned $POST_API${NC}"
  echo ""
  echo "  To investigate:  ssh -i ~/Desktop/LightsailDefaultKey-us-west-2.pem ubuntu@52.42.155.185"
  echo "  Then run:        pm2 logs api-server --lines 50"
fi

echo ""
echo "✅  DEPLOY COMPLETE"
echo ""
