#!/bin/bash
set -e

SRC="/home/runner/workspace/.mobile-build"
BUILD_DIR="/tmp/eas-isolated-build"

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
pnpm install --frozen-lockfile

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
EXPO_TOKEN=$EXPO_TOKEN npx eas-cli build \
  --platform ios \
  --profile production \
  --non-interactive
