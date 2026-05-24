# Google Sheet setup (daily devotional) — ~10 minutes

You only do this **once**. After that, the app pulls today’s verse from your spreadsheet automatically.

## What you need

- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Access to your devotional Google Sheet (the one with dates in column A)

---

## Step 1 — Create a service account

1. Open [Google Cloud Console](https://console.cloud.google.com/) → pick or create a project.
2. **APIs & Services** → **Library** → search **Google Sheets API** → **Enable**.
3. **APIs & Services** → **Credentials** → **Create credentials** → **Service account**.
4. Name it something like `shepherds-path-sheets` → **Create and continue** → **Done**.
5. Click the new service account → **Keys** tab → **Add key** → **Create new key** → **JSON** → download the file.

Keep that JSON file private (like a password).

---

## Step 2 — Share your spreadsheet

1. Open the downloaded JSON and find `"client_email"` (looks like `something@project-id.iam.gserviceaccount.com`).
2. Open your **devotional Google Sheet**.
3. **Share** → paste that email → role **Viewer** → Send.

---

## Step 3 — Put the key on your server

SSH into Lightsail, then:

```bash
nano ~/Daily-Devotional-AI/artifacts/api-server/.env
```

Add **one line** (paste the **entire** JSON from the file, on a single line):

```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...",...}
```

Also confirm these exist:

```
APP_URL=https://www.shepherdspathai.com
NODE_ENV=production
```

Save: `Ctrl+O`, Enter, `Ctrl+X`.

Restart:

```bash
pm2 restart api-server
```

---

## Step 4 — Test

```bash
curl -s http://127.0.0.1:3000/api/verses/daily
```

The `reference` and `text` should match **today’s row** in your sheet (Eastern US date).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Still shows Philippians 4:6-7 | JSON not set, invalid JSON, or sheet not shared with service account email |
| Wrong day’s verse | Sheet date column must match `YYYY-MM-DD` for US Eastern “today” |
| `googleSheets` false in `/api/health` | Set `GOOGLE_SERVICE_ACCOUNT_JSON` and restart |

---

## Optional: send me the JSON?

**Do not** email or chat the JSON key. Only paste it into the server `.env` file yourself.
