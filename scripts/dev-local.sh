#!/usr/bin/env bash
# Start local dev: api-server (port 8080) + Vite frontend (port 3000)
# Uses .env.development only — never production .env or OpenAI key.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/artifacts/api-server"
WEB_DIR="$ROOT/artifacts/shepherds-path"

if [[ ! -f "$API_DIR/.env.development" ]]; then
  echo "Missing $API_DIR/.env.development"
  echo "Run: cp $API_DIR/.env.development.example $API_DIR/.env.development"
  echo "Then add your dev OpenAI key (OPENAI_KEY_ENV=development, \$5 limit)."
  exit 1
fi

if [[ ! -f "$WEB_DIR/.env.development" ]]; then
  echo "Missing $WEB_DIR/.env.development"
  echo "Run: cp $WEB_DIR/.env.development.example $WEB_DIR/.env.development"
  exit 1
fi

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting api-server (http://localhost:8080) …"
(cd "$API_DIR" && pnpm run dev) &
API_PID=$!

sleep 2

echo "Starting Vite (http://localhost:3000) …"
(cd "$WEB_DIR" && pnpm dev) &
WEB_PID=$!

echo ""
echo "Local dev ready:"
echo "  App:  http://localhost:3000"
echo "  API:  http://localhost:8080/api/healthz"
echo "  OpenAI: dev key from .env.development only"
echo ""
echo "Press Ctrl+C to stop both."

wait
