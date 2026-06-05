/** Threshold arrival — first sacred encounter (replaces carousel onboarding). */

import {
  isReturningHome,
  markIntroFlowComplete,
  recordSplashShown,
} from "@/lib/introState";

export const THRESHOLD_COMPLETE_KEY = "sp_threshold_complete";
export const THRESHOLD_NEED_KEY = "sp_threshold_need";
export const THRESHOLD_JUST_COMPLETED_KEY = "sp_threshold_just_completed";

export type ThresholdNeed =
  | "peace"
  | "grief"
  | "battle"
  | "stillness"
  | "worship"
  | "deep-dive"
  | "morning-surrender"
  | "night-prayer"
  | "gratitude"
  | "comfort"
  | "honesty"
  | "hope";

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
    /* private mode */
  }
}

export function isThresholdComplete(): boolean {
  if (storageGet(THRESHOLD_COMPLETE_KEY) === "1") return true;
  // Legacy users who finished old onboarding
  if (storageGet("sp_intro_flow_complete") === "1") return true;
  if (storageGet("sp_onboarding_shown")) return true;
  return false;
}

const THRESHOLD_NEEDS: ThresholdNeed[] = [
  "peace",
  "grief",
  "battle",
  "stillness",
  "worship",
  "deep-dive",
  "morning-surrender",
  "night-prayer",
  "gratitude",
  "comfort",
  "honesty",
  "hope",
];

export function getThresholdNeed(): ThresholdNeed | null {
  const v = storageGet(THRESHOLD_NEED_KEY);
  if (v && (THRESHOLD_NEEDS as string[]).includes(v)) return v as ThresholdNeed;
  return null;
}

export function isThresholdReplay(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("replay") === "1";
  } catch {
    return false;
  }
}

/** First-time users land on /threshold instead of stacked home intros. */
export function shouldShowThresholdArrival(): boolean {
  if (isReturningHome()) return false;
  if (isThresholdReplay()) return true;
  return !isThresholdComplete();
}

export function markThresholdComplete(need?: ThresholdNeed): void {
  storageSet(THRESHOLD_COMPLETE_KEY, "1");
  if (need) storageSet(THRESHOLD_NEED_KEY, need);
  markIntroFlowComplete();
  recordSplashShown();
  storageSet("sp_onboarding_shown", new Date().toISOString().split("T")[0]);
  try {
    sessionStorage.setItem(THRESHOLD_JUST_COMPLETED_KEY, "1");
  } catch {
    /* noop */
  }
}

export function getThresholdNeedAcknowledgment(need: ThresholdNeed): string {
  switch (need) {
    case "peace":
      return "You said you needed peace — we'll move softly today.";
    case "grief":
      return "You said you're carrying grief — you don't have to do that alone.";
    case "battle":
      return "You said you needed strength — you're not weak for asking.";
    case "stillness":
      return "You said you needed stillness — the quiet is enough here.";
    case "worship":
      return "You said you wanted to worship — let's turn toward God together.";
    case "gratitude":
      return "You said you wanted gratitude — small thanks still count.";
    case "deep-dive":
      return "You said you wanted depth in Scripture — we'll go slowly.";
    case "morning-surrender":
      return "You said you wanted a gentle morning start — one step is enough.";
    case "night-prayer":
      return "You said you needed to release today — you can rest here.";
    case "honesty":
      return "You said you needed space for honesty — start wherever you are.";
    case "hope":
      return "You said you were looking for hope — small steps still count here.";
    case "comfort":
      return "You said you needed comfort — gentleness first, no performance.";
  }
}

export function consumeThresholdJustCompleted(): boolean {
  try {
    if (sessionStorage.getItem(THRESHOLD_JUST_COMPLETED_KEY) !== "1") return false;
    sessionStorage.removeItem(THRESHOLD_JUST_COMPLETED_KEY);
    return true;
  } catch {
    return false;
  }
}
