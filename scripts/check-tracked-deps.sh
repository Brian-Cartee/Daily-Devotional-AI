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
  artifacts/shepherds-path/src/lib/whyPanelApi.ts
  artifacts/shepherds-path/src/lib/homeHeroState.ts
)

# Export / symbol checks (file exists but wrong revision on GitHub)
SYMBOL_CHECKS=(
  "artifacts/shepherds-path/src/lib/homeHeroState.ts|hydrateWhyPanelFromServer"
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

for entry in "${SYMBOL_CHECKS[@]}"; do
  path="${entry%%|*}"
  pattern="${entry#*|}"
  content="$(git show "$REF:$path" 2>/dev/null || true)"
  if [[ -z "$content" ]] || ! grep -Fq -- "$pattern" <<< "$content"; then
    echo "INCOMPLETE on $REF: $path (missing: $pattern)"
    MISS=1
  else
    echo "OK symbol: $path ← $pattern"
  fi
done

if [[ "$MISS" -ne 0 ]]; then
  exit 1
fi

echo "All required build files are tracked on $REF."
