import { google } from 'googleapis';

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1Zhg_rL3i-eIyBNWOpB8Vld0awv6e-l9UoG6lvY3r4jI';

/** Eastern calendar date (YYYY-MM-DD), DST-safe — used for daily verse rows */
export function getEasternDateString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

export interface SheetVerse {
  date: string;
  verseText: string;
  reference: string;
  encouragement: string;
  reflectionPrompt: string;
}

/** When Google blocks JSON keys, use a Sheet Apps Script web app URL (no service account). */
async function getTodayVerseFromWebApp(): Promise<SheetVerse | null> {
  const url = process.env.GOOGLE_SHEET_WEB_APP_URL?.trim();
  if (!url) return null;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error('[sheets] Web app returned', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = (await res.json()) as Partial<SheetVerse>;
    const today = getEasternDateString();
    if (!data.verseText && !data.reference) return null;
    return {
      date: data.date || today,
      verseText: data.verseText?.trim() || '',
      reference: data.reference?.trim() || '',
      encouragement: data.encouragement?.trim() || '',
      reflectionPrompt: data.reflectionPrompt?.trim() || '',
    };
  } catch (err) {
    console.error('[sheets] GOOGLE_SHEET_WEB_APP_URL fetch failed:', err);
    return null;
  }
}

function parseServiceAccount(): object | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as object;
  } catch (err) {
    console.error('[sheets] GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON:', err);
    return null;
  }
}

/** Preferred on AWS/Lightsail — no Replit connector */
async function getSheetsClientFromServiceAccount() {
  const credentials = parseServiceAccount();
  if (!credentials) return null;

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

// Legacy Replit Connectors fallback (optional)
let connectionSettings: any;

async function getAccessTokenFromReplitConnector(): Promise<string> {
  if (
    connectionSettings?.settings?.expires_at &&
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

  if (!xReplitToken || !hostname) {
    throw new Error(
      'Google Sheets not configured — set GOOGLE_SERVICE_ACCOUNT_JSON (recommended) or Replit connector env vars',
    );
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        Accept: 'application/json',
        'X-Replit-Token': xReplitToken,
      },
    },
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('Google Sheet connector returned no access token');
  }
  return accessToken;
}

async function getSheetsClientFromReplitConnector() {
  const accessToken = await getAccessTokenFromReplitConnector();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

export async function getUncachableGoogleSheetClient() {
  const fromServiceAccount = await getSheetsClientFromServiceAccount();
  if (fromServiceAccount) return fromServiceAccount;

  console.warn(
    '[sheets] GOOGLE_SERVICE_ACCOUNT_JSON not set — falling back to Replit connector (deprecated for AWS deploy)',
  );
  return getSheetsClientFromReplitConnector();
}

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
  const fromWebApp = await getTodayVerseFromWebApp();
  if (fromWebApp) return fromWebApp;

  const sheets = await getUncachableGoogleSheetClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A2:M1000',
  });

  const rows = (response.data.values as string[][]) || [];
  const today = getEasternDateString();

  for (const row of rows) {
    const rawDate = row[0]?.trim() || '';
    const normalizedDate = normalizeDateString(rawDate);
    if (normalizedDate === today) {
      return {
        date: today,
        verseText: row[1]?.trim() || '',
        reference: row[2]?.trim() || '',
        encouragement: row[5]?.trim() || '',
        reflectionPrompt: row[6]?.trim() || '',
      };
    }
  }

  const pastRows = rows.filter((row) => {
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return raw;
}
