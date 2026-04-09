import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { storage } from "./storage";
import { getUncachableResendClient, buildDailyVerseEmailHtml, buildDailyVerseEmailText } from "./resend";
import { getTodayVerseFromSheet } from "./googleSheets";
import { db } from "./db";
import { verses } from "@shared/schema";
import { hasEmailSentToday, markEmailSentToday } from "./schedulerState";

const TARGET_HOUR_UTC = 12; // 12:00 UTC = 5 AM PDT / 6 AM MDT / 7 AM CDT / 8 AM EDT
// ⚠️ When DST ends in November (PST = UTC-8), change to 13 to maintain these local times

const CATCHUP_WINDOW_HOURS = 8; // Fire immediately if within 8 hours past scheduled time

// How many ms until the next occurrence of targetHour:00 UTC
function msUntilNextHour(targetHour: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(targetHour, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

// Returns true if we're past today's scheduled time but within the catch-up window
function withinCatchupWindow(): boolean {
  const now = new Date();
  const scheduledToday = new Date(now);
  scheduledToday.setUTCHours(TARGET_HOUR_UTC, 0, 0, 0);
  const hoursPast = (now.getTime() - scheduledToday.getTime()) / (1000 * 60 * 60);
  return hoursPast >= 0 && hoursPast < CATCHUP_WINDOW_HOURS;
}

// Generate a personal follow-up paragraph if subscriber had a recent guidance session
async function getPersonalFollowUp(
  sessionId: string,
  verseRef: string,
  verseText: string,
  name?: string | null
): Promise<string | null> {
  try {
    const entries = await storage.getJournalEntries(sessionId);
    const cutoff = Date.now() - 36 * 60 * 60 * 1000; // 36 hours ago
    const recentMemories = entries.filter(
      e => e.type === "guidance_memory" && new Date(e.createdAt).getTime() > cutoff
    );
    if (recentMemories.length === 0) return null;

    const memorySnippet = recentMemories[0].content.slice(0, 300);
    const nameClause = name ? ` The person's name is ${name}.` : "";

    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: `You are a pastoral friend writing 2 warm sentences for someone's morning email.${nameClause} Yesterday they brought something to prayer or reflection. Today's verse is: "${verseText}" — ${verseRef}. Write 2 sentences that quietly connect today's verse to what they were carrying yesterday — not preachy, not summarizing, just the gentle sense that today's word arrived for a reason. Do not start with "I". No clichés. Sound like a friend who remembered.`,
        },
        {
          role: "user",
          content: `What they were carrying yesterday: ${memorySnippet}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    return text && text.length > 20 ? text : null;
  } catch (err) {
    console.error("[email] Failed to generate personal follow-up:", err);
    return null;
  }
}

export async function sendDailyEmailsToAllSubscribers() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`[email] Running daily email job for ${today}`);

  // Mark as sent immediately so a concurrent restart can't trigger a duplicate send
  markEmailSentToday();

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

    const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
    const appUrl = process.env.APP_URL
      || (replitDomain ? `https://${replitDomain}` : "https://shepherdspath.app");
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
      // Per-subscriber DB-level guard: skip if already sent today regardless of scheduler restarts
      if (subscriber.lastEmailSentDate === today) {
        console.log(`[email] Already sent to ${subscriber.email} today — skipping.`);
        continue;
      }

      try {
        const artImageUrl = subscriber.includeDailyArt ? todayArtImageUrl : null;

        // Generate personal follow-up if this subscriber has a linked session with recent activity
        let followUp: string | null = null;
        if (subscriber.sessionId) {
          followUp = await getPersonalFollowUp(
            subscriber.sessionId,
            verse.reference,
            verse.text,
            subscriber.name
          );
          if (followUp) {
            console.log(`[email] Personal follow-up generated for ${subscriber.email}`);
          }
        }

        const html = buildDailyVerseEmailHtml({ ...verse, appUrl, artImageUrl, followUp })
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

        // Record the send date in the DB so a restart cannot trigger a duplicate
        await storage.updateSubscriberLastEmailDate(subscriber.id, today);
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

// Schedule daily emails at TARGET_HOUR_UTC
// On startup: if past scheduled time, not yet sent today, and within catch-up window → fire immediately
export async function scheduleDailyEmails() {
  const scheduleNext = () => {
    const delay = msUntilNextHour(TARGET_HOUR_UTC);
    const nextRun = new Date(Date.now() + delay);
    console.log(`[email] Next daily email scheduled for: ${nextRun.toISOString()}`);

    setTimeout(async () => {
      if (!hasEmailSentToday()) {
        await sendDailyEmailsToAllSubscribers();
      } else {
        console.log("[email] Already sent today, skipping duplicate run.");
      }
      scheduleNext();
    }, delay);
  };

  // Catch-up: if we restarted past the send time but within the window and haven't sent yet
  if (withinCatchupWindow() && !hasEmailSentToday()) {
    console.log("[email] Server restarted within catch-up window — sending now.");
    await sendDailyEmailsToAllSubscribers();
  }

  scheduleNext();
}
