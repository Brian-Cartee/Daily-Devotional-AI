# QA smoke checklist (15 minutes)

Run after every production deploy. Pair with `bash scripts/production-smoke.sh`.

## Automated (Mac)

```bash
cd ~/Daily-Devotional-AI
bash scripts/safe-deploy-preflight.sh
bash scripts/production-smoke.sh
```

## iPhone / App Store app

1. Force-quit the app → reopen.
2. Tap **···** (top right) → confirm **Contact support** and **Send feedback** open.
3. **Daily Devotional** → Reflection: name box or personalized text (no blocking name popup on launch).
4. Purple **Why we built this** does not auto-open; manual open still works.
5. Optional: tap **Save & personalize** once if testing name flow.

## Safari (quick)

- https://www.shepherdspathai.com/support — contact form loads
- https://www.shepherdspathai.com/feedback — rating form loads

## If something fails

- Bundle unchanged after deploy → build failed; check Lightsail `deploy-lightsail.sh` output
- Missing file on build → run `bash scripts/check-tracked-deps.sh` on Mac before push
- Rollback → see `docs/SAFE_DEPLOY.md` (restore tar from backup)
