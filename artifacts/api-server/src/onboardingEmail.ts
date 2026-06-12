import { EMAIL_THEME, emailPreheader } from "./emailTheme";

export interface OnboardingEmailData {
  name?: string | null;
  email: string;
  appUrl: string;
}

export type OnboardingEmailStep = "day2" | "day4" | "day7_winback" | "day7_journeys";

function firstName(name?: string | null): string | null {
  const n = name?.trim().split(/\s+/)[0];
  return n || null;
}

function unsubUrl(data: OnboardingEmailData): string {
  return `${data.appUrl}/api/unsubscribe?email=${encodeURIComponent(data.email)}`;
}

function ctaRow(href: string, label: string) {
  const T = EMAIL_THEME;
  return `
    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin:24px 0 14px;">
      <tr>
        <td align="center">
          <a href="${href}"
             style="display:inline-block;background-color:${T.accent};color:${T.accentInk};font-family:${T.sans};font-size:15px;font-weight:700;text-decoration:none;padding:15px 32px;border-radius:12px;letter-spacing:0.02em;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

function buildOnboardingShell(
  data: OnboardingEmailData,
  opts: { preheader: string; headline: string; bodyHtml: string; ctaHref: string; ctaLabel: string },
): string {
  const T = EMAIL_THEME;
  const unsub = unsubUrl(data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark light" />
  <title>Shepherd&rsquo;s Path</title>
</head>
<body style="margin:0;padding:0;background-color:${T.outerBg};font-family:${T.serif};">
${emailPreheader(opts.preheader)}
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
            <h1 style="margin:0 0 16px;font-family:${T.serif};font-size:26px;font-weight:400;color:${T.text};line-height:1.35;text-align:center;">
              ${opts.headline}
            </h1>
            ${opts.bodyHtml}
            ${ctaRow(opts.ctaHref, opts.ctaLabel)}
            <p style="margin:0;font-family:${T.sans};font-size:13px;line-height:1.6;color:${T.textMuted};text-align:center;">
              <a href="${data.appUrl}" style="color:${T.accent};text-decoration:none;font-weight:600;">Open the app</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 8px 0;text-align:center;">
            <p style="margin:0 0 12px;font-family:${T.sans};font-size:12px;line-height:1.6;color:${T.textMuted};">
              You subscribed to daily Scripture from Shepherd&rsquo;s Path.
            </p>
            <p style="margin:0 0 20px;font-family:${T.sans};font-size:12px;color:${T.textMuted};">
              <a href="${unsub}" style="color:${T.accent};text-decoration:underline;">Unsubscribe</a>
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

function bodyParagraph(html: string) {
  const T = EMAIL_THEME;
  return `<p style="margin:0 0 16px;font-family:${T.sans};font-size:16px;line-height:1.75;color:${T.textSoft};text-align:center;">${html}</p>`;
}

export function buildOnboardingDay2Html(data: OnboardingEmailData): string {
  const fn = firstName(data.name);
  const headline = fn ? `${fn}, you don&rsquo;t have to carry it alone.` : `You don&rsquo;t have to carry it alone.`;
  return buildOnboardingShell(data, {
    preheader: "Share what's on your heart and receive Scripture-grounded guidance — whenever you need it.",
    headline,
    bodyHtml: `
      ${bodyParagraph(
        "Your daily email brings you Scripture each morning. When something is heavier than a verse can hold alone, there&rsquo;s <strong style=\"color:#f4efe6;font-weight:600;\">Talk It Through</strong> &mdash; a quiet space to share what&rsquo;s on your heart and receive gentle, Bible-rooted guidance.",
      )}
      ${bodyParagraph("No perfect words required. Just honesty.")}`,
    ctaHref: `${data.appUrl}/guidance`,
    ctaLabel: "Talk it through &rarr;",
  });
}

export function buildOnboardingDay2Text(data: OnboardingEmailData): string {
  const fn = firstName(data.name);
  const headline = fn ? `${fn}, you don't have to carry it alone.` : `You don't have to carry it alone.`;
  return `Shepherd's Path

${headline}

Your daily email brings you Scripture each morning. When something is heavier than a verse can hold alone, try Talk It Through — share what's on your heart and receive gentle, Bible-rooted guidance.

Talk it through: ${data.appUrl}/guidance
Open the app: ${data.appUrl}

Unsubscribe: ${unsubUrl(data)}`;
}

export function buildOnboardingDay4Html(data: OnboardingEmailData): string {
  const fn = firstName(data.name);
  const headline = fn
    ? `${fn}, Scripture for the season you&rsquo;re in.`
    : `Scripture for the season you&rsquo;re in.`;
  return buildOnboardingShell(data, {
    preheader: "Find Biblical encouragement for anxiety, grief, doubt, loneliness, and more.",
    headline,
    bodyHtml: `
      ${bodyParagraph(
        "Some mornings the daily verse is exactly enough. Other days you need something that speaks directly to what you&rsquo;re walking through.",
      )}
      ${bodyParagraph(
        "Under <strong style=\"color:#f4efe6;font-weight:600;\">Guidance</strong>, choose what you&rsquo;re facing &mdash; anxiety, grief, doubt, loneliness, and more &mdash; and receive Scripture chosen for that season.",
      )}`,
    ctaHref: `${data.appUrl}/guidance`,
    ctaLabel: "Find guidance for today &rarr;",
  });
}

export function buildOnboardingDay4Text(data: OnboardingEmailData): string {
  const fn = firstName(data.name);
  const headline = fn
    ? `${fn}, Scripture for the season you're in.`
    : `Scripture for the season you're in.`;
  return `Shepherd's Path

${headline}

Some mornings the daily verse is exactly enough. Other days you need something that speaks directly to what you're walking through.

Under Guidance, choose what you're facing — anxiety, grief, doubt, loneliness, and more — and receive Scripture for that season.

Find guidance: ${data.appUrl}/guidance
Open the app: ${data.appUrl}

Unsubscribe: ${unsubUrl(data)}`;
}

