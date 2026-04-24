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

function getStreakBadgeName(streak: number): string | null {
  if (streak >= 365) return "Dwelling";
  if (streak >= 90)  return "Goodness & Mercy";
  if (streak >= 60)  return "Anointed";
  if (streak >= 30)  return "No Fear";
  if (streak >= 21)  return "Righteous Paths";
  if (streak >= 14)  return "Restored";
  if (streak >= 7)   return "Still Waters";
  if (streak >= 3)   return "Green Pastures";
  return null;
}

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
      title: "Good morning 🌅",
      body: `${ref} is waiting. You don't have to carry today alone.`,
      tag: "morning",
      url: "/devotional",
    });
    if (!ok) await storage.deletePushSubscription(sub.sessionId);
  }
}

const MIDDAY_MESSAGES: { title: string; body: string }[] = [
  { title: "Before you move on 🌿", body: "Take a breath. Where are you, really? A quiet moment changes the rest of the day." },
  { title: "A midday moment 🌿", body: "Pausing is not falling behind. Five minutes with God is enough." },
  { title: "Midday breath 🌿", body: "Before the afternoon takes over — bring what you're carrying to God." },
  { title: "A quiet place in the middle 🌿", body: "The day is only half over. There's still time to walk with God through the rest of it." },
  { title: "Take a quiet moment 🌿", body: "You don't have to push through alone. The path is open — come as you are." },
  { title: "The door is still open 🌿", body: "Whatever the morning held — you can bring it here. Just for a few minutes." },
  { title: "Halfway through 🌿", body: "The second half of the day is ahead. Carry something good into it." },
];

async function sendMiddayNotifications() {
  const subs = await storage.getAllPushSubscriptions();
  const dayOfWeek = new Date().getDay(); // 0 = Sunday
  const { title, body } = MIDDAY_MESSAGES[dayOfWeek % MIDDAY_MESSAGES.length];

  for (const sub of subs) {
    if (!sub.middayEnabled) continue;
    const ok = await sendToSubscription(sub, {
      title,
      body,
      tag: "midday",
      url: "/devotional",
    });
    if (!ok) await storage.deletePushSubscription(sub.sessionId);
  }
}

const EVENING_MESSAGES: { title: string; body: string; url: string }[] = [
  { title: "How did you walk today? ✨", body: "A few quiet minutes before the day closes. Reflect on where you walked — and where you struggled.", url: "/alignment" },
  { title: "Before the day closes ✨", body: "The day is winding down. How did you walk? Bring it to God honestly before you rest.", url: "/alignment" },
  { title: "Evening reflection ✨", body: "Not perfection. Just honest reflection. Where did you feel closest to God today?", url: "/alignment" },
  { title: "Before you rest ✨", body: "Lay down whatever the day held. Five quiet minutes of reflection before you sleep.", url: "/alignment" },
  { title: "A faithful close ✨", body: "Tomorrow is another step. You don't have to get it all right — just keep walking.", url: "/devotional" },
  { title: "The day behind you ✨", body: "Whatever today held — God saw it all. Take a quiet moment to close the day with Him.", url: "/alignment" },
  { title: "Rest begins here ✨", body: "A quiet place to end the day. Reflect on where faith showed up — and where you needed grace.", url: "/alignment" },
];

async function sendEveningNotifications() {
  const subs = await storage.getAllPushSubscriptions();
  const hour = new Date().getUTCHours();
  const dayOfWeek = new Date().getDay();
  const { title, body, url } = EVENING_MESSAGES[dayOfWeek % EVENING_MESSAGES.length];

  for (const sub of subs) {
    if (!sub.eveningEnabled) continue;
    const [h] = sub.eveningTime.split(":").map(Number);
    if (h !== hour) continue;

    const ok = await sendToSubscription(sub, {
      title,
      body,
      tag: "evening",
      url,
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

      const badgeName = streak ? getStreakBadgeName(streak.currentStreak) : null;
      const ok = await sendToSubscription(sub, {
        title: streak && streak.currentStreak > 1 ? `Day ${streak.currentStreak} 🌿` : "Take a quiet moment 🌿",
        body: streak && streak.currentStreak > 1
          ? badgeName
            ? `${badgeName} · The path is still open today. Come back when you can.`
            : `You've been walking ${streak.currentStreak} days. Today's a good day to keep going.`
          : "No pressure — just an open door. Come as you are.",
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

  // All times are Eastern Daylight Time (EDT = UTC-4). Active March–November.
  // ⚠️ When DST ends in November (EST = UTC-5), add 1 to each UTC hour below.
  scheduleHourly(11, sendMorningNotifications, "morning push");   // 7 AM EDT
  scheduleHourly(16, sendMiddayNotifications, "midday push");     // 12 PM EDT
  scheduleHourly(0,  sendEveningNotifications, "evening push");   // 8 PM EDT
  scheduleHourly(1,  sendStreakReminders, "streak reminder");     // 9 PM EDT

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
    // Sunday 7 PM EDT (UTC-4) = Sunday 23:00 UTC
    // ⚠️ When DST ends in November (EST = UTC-5), change to Monday 00:00 UTC
    const daysUntilSunday = (7 - now.getUTCDay()) % 7;
    next.setUTCDate(now.getUTCDate() + daysUntilSunday);
    next.setUTCHours(23, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
    const delay = next.getTime() - now.getTime();
    console.log(`[push] Next weekly summary: ${next.toISOString()}`);
    setTimeout(async () => {
      await sendWeeklySummary();
      scheduleSundaySummary();
    }, delay);
  };
  scheduleSundaySummary();
}
