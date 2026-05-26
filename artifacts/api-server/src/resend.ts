// Resend email integration via Replit Connectors
import { Resend } from 'resend';
import { config } from './config';
import { EMAIL_THEME, emailPreheader } from './emailTheme';

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

        <!-- Brand row — type only (logo PNG has no transparency; avoids black square in clients) -->
        <tr>
          <td align="center" style="padding:0 0 20px;">
            <p style="margin:0 0 6px;font-family:${T.serif};font-size:22px;font-weight:400;color:${T.text};letter-spacing:0.02em;">
              Shepherd&rsquo;s Path
            </p>
            <p style="margin:0;font-family:${T.sans};font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:${T.textMuted};">
              Daily word
            </p>
          </td>
        </tr>

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

// ── Welcome email — sent once on new subscriber signup ──────────────────────

export interface WelcomeEmailData {
  name?: string | null;
  appUrl: string;
  videoUrl?: string | null;   // Optional: set WELCOME_VIDEO_URL env var to activate
}

export function buildWelcomeEmailHtml(data: WelcomeEmailData): string {
  const firstName = data.name?.split(" ")[0] ?? null;
  const greeting = firstName ? `${firstName},` : "Friend,";
  const videoUrl = data.videoUrl || null;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Shepherd's Path</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_THEME.outerBg};font-family:${EMAIL_THEME.serif};">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:${EMAIL_THEME.outerBg};padding:28px 16px 40px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- HEADER -->
        <tr>
          <td style="padding:0 0 20px;text-align:center;">
            <p style="margin:0 0 14px;font-family:${EMAIL_THEME.serif};font-size:22px;color:${EMAIL_THEME.text};">
              Shepherd&rsquo;s Path
            </p>
            <h1 style="margin:0;font-family:${EMAIL_THEME.serif};font-size:26px;font-weight:400;color:${EMAIL_THEME.text};line-height:1.35;">
              You&rsquo;re on the path now.
            </h1>
          </td>
        </tr>

        <!-- MAIN CARD -->
        <tr>
          <td style="background-color:${EMAIL_THEME.cardBg};border:1px solid ${EMAIL_THEME.cardBorder};border-radius:20px;padding:36px 28px 32px;">

            <!-- PERSONAL LETTER FROM BRIAN -->
            <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:${EMAIL_THEME.textSoft};">
              Hey &mdash; I&rsquo;m glad you found this.
            </p>
            <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:${EMAIL_THEME.textSoft};">
              My name is Brian, and I built Shepherd&rsquo;s Path because I know what it&rsquo;s like to go looking for God in the middle of something hard &mdash; and not know where to start.
            </p>
            <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:${EMAIL_THEME.textSoft};">
              This isn&rsquo;t another Bible app. It&rsquo;s a companion.
            </p>
            <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:${EMAIL_THEME.textSoft};">
              You can bring it whatever&rsquo;s on your heart &mdash; fear, grief, a decision you can&rsquo;t make, a morning where you just feel off &mdash; and it will meet you there with Scripture, a prayer, and a word shaped for where you actually are right now.
            </p>
            <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:${EMAIL_THEME.textSoft};">
              Every day, a verse comes to you. You can read it, listen to it, or go deeper into its meaning. You can ask for guidance. Or you can just sit with it.
            </p>
            <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:${EMAIL_THEME.textSoft};">
              If you don&rsquo;t know where to start &mdash; open the app and tap <strong>&ldquo;Guidance.&rdquo;</strong> Say what&rsquo;s actually on your mind. That&rsquo;s enough.
            </p>
            <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:${EMAIL_THEME.textSoft};">
              You don&rsquo;t have to have it together. You don&rsquo;t have to know the right words.
            </p>
            <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:${EMAIL_THEME.textSoft};">
              The path is here.<br />
              Walking it is up to you.
            </p>
            <p style="margin:0 0 36px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:${EMAIL_THEME.textSoft};">
              &mdash; Brian
            </p>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr><td style="height:1px;background:linear-gradient(90deg,transparent,#d4cce0,transparent);"></td></tr>
            </table>

            ${videoUrl ? `
            <!-- VIDEO PLAY BUTTON -->
            <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:14px;line-height:1.7;color:#5c4e70;text-align:center;font-style:italic;">
              I also recorded a short video message for you.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
              <tr>
                <td align="center">
                  <a href="${videoUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;">
                    <table cellpadding="0" cellspacing="0"
                           style="background:linear-gradient(135deg,#2d1b5e,#5a3d8a);border-radius:16px;width:400px;max-width:100%;overflow:hidden;">
                      <tr>
                        <td style="padding:48px 32px;text-align:center;">
                          <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                            <tr>
                              <td align="center" valign="middle"
                                  style="width:72px;height:72px;background:rgba(255,255,255,0.95);border-radius:50%;">
                                <span style="display:inline-block;margin-left:6px;width:0;height:0;border-style:solid;border-width:12px 0 12px 22px;border-color:transparent transparent transparent #7a018d;"></span>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:17px;color:#ffffff;font-weight:400;">
                            Watch the message
                          </p>
                          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.6);letter-spacing:1px;">
                            TAP TO PLAY
                          </p>
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>
              </tr>
            </table>
            ` : `
            <!-- FEATURED MESSAGE CARD — stands in until video is recorded -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
              <tr>
                <td style="background:linear-gradient(160deg,#1e1030 0%,#2d1b5e 55%,#3d2870 100%);border-radius:16px;padding:36px 32px 32px;">

                  <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.45);text-align:center;">
                    A Message From Brian
                  </p>

                  <!-- Decorative rule -->
                  <table width="60" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                    <tr><td style="height:1px;background:rgba(255,255,255,0.25);"></td></tr>
                  </table>

                  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:16px;line-height:1.9;color:rgba(255,255,255,0.92);font-style:italic;">
                    Hey &mdash; I&rsquo;m really glad you found this.
                  </p>
                  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:16px;line-height:1.9;color:rgba(255,255,255,0.92);font-style:italic;">
                    My name is Brian&hellip; and I built Shepherd&rsquo;s Path because I know what it&rsquo;s like to go looking for God in the middle of something hard&hellip; and not know where to start.
                  </p>
                  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:16px;line-height:1.9;color:rgba(255,255,255,0.92);font-style:italic;">
                    This isn&rsquo;t another Bible app. It&rsquo;s something you can actually bring your life into.
                  </p>
                  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:16px;line-height:1.9;color:rgba(255,255,255,0.92);font-style:italic;">
                    Whatever&rsquo;s on your mind &mdash; fear, grief, something you&rsquo;re trying to figure out &mdash; you can just say it. And it will meet you there with Scripture, with a real prayer, and something that actually speaks to where you are.
                  </p>
                  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:16px;line-height:1.9;color:rgba(255,255,255,0.92);font-style:italic;">
                    If you don&rsquo;t know where to start&hellip; just open the app and tap &ldquo;Guidance.&rdquo;
                  </p>
                  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:16px;line-height:1.9;color:rgba(255,255,255,0.92);font-style:italic;">
                    Say what&rsquo;s on your mind. That&rsquo;s enough.
                  </p>
                  <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:16px;line-height:1.9;color:rgba(255,255,255,0.92);font-style:italic;">
                    You don&rsquo;t have to have it together.
                  </p>
                  <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:17px;line-height:1.7;color:#ffffff;font-weight:400;">
                    The path is here.<br />
                    Walking it is up to you.
                  </p>

                  <!-- Decorative rule -->
                  <table width="60" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                    <tr><td style="height:1px;background:rgba(255,255,255,0.25);"></td></tr>
                  </table>

                  <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.55);text-align:center;letter-spacing:1px;">
                    &mdash; Brian
                  </p>
                </td>
              </tr>
            </table>
            `}

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
              <tr>
                <td align="center">
                  <a href="${data.appUrl}"
                     style="display:inline-block;background-color:${EMAIL_THEME.accent};color:${EMAIL_THEME.accentInk};padding:14px 28px;text-decoration:none;border-radius:12px;font-family:${EMAIL_THEME.sans};font-size:15px;font-weight:700;">
                    Open Shepherd&rsquo;s Path &rarr;
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:24px 8px 0;text-align:center;">
            <p style="margin:0 0 12px;font-family:${EMAIL_THEME.serif};font-size:13px;color:${EMAIL_THEME.textMuted};font-style:italic;line-height:1.65;">
              &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo;<br />
              <span style="font-family:${EMAIL_THEME.sans};font-size:11px;font-style:normal;">PSALM 119:105</span>
            </p>
            <p style="margin:0;font-family:${EMAIL_THEME.sans};font-size:12px;color:${EMAIL_THEME.textMuted};line-height:1.6;">
              You subscribed to Shepherd&rsquo;s Path.
              <a href="${data.appUrl}/api/unsubscribe?email={{email}}" style="color:${EMAIL_THEME.accent};text-decoration:underline;">Unsubscribe</a>
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

export function buildWelcomeEmailText(data: WelcomeEmailData): string {
  return `Welcome to Shepherd's Path

Hey — I'm glad you found this.

My name is Brian, and I built Shepherd's Path because I know what it's like to go looking for God in the middle of something hard — and not know where to start.

This isn't another Bible app. It's a companion.

You can bring it whatever's on your heart — fear, grief, a decision you can't make, a morning where you just feel off — and it will meet you there with Scripture, a prayer, and a word shaped for where you actually are right now.

Every day, a verse comes to you. You can read it, listen to it, or go deeper into its meaning. You can ask for guidance. Or you can just sit with it.

If you don't know where to start — open the app and tap "Guidance." Say what's actually on your mind. That's enough.

You don't have to have it together. You don't have to know the right words.

The path is here.
Walking it is up to you.

— Brian

${data.videoUrl ? `Watch a short video message from Brian:\n${data.videoUrl}\n\n` : ''}Open Shepherd's Path: ${data.appUrl}

---
"Your word is a lamp to my feet and a light to my path." — Psalm 119:105`;
}

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
