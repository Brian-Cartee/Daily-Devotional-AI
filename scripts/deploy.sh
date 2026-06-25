#!/usr/bin/env bash
# Optional pre-deploy quality gate (~25 min live): cd eval && npm run turing:gate
# Skip with: SKIP_TURING_GATE=1 bash scripts/deploy.sh
# Usage: bash scripts/deploy.sh
#
# What it does:
#   1. Pushes local commits to GitHub
#   2. SSHes into the Lightsail server and runs the build + restart there
#   3. Verifies the live site is serving the new build before exiting
#
set -euo pipefail

LIGHTSAIL_IP="52.42.155.185"
LIGHTSAIL_USER="ubuntu"
LIGHTSAIL_KEY="$HOME/Desktop/LightsailDefaultKey-us-west-2.pem"
APP_ORIGIN="https://www.shepherdspathai.com"

if [[ ! -f "$LIGHTSAIL_KEY" ]]; then
  echo "ERROR: SSH key not found at $LIGHTSAIL_KEY"
  exit 1
fi

if [[ "${SKIP_TURING_GATE:-}" != "1" ]] && [[ "${RUN_TURING_GATE:-}" == "1" ]]; then
  echo "==> Running Philip Turing gate (golden 15)..."
  (cd eval && npm run turing:gate) || exit 1
  echo "    Gate passed."
fi

# ── 1. Push to GitHub ──────────────────────────────────────────────────────────
echo "==> Pushing to GitHub..."
cd "$(dirname "$0")/.."
git push origin main
echo "    Done."

# ── 2. Deploy on server ────────────────────────────────────────────────────────
echo "==> Deploying on Lightsail ($LIGHTSAIL_IP)..."
ssh -i "$LIGHTSAIL_KEY" -o ConnectTimeout=15 "$LIGHTSAIL_USER@$LIGHTSAIL_IP" \
  "cd /home/ubuntu/Daily-Devotional-AI && bash scripts/deploy-lightsail.sh 2>&1 | tail -6"

# ── 3. Verify live site ────────────────────────────────────────────────────────
echo ""
echo "==> Verifying live site..."
sleep 2
MANIFEST=$(curl -sf --max-time 10 "$APP_ORIGIN/native-manifest.json" 2>/dev/null || echo "FETCH_FAILED")
if [[ "$MANIFEST" == "FETCH_FAILED" ]]; then
  echo "  WARNING: Could not reach $APP_ORIGIN — check server manually"
  exit 1
fi

BUILT_AT=$(echo "$MANIFEST" | python3 -c "import sys,json; print(json.load(sys.stdin).get('builtAt','?'))" 2>/dev/null || echo "?")
MAIN_JS=$(echo "$MANIFEST"  | python3 -c "import sys,json; print(json.load(sys.stdin).get('mainJs','?'))"  2>/dev/null || echo "?")

echo "  Live build : $BUILT_AT"
echo "  Live JS    : $MAIN_JS"
echo ""
echo "✓ Deploy complete. Force-close the app and reopen to pick up changes."
