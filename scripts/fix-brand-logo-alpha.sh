#!/usr/bin/env bash
# One-time: give talk-it-through-icon.png a real alpha channel (removes black square corners).
# Requires ImageMagick (`magick`). Run from repo root on Lightsail or Mac.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON="$REPO_ROOT/artifacts/shepherds-path/public/talk-it-through-icon.png"
EMAIL="$REPO_ROOT/artifacts/shepherds-path/public/sp-email-logo.png"
API_ASSET="$REPO_ROOT/artifacts/api-server/assets/sp-email-logo.png"

if ! command -v magick >/dev/null 2>&1; then
  echo "Install ImageMagick first (e.g. apt install imagemagick)."
  exit 1
fi

for f in "$ICON" "$EMAIL"; do
  if [[ -f "$f" ]]; then
    magick "$f" -fuzz 14% -transparent black "$f"
    echo "OK: transparent background → $f"
  fi
done

if [[ -f "$EMAIL" ]]; then
  cp "$EMAIL" "$API_ASSET"
  echo "OK: copied to $API_ASSET"
fi

echo "Bump ?v= in src/lib/brand.ts after deploy so browsers refetch the icon."
