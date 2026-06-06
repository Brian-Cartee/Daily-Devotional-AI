# Xcode release — Shepherd's Path iOS (2.1.3+)

Build and upload from your Mac **without EAS cloud credits**.

## Before you build

### 1. Deploy website (required first)

The App Store shell loads the live site. Deploy web changes so Apple IAP buttons work:

```bash
./scripts/deploy-lightsail.sh
```

### 2. App Store Connect — subscriptions

Under **Subscriptions** (not the empty In-App Purchases tab):

| Product ID   | Price     | Duration |
|-------------|-----------|----------|
| `monthly_pro` | $5.99/mo | 1 month  |
| `annual_pro`  | $44.99/yr | 1 year   |

- Create a subscription group (e.g. "Shepherd's Path Pro")
- Add both products, submit for review with the app binary

### 3. RevenueCat

- Upload `SubscriptionKey_VYDFYBD2S6.p8` in RevenueCat → Apple App Store
- Link `monthly_pro` and `annual_pro` to entitlement **`pro`**
- Default offering should include monthly + annual packages

## Build steps

```bash
cd .mobile-build
npm install
export LANG=en_US.UTF-8
npx expo prebuild --platform ios --clean
open ios/*.xcworkspace
```

In Xcode:

1. Select target **Shepherd's Path** → **Signing & Capabilities**
   - Team: **Brian Cartee (D5X4W5F62Y)**
   - Bundle ID: **com.shepherdspath.app**
   - Enable **In-App Purchase**
2. **Product → Archive**
3. **Distribute App → App Store Connect → Upload**

Or upload the `.ipa` with [Transporter](https://apps.apple.com/app/transporter/id1450874784).

## App Store Connect after upload

1. Create version **2.1.3** (matches `app.json`)
2. Attach build **160** (or whatever Xcode incremented)
3. Attach the subscription products to this version
4. Submit for review

## Submit auth (optional — Transporter/Xcode upload doesn't need this)

EAS submit uses `AuthKey_45KVCS5PG2.p8` at `/tmp/asc-key/`.

## Test on device before submit

1. Install the archive via Xcode **Run** on a physical iPhone
2. Hit an AI limit or open **Pricing** → **Subscribe with Apple**
3. Confirm native subscription screen opens
4. After purchase (Sandbox account), Pro should unlock in the web UI

## Timeline

| Step              | Time        |
|-------------------|-------------|
| ASC + RevenueCat  | ~30–60 min  |
| prebuild + Archive| ~30–60 min  |
| Apple review      | 1–3 days    |
