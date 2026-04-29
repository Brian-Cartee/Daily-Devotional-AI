#!/bin/bash
set -e

echo "=== Writing ASC API key ==="
mkdir -p /tmp/asc-key
printf '%s' "$ASC_API_KEY_CONTENT" > /tmp/asc-key/AuthKey_3DD2747FYX.p8
chmod 600 /tmp/asc-key/AuthKey_3DD2747FYX.p8
echo "=== Key file size: $(wc -c < /tmp/asc-key/AuthKey_3DD2747FYX.p8) bytes ==="

echo "=== Submitting build 05eef555 to App Store Connect ==="
cd /tmp/eas-isolated-build

EXPO_TOKEN=$EXPO_TOKEN npx eas-cli submit \
  --platform ios \
  --id 05eef555-013f-4761-9661-aa06547743f1 \
  --non-interactive \
  --verbose \
  --verbose-fastlane 2>&1
