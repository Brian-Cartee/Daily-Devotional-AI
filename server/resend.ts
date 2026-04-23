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
  followUp?: string | null;
  // When present, replaces the generic encouragement with season-specific AI text
  personalEncouragement?: string | null;
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
            <!-- SP cross+path logo — served from the app's own domain -->
            <img src="${data.appUrl}/sp-cross-logo.png"
                 alt="Shepherd's Path"
                 width="84" height="84"
                 style="display:block;margin:0 auto 14px;width:84px;height:84px;object-fit:contain;" />
            <p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.88);">
              Shepherd&rsquo;s Path
            </p>
          </td>
        </tr>

        <!-- VERSE CARD -->
        <tr>
          <td style="background-color:#ffffff;padding:40px 36px 36px;border-left:1px solid #e2ddd6;border-right:1px solid #e2ddd6;">

            <!-- Date — always visible at top of card -->
            <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:14px;color:#6b5880;letter-spacing:1.5px;text-transform:uppercase;text-align:center;">${formattedDate}</p>

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

            <!-- Encouragement — personalized for this subscriber's season, or curated for today -->
            <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:15px;line-height:1.75;color:#3d3048;">
              ${data.personalEncouragement || data.encouragement}
            </p>

            <!-- Quiet depth hint — whisper, not marketing -->
            <p style="margin:0 0 32px;text-align:center;font-family:Georgia,serif;font-size:13px;color:#6b5d7a;font-style:italic;line-height:1.7;">
              Wondering what this verse meant to its original readers?<br />
              History, cultural context, and meaning are a question away in the app.
            </p>

            ${data.followUp ? `
            <!-- Personal follow-up from yesterday's guidance session -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="padding:16px 20px;background:#f5f0fc;border-left:3px solid #7a018d;border-radius:0 8px 8px 0;">
                  <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9b8ea8;">Still with you from yesterday</p>
                  <p style="margin:0;font-family:Georgia,serif;font-size:14px;line-height:1.75;color:#3d3048;font-style:italic;">${data.followUp}</p>
                </td>
              </tr>
            </table>
            ` : ''}

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${data.appUrl}"
                     style="display:inline-block;background:linear-gradient(135deg,#7a018d,#442f74);color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.5px;box-shadow:0 4px 20px rgba(122,1,141,0.3);">
                    Continue with today&rsquo;s devotional &rarr;
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
            <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.72);line-height:1.6;">
              You&rsquo;re receiving this because you subscribed to daily scripture from Shepherd&rsquo;s Path.
            </p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.65);">
              <a href="${data.appUrl}/api/unsubscribe?email={{email}}" style="color:rgba(255,255,255,0.70);text-decoration:underline;">Unsubscribe</a>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <a href="${data.appUrl}" style="color:rgba(255,255,255,0.70);text-decoration:none;">Shepherd&rsquo;s Path</a>
            </p>
          </td>
        </tr>

        <!-- Bottom breathing room -->
        <tr>
          <td style="padding-top:24px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:14px;color:#6b5870;font-style:italic;line-height:1.7;">
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
<body style="margin:0;padding:0;background-color:#f0ede8;font-family:'Georgia',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0ede8;padding:24px 12px 40px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(160deg,#2d1b5e 0%,#442f74 60%,#5a3d8a 100%);border-radius:20px 20px 0 0;padding:40px 32px 32px;text-align:center;">
            <img src="${data.appUrl}/sp-cross-logo.png"
                 alt="Shepherd's Path" width="84" height="84"
                 style="display:block;margin:0 auto 16px;width:84px;height:84px;object-fit:contain;" />
            <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.6);">
              Shepherd&rsquo;s Path
            </p>
            <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#ffffff;line-height:1.3;">
              You&rsquo;re on the path now.
            </h1>
          </td>
        </tr>

        <!-- MAIN CARD -->
        <tr>
          <td style="background-color:#ffffff;padding:40px 36px 36px;border-left:1px solid #e2ddd6;border-right:1px solid #e2ddd6;">

            <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#7a018d;text-align:center;">
              Welcome
            </p>

            <p style="margin:0 0 28px;font-family:Georgia,serif;font-size:20px;line-height:1.6;color:#1e1530;text-align:center;">
              ${greeting}
            </p>

            <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:#3d3048;">
              Something brought you here. That&rsquo;s not nothing.
            </p>
            <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:#3d3048;">
              Shepherd&rsquo;s Path exists for exactly this — the moments when you need more than a verse on a wall. When life is hard, or heavy, or you just can&rsquo;t find the words. This is a place to come as you are and be met where you are.
            </p>
            <p style="margin:0 0 32px;font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:#3d3048;">
              Every day, scripture will come to you. When you need guidance, it&rsquo;s there. When you want to go deeper, it&rsquo;s waiting. You don&rsquo;t have to walk this alone.
            </p>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr><td style="height:1px;background:linear-gradient(90deg,transparent,#d4cce0,transparent);"></td></tr>
            </table>

            ${videoUrl ? `
            <!-- VIDEO MESSAGE SECTION -->
            <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7a018d;text-align:center;">
              A Message For You
            </p>
            <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#5c4e70;text-align:center;font-style:italic;">
              I recorded a short message just for you.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
              <tr>
                <td align="center">
                  <a href="${videoUrl}" target="_blank" rel="noopener noreferrer"
                     style="display:inline-block;position:relative;text-decoration:none;">
                    <!-- Video thumbnail frame -->
                    <table cellpadding="0" cellspacing="0"
                           style="background:linear-gradient(135deg,#2d1b5e,#5a3d8a);border-radius:16px;width:400px;max-width:100%;overflow:hidden;">
                      <tr>
                        <td style="padding:48px 32px;text-align:center;">
                          <!-- Play button circle -->
                          <div style="width:72px;height:72px;background:rgba(255,255,255,0.95);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
                            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                              <tr>
                                <td align="center" valign="middle"
                                    style="width:72px;height:72px;background:rgba(255,255,255,0.95);border-radius:50%;">
                                  <span style="display:inline-block;margin-left:6px;width:0;height:0;border-style:solid;border-width:12px 0 12px 22px;border-color:transparent transparent transparent #7a018d;"></span>
                                </td>
                              </tr>
                            </table>
                          </div>
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
            ` : ''}

            <!-- THREE THINGS -->
            <p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7a018d;text-align:center;">
              Three things you now have
            </p>

            <!-- Item 1 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr>
                <td style="padding:16px 20px;background:#f5f0fc;border-left:3px solid #7a018d;border-radius:0 10px 10px 0;">
                  <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#7a018d;letter-spacing:1px;text-transform:uppercase;">Daily Scripture</p>
                  <p style="margin:0;font-family:Georgia,serif;font-size:14px;line-height:1.7;color:#3d3048;">Each morning, today&rsquo;s verse arrives in your inbox. Open it. Sit with it. Let it meet you where you are.</p>
                </td>
              </tr>
            </table>

            <!-- Item 2 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr>
                <td style="padding:16px 20px;background:#f5f0fc;border-left:3px solid #442f74;border-radius:0 10px 10px 0;">
                  <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#442f74;letter-spacing:1px;text-transform:uppercase;">Guidance When You Need It</p>
                  <p style="margin:0;font-family:Georgia,serif;font-size:14px;line-height:1.7;color:#3d3048;">Whatever is on your heart — grief, fear, a decision you can&rsquo;t make — bring it. You&rsquo;ll receive scripture, a prayer, and a word shaped just for your moment.</p>
                </td>
              </tr>
            </table>

            <!-- Item 3 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
              <tr>
                <td style="padding:16px 20px;background:#f5f0fc;border-left:3px solid #5a3d8a;border-radius:0 10px 10px 0;">
                  <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#5a3d8a;letter-spacing:1px;text-transform:uppercase;">Listen to Everything</p>
                  <p style="margin:0;font-family:Georgia,serif;font-size:14px;line-height:1.7;color:#3d3048;">Every word in the app can be heard aloud. Set the phone down and let it come to you. You don&rsquo;t have to navigate. You can just receive.</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
              <tr>
                <td align="center">
                  <a href="${data.appUrl}"
                     style="display:inline-block;background:linear-gradient(135deg,#7a018d,#442f74);color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:50px;letter-spacing:0.5px;box-shadow:0 4px 20px rgba(122,1,141,0.3);">
                    Begin today &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:20px 0 0;text-align:center;font-family:Georgia,serif;font-size:13px;color:#6b5d7a;font-style:italic;line-height:1.7;">
              I&rsquo;m glad you&rsquo;re here.
            </p>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:linear-gradient(160deg,#2d1b5e 0%,#442f74 100%);border-radius:0 0 20px 20px;padding:28px 32px;text-align:center;">
            <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:14px;color:rgba(255,255,255,0.75);font-style:italic;line-height:1.7;">
              &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo;<br />
              <span style="font-family:Arial,sans-serif;font-size:12px;font-style:normal;color:rgba(255,255,255,0.5);">&mdash; Psalm 119:105</span>
            </p>
            <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.5);line-height:1.6;">
              You&rsquo;re receiving this because you subscribed to Shepherd&rsquo;s Path.
              &nbsp;<a href="${data.appUrl}/api/unsubscribe?email={{email}}" style="color:rgba(255,255,255,0.55);text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding-top:24px;text-align:center;">
            <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#9e9490;">
              &copy; ${new Date().getFullYear()} Shepherd&rsquo;s Path. You don&rsquo;t have to walk this alone.
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
  const firstName = data.name?.split(" ")[0] ?? null;
  const greeting = firstName ? `${firstName},` : "Friend,";
  return `Welcome to Shepherd's Path

${greeting}

Something brought you here. That's not nothing.

Shepherd's Path exists for exactly this — the moments when you need more than a verse on a wall. When life is hard, or heavy, or you just can't find the words. This is a place to come as you are and be met where you are.

Every day, scripture will come to you. When you need guidance, it's there. When you want to go deeper, it's waiting. You don't have to walk this alone.

${data.videoUrl ? `Watch a short message recorded just for you:\n${data.videoUrl}\n\n` : ''}Three things you now have:

1. Daily Scripture — Each morning, today's verse arrives in your inbox. Open it. Sit with it.

2. Guidance When You Need It — Whatever is on your heart, bring it. You'll receive scripture, a prayer, and a word shaped just for your moment.

3. Listen to Everything — Every word in the app can be heard aloud. Set the phone down and let it come to you.

Begin today: ${data.appUrl}

I'm glad you're here.

— Shepherd's Path
"Your word is a lamp to my feet and a light to my path." — Psalm 119:105`;
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
