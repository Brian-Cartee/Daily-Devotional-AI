import { google } from 'googleapis';

// Google Sheets integration via Replit Connectors
let connectionSettings: any;

async function getAccessToken() {
  if (
    connectionSettings &&
    connectionSettings.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        Accept: 'application/json',
        'X-Replit-Token': xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client. Tokens expire.
export async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

const SPREADSHEET_ID = '1Zhg_rL3i-eIyBNWOpB8Vld0awv6e-l9UoG6lvY3r4jI';

export interface SheetVerse {
  date: string;
  verseText: string;
  reference: string;
  encouragement: string;
  reflectionPrompt: string;
}

/**
 * Fetch all rows from the sheet to inspect column layout.
 * Returns raw row arrays.
 */
export async function getRawSheetRows(): Promise<string[][]> {
  const sheets = await getUncachableGoogleSheetClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A1:Z50',
  });
  return (response.data.values as string[][]) || [];
}

/**
 * Get today's verse row from the Google Sheet.
 * Column layout (0-indexed):
 *   0: Date
 *   1: Verse text
 *   2: Reference
 *   3: Translation
 *   4: Summary
 *   5: Takeaway/Encouragement
 *   6: Reflection Prompt
 */
export async function getTodayVerseFromSheet(): Promise<SheetVerse | null> {
  const sheets = await getUncachableGoogleSheetClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A2:M1000', // skip header row, fetch enough columns
  });

  const rows = (response.data.values as string[][]) || [];
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  for (const row of rows) {
    const rawDate = row[0]?.trim() || '';
    const normalizedDate = normalizeDateString(rawDate);
    if (normalizedDate === today) {
      return {
        date: today,
        verseText: row[1]?.trim() || '',
        reference: row[2]?.trim() || '',
        encouragement: row[5]?.trim() || '',   // col 5: Takeaway/Encouragement
        reflectionPrompt: row[6]?.trim() || '', // col 6: Reflection Prompt
      };
    }
  }

  // If no exact match today, return the most recent past row as fallback
  const pastRows = rows.filter(row => {
    const d = normalizeDateString(row[0]?.trim() || '');
    return d && d <= today;
  });

  if (pastRows.length > 0) {
    const lastRow = pastRows[pastRows.length - 1];
    return {
      date: today,
      verseText: lastRow[1]?.trim() || '',
      reference: lastRow[2]?.trim() || '',
      encouragement: lastRow[5]?.trim() || '',
      reflectionPrompt: lastRow[6]?.trim() || '',
    };
  }

  return null;
}

function normalizeDateString(raw: string): string {
  if (!raw) return '';
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try parsing M/D/YYYY or MM/DD/YYYY
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return raw;
}
