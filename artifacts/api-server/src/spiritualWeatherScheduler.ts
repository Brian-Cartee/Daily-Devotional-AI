import { getUncachableResendClient, buildWeeklyWeatherEmailHtml, buildWeeklyWeatherEmailText } from "./resend";
import { storage } from "./storage";
import { buildWeeklyWeather, weeklyWeatherEmailSubject } from "./homeExperience";
import { getIsoWeekId, hasProWeeklyEmailSent, markProWeeklyEmailSent } from "./schedulerState";

export async function sendProWeeklySpiritualWeatherEmails() {
  const weekId = getIsoWeekId();
  const appUrl = process.env.APP_URL || "https://www.shepherdspathai.com";
  console.log(`[pro-weekly] Running spiritual weather email job for ${weekId}`);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const pros = await storage.getAllActiveProSubscribers();
    if (pros.length === 0) {
      console.log("[pro-weekly] No active Pro subscribers.");
      return;
    }

    const { client, fromEmail } = await getUncachableResendClient();
    const displayFrom = fromEmail.includes("@") && !fromEmail.startsWith('"')
      ? `Shepherd's Path <${fromEmail}>`
      : fromEmail;

    for (const pro of pros) {
      const email = pro.email.toLowerCase();
      if (hasProWeeklyEmailSent(email, weekId)) {
        skipped++;
        continue;
      }

      const subscriber = await storage.getSubscriberByEmail(email);
      if (!subscriber?.sessionId) {
        console.log(`[pro-weekly] No linked session for ${email} — skipping personalized send.`);
        skipped++;
        continue;
      }

      try {
        const weather = await buildWeeklyWeather(subscriber.sessionId, {
          isPro: true,
          withSeasonLetter: true,
          subscriberName: subscriber.name,
        });

        if (!weather.shouldShow) {
          skipped++;
          continue;
        }

        const subject = weeklyWeatherEmailSubject(weather.theme ?? null);
        const guidanceUrl = weather.guidancePrefill
          ? `${appUrl}/guidance?situation=${encodeURIComponent(weather.guidancePrefill)}`
          : `${appUrl}/guidance`;

        const html = buildWeeklyWeatherEmailHtml({
          appUrl,
          weekLabel: weather.weekLabel,
          observations: weather.observations,
          seasonLetter: weather.seasonLetter,
          invitation: weather.invitation,
          guidanceUrl,
          email,
        });
        const text = buildWeeklyWeatherEmailText({
          appUrl,
          weekLabel: weather.weekLabel,
          observations: weather.observations,
          seasonLetter: weather.seasonLetter,
          invitation: weather.invitation,
          guidanceUrl,
        });

        await client.emails.send({
          from: displayFrom,
          to: email,
          subject,
          html,
          text,
        });

        markProWeeklyEmailSent(email, weekId);
        sent++;
        console.log(`[pro-weekly] Sent to ${email}`);
      } catch (err) {
        failed++;
        console.error(`[pro-weekly] Failed for ${email}:`, err);
      }
    }

    console.log(`[pro-weekly] Done — sent=${sent} skipped=${skipped} failed=${failed}`);
  } catch (err) {
    console.error("[pro-weekly] Job error:", err);
  }
}

/** Sunday 7 PM EDT = 23:00 UTC (same slot as weekly push summary). */
export function scheduleProWeeklySpiritualWeatherEmails() {
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    const daysUntilSunday = (7 - now.getUTCDay()) % 7;
    next.setUTCDate(now.getUTCDate() + daysUntilSunday);
    next.setUTCHours(23, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
    const delay = next.getTime() - now.getTime();
    console.log(`[pro-weekly] Next spiritual weather email: ${next.toISOString()}`);
    setTimeout(async () => {
      await sendProWeeklySpiritualWeatherEmails();
      scheduleNext();
    }, delay);
  };
  scheduleNext();
}
