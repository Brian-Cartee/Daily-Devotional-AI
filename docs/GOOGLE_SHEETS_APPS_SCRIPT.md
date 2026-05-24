# Daily verse without a JSON key (Google Apps Script)

Use this if Google Cloud **blocks service account key download** (`iam.disableServiceAccountKeyCreation`).

Takes ~15 minutes. No JSON file, no Organization Policy changes.

---

## Step 1 — Open Apps Script from your sheet

1. Open your **devotional Google Sheet** (the one with dates in column A).
2. **Extensions** → **Apps Script**.
3. Delete any code in the editor and paste this **entire** script:

```javascript
function doGet() {
  const tz = 'America/New_York';
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const data = sheet.getDataRange().getValues();

  var match = null;
  var lastPast = null;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var norm = normalizeDate(String(row[0] || '').trim());
    if (!norm) continue;

    var verse = {
      date: today,
      verseText: String(row[1] || '').trim(),
      reference: String(row[2] || '').trim(),
      encouragement: String(row[5] || '').trim(),
      reflectionPrompt: String(row[6] || '').trim(),
    };

    if (norm === today) {
      match = verse;
      break;
    }
    if (norm <= today) lastPast = verse;
  }

  var out = match || lastPast || {
    date: today,
    verseText: '',
    reference: '',
    encouragement: '',
    reflectionPrompt: '',
  };

  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeDate(raw) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  var d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, 'America/New_York', 'yyyy-MM-dd');
  }
  return raw;
}
```

4. Click **Save** (disk icon). Name the project `Daily Verse API`.

---

## Step 2 — Deploy as web app

1. Click **Deploy** → **New deployment**.
2. Gear icon → type: **Web app**.
3. **Execute as:** Me  
4. **Who has access:** Anyone (the URL only returns today’s verse JSON; your sheet stays private in Google).
5. Click **Deploy** → authorize when asked → copy the **Web app URL**  
   (looks like `https://script.google.com/macros/s/...../exec`).

Test in a browser: open that URL. You should see JSON with `verseText`, `reference`, etc.

---

## Step 3 — Add URL on the server

SSH to Lightsail:

```bash
nano ~/Daily-Devotional-AI/artifacts/api-server/.env
```

Add (paste your URL):

```
GOOGLE_SHEET_WEB_APP_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

Save (`Ctrl+O`, Enter, `Ctrl+X`), then:

```bash
cd ~/Daily-Devotional-AI
git pull
bash scripts/fix-api-server.sh
curl -s http://127.0.0.1:3001/api/verses/daily
```

You should **not** see Philippians unless that’s today’s row in the sheet.

---

## Column layout (must match your sheet)

| Column | Content |
|--------|---------|
| A | Date |
| B | Verse text |
| C | Reference |
| F | Encouragement |
| G | Reflection prompt |

If your sheet tab is not named `Sheet1`, change `getSheetByName('Sheet1')` in the script to your tab name.

---

## Later: JSON key path

If Google allows keys later, you can use `GOOGLE_SERVICE_ACCOUNT_JSON` instead (see `GOOGLE_SHEETS_SETUP.md`). Web app URL is tried **first** when set.
