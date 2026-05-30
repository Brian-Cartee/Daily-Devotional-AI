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

/** How far back we read journal / guidance notes for email personalization */
const EMAIL_CONTEXT_LOOKBACK_DAYS = 14;
/** Heavy themes (grief, loss, etc.) only anchor the email if seen this recently */
const EMAIL_ACTIVE_HEAVY_DAYS = 5;

const HEAVY_SEASON_RE =
  /\b(grief|grieving|mourning|bereavement|loss|passed away|funeral|widow|widower|died|death of)\b/i;

function entryDaysAgo(createdAt: Date | string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000));
}

function mentionsHeavySeason(text: string): boolean {
  return HEAVY_SEASON_RE.test(text);
}

// Build a season-aware email for subscribers with a linked session.
// Uses recent prayers, reflections, and guidance memories — with strict recency
// rules so a one-time grief conversation does not define every morning email.
async function getSeasonalContent(
  sessionId: string,
  verseRef: string,
  verseText: string,
  name?: string | null
): Promise<SeasonalContent | null> {
  try {
    const entries = await storage.getJournalEntries(sessionId);
    const cutoff = Date.now() - EMAIL_CONTEXT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

    const recent = entries
      .filter((e) => new Date(e.createdAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const memories = recent.filter((e) => e.type === "guidance_memory").slice(0, 3);
    const humanEntries = recent.filter((e) => e.type !== "guidance_memory").slice(0, 4);
    const allContext = [...memories, ...humanEntries];
    if (allContext.length === 0) return null;

    const newestDaysAgo = entryDaysAgo(allContext[0]!.createdAt);
    const hasRecentHeavy = allContext.some(
      (e) => entryDaysAgo(e.createdAt) <= EMAIL_ACTIVE_HEAVY_DAYS && mentionsHeavySeason(e.content),
    );
    const hasStaleHeavyOnly =
      allContext.some((e) => mentionsHeavySeason(e.content)) && !hasRecentHeavy;

    // Old grief / loss notes with nothing current → use the standard verse email instead
    if (hasStaleHeavyOnly) {
      console.log(
        `[email] Skipping heavy seasonal personalization for session ${sessionId.slice(0, 8)}… — grief/loss only in stale context`,
      );
      return null;
    }

    const contextBlock = allContext
      .map((e) => {
        const daysAgo = entryDaysAgo(e.createdAt);
        const recency =
          daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`;
        const label =
          e.type === "guidance_memory"
            ? "Guidance conversation"
            : e.type === "prayer"
              ? "Prayer"
              : e.type === "reflection"
                ? "Reflection"
                : "Note";
        const heavy =
          mentionsHeavySeason(e.content) && daysAgo > EMAIL_ACTIVE_HEAVY_DAYS
            ? " (background only — not necessarily current)"
            : "";
        return `[${label}, ${recency}]${heavy}: ${e.content.replace(/\n+/g, " ").slice(0, 250)}`;
      })
      .join("\n");

    const recencyNote =
      newestDaysAgo > EMAIL_ACTIVE_HEAVY_DAYS
        ? `Newest note is ${newestDaysAgo} days old — write for their present life, not an old crisis unless the notes are clearly still current.`
        : "Recent activity is fresh — you may reflect their current season gently.";

    const nameClause = name ? ` Their name is ${name}.` : "";
    const openai = new OpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 220,
      temperature: 0.72,
      messages: [
        {
          role: "system",
          content: `You are a pastoral writer crafting a personal morning email for one specific person.${nameClause}

Today's verse: "${verseText}" — ${verseRef}

You will see notes from their app (prayers, reflections, guidance). Each line is dated. Your job:

1. ENCOURAGEMENT (3–4 sentences): Warm, honest, not preachy. Let today's verse meet them where they are NOW. Sound like a caring friend who has been paying attention — not a therapist diagnosing an old wound.

CRITICAL — recency and accuracy:
- Do NOT say "this season of grief," "during this time of grief," "in your grief," or similar unless grief/loss is clearly CURRENT (marked today/yesterday/within a few days, present-tense, still walking it).
- A single old mention of grief, or a guidance note from weeks ago, is BACKGROUND — not their defining season today.
- If recent notes are about gratitude, growth, anxiety, work, family, or general faith — write to THAT, not to grief they mentioned once.
- If context is mixed or unclear, default to hope-filled encouragement tied to the verse without assuming crisis.
- Never invent suffering they did not describe. Never repeat the verse reference robotically. No clichés.

2. SUBJECT: Under 60 characters, personal, no verse reference. Match their CURRENT tone, not a past heavy theme.

Return JSON only:
{"encouragement":"...","subject":"..."}`,
        },
        {
          role: "user",
          content: `${recencyNote}\n\nWhat they have shared recently (newest first):\n\n${contextBlock}`,
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
