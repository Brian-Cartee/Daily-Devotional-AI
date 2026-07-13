#!/usr/bin/env bash
# Stop ONLY Philip Voice Lab PM2 processes. Production api-server/frontend untouched.
set -euo pipefail

echo "==> Stopping Philip Voice Lab processes (production untouched)"

for name in philip-voice-agent philip-lab-api; do
  if command -v pm2 >/dev/null 2>&1 && pm2 describe "$name" >/dev/null 2>&1; then
    pm2 stop "$name" 2>/dev/null || true
    pm2 delete "$name" 2>/dev/null || true
    echo "Stopped and removed PM2 process: $name"
  else
    echo "PM2 process not found (skipped): $name"
  fi
done

# Fallback: kill by loopback port if PM2 unavailable (lab ports only)
if command -v lsof >/dev/null 2>&1; then
  for port in 3101 8091; do
    pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
      echo "WARN: port $port still listening (PIDs: $pids) — verify these are lab processes before killing"
    fi
  done
fi

echo ""
echo "Kill switch: set PHILIP_VOICE_LAB_ENABLED=false in .env.philip-lab before next start."
echo "Rollback nginx: remove deploy/philip-voice-lab/nginx-philip-lab.snippet and reload nginx."
echo "Production api-server (port 3001) was NOT stopped."
