#!/bin/bash
set -e

echo "=== Writing ASC API key ==="
mkdir -p /tmp/asc-key

# Use Node to safely write a properly formatted PKCS#8 PEM key
node -e "
const fs = require('fs');
let raw = process.env.ASC_API_KEY_CONTENT || '';

// Strip any existing headers, whitespace, literal \n sequences
raw = raw.replace(/-----BEGIN PRIVATE KEY-----/g, '');
raw = raw.replace(/-----END PRIVATE KEY-----/g, '');
raw = raw.replace(/\\\\n/g, '');
raw = raw.replace(/\n/g, '');
raw = raw.replace(/\r/g, '');
raw = raw.replace(/\s/g, '');

// Wrap at 64 chars per line (PEM standard)
const body = raw.match(/.{1,64}/g).join('\n');
const pem = '-----BEGIN PRIVATE KEY-----\n' + body + '\n-----END PRIVATE KEY-----\n';

fs.writeFileSync('/tmp/asc-key/AuthKey_3DD2747FYX.p8', pem, { mode: 0o600 });
console.log('Key written: ' + pem.length + ' bytes');
console.log('Header: ' + pem.split('\n')[0]);
console.log('Lines: ' + pem.split('\n').length);
"

echo "=== Submitting build to App Store Connect ==="
cd /tmp/eas-isolated-build

EXPO_TOKEN=$EXPO_TOKEN npx eas-cli submit \
  --platform ios \
  --id 05eef555-013f-4761-9661-aa06547743f1 \
  --non-interactive \
  --verbose \
  --verbose-fastlane 2>&1
