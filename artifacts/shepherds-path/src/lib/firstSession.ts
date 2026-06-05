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

/**
 * Home should center on Today's Word — one obvious step, minimal competing cards.
 * Through day 7, or until the user has opened the devotional at least once.
 */
export function isHomeDevotionalFocusPeriod(
  daysWithApp: number,
  devotionalVisitCount: number,
): boolean {
  if (daysWithApp >= 7 && devotionalVisitCount >= 1) return false;
  return daysWithApp < 7 || devotionalVisitCount < 1;
}

/** Week-one home: keep extra cards behind “More paths” until rhythm is established. */
export function isHomeMarketplaceCollapsed(
  daysWithApp: number,
  devotionalVisitCount: number,
): boolean {
  return isChapelFirstWeek(daysWithApp, devotionalVisitCount);
}

/** Daily art — after first return home (not sacred visit 1); keep visible in week-one focus. */
export function shouldShowHomeDailyArt(homeVisitsAfterThreshold: number): boolean {
  if (!isThresholdComplete()) return false;
  if (isSacredFirstHomeVisit(homeVisitsAfterThreshold)) return false;
  return homeVisitsAfterThreshold >= 2;
}

/** Prayer closet doorway banner — always on home unless quiet door is selected. */
export function shouldShowPrayerClosetOnHome(quietDoorSelected: boolean): boolean {
  return !quietDoorSelected;
}

export function isPrayerClosetCompactTeaser(
  homeDevotionalFocus: boolean,
  daysWithApp: number,
): boolean {
  return homeDevotionalFocus && daysWithApp < 7;
}

/** Returning users (day 8+): verse snippet on home hero when not in week-one focus mode. */
export function shouldShowHeroVerseSnippet(
  daysWithApp: number,
  homeDevotionalFocus: boolean,
): boolean {
  return daysWithApp >= 8 && !homeDevotionalFocus;
}
