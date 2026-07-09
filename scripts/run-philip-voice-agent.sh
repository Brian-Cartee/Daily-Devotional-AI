#!/usr/bin/env bash
# Run Philip Voice Lab agent worker (separate from main api-server).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/artifacts/api-server"

if [[ -f "$API_DIR/.env.philip-lab" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$API_DIR/.env.philip-lab"
  set +a
elif [[ -f "$API_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$API_DIR/.env"
  set +a
fi

if [[ "${PHILIP_VOICE_LAB_ENABLED:-}" != "true" ]]; then
  echo "[run-philip-voice-agent] PHILIP_VOICE_LAB_ENABLED is not true — refusing to start."
  exit 1
fi

cd "$API_DIR"
exec node src/philip-voice-lab/agent.mjs
