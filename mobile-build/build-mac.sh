#!/usr/bin/env bash
# Isolated EAS iOS build from Mac (avoids uploading the whole monorepo).
# For Android: bash build-android.sh
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="/tmp/eas-isolated-build"

echo "=== Pre-build: Verifying API connectivity ==="
if curl -sf --max-time 10 "https://shepherdspathai.com/api/bible" > /dev/null; then
  echo "✓ API reachable at https://shepherdspathai.com"
else
  echo "ERROR: Cannot reach https://shepherdspathai.com/api/bible"
  exit 1
fi

echo "=== Cleaning old build dir ==="
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "=== Copying mobile app files ==="
cp -r "$SRC/app"            "$BUILD_DIR/"
cp -r "$SRC/assets"         "$BUILD_DIR/"
cp -r "$SRC/components"     "$BUILD_DIR/"
cp -r "$SRC/constants"      "$BUILD_DIR/"
cp -r "$SRC/hooks"          "$BUILD_DIR/"
cp -r "$SRC/lib"            "$BUILD_DIR/"
cp -r "$SRC/scripts"        "$BUILD_DIR/"
cp    "$SRC/app.json"       "$BUILD_DIR/"
cp    "$SRC/eas.json"       "$BUILD_DIR/"
cp    "$SRC/package.json"   "$BUILD_DIR/"
cp    "$SRC/pnpm-lock.yaml" "$BUILD_DIR/" 2>/dev/null || cp "$SRC/package-lock.json" "$BUILD_DIR/" 2>/dev/null || true
cp    "$SRC/babel.config.js" "$BUILD_DIR/"
cp    "$SRC/metro.config.js" "$BUILD_DIR/"
cp    "$SRC/tsconfig.json"  "$BUILD_DIR/"
cp    "$SRC/store.config.yaml" "$BUILD_DIR/" 2>/dev/null || true

echo "=== Installing dependencies ==="
cd "$BUILD_DIR"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "=== Initializing fresh git repo ==="
git init
git config user.email "build@shepherdspathai.com"
git config user.name "EAS Build"
printf 'node_modules/\n' > .gitignore
git add -A
git commit -m "production build snapshot"

echo "=== Starting EAS Build ==="
cd "$BUILD_DIR"
EAS_BUILD_NO_EXPO_GO_WARNING=true eas build \
  --platform ios \
  --profile production \
  --non-interactive

echo ""
echo "=== Done. Submit with: ==="
echo "  cd $BUILD_DIR && eas submit --platform ios --latest"
