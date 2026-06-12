// Resend email integration via Replit Connectors
import { Resend } from 'resend';
import { config } from './config';
import { EMAIL_THEME, emailPreheader } from './emailTheme';
import { buildEmailBrandHeaderRow } from './emailLogo';

let connectionSettings: any;

async function getCredentials() {
  // Try env var first — reliable across restarts and scheduler runs
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || 'hello@shepherdspathai.com',
    };
  }

  // Fall back to Replit Connectors integration
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Resend not connected — set RESEND_API_KEY secret');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        Accept: 'application/json',
        'X-Replit-Token': xReplitToken,
      },
    }
  )
    .then((res) => res.json() as Promise<{ items?: unknown[] }>)
    .then((data) => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('Resend not connected — set RESEND_API_KEY secret');
  }

  return {
    apiKey: connectionSettings.settings.api_key as string,
    fromEmail: process.env.RESEND_FROM_EMAIL || (connectionSettings.settings.from_email as string) || 'onboarding@resend.dev',
  };
}

// WARNING: Never cache this client — tokens expire.
export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

export interface DailyVerseEmailData {
  reference: string;
  text: string;
  encouragement: string;
  date: string;
  appUrl: string;
  artImageUrl?: string | null;
  followUp?: string | null;
  // When present, replaces the generic encouragement with season-specific AI text
  personalEncouragement?: string | null;
}