export function buildOnboardingDay7WinbackHtml(data: OnboardingEmailData): string {
  const fn = firstName(data.name);
  const headline = fn ? `We&rsquo;re still here, ${fn}.` : `We&rsquo;re still here.`;
  return buildOnboardingShell(data, {
    preheader: "Today's devotional is waiting whenever you're ready — no pressure.",
    headline,
    bodyHtml: `
      ${bodyParagraph(
        "Life gets loud. If Shepherd&rsquo;s Path has been quiet in the background, that&rsquo;s okay &mdash; grace covers gaps.",
      )}
      ${bodyParagraph(
        "Whenever you&rsquo;re ready, today&rsquo;s verse and reflection are waiting. One minute is enough to begin again.",
      )}`,
    ctaHref: `${data.appUrl}/devotional`,
    ctaLabel: "Read today&rsquo;s devotional &rarr;",
  });
}

export function buildOnboardingDay7WinbackText(data: OnboardingEmailData): string {
  const fn = firstName(data.name);
  const headline = fn ? `We're still here, ${fn}.` : `We're still here.`;
  return `Shepherd's Path

${headline}

Life gets loud. If Shepherd's Path has been quiet in the background, that's okay — grace covers gaps.

Whenever you're ready, today's verse and reflection are waiting. One minute is enough to begin again.

Read today: ${data.appUrl}/devotional
Open the app: ${data.appUrl}

Unsubscribe: ${unsubUrl(data)}`;
}

export function buildOnboardingDay7JourneysHtml(data: OnboardingEmailData): string {
  const fn = firstName(data.name);
  const headline = fn ? `${fn}, walk through it one day at a time.` : `Walk through it one day at a time.`;
  return buildOnboardingShell(data, {
    preheader: "Guided journeys for grief, anxiety, healing, and growth — at your pace.",
    headline,
    bodyHtml: `
      ${bodyParagraph(
        "You&rsquo;ve been showing up &mdash; that matters. When you&rsquo;re ready to go deeper than a single verse, <strong style=\"color:#f4efe6;font-weight:600;\">Journeys</strong> walk you through hard seasons step by step.",
      )}
      ${bodyParagraph("Grief, anxiety, healing, growth &mdash; one day at a time, with Scripture leading the way.")}
      ${bodyParagraph("Want to go even deeper? <strong style=\"color:#f4efe6;font-weight:600;\">Pro</strong> removes limits on guided conversation &mdash; so when you need to sit with something longer, you can. Less than a cup of coffee a month.")}`,
    ctaHref: `${data.appUrl}/understand`,
    ctaLabel: "Explore journeys &rarr;",
  });
}

export function buildOnboardingDay7JourneysText(data: OnboardingEmailData): string {
  const fn = firstName(data.name);
  const headline = fn ? `${fn}, walk through it one day at a time.` : `Walk through it one day at a time.`;
  return `Shepherd's Path

${headline}

You've been showing up — that matters. When you're ready to go deeper than a single verse, Journeys walk you through hard seasons step by step.

Explore journeys: ${data.appUrl}/understand
Open the app: ${data.appUrl}

Unsubscribe: ${unsubUrl(data)}`;
}

export function getOnboardingEmailContent(
  step: OnboardingEmailStep,
  data: OnboardingEmailData,
): { subject: string; html: string; text: string } {
  switch (step) {
    case "day2":
      return {
        subject: "You don't have to carry it alone",
        html: buildOnboardingDay2Html(data),
        text: buildOnboardingDay2Text(data),
      };
    case "day4":
      return {
        subject: "Scripture for the season you're in",
        html: buildOnboardingDay4Html(data),
        text: buildOnboardingDay4Text(data),
      };
    case "day7_winback":
      return {
        subject: "We're still here when you're ready",
        html: buildOnboardingDay7WinbackHtml(data),
        text: buildOnboardingDay7WinbackText(data),
      };
    case "day7_journeys":
      return {
        subject: "One week in — here's what's waiting for you",
        html: buildOnboardingDay7JourneysHtml(data),
        text: buildOnboardingDay7JourneysText(data),
      };
  }
}
