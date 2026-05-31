import { storage } from "./storage";
import { getUncachableResendClient } from "./resend";
import {
  getOnboardingEmailContent,
  type OnboardingEmailStep,
} from "./onboardingEmail";
import type { Subscriber } from "@workspace/db";
import {
  hasOnboardingSentToday,
  markOnboardingSentToday,
} from "./schedulerState";

/** 17:00 UTC ≈ 1 PM Eastern — afternoon, separate from morning daily verse */
const ONBOARDING_HOUR_UTC = 17;
const CATCHUP_WINDOW_HOURS = 8;

function getEasternDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}

function daysSinceSubscribe(subscribedAt: Date): number {
  const start = getEasternDateKey(subscribedAt);
  const today = getEasternDateKey();
  const startMs = new Date(`${start}T12:00:00`).getTime();
  const todayMs = new Date(`${today}T12:00:00`).getTime();
  return Math.floor((todayMs - startMs) / (24 * 60 * 60 * 1000));
}

function msUntilNextHour(targetHour: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(targetHour, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

function withinCatchupWindow(): boolean {
  const now = new Date();
  const scheduledToday = new Date(now);
  scheduledToday.setUTCHours(ONBOARDING_HOUR_UTC, 0, 0, 0);
  const hoursPast = (now.getTime() - scheduledToday.getTime()) / (1000 * 60 * 60);
  return hoursPast >= 0 && hoursPast < CATCHUP_WINDOW_HOURS;
}

function getOnboardingSent(subscriber: Subscriber): string[] {
  const sent = subscriber.onboardingEmailsSent;
  return Array.isArray(sent) ? sent : [];
}

function hasSentStep(subscriber: Subscriber, step: OnboardingEmailStep): boolean {
  return getOnboardingSent(subscriber).includes(step);
}

/** Skip legacy subscribers who joined long before onboarding existed. */
function isWithinOnboardingWindow(subscriber: Subscriber, maxDays: number): boolean {
  if (!subscriber.subscribedAt) return false;
  const days = daysSinceSubscribe(subscriber.subscribedAt);
  return days >= 0 && days <= maxDays;
}

async function isSubscriberActiveSinceSignup(subscriber: Subscriber): Promise<boolean> {
  if (!subscriber.sessionId || !subscriber.subscribedAt) return false;

  const subscribeDate = getEasternDateKey(subscriber.subscribedAt);
  const streak = await storage.getStreak(subscriber.sessionId);
  if (streak?.visitDates?.some((d) => d >= subscribeDate)) {
    return true;
  }

  const entries = await storage.getJournalEntries(subscriber.sessionId);
  const subscribeMs = subscriber.subscribedAt.getTime();
  return entries.some((e) => new Date(e.createdAt).getTime() >= subscribeMs);
}

function resolveOnboardingStep(subscriber: Subscriber): OnboardingEmailStep | null {
  if (!subscriber.subscribedAt) return null;
  const days = daysSinceSubscribe(subscriber.subscribedAt);

  if (
    days >= 2 &&
    days <= 5 &&
    !hasSentStep(subscriber, "day2") &&
    isWithinOnboardingWindow(subscriber, 14)
  ) {
    return "day2";
  }

  if (
    days >= 4 &&
    days <= 9 &&
    !hasSentStep(subscriber, "day4") &&
    isWithinOnboardingWindow(subscriber, 16)
  ) {
    return "day4";
  }

  if (days >= 7 && days <= 14 && isWithinOnboardingWindow(subscriber, 21)) {
    if (!hasSentStep(subscriber, "day7_winback") && !hasSentStep(subscriber, "day7_journeys")) {
      return null; // resolved async in send loop
    }
  }

  return null;
}

async function resolveDay7Step(subscriber: Subscriber): Promise<OnboardingEmailStep | null> {
  if (hasSentStep(subscriber, "day7_winback") || hasSentStep(subscriber, "day7_journeys")) {
    return null;
  }
  const days = daysSinceSubscribe(subscriber.subscribedAt!);
  if (days < 7 || days > 14 || !isWithinOnboardingWindow(subscriber, 21)) {
    return null;
  }
  const active = await isSubscriberActiveSinceSignup(subscriber);
  return active ? "day7_journeys" : "day7_winback";
}

export async function sendOnboardingEmailsToEligibleSubscribers() {
  console.log("[onboarding-email] Running onboarding drip job");

  markOnboardingSentToday();

  try {
    const subscribers = await storage.getAllActiveSubscribers();
    if (subscribers.length === 0) {
      console.log("[onboarding-email] No active subscribers.");
      return;
    }

    const appUrl = process.env.APP_URL || "https://www.shepherdspathai.com";
    const { client, fromEmail } = await getUncachableResendClient();
    const displayFrom = fromEmail.includes("@") && !fromEmail.startsWith('"')
      ? `Shepherd's Path <${fromEmail}>`
      : fromEmail;

    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      let step = resolveOnboardingStep(subscriber);
      if (!step) {
        step = await resolveDay7Step(subscriber);
      }
      if (!step) continue;

      const claimed = await storage.claimOnboardingEmailStep(subscriber.id, step);
      if (!claimed) continue;

      try {
        const content = getOnboardingEmailContent(step, {
          name: subscriber.name,
          email: subscriber.email,
          appUrl,
        });

        await client.emails.send({
          from: displayFrom,
          to: subscriber.email,
          replyTo: "hello@shepherdspathai.com",
          subject: content.subject,
          html: content.html,
          text: content.text,
        });

        await storage.markOnboardingEmailSent(subscriber.id, step);
        console.log(`[onboarding-email] Sent ${step} to ${subscriber.email}`);
        sent++;
      } catch (err) {
        console.error(`[onboarding-email] Failed ${step} for ${subscriber.email}:`, err);
        failed++;
      }
    }

    console.log(`[onboarding-email] Done. Sent: ${sent}, Failed: ${failed}`);
  } catch (err) {
    console.error("[onboarding-email] Job error:", err);
  }
}

export async function scheduleOnboardingEmails() {
  const scheduleNext = () => {
    const delay = msUntilNextHour(ONBOARDING_HOUR_UTC);
    const nextRun = new Date(Date.now() + delay);
    console.log(`[onboarding-email] Next run scheduled for: ${nextRun.toISOString()}`);

    setTimeout(async () => {
      if (!hasOnboardingSentToday()) {
        await sendOnboardingEmailsToEligibleSubscribers();
      } else {
        console.log("[onboarding-email] Already ran today, skipping duplicate.");
      }
      scheduleNext();
    }, delay);
  };

  if (withinCatchupWindow() && !hasOnboardingSentToday()) {
    console.log("[onboarding-email] Server restarted within catch-up window — sending now.");
    await sendOnboardingEmailsToEligibleSubscribers();
  }

  scheduleNext();
}
