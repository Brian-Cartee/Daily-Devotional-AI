import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { getUncachableResendClient, buildDailyVerseEmailHtml, buildDailyVerseEmailText } from "./resend";
import { getTodayVerseFromSheet } from "./googleSheets";
import { db } from "./db";
import { verses } from "@shared/schema";
import { eq } from "drizzle-orm";

// How many ms until the next occurrence of targetHour:00 UTC
function msUntilNextHour(targetHour: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(targetHour, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

async function sendDailyEmailsToAllSubscribers() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`[email] Running daily email job for ${today}`);

  try {
    // Ensure verse is synced from the sheet
    let verse = await storage.getVerseByDate(today);
    if (!verse) {
      const sheetVerse = await getTodayVerseFromSheet();
      if (sheetVerse) {
        [verse] = await db
          .insert(verses)
          .values({
            reference: sheetVerse.reference,
            text: sheetVerse.verseText,
            encouragement: sheetVerse.encouragement,
            reflectionPrompt: sheetVerse.reflectionPrompt,
            date: today,
          })
          .onConflictDoNothing()
          .returning();
      }
    }

    if (!verse) {
      console.warn("[email] No verse found for today — skipping email send.");
      return;
    }

    const activeSubscribers = await storage.getAllActiveSubscribers();
    if (activeSubscribers.length === 0) {
      console.log("[email] No active subscribers, nothing to send.");
      return;
    }

    const appUrl = process.env.APP_URL || "https://your-app.replit.app";
    const { client, fromEmail } = await getUncachableResendClient();

    // Fetch today's daily art image URL (if generated)
    let todayArtImageUrl: string | null = null;
    try {
      const DAILY_ART_DIR = path.resolve(process.cwd(), "client/public/daily-art");
      const metaFile = path.join(DAILY_ART_DIR, `${today}.json`);
      if (fs.existsSync(metaFile)) {
        const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
        if (meta.imageUrl) {
          todayArtImageUrl = `${appUrl}${meta.imageUrl}`;
        }
      }
    } catch {
      // Non-fatal — art just won't be included
    }

    let sent = 0;
    let failed = 0;

    for (const subscriber of activeSubscribers) {
      try {
        const artImageUrl = subscriber.includeDailyArt ? todayArtImageUrl : null;
        const html = buildDailyVerseEmailHtml({ ...verse, appUrl, artImageUrl })
          .replace("{{email}}", encodeURIComponent(subscriber.email));
        const text = buildDailyVerseEmailText({ ...verse, appUrl });

        const displayFrom = fromEmail.includes('@') && !fromEmail.startsWith('"')
          ? `Shepherd's Path <${fromEmail}>`
          : fromEmail;
        await client.emails.send({
          from: displayFrom,
          to: subscriber.email,
          replyTo: 'hello@shepherdspathai.com',
          subject: `${verse.reference} — a word for your morning`,
          html,
          text,
        });
        sent++;
      } catch (err) {
        console.error(`[email] Failed to send to ${subscriber.email}:`, err);
        failed++;
      }
    }

    console.log(`[email] Done. Sent: ${sent}, Failed: ${failed}`);
  } catch (err) {
    console.error("[email] Daily email job error:", err);
  }
}

// Schedule daily emails at 12:00 UTC = 5:00 AM PDT / 6 AM MDT / 7 AM CDT / 8 AM EDT
// ⚠️ When DST ends in November (PST = UTC-8), change to 13 to maintain these local times
export async function scheduleDailyEmails() {
  const TARGET_HOUR_UTC = 12; // 12:00 UTC = 5 AM PDT / 6 AM MDT / 7 AM CDT / 8 AM EDT

  const scheduleNext = () => {
    const delay = msUntilNextHour(TARGET_HOUR_UTC);
    const nextRun = new Date(Date.now() + delay);
    console.log(`[email] Next daily email scheduled for: ${nextRun.toISOString()}`);

    setTimeout(async () => {
      await sendDailyEmailsToAllSubscribers();
      scheduleNext(); // Schedule the next day
    }, delay);
  };

  scheduleNext();
}
