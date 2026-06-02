# Shepherd's Path Release Readiness Playbook

This is the fastest stable path for shipping frontend changes to production and verifying iOS WebView behavior.

See also: `docs/SAFE_DEPLOY.md`, `docs/QA_SMOKE_CHECKLIST.md`.

## 1) Local preflight (Mac)

```bash
cd ~/Daily-Devotional-AI
git fetch origin main
bash scripts/safe-deploy-preflight.sh
cd artifacts/shepherds-path && pnpm build
```

Expected: preflight passes; build succeeds. Chunk-size warnings are acceptable.

## 2) Deploy path (recommended)

Push to GitHub first, then on Lightsail:

```bash
ssh -i ~/Desktop/LightsailDefaultKey-us-west-2.pem ubuntu@52.42.155.185
cd ~/Daily-Devotional-AI
git pull origin main
bash scripts/safe-deploy-preflight.sh
bash scripts/deploy-lightsail.sh
```

On Mac after deploy:

```bash
bash scripts/production-smoke.sh
```

Follow `docs/QA_SMOKE_CHECKLIST.md` for iPhone checks.

## 3) Emergency direct frontend ship (when GitHub is behind)

Run on Mac:

```bash
cd ~/Daily-Devotional-AI/artifacts/shepherds-path
pnpm build
tar -czf /tmp/shepherds-path-dist.tgz dist/public serve.mjs
scp -i ~/Desktop/LightsailDefaultKey-us-west-2.pem /tmp/shepherds-path-dist.tgz ubuntu@52.42.155.185:/tmp/
```

Run on Lightsail:

```bash
cd ~/Daily-Devotional-AI/artifacts/shepherds-path
tar -xzf /tmp/shepherds-path-dist.tgz
pm2 delete frontend 2>/dev/null || true
PORT=3000 pm2 start serve.mjs --name frontend --cwd ~/Daily-Devotional-AI/artifacts/shepherds-path
pm2 save 2>/dev/null || true
```

## 4) Production verification

Run on Mac:

```bash
curl -sS 'https://www.shepherdspathai.com/' | grep -o 'assets/index-[^"]*\.js' | head -n 1
curl -sS 'https://www.shepherdspathai.com/threshold?replay=1' | grep -E 'What do you need right now\?|How should we greet you\?|What may we call you\?|What brought you here\?'
curl -sS 'https://www.shepherdspathai.com/?native=1&enter=1' | grep __SP_DISABLE_WHY_AUTO_OPEN
```

Expected:
- New bundle hash (not an old cached hash).
- Threshold copy includes the new flow text.
- Native blocker marker exists in HTML.

## 5) iPhone QA smoke test

1. Force-quit app and reopen.
2. Confirm purple "Why we built this" does not auto-open.
3. Confirm manual "Why we built this" still opens.
4. Open `https://www.shepherdspathai.com/threshold?replay=1` in Safari (or private tab) and verify current intro sequence.

## 6) Troubleshooting

- If intro still looks old: production bundle not updated; redeploy frontend.
- If purple auto-open returns: verify `__SP_DISABLE_WHY_AUTO_OPEN` on native URL and restart frontend PM2 process.
- If Mac Git is blocked by Xcode license:

```bash
sudo xcodebuild -license accept
```
