#!/usr/bin/env bash
# Snapshot current built frontend before a deploy (run on Lightsail from repo root).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$REPO_ROOT/artifacts/shepherds-path/dist/public"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/shepherds-path-dist-backup-${STAMP}.tar.gz"

if [[ ! -d "$DIST" ]]; then
  echo "WARN: No dist at $DIST — skipping backup."
  exit 0
fi

tar -czf "$OUT" -C "$REPO_ROOT/artifacts/shepherds-path/dist" public index.html 2>/dev/null \
  || tar -czf "$OUT" -C "$REPO_ROOT/artifacts/shepherds-path/dist" public

BUNDLE="$(grep -o 'index-[^"]*\.js' "$DIST/index.html" 2>/dev/null | head -1 || echo unknown)"
echo "Backup saved: $OUT"
echo "Bundle in backup: $BUNDLE"
echo "$OUT" > /tmp/shepherds-path-last-backup.txt
