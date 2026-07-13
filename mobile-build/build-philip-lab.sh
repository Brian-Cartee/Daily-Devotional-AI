#!/usr/bin/env bash
# Isolated EAS iOS build for Philip Voice Lab (does not ship to App Store production).
set -euo pipefail

if [[ -z "${PHILIP_VOICE_LAB_KEY:-}" ]]; then
  echo "ERROR: Set PHILIP_VOICE_LAB_KEY to match server PHILIP_VOICE_LAB_SECRET before building."
  echo "  export PHILIP_VOICE_LAB_KEY='your-shared-secret'"
  exit 1
fi

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

echo "=== Patching eas.json philip-lab key ==="
node -e "
const fs = require('fs');
const p = '$BUILD_DIR/eas.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.build['philip-lab'].env.EXPO_PUBLIC_PHILIP_VOICE_LAB_KEY = process.env.PHILIP_VOICE_LAB_KEY;
if (process.env.PHILIP_LAB_API_URL) {
  j.build['philip-lab'].env.EXPO_PUBLIC_API_URL = process.env.PHILIP_LAB_API_URL;
}
fs.writeFileSync(p, JSON.stringify(j, null, 2));
"

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
echo "=== Done. Install via TestFlight internal testing (manual submit when approved). ==="
echo "  Deep link: shepherdspath://philip-voice-lab?key=\$PHILIP_VOICE_LAB_KEY"
