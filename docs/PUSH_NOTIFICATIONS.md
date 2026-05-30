# Web push notifications (VAPID)

Browser push uses **VAPID** keys on the API server. If they are missing, admin **System Health** shows push as failed and users cannot enable reminders in **My rhythm**.

## Fix on Lightsail (one time)

SSH to the server, then:

```bash
cd ~/Daily-Devotional-AI
git pull origin main
cd artifacts/api-server
pnpm run generate-vapid
```

Copy the three `VAPID_*` lines into `artifacts/api-server/.env` (create keys only once — keep the same pair forever or existing subscriptions stop working).

```bash
nano ~/Daily-Devotional-AI/artifacts/api-server/.env
# add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

pm2 restart api-server --update-env
```

Verify:

```bash
curl -s https://www.shepherdspathai.com/api/push/vapid-key
# should show "configured":true and a non-empty publicKey
```

Re-check **https://www.shepherdspathai.com/shepherd-admin** → System Health → Push should be green.

## Local development

```bash
cd artifacts/api-server
pnpm run generate-vapid
# paste into artifacts/api-server/.env
pnpm run build && pnpm start
```

## Notes

- **App Store shell / Safari**: uses the same Web Push + service worker as the website.
- **Expo native push** uses a separate path (`expo_push_tokens`) and does not need VAPID.
- **SMS (Twilio)** is optional and unrelated to VAPID.
