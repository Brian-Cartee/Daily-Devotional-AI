# iOS platform strategy (Tier 3)

## Approved approach: **WebView shell → live website**

The App Store app in `.mobile-build/` loads:

`https://www.shepherdspathai.com`

**You do not rebuild iOS** for most feature work (prayer closet, home UI, worship labels, check-in). Deploy the web app:

```bash
cd ~/Daily-Devotional-AI && git pull && bash scripts/deploy-lightsail.sh
```

Users on the **approved App Store build** get those changes on next launch (pull-to-refresh optional).

---

## Three ways people use Shepherd's Path on iPhone

| Surface | Updates via | Notes |
|---------|-------------|--------|
| **Safari** | Lightsail deploy | PWA “Add to Home Screen” prompt; service worker for updates |
| **App Store app** (`.mobile-build`) | Lightsail deploy for UI/features | Native shell: pull-to-refresh, offline screen, safe areas, inline YouTube for worship |
| **Legacy native Expo tabs** (`artifacts/shepherds-path-mobile/`) | Separate codebase | Not tied to website deploy — only if you revive native parity |

**Decision:** Ship **WebView-only** on iOS. Do not invest in `shepherds-path-mobile` parity unless you pivot product strategy.

---

## Worship bed volume on iOS

YouTube embeds **do not support in-app volume** on iPhone (Safari or App Store WebView). Users adjust loudness with **side volume buttons**. The app shows a short note and disables the slider for YouTube on iOS — this is expected, not a bug.

Local **Stillness** tracks still use the in-app volume slider.

---

## What the web app does inside the App Store shell

- Sets `data-sp-shell="native"` so the site knows it’s in the official app
- **Hides** “Add to Home Screen” and service-worker update banners (you already have the store app)
- Unregisters service workers (avoids stale cached bundles in WebView)
- Posts `app_ready` so the native splash clears quickly

---

## When you **do** need a new iOS build

Bump `version` + `ios.buildNumber` in `.mobile-build/app.json`, then EAS build + submit:

- WebView behavior changes (navigation, media, safe area, offline copy)
- New native permissions or plugins (mic, notifications, RevenueCat)
- App Store metadata / icons / splash

Example next shell release: `2.0.2` / build `3` after Tier 3 shell tweaks.

---

## After Apple approval (your flow)

1. **Today:** Deploy web (`deploy-lightsail.sh`) — closet, home tiles, Praise house, etc. go live in the approved app automatically.
2. **Optional next binary:** EAS iOS build with Tier 3 shell improvements (pull-to-refresh hint in error UI, worship inline playback, external links open in Safari).
3. **Android:** Same WebView pattern when you ship Play Store.

---

## Quick test matrix

- [ ] App Store app: home loads, prayer closet, YouTube worship plays, side volume works
- [ ] Pull down to refresh after a deploy
- [ ] Airplane mode → offline screen → Try Again
- [ ] Safari: no “install” confusion; App Store mentioned in FAQ / install sheet
- [ ] External link (e.g. support) opens outside WebView
