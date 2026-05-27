/**
 * Sacred first session — defer home overlays until the user has met Scripture once.
 */

import { isIntroFlowComplete } from "@/lib/introState";
import { isThresholdComplete } from "@/lib/thresholdState";

const HOME_VISITS_KEY = "sp_home_visits_after_threshold";

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

/** Call once when LandingHome mounts after threshold is complete. */
export function bumpHomeVisitAfterThreshold(): number {
  if (!isThresholdComplete()) return 0;
  const next = parseInt(storageGet(HOME_VISITS_KEY) ?? "0", 10) + 1;
  storageSet(HOME_VISITS_KEY, String(next));
  return next;
}

export function getHomeVisitsAfterThreshold(): number {
  return parseInt(storageGet(HOME_VISITS_KEY) ?? "0", 10);
}

/** Visit 1 after threshold: hero + devotional only — no splash/onboarding/welcome/entry. */
export function isSacredFirstHomeVisit(visitCount: number): boolean {
  return isThresholdComplete() && !isIntroFlowComplete() && visitCount === 1;
}

/** Visit 2: show boundary onboarding only. */
export function isDeferredOnboardingVisit(visitCount: number): boolean {
  return isThresholdComplete() && !isIntroFlowComplete() && visitCount === 2;
}

/** Week-one home: chapel cards only; marketplace collapsed. */
export function isChapelFirstWeek(daysWithApp: number, devotionalVisits: number): boolean {
  return daysWithApp < 7 || devotionalVisits < 4;
}
