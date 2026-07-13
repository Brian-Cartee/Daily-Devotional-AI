#!/usr/bin/env bash
# Run Philip Voice Lab agent worker (separate from main api-server).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/artifacts/api-server"

ENV_FILE=""
if [[ -f "$API_DIR/.env.philip-lab" ]]; then
  ENV_FILE="$API_DIR/.env.philip-lab"
elif [[ -f "$API_DIR/.env" ]]; then
  ENV_FILE="$API_DIR/.env"
fi

if [[ -z "$ENV_FILE" ]] || ! grep -qE '^PHILIP_VOICE_LAB_ENABLED=true' "$ENV_FILE"; then
  echo "[run-philip-voice-agent] PHILIP_VOICE_LAB_ENABLED is not true — refusing to start."
  exit 1
fi

cd "$API_DIR"
exec node src/philip-voice-lab/agent.mjs
