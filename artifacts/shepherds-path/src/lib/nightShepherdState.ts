/** Night Shepherd — late-night presence flow (10pm–5am ET). */

import { isLateNight } from "@/lib/nightMode";
import { isReturningHome } from "@/lib/introState";
import { getRelationshipAge } from "@/lib/relationship";

const OPT_OUT_KEY = "sp_night_opt_out";
const DATE_KEY = "sp_night_shepherd_day";
const COUNT_KEY = "sp_night_shepherd_count";
export const FREE_NIGHT_SESSIONS_PER_NIGHT = 1;

export type NightNeed = "anxiety" | "loneliness" | "grief" | "fear" | "unknown";

export const NIGHT_NEED_LABELS: Record<NightNeed, string> = {
  anxiety: "Anxiety",
  loneliness: "Loneliness",
  grief: "Grief",
  fear: "Fear",
  unknown: "I don't know",
};

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

export function isNightOptOut(): boolean {
  return storageGet(OPT_OUT_KEY) === "1";
}

export function setNightOptOut(optOut: boolean): void {
  storageSet(OPT_OUT_KEY, optOut ? "1" : "0");
}

/** Skip auto-redirect for this browser session (e.g. user chose full home). */
export function skipNightRedirectThisSession(): void {
  try {
    sessionStorage.setItem("sp_night_skip_redirect", "1");
  } catch {
    /* noop */
  }
}

export function isNightRedirectSkippedThisSession(): boolean {
  try {
    return sessionStorage.getItem("sp_night_skip_redirect") === "1";
  } catch {
    return false;
  }
}

export function shouldRedirectToNightShepherd(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get("night") === "1") return false;
  } catch {
    /* noop */
  }
  if (!isLateNight()) return false;
  if (isNightOptOut()) return false;
  if (isReturningHome()) return false;
  // Don't interrupt new users in their first 5 days — let them explore freely
  if (getRelationshipAge() < 5) return false;
  if (isNightRedirectSkippedThisSession()) return false;
  try {
    if (new URLSearchParams(window.location.search).get("home") === "1") return false;
  } catch {
    /* noop */
  }
  return true;
}

export function getNightSessionsTonight(): number {
  try {
    if (storageGet(DATE_KEY) !== todayStr()) return 0;
    return parseInt(storageGet(COUNT_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function canStartNightShepherd(isPro: boolean): boolean {
  if (isPro) return true;
  return getNightSessionsTonight() < FREE_NIGHT_SESSIONS_PER_NIGHT;
}

export function recordNightShepherdStarted(): void {
  const today = todayStr();
  if (storageGet(DATE_KEY) !== today) {
    storageSet(DATE_KEY, today);
    storageSet(COUNT_KEY, "1");
    return;
  }
  const n = getNightSessionsTonight() + 1;
  storageSet(COUNT_KEY, String(n));
}

/** Situation text for AI — grounded in night need, not chatty. */
export function buildNightSituation(need: NightNeed, extra?: string): string {
  const base: Record<NightNeed, string> = {
    anxiety:
      "I cannot sleep. My mind will not quiet down — anxiety is keeping me awake in the middle of the night.",
    loneliness:
      "It is late and I feel deeply alone. The quiet of the night makes the loneliness louder.",
    grief:
      "I am awake with grief tonight. The loss feels heavy in the dark hours.",
    fear:
      "Fear is keeping me awake tonight. I need God's presence in this dark hour.",
    unknown:
      "I do not know exactly what is wrong — only that I am awake when I wish I were not, and something in me is unsettled.",
  };
  const core = base[need];
  if (extra?.trim()) return `${core} ${extra.trim()}`;
  return core;
}
