import webpush from "web-push";
import { storage } from "./storage";
import { db } from "./db";
import { streaks } from "@shared/schema";
import { eq } from "drizzle-orm";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@shepherdspathAI.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

type NotifPayload = { title: string; body: string; tag?: string; url?: string };

async function sendToSubscription(sub: { endpoint: string; p256dh: string; auth: string }, payload: NotifPayload): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return false;
    }
    console.error("[push] send error:", err.message);
    return false;
  }
}

async function getTodayReference(): Promise<string> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const verse = await storage.getVerseByDate(today);
    return verse ? verse.reference : "Today's verse";
  } catch {
    return "Today's verse";
  }
}

async function sendMorningNotifications() {
  const ref = await getTodayReference();
  const subs = await storage.getAllPushSubscriptions();
  const hour = new Date().getUTCHours();

  for (const sub of subs) {
    if (!sub.morningEnabled) continue;
    const [h] = sub.morningTime.split(":").map(Number);
    if (h !== hour) continue;

    const ok = await sendToSubscription(sub, {
      title: "Good morning — Shepherd's Path 🌅",
      body: `${ref} is waiting. Start your 4-step devotional and walk the path.`,
      tag: "morning",
      url: "/devotional",
    });
    if (!ok) await storage.deletePushSubscription(sub.sessionId);
  }
}

async function sendMiddayNotifications() {
  const subs = await storage.getAllPushSubscriptions();
  const hour = new Date().getUTCHours();

  for (const sub of subs) {
    if (!sub.middayEnabled) continue;
    const ok = await sendToSubscription(sub, {
      title: "Midday check-in 🌿",
      body: "Halfway through the day. Have you walked the path yet?",
      tag: "midday",
      url: "/devotional",
    });
    if (!ok) await storage.deletePushSubscription(sub.sessionId);
  }
}

async function sendEveningNotifications() {
  const subs = await storage.getAllPushSubscriptions();
  const hour = new Date().getUTCHours();

  for (const sub of subs) {
    if (!sub.eveningEnabled) continue;
    const [h] = sub.eveningTime.split(":").map(Number);
    if (h !== hour) continue;

    const ok = await sendToSubscription(sub, {
      title: "Evening reflection ✨",
      body: "The day is winding down. Your devotional is still waiting — 4 steps, 5 minutes.",
      tag: "evening",
      url: "/devotional",
    });
    if (!ok) await storage.deletePushSubscription(sub.sessionId);
  }
}

async function sendStreakReminders() {
  const today = new Date().toISOString().split("T")[0];
  const subs = await storage.getAllPushSubscriptions();

  for (const sub of subs) {
    if (!sub.streakReminder) continue;
    try {
      const [streak] = await db.select().from(streaks).where(eq(streaks.sessionId, sub.sessionId));
      if (streak && streak.lastVisitDate === today) continue;

      const ok = await sendToSubscription(sub, {
        title: "Don't break your streak 🔥",
        body: streak && streak.currentStreak > 1
          ? `You're on a ${streak.currentStreak}-day streak — don't let it end today!`
          : "Your devotional for today is still open. Come walk the path.",
        tag: "streak-reminder",
        url: "/devotional",
      });
      if (!ok) await storage.deletePushSubscription(sub.sessionId);
    } catch {}
  }
}

async function sendWeeklySummary() {
  const subs = await storage.getAllPushSubscriptions();
  for (const sub of subs) {
    if (!sub.weeklySummary) continue;
    const ok = await sendToSubscription(sub, {
      title: "Your weekly walk summary 📖",
      body: "A new week of devotions begins tomorrow. See how far you've come.",
      tag: "weekly-summary",
      url: "/devotional",
    });
    if (!ok) await storage.deletePushSubscription(sub.sessionId);
  }
}

function msUntilNextMinute(targetHour: number, targetMinute: number = 0): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(targetHour, targetMinute, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

export async function sendPrayerReminderNotifications() {
  try {
    const due = await storage.getDuePrayerReminders();
    for (const reminder of due) {
      try {
        const subs = await storage.getAllPushSubscriptions();
        const sub = subs.find(s => s.sessionId === reminder.sessionId);
        if (sub) {
          const snippet = reminder.request.length > 80 ? reminder.request.slice(0, 77) + "…" : reminder.request;
          const name = reminder.displayName ?? "someone";
          const ok = await sendToSubscription(sub, {
            title: "A prayer you committed to 🙏",
            body: `You said you'd pray for ${name}. "${snippet}" — they may still need it.`,
            tag: `prayer-reminder-${reminder.requestId}`,
            url: "/prayer-wall",
          });
          if (!ok) await storage.deletePushSubscription(reminder.sessionId);
        }
        await storage.clearPrayerReminder(reminder.requestId, reminder.sessionId);
      } catch {}
    }
  } catch (err) {
    console.error("[push] prayer reminder error:", err);
  }
}

export function schedulePushNotifications() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log("[push] VAPID keys not configured, skipping push scheduler");
    return;
  }

  console.log("[push] Push notification scheduler starting...");

  const scheduleHourly = (hour: number, fn: () => Promise<void>, label: string) => {
    const run = () => {
      const delay = msUntilNextMinute(hour, 0);
      const nextRun = new Date(Date.now() + delay);
      console.log(`[push] Next ${label} scheduled for: ${nextRun.toISOString()}`);
      setTimeout(async () => {
        await fn();
        run();
      }, delay);
    };
    run();
  };

  // All times are Eastern Time (ET). UTC offsets: EST = UTC-5, EDT = UTC-4.
  // Using UTC-5 (EST) as baseline: 7 AM ET = UTC 12, 12 PM ET = UTC 17,
  // 8 PM ET = UTC 01, 9 PM ET = UTC 02, Sunday 7 PM ET = UTC Mon 00
  scheduleHourly(12, sendMorningNotifications, "morning push");   // 7 AM ET
  scheduleHourly(17, sendMiddayNotifications, "midday push");     // 12 PM ET
  scheduleHourly(1,  sendEveningNotifications, "evening push");   // 8 PM ET
  scheduleHourly(2,  sendStreakReminders, "streak reminder");     // 9 PM ET

  // Prayer wall reminders — check every hour for due reminders
  const schedulePrayerReminders = () => {
    setTimeout(async () => {
      await sendPrayerReminderNotifications();
      schedulePrayerReminders();
    }, 60 * 60 * 1000);
  };
  sendPrayerReminderNotifications().catch(() => {});
  schedulePrayerReminders();

  const scheduleSundaySummary = () => {
    const now = new Date();
    const next = new Date(now);
    // Sunday 7 PM ET (UTC-5) = Monday 00:00 UTC
    const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
    next.setUTCDate(now.getUTCDate() + daysUntilMonday);
    next.setUTCHours(0, 0, 0, 0);
    const delay = next.getTime() - now.getTime();
    console.log(`[push] Next weekly summary: ${next.toISOString()}`);
    setTimeout(async () => {
      await sendWeeklySummary();
      scheduleSundaySummary();
    }, delay);
  };
  scheduleSundaySummary();
}
