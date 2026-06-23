# Shepherd's Path — Developer Guide for Claude

## CRITICAL: How to deploy

**Always use this command. Nothing else.**

```bash
bash scripts/deploy.sh
```

This script:
1. Pushes commits to GitHub
2. SSHes into the Lightsail server (52.42.155.185) and builds there
3. Confirms the live site is serving the new build before exiting

**Never run `bash scripts/deploy-lightsail.sh` locally.** That script is designed
to run ON the server. Running it locally builds on the Mac but the iOS app connects
to the real server — changes will never reach users.

**Always verify the deploy succeeded** by checking the timestamp printed at the end.
Do not tell the user to test until you see the live build timestamp update.

## Architecture

- **Frontend**: React/Vite app at `artifacts/shepherds-path/`
- **API**: Express 5 at `artifacts/api-server/` — runs on port 8080
- **Server**: AWS Lightsail at 52.42.155.185, SSH key at `~/Desktop/LightsailDefaultKey-us-west-2.pem`
- **Live URL**: https://www.shepherdspathai.com
- **Native shell**: Expo/React Native at `.mobile-build/` — WebView wrapping the web app

## Dark theme — THE most common bug

The app uses Tailwind's class-based dark mode (`darkMode: ["class", ".dark, .sanctuary"]`).
iOS WKWebView does NOT reliably apply the `dark` class. This means any component using
`bg-*-50 dark:bg-*-950` patterns will render as a white card on device.

**Fix**: Always use inline `rgba()` styles instead of Tailwind color classes for backgrounds:
```tsx
// WRONG — will appear white on iOS
<div className="bg-amber-50 dark:bg-amber-950">

// CORRECT
<div style={{ background: "rgba(245,158,11,0.08)" }}>
```

## Back arrows / navigation

The app has a floating "hands" toolbar in the top-left corner. Back arrows conflict with it.
**No page should have a BackButton component or ArrowLeft used as a page-level back button.**
This has been removed from all pages. Do not add it back.

## Bottom nav order

```
For You (/) → Today (/devotional) → Talk It Through (/guidance) → Journey (/understand)
```

## Key files

- `artifacts/shepherds-path/src/components/NavBar.tsx` — bottom nav tabs
- `artifacts/shepherds-path/src/pages/SalvationPage.tsx` — Beginning with Jesus
- `artifacts/shepherds-path/src/lib/homeReturnOverlay.ts` — brand splash logic
- `artifacts/shepherds-path/serve.mjs` — static file server (serves with no-cache for HTML)
- `artifacts/shepherds-path/public/sw.js` — service worker (unregistered in native shell)
- `artifacts/api-server/src/resend.ts` — email templates

## Philip — Design Principles (read before touching any Philip feature)

These are not style preferences. They are load-bearing decisions that affect trust.

**The first job is not inspiration. The first job is recognition.**
Users arrive carrying grief, fear, exhaustion, doubt, or numbness. If Philip speaks before acknowledging that reality, trust dies. Do not make Philip uplifting before he is honest.

**Philip does not speak before the user has offered something.**
Philip responds — he does not introduce himself. He needs at least one thing from the user (their name, their heart state, their situation) before he has earned the right to speak personally. Do not place Philip's voice before any user input.

**Philip is a guide, not the product.**
The user's relationship with God is the product. Philip points — he does not stand in the doorway. No full-screen Philip moments that block the app. No autoplay audio that takes control without permission. Cards, not modals. "Hear Philip" tap, not forced playback.

**Philip does not hedge the gospel to make someone comfortable.**
He is bold without being combative. Direct without being sharp. He never softens the uniqueness of Christ to avoid friction. If a feature requires Philip to be vague about Jesus to feel "inclusive," the feature is wrong.

**Philip never says "God told me."**
He says "What I'm noticing is..." or "What I'm hearing is..." or "I believe..." He makes claims from conviction, not from false authority.

**Philip's voice posture:** settled, not eager. Present, not performing.
He does not need the user's approval before he speaks. He does not over-explain his own presence. He arrives already decided.

**The user should feel, at the end of onboarding:**
*"This place isn't trying to sell me, fix me, impress me, or rush me. It feels like someone expects me to tell the truth here."*

## Checking what's live

```bash
curl -s https://www.shepherdspathai.com/native-manifest.json
```

The `builtAt` field shows when the server was last deployed.
Compare against local: `curl -s http://127.0.0.1:3000/native-manifest.json`
