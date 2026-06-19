import webpush from "web-push";
import { Expo } from "expo-server-sdk";
import { storage } from "./storage";
import { buildWeeklyWeather } from "./homeExperience";
import { db } from "./db";
import { streaks } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  DEFAULT_PUSH_TIMEZONE,
  getLocalTimeInZone,
  matchesLocalTime,
  parseHourFromTime,
  resolveTimezone,
} from "./pushTime";

const expo = new Expo();

const vapidEnabled = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

// ── Guidance follow-up: morning notification after a Talk It Through session ──
type PendingGuidanceFollowUp = {
  sessionId: string;
  token: string;
  scheduledAt: Date; // UTC time to fire (~8am in user's timezone)
  message: string;
};

const pendingGuidanceFollowUps: PendingGuidanceFollowUp[] = [];

const GUIDANCE_FOLLOWUP_MESSAGES = [
  "Yesterday you brought something heavy. A verse is waiting when you're ready.",
  "What you carried into Talk It Through yesterday — God hasn't forgotten it.",
  "You were honest yesterday. Come back for a moment whenever you're ready.",
  "Yesterday's conversation left something open. The door is still here.",
  "You didn't come yesterday just to leave it unfinished. A word is waiting.",
];

function getMorning8amUTC(timezone: string): Date {
  const now = new Date();
  const tz = resolveTimezone(timezone);
  const local = getLocalTimeInZone(now, tz);
  // Hours until next 8am in user's local time (if past 8am, aim for tomorrow)
  const hoursUntil8am = local.hour < 8
    ? (8 - local.hour) - local.minute / 60
    : (32 - local.hour) - local.minute / 60;
  return new Date(now.getTime() + hoursUntil8am * 3600 * 1000);
}

export function scheduleGuidanceFollowUp(
  sessionId: string,
  token: string,
  timezone: string,
  situationSnippet: string,
) {
  if (!Expo.isExpoPushToken(token)) return;
  // Remove any existing pending follow-up for this session (deduplicate)
  const idx = pendingGuidanceFollowUps.findIndex(p => p.sessionId === sessionId);
  if (idx !== -1) pendingGuidanceFollowUps.splice(idx, 1);

  const hash = situationSnippet.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const message = GUIDANCE_FOLLOWUP_MESSAGES[hash % GUIDANCE_FOLLOWUP_MESSAGES.length];

  pendingGuidanceFollowUps.push({
    sessionId,
    token,
    scheduledAt: getMorning8amUTC(timezone),
    message,
  });
  console.log(`[guidance-followup] Scheduled for ${sessionId} at ${getMorning8amUTC(timezone).toISOString()}`);
}

async function sendScheduledGuidanceFollowUps(now: Date) {
  const due = pendingGuidanceFollowUps.filter(p => p.scheduledAt <= now);
  if (due.length === 0) return;

  const messages = due
    .filter(p => Expo.isExpoPushToken(p.token))
    .map(p => ({
      to: p.token,
      sound: "default" as const,
      title: "A word is waiting 🕊️",
      body: p.message,
      data: { screen: "guidance" },
    }));

  // Remove fired ones from the queue
  for (const p of due) {
    const idx = pendingGuidanceFollowUps.indexOf(p);
    if (idx !== -1) pendingGuidanceFollowUps.splice(idx, 1);
  }

  if (messages.length === 0) return;

  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`[guidance-followup] Sent ${messages.length} morning follow-up(s)`);
  } catch (err) {
    console.error("[guidance-followup] send error:", err);
  }
}

if (vapidEnabled) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@shepherdspathAI.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
} else {
  console.log("[push] Push notifications disabled: missing VAPID keys");
}

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
  if (!vapidEnabled) return false;
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

async function getTodayReference(timezone: string): Promise<string> {
  try {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
    const verse = await storage.getVerseByDate(today);
    return verse ? verse.reference : "Today's verse";
  } catch {
    return "Today's verse";
  }
}

