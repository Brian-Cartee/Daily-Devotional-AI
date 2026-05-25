/**
 * Server-side cost protection — caps expensive operations for everyone.
 * Pro gets generous limits; free gets tighter limits. Nothing is unbounded.
 */
import { getAiDailyLimits } from "./aiLimits";

/** Pro AI: high but not infinite (abuse / runaway scripts) */
export const PRO_AI_DAILY_HARD_CAP = 100;

export type CostGuardResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

type FeatureBudget = {
  free: number;
  pro: number;
  windowMs: number;
  messageFree: string;
  messagePro: string;
};

const DAY = 86_400_000;
const MONTH = 30 * DAY;

const FEATURE_BUDGETS: Record<string, FeatureBudget> = {
  "sermon-daily": {
    free: 2,
    pro: 5,
    windowMs: DAY,
    messageFree: "Daily message clip limit reached for today. Try again tomorrow or upgrade to Pro for more.",
    messagePro: "You've reached today's clip discovery limit. It resets tomorrow.",
  },
  "sermon-additional": {
    free: 1,
    pro: 4,
    windowMs: DAY,
    messageFree: "One extra teaching search per day on free — Pro includes more.",
    messagePro: "Extra teaching search limit reached for today.",
  },
  "context-fetch": {
    free: 4,
    pro: 15,
    windowMs: DAY,
    messageFree: "Context lookups are limited today. Pro continues deeper study.",
    messagePro: "Context lookup limit reached for today.",
  },
  "context-ask": {
    free: 8,
    pro: 40,
    windowMs: DAY,
    messageFree: "Follow-up context questions are limited today.",
    messagePro: "Context question limit reached for today.",
  },
  transcribe: {
    free: 1,
    pro: 6,
    windowMs: DAY,
    messageFree: "One AI sermon recording per day on free. Pro includes more.",
    messagePro: "Sermon recording limit reached for today.",
  },
  "sermon-chunk": {
    free: 0,
    pro: 48,
    windowMs: DAY,
    messageFree: "Live sermon capture is a Pro feature.",
    messagePro: "Live capture limit reached for today.",
  },
  "prayer-portrait": {
    free: 0,
    pro: 4,
    windowMs: DAY,
    messageFree: "Prayer Portrait is included with Pro.",
    messagePro: "Prayer Portrait limit reached for today.",
  },
  "verse-art": {
    free: 1,
    pro: 3,
    windowMs: DAY,
    messageFree: "One verse art generation per day on free.",
    messagePro: "Verse art generation limit reached for today.",
  },
  "verse-frame": {
    free: 6,
    pro: 24,
    windowMs: DAY,
    messageFree: "Verse framing limit reached for today.",
    messagePro: "Verse framing limit reached for today.",
  },
};

/** Uses the same store as routes.ts isRateLimited — imported via register */
let rateLimitFn: ((key: string, max: number, windowMs: number) => boolean) | null = null;

export function bindRateLimiter(fn: (key: string, max: number, windowMs: number) => boolean) {
  rateLimitFn = fn;
}

function limited(key: string, max: number, windowMs: number): boolean {
  if (!rateLimitFn || max <= 0) return max <= 0;
  return rateLimitFn(key, max, windowMs);
}

export function aiDailyCap(daysWithApp: number, isPro: boolean): number {
  return isPro ? PRO_AI_DAILY_HARD_CAP : getAiDailyLimits(daysWithApp).hardLimit;
}

export function checkAiDailyLimit(
  sessionId: string | undefined,
  daysWithApp: number,
  isPro: boolean,
): CostGuardResult {
  if (!sessionId) {
    return {
      ok: false,
      status: 400,
      code: "session_required",
      message: "Session required for this request.",
    };
  }
  const cap = aiDailyCap(daysWithApp, isPro);
  if (limited(`daily:${sessionId}`, cap, DAY)) {
    return {
      ok: false,
      status: 429,
      code: "ai_daily_limit",
      message: isPro
        ? "You've had a very full day of conversation. Pick up tomorrow — we're still here."
        : "You've had a full day of reflection. Rest with what you've received — or continue with Pro.",
    };
  }
  return { ok: true };
}

export function checkFeatureBudget(
  sessionId: string | undefined,
  feature: string,
  isPro: boolean,
): CostGuardResult {
  if (!sessionId) {
    return {
      ok: false,
      status: 400,
      code: "session_required",
      message: "Session required for this request.",
    };
  }
  const budget = FEATURE_BUDGETS[feature];
  if (!budget) return { ok: true };
  const max = isPro ? budget.pro : budget.free;
  if (limited(`feat:${feature}:${sessionId}`, max, budget.windowMs)) {
    return {
      ok: false,
      status: 429,
      code: `${feature}_limit`,
      message: isPro ? budget.messagePro : budget.messageFree,
    };
  }
  return { ok: true };
}

export function parseProFlag(value: unknown): boolean {
  return value === true || value === "true";
}
