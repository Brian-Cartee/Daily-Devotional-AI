#!/usr/bin/env bash
# Quick production smoke checks (run from Mac after deploy).
set -euo pipefail

BASE="${1:-https://www.shepherdspathai.com}"
FAIL=0

check_http() {
  local name="$1"
  local url="$2"
  local code
  code="$(curl -fsS -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")"
  if [[ "$code" != "200" ]]; then
    echo "FAIL: $name — HTTP $code ($url)"
    FAIL=1
    return
  fi
  echo "OK: $name (HTTP 200)"
}

check_body() {
  local name="$1"
  local url="$2"
  local expect="$3"
  local body
  body="$(curl -fsS "$url" 2>/dev/null || true)"
  if [[ -z "$body" ]]; then
    echo "FAIL: $name — no response from $url"
    FAIL=1
    return
  fi
  if [[ -n "$expect" ]] && ! grep -Fq "$expect" <<< "$body"; then
    echo "FAIL: $name — expected to find: $expect"
    FAIL=1
    return
  fi
  echo "OK: $name"
}

echo "==> Production smoke: $BASE"
check_body "Home HTML" "$BASE/" "assets/index-"
check_http "Support route" "$BASE/support"
check_http "Feedback route" "$BASE/feedback"
# "degraded" is normal when optional SMS (Twilio) is not configured
check_api_health() {
  local body
  body="$(curl -fsS "$BASE/api/health" 2>/dev/null || true)"
  if [[ -z "$body" ]]; then
    echo "FAIL: API health — no response"
    FAIL=1
    return
  fi
  if grep -Fq '"status":"down"' <<< "$body"; then
    echo "FAIL: API health — status down"
    FAIL=1
    return
  fi
  if ! grep -Fq '"database":{"ok":true' <<< "$body" || ! grep -Fq '"openai":{"ok":true' <<< "$body"; then
    echo "FAIL: API health — database or OpenAI not OK"
    echo "$body" | head -c 280
    FAIL=1
    return
  fi
  local status
  status="$(grep -o '"status":"[^"]*"' <<< "$body" | head -1 || true)"
  echo "OK: API health ($status, core services up)"
}

check_api_health

BUNDLE="$(curl -fsS "$BASE/" | grep -o 'assets/index-[^"]*\.js' | head -1 || true)"
echo "==> Live bundle: ${BUNDLE:-unknown}"

if [[ "$FAIL" -ne 0 ]]; then
  echo ""
  echo "Smoke checks failed."
  exit 1
fi

echo ""
echo "Smoke checks passed."
