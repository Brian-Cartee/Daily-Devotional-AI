/** Threshold arrival — first sacred encounter (replaces carousel onboarding). */

import {
  isReturningHome,
  markIntroFlowComplete,
  recordSplashShown,
} from "@/lib/introState";

export const THRESHOLD_COMPLETE_KEY = "sp_threshold_complete";
export const THRESHOLD_NEED_KEY = "sp_threshold_need";
export const THRESHOLD_JUST_COMPLETED_KEY = "sp_threshold_just_completed";

export type ThresholdNeed = "comfort" | "honesty" | "hope";

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

export function getThresholdNeed(): ThresholdNeed | null {
  const v = storageGet(THRESHOLD_NEED_KEY);
  if (v === "comfort" || v === "honesty" || v === "hope") return v;
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

export function consumeThresholdJustCompleted(): boolean {
  try {
    if (sessionStorage.getItem(THRESHOLD_JUST_COMPLETED_KEY) !== "1") return false;
    sessionStorage.removeItem(THRESHOLD_JUST_COMPLETED_KEY);
    return true;
  } catch {
    return false;
  }
}
