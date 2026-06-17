#!/usr/bin/env bash
# Regenerate portrait (3:4) achievement-moment images from landscape heroes.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUB="$ROOT/public"

mk_portrait() {
  local src="$1" out="$2" cropH="$3" cropW="$4" off="$5"
  local tmp
  tmp="$(mktemp /tmp/am-src.XXXXXX.jpg)"
  sips -s format jpeg "$src" --out "$tmp" >/dev/null
  sips --cropToHeightWidth "$cropH" "$cropW" --cropOffset 0 "$off" "$tmp" --out /tmp/am-crop.jpg >/dev/null
  sips -z 1280 960 /tmp/am-crop.jpg --out "$PUB/$out" >/dev/null
  rm -f "$tmp" /tmp/am-crop.jpg
  echo "  $out"
}

echo "Generating achievement moment portraits…"
mk_portrait "$PUB/hero-landing.webp"            "achievement-moment-first.jpg" 655 491 355
mk_portrait "$PUB/hero-understand-2.webp"       "achievement-moment-day3.jpg"  655 491 200
mk_portrait "$PUB/hero-understand-new.webp"      "achievement-moment-day7.jpg"  655 491 355
mk_portrait "$PUB/hero-achievement-mountain.jpg" "achievement-moment-day30.jpg" 927 695 352
echo "Done."
