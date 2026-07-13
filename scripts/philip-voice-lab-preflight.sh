#!/usr/bin/env bash
# Philip Voice Lab — preflight checks (no secrets printed).
# Run from repo root: bash scripts/philip-voice-lab-preflight.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$REPO_ROOT/artifacts/api-server"
ENV_FILE="${PHILIP_LAB_ENV_FILE:-$API_DIR/.env.philip-lab}"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
FAIL=0

pass() { echo -e "${GREEN}PASS${NC} $*"; }
fail() { echo -e "${RED}FAIL${NC} $*"; FAIL=1; }
warn() { echo -e "WARN $*"; }

echo "==> Philip Voice Lab preflight"
echo "    env file: $ENV_FILE"

# --- env file ---
if [[ ! -f "$ENV_FILE" ]]; then
  fail "Missing env file — copy artifacts/api-server/philip-lab.env.example to .env.philip-lab"
else
  pass "Env file exists"
fi

env_val() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d ' "' || true
}

check_var_set() {
  local name="$1"
  local val
  val="$(env_val "$name")"
  if [[ -z "$val" ]]; then
    fail "$name is not set"
  else
    pass "$name is set"
  fi
}

if [[ -f "$ENV_FILE" ]]; then
  check_var_set "PHILIP_VOICE_LAB_ENABLED"
  if [[ "$(env_val PHILIP_VOICE_LAB_ENABLED)" != "true" ]]; then
    fail "PHILIP_VOICE_LAB_ENABLED must be true"
  fi
  check_var_set "PHILIP_VOICE_LAB_SECRET"
  check_var_set "LIVEKIT_URL"
  check_var_set "LIVEKIT_API_KEY"
  check_var_set "LIVEKIT_API_SECRET"
  check_var_set "PHILIP_VOICE_LAB_API_BASE"
  check_var_set "PHILIP_VOICE_LAB_GUIDANCE_API_BASE"
  check_var_set "PHILIP_VOICE_LAB_AGENT_DISPATCH_URL"

  LAB_PORT="$(env_val PORT)"
  LAB_PORT="${LAB_PORT:-3101}"
  GUIDANCE_BASE="$(env_val PHILIP_VOICE_LAB_GUIDANCE_API_BASE)"
  AGENT_PORT="$(env_val PHILIP_VOICE_LAB_AGENT_PORT)"
  AGENT_PORT="${AGENT_PORT:-8091}"

  if [[ "$GUIDANCE_BASE" == *":8080"* ]]; then
    warn "PHILIP_VOICE_LAB_GUIDANCE_API_BASE contains :8080 — production is likely :3001"
  fi
  if [[ "$GUIDANCE_BASE" == *":3101"* ]]; then
    fail "PHILIP_VOICE_LAB_GUIDANCE_API_BASE must not point at lab API (:3101)"
  fi
fi

# --- build artifacts ---
if [[ -f "$API_DIR/dist/philip-lab-index.mjs" ]]; then
  pass "dist/philip-lab-index.mjs exists"
else
  fail "dist/philip-lab-index.mjs missing — run: cd artifacts/api-server && pnpm run build:philip-lab"
fi

if [[ -f "$API_DIR/src/philip-voice-lab/agent.mjs" ]]; then
  pass "agent.mjs exists"
else
  fail "src/philip-voice-lab/agent.mjs missing"
fi

# --- syntax ---
for f in "$API_DIR"/src/philip-voice-lab/*.mjs; do
  if node --check "$f" 2>/dev/null; then
    pass "syntax $(basename "$f")"
  else
    fail "syntax $(basename "$f")"
  fi
done

# --- ffmpeg ---
FFMPEG="${FFMPEG_PATH:-$(command -v ffmpeg 2>/dev/null || true)}"
if [[ -n "$FFMPEG" ]] && "$FFMPEG" -version >/dev/null 2>&1; then
  pass "ffmpeg available"
else
  fail "ffmpeg not found on PATH (set FFMPEG_PATH in .env.philip-lab)"
fi

# --- LiveKit deps ---
if [[ -d "$API_DIR/node_modules/@livekit/rtc-node" ]] || [[ -d "$REPO_ROOT/node_modules/@livekit/rtc-node" ]]; then
  pass "@livekit/rtc-node installed"
else
  fail "@livekit/rtc-node not installed — run pnpm install from repo root"
fi

if [[ -d "$API_DIR/node_modules/livekit-server-sdk" ]] || [[ -d "$REPO_ROOT/node_modules/livekit-server-sdk" ]]; then
  pass "livekit-server-sdk installed"
else
  fail "livekit-server-sdk not installed"
fi

# --- port availability (local only) ---
port_free() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    ! lsof -iTCP:"$port" -sTCP:LISTEN -P -n >/dev/null 2>&1
  else
    return 0
  fi
}

if [[ -f "$ENV_FILE" ]]; then
  if port_free "$LAB_PORT"; then
    pass "port $LAB_PORT available for philip-lab-api"
  else
    warn "port $LAB_PORT already in use (OK if philip-lab-api is running)"
  fi
  if port_free "$AGENT_PORT"; then
    pass "port $AGENT_PORT available for philip-voice-agent"
  else
    warn "port $AGENT_PORT already in use (OK if agent is running)"
  fi
  if port_free 3001; then
    warn "port 3001 not listening — production api-server may be down"
  else
    pass "port 3001 in use (expected: production api-server)"
  fi
fi

# --- optional live health (if processes running) ---
if [[ -f "$ENV_FILE" ]] && command -v curl >/dev/null 2>&1; then
  SECRET="$(env_val PHILIP_VOICE_LAB_SECRET)"
  if curl -sf "http://127.0.0.1:${LAB_PORT:-3101}/api/health" >/dev/null 2>&1; then
    pass "philip-lab-api health reachable"
    if [[ -n "$SECRET" ]]; then
      if curl -sf "http://127.0.0.1:${LAB_PORT:-3101}/api/internal/philip-voice/health" \
        -H "X-Philip-Lab-Secret: $SECRET" >/dev/null 2>&1; then
        pass "gated lab health accepts secret"
      else
        warn "gated lab health failed (process may be down or secret mismatch)"
      fi
    fi
  else
    warn "philip-lab-api not running on :${LAB_PORT:-3101} (expected before device test)"
  fi
  if curl -sf "http://127.0.0.1:${AGENT_PORT:-8091}/health" >/dev/null 2>&1; then
    pass "philip-voice-agent health reachable"
  else
    warn "philip-voice-agent not running on :${AGENT_PORT:-8091}"
  fi
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo -e "${GREEN}Preflight passed.${NC}"
  exit 0
else
  echo -e "${RED}Preflight failed — fix issues above.${NC}"
  exit 1
fi
