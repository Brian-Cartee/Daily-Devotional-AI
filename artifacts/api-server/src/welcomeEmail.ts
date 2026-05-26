import { EMAIL_THEME, emailPreheader } from "./emailTheme";

export interface WelcomeEmailData {
  name?: string | null;
  email?: string | null;
  appUrl: string;
  videoUrl?: string | null;
}

function welcomeUnsubscribeUrl(data: WelcomeEmailData): string {
  if (data.email) {
    return `${data.appUrl}/api/unsubscribe?email=${encodeURIComponent(data.email)}`;
  }
  return `${data.appUrl}`;
}

export function buildWelcomeEmailHtml(data: WelcomeEmailData): string {
  const T = EMAIL_THEME;
  const firstName = data.name?.trim().split(/\s+/)[0] ?? null;
  const headline = firstName ? `You&rsquo;re on the path, ${firstName}.` : `You&rsquo;re on the path.`;
  const videoUrl = data.videoUrl || null;
  const unsub = welcomeUnsubscribeUrl(data);
  const preheader =
    "You're subscribed to daily Scripture. Your first verse arrives tomorrow morning — read, listen, or go deeper in the app.";

  const expectRow = (title: string, body: string) => `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:16px;">
      <tr>
        <td width="4" style="background-color:${T.accent};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
        <td style="padding-left:14px;">
          <p style="margin:0 0 4px;font-family:${T.sans};font-size:13px;font-weight:700;color:${T.text};">${title}</p>
          <p style="margin:0;font-family:${T.sans};font-size:14px;line-height:1.65;color:${T.textSoft};">${body}</p>
        </td>
      </tr>
    </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>Welcome — Shepherd&rsquo;s Path daily Scripture</title>
</head>
<body style="margin:0;padding:0;background-color:${T.outerBg};font-family:${T.serif};">
${emailPreheader(preheader)}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${T.outerBg};padding:28px 16px 48px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">

        <tr>
          <td align="center" style="padding:0 0 20px;">
            <p style="margin:0 0 6px;font-family:${T.serif};font-size:22px;font-weight:400;color:${T.text};letter-spacing:0.02em;">
              Shepherd&rsquo;s Path
            </p>
            <p style="margin:0;font-family:${T.sans};font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:${T.textMuted};">
              Daily Scripture
            </p>
          </td>
        </tr>

        <tr>
          <td style="background-color:${T.cardBg};border:1px solid ${T.cardBorder};border-radius:20px;padding:32px 24px 28px;">

            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 20px;">
              <tr>
                <td style="background:rgba(212,165,116,0.12);border:1px solid rgba(212,165,116,0.35);border-radius:999px;padding:8px 16px;">
                  <p style="margin:0;font-family:${T.sans};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${T.accent};text-align:center;">
                    &#10003;&nbsp; You&rsquo;re subscribed
                  </p>
                </td>
              </tr>
            </table>

            <h1 style="margin:0 0 16px;font-family:${T.serif};font-size:26px;font-weight:400;color:${T.text};line-height:1.35;text-align:center;">
              ${headline}
            </h1>

            <p style="margin:0 0 28px;font-family:${T.sans};font-size:16px;line-height:1.75;color:${T.textSoft};text-align:center;">
              Thanks for signing up. Each morning you&rsquo;ll receive <strong style="color:${T.text};font-weight:600;">today&rsquo;s verse</strong>, a short reflection, and a quiet link to go deeper &mdash; right here in your inbox.
            </p>

            <p style="margin:0 0 14px;font-family:${T.sans};font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${T.textMuted};">
              What to expect
            </p>

            ${expectRow(
              "Tomorrow morning",
              "Your first daily email arrives soon (we send on Eastern Time). Open it with coffee, on a break, or whenever you need a breath.",
            )}
            ${expectRow(
              "Read or listen",
              "Take the verse as-is, or tap through to hear it read aloud and read the full devotional.",
            )}
            ${expectRow(
              "More when you want it",
              "The app is always there &mdash; talk through what&rsquo;s heavy, sit in Scripture, or save a moment. No pressure.",
            )}

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0 24px;">
              <tr><td style="height:1px;background:${T.rule};font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
              <tr>
                <td style="padding:20px 18px;background:rgba(212,165,116,0.06);border:1px solid rgba(212,165,116,0.2);border-radius:14px;">
                  <p style="margin:0 0 10px;font-family:${T.sans};font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${T.accent};">
                    A note from Brian
                  </p>
                  <p style="margin:0 0 14px;font-family:${T.sans};font-size:15px;line-height:1.75;color:${T.textSoft};">
                    I built Shepherd&rsquo;s Path for the moments when you&rsquo;re looking for God in the middle of something hard &mdash; and you don&rsquo;t know where to start.
                  </p>
                  <p style="margin:0 0 14px;font-family:${T.sans};font-size:15px;line-height:1.75;color:${T.textSoft};">
                    You don&rsquo;t need the right words. Tomorrow, just open what lands in your inbox. That&rsquo;s enough to begin.
                  </p>
                  <p style="margin:0;font-family:${T.sans};font-size:14px;line-height:1.6;color:${T.textMuted};">
                    &mdash; Brian
                  </p>
                </td>
              </tr>
            </table>

            ${videoUrl ? `
            <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${videoUrl}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;border-radius:14px;overflow:hidden;border:1px solid ${T.cardBorder};">
                    <table cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(135deg,#1e1030,#3d2870);">
                      <tr>
                        <td style="padding:28px 20px;text-align:center;">
                          <p style="margin:0 0 8px;font-family:${T.serif};font-size:17px;color:${T.text};">A short welcome from Brian</p>
                          <p style="margin:0;font-family:${T.sans};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${T.accent};">Watch &rarr;</p>
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>
              </tr>
            </table>
            ` : ""}

            <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-bottom:14px;">
              <tr>
                <td align="center">
                  <a href="${data.appUrl}/devotional"
                     style="display:inline-block;background-color:${T.accent};color:${T.accentInk};font-family:${T.sans};font-size:15px;font-weight:700;text-decoration:none;padding:15px 32px;border-radius:12px;letter-spacing:0.02em;">
                    Read today&rsquo;s devotional &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-family:${T.sans};font-size:13px;line-height:1.6;color:${T.textMuted};text-align:center;">
              <a href="${data.appUrl}" style="color:${T.accent};text-decoration:none;font-weight:600;">Open the app</a>
              <span style="color:${T.textMuted};"> &middot; </span>
              Can&rsquo;t wait? Today&rsquo;s word is already there.
            </p>

          </td>
        </tr>

        <tr>
          <td style="padding:28px 8px 0;text-align:center;">
            <p style="margin:0 0 12px;font-family:${T.sans};font-size:12px;line-height:1.6;color:${T.textMuted};">
              You subscribed to daily Scripture from Shepherd&rsquo;s Path.<br />
              Not a substitute for church, counseling, or emergency care.
            </p>
            <p style="margin:0 0 20px;font-family:${T.sans};font-size:12px;color:${T.textMuted};">
              <a href="${unsub}" style="color:${T.accent};text-decoration:underline;">Unsubscribe</a>
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

export function buildWelcomeEmailText(data: WelcomeEmailData): string {
  const firstName = data.name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `You're on the path, ${firstName}.` : "You're on the path.";
  const unsub = welcomeUnsubscribeUrl(data);

  return `Shepherd's Path — Daily Scripture

${greeting}

Thanks for signing up. Each morning you'll receive today's verse, a short reflection, and a link to go deeper — right in your inbox.

WHAT TO EXPECT

• Tomorrow morning — Your first daily email arrives soon (Eastern Time).
• Read or listen — Take the verse as-is, or open the full devotional in the app.
• More when you want it — Talk it through, sit in Scripture, or save a moment. No pressure.

A NOTE FROM BRIAN

I built Shepherd's Path for the moments when you're looking for God in the middle of something hard — and you don't know where to start.

You don't need the right words. Tomorrow, just open what lands in your inbox. That's enough to begin.

— Brian

${data.videoUrl ? `Watch a short welcome from Brian:\n${data.videoUrl}\n\n` : ""}Read today's devotional: ${data.appUrl}/devotional
Open the app: ${data.appUrl}

---
Unsubscribe: ${unsub}
"Your word is a lamp to my feet and a light to my path." — Psalm 119:105`;
}
