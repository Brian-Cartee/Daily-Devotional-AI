#!/bin/bash
set -e

SRC="/home/runner/workspace/.mobile-build"
BUILD_DIR="/tmp/eas-isolated-build"

echo "=== Pre-build: Verifying API connectivity ==="
if curl -sf --max-time 10 "https://shepherdspathai.com/api/bible" > /dev/null; then
  echo "✓ API reachable at https://shepherdspathai.com"
else
  echo ""
  echo "ERROR: Cannot reach https://shepherdspathai.com/api/bible"
  echo "The production server is not responding. Aborting build."
  echo "Fix the server issue before submitting a new build to Apple."
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
cp    "$SRC/app.json"        "$BUILD_DIR/"
cp    "$SRC/eas.json"        "$BUILD_DIR/"
cp    "$SRC/package.json"    "$BUILD_DIR/"
cp    "$SRC/pnpm-lock.yaml"  "$BUILD_DIR/"
cp    "$SRC/babel.config.js" "$BUILD_DIR/"
cp    "$SRC/metro.config.js" "$BUILD_DIR/"
cp    "$SRC/tsconfig.json"   "$BUILD_DIR/"
cp    "$SRC/store.config.yaml" "$BUILD_DIR/" 2>/dev/null || true

echo "=== Installing dependencies (so EAS can resolve plugins) ==="
cd "$BUILD_DIR"
pnpm install --no-frozen-lockfile

echo "=== Initializing fresh git repo ==="
git init
git config user.email "build@shepherdspathai.com"
git config user.name "EAS Build"
# Only commit source files, not node_modules
echo "node_modules/" > .gitignore
git add -A
git commit -m "production build snapshot"

echo "=== Build dir size (source only) ==="
du -sh --exclude=node_modules "$BUILD_DIR" 2>/dev/null || du -sh "$BUILD_DIR"

echo "=== Starting EAS Build ==="
BUILD_OUTPUT=$(EXPO_TOKEN=$EXPO_TOKEN npx eas-cli build \
  --platform ios \
  --profile production \
  --non-interactive 2>&1) || true
echo "$BUILD_OUTPUT"

if echo "$BUILD_OUTPUT" | grep -qi "limit\|quota\|exceeded\|403\|unauthorized\|error"; then
  echo "=== EAS Build may have failed — see output above ==="
fi

NEW_BUILD_ID=$(echo "$BUILD_OUTPUT" | grep -oP '(?<=builds/)[0-9a-f-]{36}' | tail -1)
if [ -n "$NEW_BUILD_ID" ]; then
  echo "=== Updating submit script with new build ID: $NEW_BUILD_ID ==="
  sed -i "s|BUILD_ID=\"\${SUBMIT_BUILD_ID:-[0-9a-f-]*}\"|BUILD_ID=\"\${SUBMIT_BUILD_ID:-$NEW_BUILD_ID}\"|" "$SRC/submit-ios.sh"
  echo "✓ submit-ios.sh updated"
fi
