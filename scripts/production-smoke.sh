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
check_http "Closet doorway asset" "$BASE/closet-doorway.png"
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

if [[ -n "$BUNDLE" ]]; then
  JS_URL="$BASE/$BUNDLE"
  JS_BODY="$(curl -fsS "$JS_URL" 2>/dev/null || true)"
  if [[ -z "$JS_BODY" ]]; then
    echo "FAIL: Could not fetch $JS_URL"
    FAIL=1
  elif ! grep -Fq "devotional-journal-save" <<< "$JS_BODY" || ! grep -Fq "hero-returning-verse-snippet" <<< "$JS_BODY"; then
    echo "FAIL: Live bundle missing home wow + journal UX markers (devotional-journal-save, hero-returning-verse-snippet)"
    FAIL=1
  elif ! grep -Fq "See all" <<< "$JS_BODY" || ! grep -Fq "home-paths-block" <<< "$JS_BODY"; then
    echo "FAIL: Live bundle missing home paths v3 (See all + home-paths-block)"
    FAIL=1
  elif grep -Fq "Browse all 16" <<< "$JS_BODY"; then
    echo "FAIL: Live bundle still has old Browse all 16 paths button"
    FAIL=1
  elif ! grep -Fq "home-paths-block" <<< "$JS_BODY"; then
    echo "FAIL: Live bundle missing home-paths-block"
    FAIL=1
  else
    echo "OK: Home paths v3 markers in live bundle"
  fi
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo ""
  echo "Smoke checks failed."
  exit 1
fi

echo ""
echo "Smoke checks passed."
