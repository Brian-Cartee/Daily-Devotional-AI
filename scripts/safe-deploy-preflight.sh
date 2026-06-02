#!/usr/bin/env bash
# Block deploy if origin/main is missing required source (prevents zip→git rollback).
# Usage: bash scripts/safe-deploy-preflight.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKERS="$REPO_ROOT/scripts/deploy-markers.txt"

if [[ ! -f "$MARKERS" ]]; then
  echo "ERROR: Missing $MARKERS"
  exit 1
fi

cd "$REPO_ROOT"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: Not a git repository."
  exit 1
fi

echo "==> Fetching origin/main..."
git fetch origin main 2>/dev/null || git fetch origin

REF="origin/main"
if ! git rev-parse "$REF" >/dev/null 2>&1; then
  echo "ERROR: $REF not found."
  exit 1
fi

echo "==> Checking deploy markers on $REF ($(git rev-parse --short "$REF"))..."
MISS=0
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line//$'\r'/}"
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  path="${line%%|*}"
  pattern="${line#*|}"
  path="${path%"${path##*[![:space:]]}"}"
  pattern="${pattern#"${pattern%%[![:space:]]*}"}"
  if [[ -z "$path" || -z "$pattern" ]]; then
    echo "WARN: Bad marker line: $line"
    continue
  fi
  if ! git cat-file -e "$REF:$path" 2>/dev/null; then
    echo "MISSING FILE on $REF: $path"
    MISS=1
    continue
  fi
  content="$(git show "$REF:$path" 2>/dev/null || true)"
  if [[ -z "$content" ]] || ! grep -Fq -- "$pattern" <<< "$content"; then
    echo "MISSING on $REF: $path (expected: $pattern)"
    MISS=1
  else
    echo "OK: $path ← $pattern"
  fi
done < "$MARKERS"

LIVE_BUNDLE=""
if command -v curl >/dev/null 2>&1; then
  LIVE_BUNDLE="$(curl -fsS 'https://www.shepherdspathai.com/' 2>/dev/null | grep -o 'assets/index-[^"]*\.js' | head -1 || true)"
  [[ -n "$LIVE_BUNDLE" ]] && echo "==> Live site bundle: $LIVE_BUNDLE"
fi

echo "==> Checking required tracked build files..."
if ! bash "$REPO_ROOT/scripts/check-tracked-deps.sh" "$REF"; then
  echo ""
  echo "DEPLOY BLOCKED: commit the missing files on your Mac, push, then re-run preflight."
  exit 1
fi

if [[ "$MISS" -ne 0 ]]; then
  echo ""
  echo "DEPLOY BLOCKED: origin/main is behind production or your Mac."
  echo "  1. Commit and push all changes from your Mac."
  echo "  2. Re-run: bash scripts/safe-deploy-preflight.sh"
  echo "  3. Then on server: bash scripts/deploy-lightsail.sh"
  echo ""
  echo "Emergency: keep using zip deploy, or restore from backup-lightsail-dist.sh output."
  exit 1
fi

echo ""
echo "Preflight passed. Safe to run: bash scripts/deploy-lightsail.sh"
