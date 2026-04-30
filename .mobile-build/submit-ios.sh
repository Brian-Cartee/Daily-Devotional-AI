#!/bin/bash
set -e

echo "=== Writing ASC API key ==="
mkdir -p /tmp/asc-key

node -e "
const fs = require('fs');
let raw = process.env.ASC_API_KEY_CONTENT || '';
raw = raw.replace(/-----BEGIN PRIVATE KEY-----/g, '');
raw = raw.replace(/-----END PRIVATE KEY-----/g, '');
raw = raw.replace(/\\\\n/g, '');
raw = raw.replace(/\n/g, '');
raw = raw.replace(/\r/g, '');
raw = raw.replace(/\s/g, '');
const body = raw.match(/.{1,64}/g).join('\n');
const pem = '-----BEGIN PRIVATE KEY-----\n' + body + '\n-----END PRIVATE KEY-----\n';
fs.writeFileSync('/tmp/asc-key/AuthKey_3DD2747FYX.p8', pem, { mode: 0o600 });
console.log('Key written: ' + pem.length + ' bytes');
"

echo ""
echo "=== Checking current App Store review status ==="
node << 'CHECKEOF'
const https = require('https');
const crypto = require('crypto');

let raw = process.env.ASC_API_KEY_CONTENT || '';
raw = raw.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '')
  .replace(/\\n/g, '').replace(/\n/g, '').replace(/\r/g, '').replace(/\s/g, '');
const body = raw.match(/.{1,64}/g).join('\n');
const pem = '-----BEGIN PRIVATE KEY-----\n' + body + '\n-----END PRIVATE KEY-----\n';
const keyId = process.env.ASC_KEY_ID || '3DD2747FYX';
const issuerId = process.env.ASC_ISSUER_ID;
const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({ iss: issuerId, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+1200, aud: 'appstoreconnect-v1' })).toString('base64url');
const si = header + '.' + payload;
const sign = crypto.createSign('SHA256');
sign.update(si); sign.end();
const sig = sign.sign({ key: pem, dsaEncoding: 'ieee-p1363' }).toString('base64url');
const token = si + '.' + sig;

function get(path) {
  return new Promise((resolve, reject) => {
    const options = { hostname: 'api.appstoreconnect.apple.com', path, headers: { 'Authorization': 'Bearer ' + token } };
    https.get(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  const versions = await get('/v1/apps/6760953522/appStoreVersions?limit=5&fields[appStoreVersions]=versionString,appStoreState,releaseType,createdDate');
  console.log('App Store versions:');
  (versions.data || []).slice(0, 4).forEach(v => {
    const state = v.attributes.appStoreState;
    const emoji = state === 'READY_FOR_SALE' ? '✓ LIVE' : state === 'IN_REVIEW' ? '⏳ IN_REVIEW' : state;
    console.log(`  v${v.attributes.versionString}  ${emoji}`);
  });

  const pending = (versions.data || []).find(v =>
    ['IN_REVIEW','PENDING_APPLE_RELEASE','PENDING_DEVELOPER_RELEASE','WAITING_FOR_REVIEW','PREPARE_FOR_SUBMISSION'].includes(v.attributes.appStoreState)
  );

  if (pending) {
    console.log('');
    console.log('=======================================================');
    console.log(`  Version ${pending.attributes.versionString} is currently: ${pending.attributes.appStoreState}`);
    console.log('  Apple is reviewing your build. Do NOT submit another');
    console.log('  build for the same version — wait for Apple to finish.');
    console.log('  If approved it will go live automatically.');
    console.log('=======================================================');
    process.exit(1);
  }

  console.log('No version in review — safe to submit.');
}
main().catch(e => { console.error(e); process.exit(1); });
CHECKEOF

echo ""
echo "=== Submitting to App Store Connect ==="
# Latest completed build ID — update this when a new build is ready
BUILD_ID="${SUBMIT_BUILD_ID:-0cd2c7d1-88dc-4823-b500-4e1b2a546dca}"

EXPO_TOKEN=$EXPO_TOKEN npx eas-cli submit \
  --platform ios \
  --id "$BUILD_ID" \
  --non-interactive \
  --verbose \
  --verbose-fastlane 2>&1
