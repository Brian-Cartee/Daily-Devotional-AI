// Resend email integration via Replit Connectors
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  // Try env var first — reliable across restarts and scheduler runs
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
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
    .then((res) => res.json())
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
}

export function buildDailyVerseEmailHtml(data: DailyVerseEmailData): string {
  const formattedDate = new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.reference} — Shepherd's Path</title>
</head>
<body style="margin:0;padding:0;background-color:#f0ede8;font-family:'Georgia',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0ede8;padding:24px 12px 40px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- HEADER — brand purple with cross icon -->
        <tr>
          <td style="background-color:#2d1b5e;background-image:linear-gradient(160deg,#2d1b5e 0%,#442f74 60%,#5a3d8a 100%);border-radius:20px 20px 0 0;padding:36px 32px 28px;text-align:center;">
            <!-- SP cross+path logo — always served from production domain so it never breaks -->
            <img src="https://shepherdspath.app/sp-cross-logo.png"
                 alt="Shepherd's Path"
                 width="84" height="84"
                 style="display:block;margin:0 auto 14px;width:84px;height:84px;object-fit:contain;" />
            <p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.55);">
              Shepherd&rsquo;s Path
            </p>
          </td>
        </tr>

        <!-- VERSE CARD -->
        <tr>
          <td style="background-color:#ffffff;padding:40px 36px 36px;border-left:1px solid #e2ddd6;border-right:1px solid #e2ddd6;">

            <!-- Date — always visible at top of card -->
            <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:12px;color:#9b8ea8;letter-spacing:1.5px;text-transform:uppercase;text-align:center;">${formattedDate}</p>

            <!-- Scripture text with inline curly quotes -->
            <p style="margin:0 0 24px;font-size:21px;line-height:1.65;color:#1e1530;font-style:italic;font-family:Georgia,serif;">
              &ldquo;${data.text}&rdquo;
            </p>

            <!-- Reference -->
            <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#7a018d;letter-spacing:1px;text-transform:uppercase;">
              &mdash;&nbsp;${data.reference}
            </p>

            <!-- Accent line -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="height:2px;background:linear-gradient(90deg,#7a018d,#442f74,transparent);border-radius:2px;"></td>
              </tr>
            </table>

            <!-- Encouragement -->
            <p style="margin:0 0 36px;font-family:Arial,sans-serif;font-size:15px;line-height:1.75;color:#3d3048;">
              ${data.encouragement}
            </p>

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${data.appUrl}"
                     style="display:inline-block;background:linear-gradient(135deg,#7a018d,#442f74);color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.5px;box-shadow:0 4px 20px rgba(122,1,141,0.3);">
                    Open Shepherd&rsquo;s Path &rarr;
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        ${data.artImageUrl ? `
        <!-- Daily art image -->
        <tr>
          <td style="border-left:1px solid #e2ddd6;border-right:1px solid #e2ddd6;padding:0 0 0;">
            <a href="${data.appUrl}" style="display:block;text-decoration:none;">
              <img src="${data.artImageUrl}"
                   alt="Today's Daily Beauty"
                   width="560"
                   style="width:100%;max-width:560px;display:block;border:0;" />
            </a>
          </td>
        </tr>
        <tr>
          <td style="background-color:#1e1530;border-left:1px solid #e2ddd6;border-right:1px solid #e2ddd6;padding:12px 24px;text-align:center;">
            <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:1.5px;text-transform:uppercase;">
              A Moment of Beauty &mdash; tap to open
            </p>
          </td>
        </tr>
        ` : ''}

        <!-- FOOTER -->
        <tr>
          <td style="background-color:#2d1b5e;border-radius:0 0 20px 20px;padding:24px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.4);line-height:1.6;">
              You&rsquo;re receiving this because you subscribed to daily scripture from Shepherd&rsquo;s Path.
            </p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.3);">
              <a href="${data.appUrl}/api/unsubscribe?email={{email}}" style="color:rgba(255,255,255,0.35);text-decoration:underline;">Unsubscribe</a>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <a href="${data.appUrl}" style="color:rgba(255,255,255,0.35);text-decoration:none;">shepherdspath.app</a>
            </p>
          </td>
        </tr>

        <!-- Bottom breathing room -->
        <tr>
          <td style="padding-top:24px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:12px;color:#b5a898;font-style:italic;">
              &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo; &mdash; Psalm 119:105
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

export function buildDailyVerseEmailText(data: DailyVerseEmailData): string {
  const formattedDate = new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  return `Shepherd's Path — ${formattedDate}

"${data.text}"
— ${data.reference}

${data.encouragement}

Open Shepherd's Path: ${data.appUrl}

---
To unsubscribe: ${data.appUrl}/api/unsubscribe`;
}
