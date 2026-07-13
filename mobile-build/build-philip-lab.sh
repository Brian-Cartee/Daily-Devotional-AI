#!/usr/bin/env bash
# Isolated EAS iOS build for Philip Voice Lab (does not ship to App Store production).
set -euo pipefail

# Lab key must be configured in EAS (preview environment) as EXPO_PUBLIC_PHILIP_VOICE_LAB_KEY.
# Do not pass the key via eas.json, deep links, or command-line flags.

SRC="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="/tmp/eas-philip-lab-build"

echo "=== Philip Voice Lab — isolated iOS build ==="
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
cp -r "$SRC/plugins"        "$BUILD_DIR/"
cp    "$SRC/app.json"       "$BUILD_DIR/"
cp    "$SRC/app.config.js"  "$BUILD_DIR/"
cp    "$SRC/eas.json"       "$BUILD_DIR/"
cp    "$SRC/package.json"   "$BUILD_DIR/"
cp    "$SRC/pnpm-lock.yaml" "$BUILD_DIR/" 2>/dev/null || cp "$SRC/package-lock.json" "$BUILD_DIR/" 2>/dev/null || true
cp    "$SRC/babel.config.js" "$BUILD_DIR/"
cp    "$SRC/metro.config.js" "$BUILD_DIR/"
cp    "$SRC/tsconfig.json"  "$BUILD_DIR/"

echo "=== Installing dependencies ==="
cd "$BUILD_DIR"
if [[ -d "$SRC/node_modules" && -f "$SRC/package-lock.json" ]]; then
  echo "=== Linking existing node_modules from mobile-build (saves ~750MB disk) ==="
  ln -s "$SRC/node_modules" node_modules
elif [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "=== Initializing fresh git repo ==="
git init
git config user.email "build@shepherdspathai.com"
git config user.name "EAS Philip Lab Build"
printf 'node_modules/\n' > .gitignore
git add -A
git commit -m "philip-lab build snapshot"

echo "=== Starting EAS Build (profile: philip-lab) ==="
export EXPO_PUBLIC_ENABLE_PHILIP_VOICE_LAB=true
export EXPO_PUBLIC_PHILIP_VOICE_LAB_BUNDLE_SUFFIX=lab
EAS_BUILD_NO_EXPO_GO_WARNING=true eas build \
  --platform ios \
  --profile philip-lab \
  --non-interactive

echo ""
echo "=== Done. Install via EAS internal distribution link (registered test iPhone). ==="
echo "  Deep link: shepherdspath://philip-voice-lab"
