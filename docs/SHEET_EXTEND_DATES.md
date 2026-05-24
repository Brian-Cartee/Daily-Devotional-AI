# Add more months to your devotional sheet

Your app reads **one row per day** in column **A** (date). If rows stop in June, the app uses an **old fallback verse** for later days — not because the sheet “expires,” but because there is **no row for that date**.

---

## Column layout (must match)

| Column | Content |
|--------|---------|
| A | Date (`YYYY-MM-DD` or `M/D/YYYY`) |
| B | Verse text |
| C | Reference |
| F | Encouragement |
| G | Reflection prompt |

---

## Easiest: run a script once in your sheet

1. Open your **devotional Google Sheet**.
2. **Extensions** → **Apps Script** (same project as `DailyVerseWeb`).
3. Click **+** → **Script** → name it `FillDates.gs`.
4. Paste the script from the section **“FillDates.gs”** below.
5. Select function **`fillDatesSixMonths`** in the toolbar dropdown.
6. Click **Run** (▶). Approve permissions if asked.
7. Back in the sheet: you should see **new rows** with dates through ~6 months ahead (columns B–G empty for you to fill).

To go further out, run **`fillDatesTwelveMonths`** instead (or change the number in the script).

---

## FillDates.gs (paste into Apps Script)

```javascript
/**
 * Adds daily date rows from the day after your last date through N months ahead.
 * Does not overwrite existing rows.
 */
function fillDatesMonthsAhead(monthsAhead) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const tz = 'America/New_York';
  const data = sheet.getDataRange().getValues();

  var lastDate = null;
  for (var i = 1; i < data.length; i++) {
    var norm = normalizeDateForFill(String(data[i][0] || '').trim());
    if (norm) lastDate = norm;
  }

  var start;
  if (lastDate) {
    start = new Date(lastDate + 'T12:00:00');
    start.setDate(start.getDate() + 1);
  } else {
    start = new Date();
  }

  var end = new Date(start);
  end.setMonth(end.getMonth() + monthsAhead);

  var existing = {};
  for (var j = 1; j < data.length; j++) {
    var d = normalizeDateForFill(String(data[j][0] || '').trim());
    if (d) existing[d] = true;
  }

  var rowsToAdd = [];
  for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    var key = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    if (existing[key]) continue;
    rowsToAdd.push([key, '', '', '', '', '', '']);
  }

  if (rowsToAdd.length === 0) {
    Logger.log('No new dates to add.');
    return;
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, 7).setValues(rowsToAdd);
  Logger.log('Added ' + rowsToAdd.length + ' date rows.');
}

function fillDatesSixMonths() {
  fillDatesMonthsAhead(6);
}

function fillDatesTwelveMonths() {
  fillDatesMonthsAhead(12);
}

function normalizeDateForFill(raw) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  var parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, 'America/New_York', 'yyyy-MM-dd');
  }
  return '';
}
```

---

## After new rows exist

1. Fill in **verse / reference / encouragement / reflection** for each new day (or copy your workflow).
2. No server change needed — the app picks up new rows automatically.
3. Optional test on server:
   ```bash
   curl -s "http://127.0.0.1:3001/api/verses/daily?refresh=1"
   ```

---

## Manual way (no script)

1. Select your **last June row** (whole row).
2. Drag the **small blue square** at the bottom-right of the selection down to extend dates (if column A is real dates).
3. Or: copy a block of rows, paste below, then fix dates in column A.

---

## Not the same as “Google trial expires”

If you meant your **Google Cloud $300 trial** (top banner), that is billing — not the sheet. The sheet itself does not expire.
