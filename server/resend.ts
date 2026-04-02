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
    fromEmail: (connectionSettings.settings.from_email as string) || 'onboarding@resend.dev',
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
  <title>Daily Verse — ${data.reference}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f7f4;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f7f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="text-align:center;padding-bottom:28px;">
              <span style="display:inline-block;background-color:#e8e3d8;color:#7c6d5a;font-family:sans-serif;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:20px;">
                Shepherd's Path
              </span>
              <p style="margin:12px 0 0;font-family:sans-serif;font-size:13px;color:#9e9085;letter-spacing:1px;text-transform:uppercase;">
                ${formattedDate}
              </p>
            </td>
          </tr>

          <!-- Verse card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;padding:40px 36px;border:1px solid #ede9e0;">
              <p style="font-size:11px;font-family:sans-serif;color:#b5a898;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;">"</p>
              <p style="font-size:22px;line-height:1.6;color:#3d3530;margin:0 0 24px;font-style:italic;">
                ${data.text}
              </p>
              <p style="font-family:sans-serif;font-size:14px;font-weight:600;color:#8b6f47;margin:0 0 32px;letter-spacing:0.5px;">
                — ${data.reference}
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #ede9e0;margin:0 0 28px;" />

              <!-- Encouragement -->
              <p style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#5c5248;margin:0 0 32px;">
                ${data.encouragement}
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${data.appUrl}"
                       style="display:inline-block;background-color:#8b6f47;color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:40px;letter-spacing:0.5px;">
                      Reflect with AI &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${data.artImageUrl ? `
          <!-- Daily Art image -->
          <tr>
            <td style="padding-top:20px;">
              <a href="${data.appUrl}" style="display:block;text-decoration:none;">
                <img src="${data.artImageUrl}"
                     alt="Today's Daily Beauty — ${data.reference}"
                     width="560"
                     style="width:100%;max-width:560px;border-radius:16px;display:block;border:0;" />
              </a>
              <p style="font-family:sans-serif;font-size:11px;color:#b5a898;text-align:center;margin:8px 0 0;letter-spacing:1px;text-transform:uppercase;">
                Today&rsquo;s Daily Beauty &mdash; tap to open the app
              </p>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="text-align:center;padding-top:24px;">
              <p style="font-family:sans-serif;font-size:12px;color:#b5a898;margin:0;">
                You're receiving this because you subscribed to Shepherd's Path.
              </p>
              <p style="font-family:sans-serif;font-size:12px;color:#b5a898;margin:6px 0 0;">
                <a href="${data.appUrl}/unsubscribe?email={{email}}" style="color:#b5a898;">Unsubscribe</a>
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

Open the app to reflect with AI: ${data.appUrl}

---
To unsubscribe, visit: ${data.appUrl}/unsubscribe`;
}