async function sendMorningNotifications(now: Date) {
  const subs = await storage.getAllPushSubscriptions();

  for (const sub of subs) {
    if (!sub.morningEnabled) continue;
    const tz = resolveTimezone(sub.timezone);
    const hour = parseHourFromTime(sub.morningTime);
    if (!matchesLocalTime(now, tz, hour, 0)) continue;

    const ref = await getTodayReference(tz);
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

async function sendMiddayNotifications(now: Date) {
  const subs = await storage.getAllPushSubscriptions();

  for (const sub of subs) {
    if (!sub.middayEnabled) continue;
    const tz = resolveTimezone(sub.timezone);
    if (!matchesLocalTime(now, tz, 12, 0)) continue;

    const local = getLocalTimeInZone(now, tz);
    const { title, body } = MIDDAY_MESSAGES[local.dayOfWeek % MIDDAY_MESSAGES.length];
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

async function sendEveningNotifications(now: Date) {
  const subs = await storage.getAllPushSubscriptions();

  for (const sub of subs) {
    if (!sub.eveningEnabled) continue;
    const tz = resolveTimezone(sub.timezone);
    const hour = parseHourFromTime(sub.eveningTime);
    if (!matchesLocalTime(now, tz, hour, 0)) continue;

    const local = getLocalTimeInZone(now, tz);
    const { title, body, url } = EVENING_MESSAGES[local.dayOfWeek % EVENING_MESSAGES.length];
    const ok = await sendToSubscription(sub, {
      title,
      body,
      tag: "evening",
      url,
    });
    if (!ok) await storage.deletePushSubscription(sub.sessionId);
  }
}

async function sendStreakReminders(now: Date) {
  const subs = await storage.getAllPushSubscriptions();

  for (const sub of subs) {
    if (!sub.streakReminder) continue;
    const tz = resolveTimezone(sub.timezone);
    if (!matchesLocalTime(now, tz, 21, 0)) continue;

    const today = getLocalTimeInZone(now, tz).dateKey;
    try {
      const [streak] = await db.select().from(streaks).where(eq(streaks.sessionId, sub.sessionId));
      if (streak && streak.lastVisitDate === today) continue;

      const badgeName = streak ? getStreakBadgeName(streak.currentStreak) : null;
      const currentStreak = streak?.currentStreak ?? 0;

      // Determine the right message based on where this user is in their walk
      let nudgeTitle: string;
      let nudgeBody: string;

      if (currentStreak === 0) {
        // Never visited or lost streak — gentle re-invitation
        nudgeTitle = "The door is still open 🕊️";
        nudgeBody = "No streak to maintain. Just an open invitation. Come as you are.";
      } else if (currentStreak === 1) {
        // Day 2 nudge — they started yesterday, haven't come back today
        nudgeTitle = "You started something yesterday ✨";
        nudgeBody = "Today's verse is ready. One more day and you're on your way.";
      } else if (currentStreak <= 6) {
        // Early habit — encourage the streak forming
        nudgeTitle = `Day ${currentStreak} is waiting 🌿`;
        nudgeBody = badgeName
          ? `${badgeName} · Keep the streak alive — today's word is just a tap away.`
          : `You've walked ${currentStreak} days. Don't let today be the one you miss.`;
      } else {
        // Established walker — honor the streak
        nudgeTitle = badgeName ? `${badgeName} 🌿` : `Day ${currentStreak} 🌿`;
        nudgeBody = badgeName
          ? `${currentStreak} days walking with God. Today's devotional is open.`
          : `You've been walking ${currentStreak} days. Today's a good day to keep going.`;
      }

      const ok = await sendToSubscription(sub, {
        title: nudgeTitle,
        body: nudgeBody,
        tag: "streak-reminder",
        url: "/devotional",
      });
      if (!ok) await storage.deletePushSubscription(sub.sessionId);
    } catch {}
  }
}

async function sendWeeklySummary(now: Date) {
  const subs = await storage.getAllPushSubscriptions();

  for (const sub of subs) {
    if (!sub.weeklySummary) continue;
    const tz = resolveTimezone(sub.timezone);
    const local = getLocalTimeInZone(now, tz);
    if (local.dayOfWeek !== 0 || local.hour !== 19 || local.minute !== 0) continue;

    let title = "Your weekly walk summary";
    let body = "A new week begins tomorrow. See how far you've come.";
    let url = "/";

    try {
      const weather = await buildWeeklyWeather(sub.sessionId);
      if (weather.shouldShow && weather.observations[0]) {
        title = "Your spiritual weather this week";
        body =
          weather.observations[0].length > 110
            ? `${weather.observations[0].slice(0, 107)}…`
            : weather.observations[0];
        url = weather.guidancePrefill
          ? `/guidance?situation=${encodeURIComponent(weather.guidancePrefill)}`
          : "/guidance";
      }
    } catch {
      /* generic fallback */
    }

    const ok = await sendToSubscription(sub, {
      title,
      body,
      tag: "weekly-summary",
      url,
    });
    if (!ok) await storage.deletePushSubscription(sub.sessionId);
  }
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

async function sendExpoDailyVerseNotifications() {
  try {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const tokens = await storage.getExpoPushTokensForHourMinute(hour, minute);
    if (tokens.length === 0) return;

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_PUSH_TIMEZONE }).format(now);
    const verse = await storage.getVerseByDate(today);
    const title = "Your Daily Scripture";
    const body = verse
      ? `${verse.reference} — "${verse.text.length > 120 ? verse.text.slice(0, 117) + "…" : verse.text}"`
      : "Open Shepherd's Path for today's verse.";

    const messages = tokens
      .filter(t => Expo.isExpoPushToken(t.token))
      .map(t => ({
        to: t.token,
        sound: "default" as const,
        title,
        body,
        data: { screen: "devotional" },
      }));

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        console.error("[expo-push] chunk send error:", err);
      }
    }
    console.log(`[expo-push] Sent daily verse to ${messages.length} device(s) at UTC ${hour}:${String(minute).padStart(2, "0")}`);
  } catch (err) {
    console.error("[expo-push] sendExpoDailyVerseNotifications error:", err);
  }
}

async function tickScheduledNotifications() {
  const now = new Date();
  await sendMorningNotifications(now);
  await sendMiddayNotifications(now);
  await sendEveningNotifications(now);
  await sendStreakReminders(now);
  await sendWeeklySummary(now);
  await sendScheduledGuidanceFollowUps(now);
}

export function schedulePushNotifications() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log("[push] VAPID keys not configured, skipping push scheduler");
    return;
  }

  console.log("[push] Push notification scheduler starting (per-minute, timezone-aware)...");

  const scheduleNextMinute = () => {
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 100;
    setTimeout(async () => {
      try {
        await tickScheduledNotifications();
      } catch (err) {
        console.error("[push] tick error:", err);
      }
      scheduleNextMinute();
    }, msUntilNextMinute);
  };

  tickScheduledNotifications().catch(() => {});
  scheduleNextMinute();

  const schedulePrayerReminders = () => {
    setTimeout(async () => {
      await sendPrayerReminderNotifications();
      schedulePrayerReminders();
    }, 60 * 60 * 1000);
  };
  sendPrayerReminderNotifications().catch(() => {});
  schedulePrayerReminders();
}

export function scheduleExpoPushNotifications() {
  console.log("[expo-push] Expo push notification scheduler starting (per-minute check)...");

  const scheduleNextMinute = () => {
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 100;
    setTimeout(async () => {
      await sendExpoDailyVerseNotifications();
      scheduleNextMinute();
    }, msUntilNextMinute);
  };

  sendExpoDailyVerseNotifications().catch(() => {});
  scheduleNextMinute();
}
