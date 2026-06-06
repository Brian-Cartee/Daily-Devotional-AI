# Fix: “Why we built this” purple sheet every app open

## Why it kept happening

The App Store app loads **https://www.shepherdspathai.com**. Production was still serving **old JavaScript** (`index-IYV0BUYL.js`) that runs:

```text
if (inApp) → auto-open until localStorage count < 2
```

If the WebView **does not keep** `localStorage` between force-quits, the count is always `0` → **popup every launch**.

Fixes in git do nothing until the **server** is updated.

## Fix (no new App Store build)

### On your Lightsail server

```bash
cd ~/Daily-Devotional-AI
git pull origin main
bash scripts/emergency-stop-why-panel.sh
```

Or full deploy:

```bash
bash scripts/deploy-lightsail.sh
```

### On your phone

1. Force-quit Shepherd's Path  
2. Open again — sheet should **not** auto-open  
3. Optional: read it via **“Why we built this”** on the home hero (manual only)

### Confirm production is fixed

```bash
curl -sS 'https://www.shepherdspathai.com/?native=1&enter=1' | grep __SP_DISABLE_WHY_AUTO_OPEN
```

You should see `__SP_DISABLE_WHY_AUTO_OPEN` in the output.

After full frontend build, the JS filename changes (e.g. `index-C9FrUjYb.js` instead of `index-IYV0BUYL.js`).

## What we changed in code

1. **`serve.mjs`** — injects a script into every HTML page for the app that sets “already seen” flags **before** React loads (works with old bundles).
2. **`index.html`** — same block in source.
3. **`WhyThisExistsPanel.tsx`** — removed auto-open `useEffect` entirely (manual open only).
