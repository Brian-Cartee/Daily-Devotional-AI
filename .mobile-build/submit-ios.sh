#!/bin/bash
set -e

echo "=== Writing ASC API key ==="
mkdir -p /tmp/asc-key

# Write key properly preserving newlines
printf '%s' "$ASC_API_KEY_CONTENT" > /tmp/asc-key/AuthKey_3DD2747FYX.p8
chmod 600 /tmp/asc-key/AuthKey_3DD2747FYX.p8

echo "=== Key file size: $(wc -c < /tmp/asc-key/AuthKey_3DD2747FYX.p8) bytes ==="

echo "=== Submitting to App Store Connect ==="
cd /tmp/eas-isolated-build

EXPO_TOKEN=$EXPO_TOKEN npx eas-cli submit \
  --platform ios \
  --latest \
  --non-interactive \
  --verbose 2>&1