export function buildDailyVerseEmailHtml(data: DailyVerseEmailData): string {
  const T = EMAIL_THEME;
  const formattedDate = new Date(data.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const encouragement = data.personalEncouragement || data.encouragement;
  const preheader = `${data.reference}: ${data.text.slice(0, 80)}…`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${data.reference} — Shepherd's Path</title>
</head>
<body style="margin:0;padding:0;background-color:${T.outerBg};font-family:${T.serif};">
${emailPreheader(preheader)}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${T.outerBg};padding:28px 16px 48px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">

        <!-- Brand row — icon + type -->
        ${buildEmailBrandHeaderRow(data.appUrl, "Daily word")}

        <!-- Main card -->
        <tr>
          <td style="background-color:${T.cardBg};border:1px solid ${T.cardBorder};border-radius:20px;padding:36px 28px 32px;">

            <p style="margin:0 0 24px;font-family:${T.sans};font-size:11px;font-weight:600;color:${T.textMuted};letter-spacing:0.14em;text-transform:uppercase;text-align:center;">
              ${formattedDate}
            </p>

            <p style="margin:0 0 20px;font-family:${T.serif};font-size:24px;line-height:1.55;color:${T.text};font-style:italic;text-align:center;">
              &ldquo;${data.text}&rdquo;
            </p>

            <p style="margin:0 0 24px;font-family:${T.sans};font-size:12px;font-weight:700;color:${T.accent};letter-spacing:0.12em;text-transform:uppercase;text-align:center;">
              &mdash; ${data.reference}
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
              <tr>
                <td style="height:1px;background:${T.rule};font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>

            <p style="margin:0 0 24px;font-family:${T.sans};font-size:16px;line-height:1.7;color:${T.textSoft};text-align:center;">
              ${encouragement}
            </p>

            ${data.followUp ? `
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
              <tr>
                <td style="padding:16px 18px;background:rgba(212,165,116,0.08);border-left:2px solid ${T.accent};border-radius:0 12px 12px 0;">
                  <p style="margin:0 0 8px;font-family:${T.sans};font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${T.accent};">
                    Still with you from yesterday
                  </p>
                  <p style="margin:0;font-family:${T.serif};font-size:15px;line-height:1.65;color:${T.textSoft};font-style:italic;">
                    ${data.followUp}
                  </p>
                </td>
              </tr>
            </table>
            ` : ""}

            <p style="margin:0 0 28px;font-family:${T.serif};font-size:13px;line-height:1.65;color:${T.textMuted};font-style:italic;text-align:center;">
              Context and meaning for this passage are a question away in the app&mdash;when you&apos;re ready.
            </p>

            <table cellpadding="0" cellspacing="0" width="100%" role="presentation">
              <tr>
                <td align="center">
                  <a href="${data.appUrl}/devotional"
                     style="display:inline-block;background-color:${T.accent};color:${T.accentInk};font-family:${T.sans};font-size:15px;font-weight:700;text-decoration:none;padding:15px 32px;border-radius:12px;letter-spacing:0.02em;">
                    Open today&rsquo;s devotional &rarr;
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        ${data.artImageUrl ? `
        <tr>
          <td style="padding-top:16px;">
            <a href="${data.appUrl}" style="display:block;text-decoration:none;border-radius:16px;overflow:hidden;border:1px solid ${T.cardBorder};">
              <img src="${data.artImageUrl}"
                   alt="Today's moment of beauty"
                   width="520"
                   style="width:100%;max-width:520px;display:block;border:0;" />
            </a>
            <p style="margin:10px 0 0;font-family:${T.sans};font-size:10px;color:${T.textMuted};letter-spacing:0.12em;text-transform:uppercase;text-align:center;">
              A moment of beauty &mdash; tap to open
            </p>
          </td>
        </tr>
        ` : ""}

        <!-- Footer -->
        <tr>
          <td style="padding:28px 8px 0;text-align:center;">
            <p style="margin:0 0 12px;font-family:${T.sans};font-size:12px;line-height:1.6;color:${T.textMuted};">
              You subscribed to daily Scripture from Shepherd&rsquo;s Path.<br />
              Not a substitute for church, counseling, or emergency care.
            </p>
            <p style="margin:0 0 16px;font-family:${T.sans};font-size:12px;color:${T.textMuted};">
              Want to go deeper?
              <a href="${data.appUrl}/pricing" style="color:${T.accent};text-decoration:none;font-weight:600;">Pro removes all limits</a>
              &mdash; less than $4/mo.
            </p>
            <p style="margin:0 0 20px;font-family:${T.sans};font-size:12px;color:${T.textMuted};">
              <a href="${data.appUrl}/api/unsubscribe?email={{email}}" style="color:${T.accent};text-decoration:underline;">Unsubscribe</a>
              <span style="color:${T.textMuted};"> &middot; </span>
              <a href="${data.appUrl}" style="color:${T.textSoft};text-decoration:none;">Open the app</a>
            </p>
            <p style="margin:0;font-family:${T.serif};font-size:13px;color:${T.textMuted};font-style:italic;line-height:1.65;">
              &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo;<br />
              <span style="font-family:${T.sans};font-size:11px;font-style:normal;letter-spacing:0.06em;">PSALM 119:105</span>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ── Welcome + onboarding drip emails ────────────────────────────────────────
export {
  buildWelcomeEmailHtml,
  buildWelcomeEmailText,
  type WelcomeEmailData,
} from "./welcomeEmail";
export {
  getOnboardingEmailContent,
  type OnboardingEmailStep,
  type OnboardingEmailData,
} from "./onboardingEmail";

export interface WeeklyWeatherEmailData {
  appUrl: string;
  weekLabel: string;
  observations: string[];
  seasonLetter?: string | null;
  invitation: string;
  guidanceUrl: string;
  email?: string;
}

export function buildWeeklyWeatherEmailHtml(data: WeeklyWeatherEmailData): string {
  const obsHtml = data.observations
    .map(
      (o) =>
        `<li style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:15px;line-height:1.65;color:${EMAIL_THEME.textSoft};border-left:3px solid #7c5cbf;padding-left:12px;">${o}</li>`,
    )
    .join("");

  const letterBlock = data.seasonLetter
    ? `<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:16px;line-height:1.75;color:#2d1b3e;font-style:italic;">${data.seasonLetter}</p>`
    : "";

  const unsub = data.email
    ? `${data.appUrl}/api/unsubscribe?email=${encodeURIComponent(data.email)}`
    : `${data.appUrl}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#f0ede8;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0ede8;padding:24px 12px 40px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr>
  <td style="background:linear-gradient(160deg,#2d1b5e 0%,#442f74 60%,#5a3d8a 100%);border-radius:20px 20px 0 0;padding:36px 32px 28px;text-align:center;">
    <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:20px;color:#fff;">Shepherd&rsquo;s Path</p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.55);">Pro · Spiritual Weather</p>
    <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#fff;">Your week, reflected</h1>
    <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.5);">${data.weekLabel}</p>
  </td>
</tr>
<tr>
  <td style="background:#fff;padding:36px 32px;border-left:1px solid #e2ddd6;border-right:1px solid #e2ddd6;">
    ${letterBlock}
    <ul style="margin:0 0 24px;padding:0;list-style:none;">${obsHtml}</ul>
    <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#5a4a68;">${data.invitation}</p>
    <a href="${data.guidanceUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#5a3d8a,#7c5cbf);color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:14px 24px;border-radius:12px;">Talk it through in the app</a>
  </td>
</tr>
<tr>
  <td style="padding:20px 8px 0;text-align:center;">
    <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#9a8aa8;line-height:1.6;">
      <a href="${data.appUrl}" style="color:#7c5cbf;">Open Shepherd's Path</a> ·
      <a href="${unsub}" style="color:#9a8aa8;">Unsubscribe from emails</a>
    </p>
  </td>
</tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function buildWeeklyWeatherEmailText(data: WeeklyWeatherEmailData): string {
  const obs = data.observations.map((o) => `• ${o}`).join("\n");
  const letter = data.seasonLetter ? `\n${data.seasonLetter}\n\n` : "\n";
  return `Shepherd's Path Pro — Spiritual Weather (${data.weekLabel})

${letter}${obs}

${data.invitation}

Talk it through: ${data.guidanceUrl}

Open the app: ${data.appUrl}`;
}

export function buildDailyVerseEmailText(data: DailyVerseEmailData): string {
  const formattedDate = new Date(data.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const encouragement = data.personalEncouragement || data.encouragement;
  return `Shepherd's Path — ${formattedDate}

"${data.text}"
— ${data.reference}

${encouragement}

Open today's devotional: ${data.appUrl}/devotional

---
To unsubscribe: ${data.appUrl}/api/unsubscribe?email=`;
}
