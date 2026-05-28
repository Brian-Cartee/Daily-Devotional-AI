import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { storage } from "./storage";
import { getUncachableResendClient, buildDailyVerseEmailHtml, buildDailyVerseEmailText } from "./resend";
import { getTodayVerseFromSheet } from "./googleSheets";
import { db } from "./db";
import { verses } from "@workspace/db";
import { hasEmailSentToday, markEmailSentToday } from "./schedulerState";
import { getCulturalMomentEmailSubject } from "./culturalMoments";

const TARGET_HOUR_UTC = 12; // 12:00 UTC = 5 AM PDT / 6 AM MDT / 7 AM CDT / 8 AM EDT
// ⚠️ When DST ends in November (PST = UTC-8), change to 13 to maintain these local times

const CATCHUP_WINDOW_HOURS = 8; // Fire immediately if within 8 hours past scheduled time

function getEasternDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

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

interface SeasonalContent {
  encouragement: string; // replaces the generic verse.encouragement
  subject: string;       // replaces the generic subject line
}

// Build a season-aware email for subscribers with a linked session.
// Looks 21 days back across guidance memories, prayers, and reflections to
// understand what this person is actually walking through, then writes the
// encouragement body and subject line specifically for their season.
async function getSeasonalContent(
  sessionId: string,
  verseRef: string,
  verseText: string,
  name?: string | null
): Promise<SeasonalContent | null> {
  try {
    const entries = await storage.getJournalEntries(sessionId);
    const cutoff = Date.now() - 21 * 24 * 60 * 60 * 1000; // 21 days

    const memories = entries
      .filter(e => e.type === "guidance_memory" && new Date(e.createdAt).getTime() > cutoff)
      .slice(0, 4);

    const humanEntries = entries
      .filter(e =>
        e.type !== "guidance_memory" &&
        new Date(e.createdAt).getTime() > cutoff
      )
      .slice(0, 4);

    const allContext = [...memories, ...humanEntries];
    if (allContext.length === 0) return null;

    const contextBlock = allContext.map(e => {
      const label = e.type === "guidance_memory" ? "Guidance conversation"
        : e.type === "prayer" ? "Prayer"
        : e.type === "reflection" ? "Reflection"
        : "Note";
      return `[${label}]: ${e.content.replace(/\n+/g, " ").slice(0, 250)}`;
    }).join("\n");

    const nameClause = name ? ` Their name is ${name}.` : "";
    const openai = new OpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 220,
      temperature: 0.82,
      messages: [
        {
          role: "system",
          content: `You are a pastoral writer crafting a personal morning email for one specific person.${nameClause}

Today's verse: "${verseText}" — ${verseRef}

Below is what this person has been carrying over the past few weeks — their prayers, reflections, and conversations. Your job is to write:

1. ENCOURAGEMENT (3–4 sentences): Replace the generic devotional text entirely. Write as if you personally know what this person is walking through. Let today's verse arrive for their specific season — not universally, but for them. Warm, honest, not preachy. Do not repeat the verse reference robotically. No clichés. Sound like a trusted friend who has been paying attention.

2. SUBJECT: A personal email subject line (under 60 characters) that speaks to their season. Do not use the verse reference. Make it feel like the sender knows them.

Return JSON only in this exact format:
{"encouragement":"...","subject":"..."}`,
        },
        {
          role: "user",
          content: `What they have been carrying:\n\n${contextBlock}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.encouragement || !parsed.subject) return null;
    return {
      encouragement: parsed.encouragement,
      subject: parsed.subject,
    };
  } catch (err) {
    console.error("[email] Failed to generate seasonal content:", err);
    return null;
  }
}

export async function sendDailyEmailsToAllSubscribers() {
  const today = getEasternDateKey();
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

    const appUrl = process.env.APP_URL || "https://www.shepherdspathai.com";
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
        // Atomic DB claim — only proceeds if not already sent today.
        // This prevents duplicates even when the scheduler restarts within the catch-up window.
        const claimed = await storage.claimSubscriberEmailSlot(subscriber.id, today);
        if (!claimed) {
          console.log(`[email] Already sent to ${subscriber.email} today (atomic guard) — skipping.`);
          continue;
        }

        const artImageUrl = subscriber.includeDailyArt ? todayArtImageUrl : null;

        // For subscribers with a linked session, generate season-aware content:
        // a personalized encouragement body and a subject line tuned to their walk.
        // Falls back gracefully to the standard email for anyone without session context.
        let personalEncouragement: string | null = null;
        let personalSubject: string | null = null;

        if (subscriber.sessionId) {
          const seasonal = await getSeasonalContent(
            subscriber.sessionId,
            verse.reference,
            verse.text,
            subscriber.name
          );
          if (seasonal) {
            personalEncouragement = seasonal.encouragement;
            personalSubject = seasonal.subject;
            console.log(`[email] Seasonal content generated for ${subscriber.email}`);
          }
        }

        const html = buildDailyVerseEmailHtml({
          ...verse,
          appUrl,
          artImageUrl,
          personalEncouragement,
        }).replace("{{email}}", encodeURIComponent(subscriber.email));
        const text = buildDailyVerseEmailText({ ...verse, appUrl });

        const displayFrom = fromEmail.includes('@') && !fromEmail.startsWith('"')
          ? `Shepherd's Path <${fromEmail}>`
          : fromEmail;

        // Subject priority: cultural moment > personal season > generic
        const emailSubject =
          getCulturalMomentEmailSubject(today, verse.reference)
          ?? personalSubject
          ?? `${verse.reference} — a word for your morning`;

        await client.emails.send({
          from: displayFrom,
          to: subscriber.email,
          replyTo: 'hello@shepherdspathai.com',
          subject: emailSubject,
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
