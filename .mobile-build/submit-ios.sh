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
fs.writeFileSync('/tmp/asc-key/AuthKey_45KVCS5PG2.p8', pem, { mode: 0o600 });
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
const keyId = process.env.ASC_KEY_ID || '45KVCS5PG2';
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

  // Read the version we're about to submit from app.json
  const fs = require('fs');
  let submitVersion = null;
  try {
    const appJson = JSON.parse(fs.readFileSync('/home/runner/workspace/.mobile-build/app.json', 'utf8'));
    submitVersion = appJson?.expo?.version;
    if (submitVersion) console.log(`Build version being submitted: ${submitVersion}`);
  } catch(e) { console.log('Could not read app.json version'); }

  // Block if this version is already LIVE on the App Store
  if (submitVersion) {
    const alreadyLive = (versions.data || []).find(v =>
      v.attributes.versionString === submitVersion &&
      v.attributes.appStoreState === 'READY_FOR_SALE'
    );
    if (alreadyLive) {
      console.log('');
      console.log('=======================================================');
      console.log(`  BLOCKED: Version ${submitVersion} is already LIVE on the App Store.`);
      console.log('  You cannot submit another binary for a version that');
      console.log('  is already released. Bump the version in app.json');
      console.log(`  (e.g. to ${submitVersion.replace(/(\d+)$/, n => +n+1)}) before submitting.`);
      console.log('=======================================================');
      process.exit(1);
    }
  }

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
# Build ID is set automatically by build-isolated.sh after a successful build.
# NEVER hardcode a build ID here — if it's stale it will submit the wrong version to Apple.
BUILD_ID="${SUBMIT_BUILD_ID:-}"

if [ -z "$BUILD_ID" ]; then
  echo "=======================================================";
  echo "  BLOCKED: No build ID available.";
  echo "  SUBMIT_BUILD_ID is not set. This usually means the";
  echo "  most recent EAS build failed or was rate-limited.";
  echo "  Do NOT run this workflow manually until a new build";
  echo "  has succeeded and updated this script.";
  echo "=======================================================";
  exit 1;
fi

# eas-cli must run from a directory with eas.json
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "Working directory: $(pwd)"

EXPO_TOKEN=$EXPO_TOKEN npx eas-cli submit \
  --platform ios \
  --id "$BUILD_ID" \
  --non-interactive \
  --verbose \
  --verbose-fastlane 2>&1
