# Safe deploy (GitHub → Lightsail)

Use this flow so production never rolls back to old code.

## Current rule

**Do not run `deploy-lightsail.sh` until `origin/main` contains the same fixes as production.**

Preflight checks for markers in `scripts/deploy-markers.txt` (e.g. `Save & personalize`, `quickPersonalize`).

## Phase 1 — One-time: fix Mac git (if needed)

If `git` says Xcode license:

```bash
sudo xcodebuild -license accept
```

## Phase 2 — Push Mac → GitHub (before any server deploy)

On your Mac:

```bash
cd ~/Daily-Devotional-AI
git status
git pull origin main
```

Commit the name/personalize work (and anything else you want live):

```bash
git add \
  artifacts/shepherds-path/src/pages/Devotional.tsx \
  artifacts/shepherds-path/src/lib/userName.ts \
  artifacts/shepherds-path/src/lib/devotionalSession.ts \
  artifacts/shepherds-path/src/lib/session.ts \
  artifacts/shepherds-path/src/components/NamePrompt.tsx \
  artifacts/shepherds-path/src/pages/ThresholdArrivalPage.tsx \
  artifacts/shepherds-path/src/App.tsx \
  artifacts/api-server/src/routes/routes.ts \
  artifacts/api-server/src/userNameState.ts \
  scripts/safe-deploy-preflight.sh \
  scripts/backup-lightsail-dist.sh \
  scripts/deploy-markers.txt \
  scripts/deploy-lightsail.sh \
  docs/SAFE_DEPLOY.md

git commit -m "Personalize devotional by name; safe deploy preflight and backups."
git push origin main
```

Then verify preflight passes locally:

```bash
bash scripts/safe-deploy-preflight.sh
```

Must print **Preflight passed**. If **DEPLOY BLOCKED**, do not deploy yet.

## Phase 3 — Deploy on Lightsail (only after preflight passes)

```bash
ssh -i ~/Desktop/LightsailDefaultKey-us-west-2.pem ubuntu@52.42.155.185
cd ~/Daily-Devotional-AI
git pull origin main
bash scripts/safe-deploy-preflight.sh
bash scripts/backup-lightsail-dist.sh
bash scripts/deploy-lightsail.sh
```

## Phase 4 — Verify (2 minutes)

On Mac:

```bash
curl -sS 'https://www.shepherdspathai.com/' | grep -o 'assets/index-[^"]*\.js' | head -1
curl -sS 'https://www.shepherdspathai.com/api/health' | head -c 200
```

On iPhone: force-quit app → Daily Devotional → name box or personalized reflection works.

## Emergency rollback (server)

Last backup path is in `/tmp/shepherds-path-last-backup.txt`:

```bash
BACKUP=$(cat /tmp/shepherds-path-last-backup.txt)
cd ~/Daily-Devotional-AI/artifacts/shepherds-path/dist
tar -xzf "$BACKUP"
pm2 restart frontend
```

## Ongoing (after Phase 3)

1. Change code on Mac → commit → `git push origin main`
2. SSH → `safe-deploy-preflight.sh` → `backup-lightsail-dist.sh` → `deploy-lightsail.sh`
3. **Stop using zip/scp** except emergencies (then push to GitHub the same day)

## What we checked (Jun 2026)

- Live site: `index-A2aBSNXm.js` (zip deploy, has name fixes)
- `origin/main` at `3efa7b5`: **did not** include personalize markers → server deploy would have regressed
- **Action taken:** preflight + docs only; **no** `deploy-lightsail.sh` run until you push
