#!/usr/bin/env bash
# Ensure files required by origin/main are tracked (catches Mac-only local files).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

REF="${1:-origin/main}"
git fetch origin main 2>/dev/null || git fetch origin

REQUIRED=(
  artifacts/shepherds-path/src/hooks/use-reduced-motion.ts
  artifacts/shepherds-path/src/lib/haptics.ts
  artifacts/shepherds-path/src/lib/thresholdModePlan.ts
)

MISS=0
for f in "${REQUIRED[@]}"; do
  if git cat-file -e "$REF:$f" 2>/dev/null; then
    echo "OK (on $REF): $f"
  else
    echo "MISSING on $REF (commit from Mac): $f"
    MISS=1
  fi
done

if [[ "$MISS" -ne 0 ]]; then
  exit 1
fi

echo "All required build files are tracked on $REF."
