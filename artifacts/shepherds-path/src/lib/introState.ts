/** First-run intro gating — localStorage-first (Safari-safe), not session-only. */

import { canShowPostOnboardingSplash } from "./dailySplash";

export const INTRO_COMPLETE_KEY = "sp_intro_flow_complete";
export const VISIT_COUNT_KEY = "sp_visit_count";
export const BRAND_SPLASH_COUNT_KEY = "sp_brand_splash_count";
export const BRAND_SPLASH_SEQUENCE_LEN = 5;
const DAILY_DOOR_SPLASH_DATE_KEY = "sp_daily_door_splash_date"; // legacy — daily flow uses dailySplash.ts keys
export const WELCOME_SESSION_KEY = "sp_welcome_shown_this_session";
export const SPLASH_KEY = "sp_splash_shown";
export const RETURNING_HOME_KEY = "sp_returning_home";

/** Purple welcome overlay: first N home loads, then stop. */
export const WELCOME_VISIT_THRESHOLD = 3;

function storageGet(key: string, store: Storage): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string, store: Storage): void {
  try {
    store.setItem(key, value);
  } catch {
    /* private mode / blocked storage */
  }
}

function readIntroCookie(): boolean {
  try {
    return /(?:^|; )sp_ic=1/.test(document.cookie);
  } catch { return false; }
}

function writeIntroCookie(): void {
  try {
    document.cookie = "sp_ic=1; path=/; max-age=63072000; SameSite=Lax";
  } catch {}
}

export function isIntroFlowComplete(): boolean {
  if (readIntroCookie()) return true;
  if (storageGet(INTRO_COMPLETE_KEY, localStorage) === "1") return true;
  if (storageGet("sp_onboarding_shown", localStorage)) return true;
  const visits = parseInt(storageGet(VISIT_COUNT_KEY, localStorage) ?? "0", 10);
  return visits > WELCOME_VISIT_THRESHOLD;
}

export function markIntroFlowComplete(): void {
  storageSet(INTRO_COMPLETE_KEY, "1", localStorage);
  storageSet(SPLASH_KEY, "1", localStorage);
  storageSet(WELCOME_SESSION_KEY, "1", sessionStorage);
  storageSet("sp_welcomed", "1", localStorage);
  writeIntroCookie();
}

export function markReturningHome(): void {
  // Use localStorage in native WebView — sessionStorage persists across backgrounding
  // so tapping Home, backgrounding, and foregrounding would still block the splash.
  storageSet(RETURNING_HOME_KEY, "1", localStorage);
  storageSet(RETURNING_HOME_KEY, "1", sessionStorage);
}

export function isReturningHome(): boolean {
  return (
    storageGet(RETURNING_HOME_KEY, localStorage) === "1" ||
    storageGet(RETURNING_HOME_KEY, sessionStorage) === "1"
  );
}

export function clearReturningHome(): void {
  try {
    localStorage.removeItem(RETURNING_HOME_KEY);
    sessionStorage.removeItem(RETURNING_HOME_KEY);
  } catch {
    /* noop */
  }
}

export function shouldShowSplash(): boolean {
  if (isIntroFlowComplete()) return false;
  if (storageGet(SPLASH_KEY, localStorage) === "1") return false;
  if (storageGet(SPLASH_KEY, sessionStorage)) return false;
  return true;
}

export function recordSplashShown(): void {
  storageSet(SPLASH_KEY, "1", localStorage);
  storageSet(SPLASH_KEY, "1", sessionStorage);
}

export function getWelcomeVisitCount(): number {
  return parseInt(storageGet(VISIT_COUNT_KEY, localStorage) ?? "0", 10);
}

export function incrementWelcomeVisitCount(): number {
  const next = getWelcomeVisitCount() + 1;
  storageSet(VISIT_COUNT_KEY, String(next), localStorage);
  if (next > WELCOME_VISIT_THRESHOLD) {
    markIntroFlowComplete();
  }
  return next;
}

export function shouldShowWelcomeOverlay(forceIntro: boolean): boolean {
  if (forceIntro) return true;
  if (isIntroFlowComplete()) return false;
  if (isReturningHome()) return false;
  if (storageGet(WELCOME_SESSION_KEY, sessionStorage)) return false;
  const count = getWelcomeVisitCount();
  return count < WELCOME_VISIT_THRESHOLD;
}

export function recordWelcomeShownThisSession(): void {
  storageSet(WELCOME_SESSION_KEY, "1", sessionStorage);
}

function readSplashCookie(): number {
  try {
    const m = document.cookie.match(new RegExp("(?:^|; )sp_bsc=([^;]*)"));
    return m ? parseInt(decodeURIComponent(m[1]), 10) : 0;
  } catch { return 0; }
}

function writeSplashCookie(n: number): void {
  try {
    document.cookie = "sp_bsc=" + n + "; path=/; max-age=63072000; SameSite=Lax";
  } catch {}
}

/** Brand splash visit count — native AsyncStorage is source of truth in the iOS shell; localStorage + cookie as fallback for web. */
export function getBrandSplashCount(): number {
  const fromNative = typeof window !== "undefined" ? (window as any).__spNativeSplashCount : undefined;
  const fromStorage = parseInt(storageGet(BRAND_SPLASH_COUNT_KEY, localStorage) ?? "0", 10);
  const fromCookie = readSplashCookie();
  const webMax = Math.max(isNaN(fromStorage) ? 0 : fromStorage, isNaN(fromCookie) ? 0 : fromCookie);
  if (typeof fromNative === "number" && !isNaN(fromNative)) {
    return Math.max(fromNative, webMax);
  }
  return webMax;
}

export function incrementBrandSplashCount(): number {
  const next = getBrandSplashCount() + 1;
  storageSet(BRAND_SPLASH_COUNT_KEY, String(next), localStorage);
  writeSplashCookie(next);
  // Keep native AsyncStorage in sync — survives full WKWebView kills
  try {
    if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
      (window as any).__spNativeSplashCount = next;
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: "sp_ui_state", splashCount: next }));
    }
  } catch {}
  return next;
}

function getEasternDateStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

export function isBrandSplashSequenceComplete(): boolean {
  return getBrandSplashCount() >= BRAND_SPLASH_SEQUENCE_LEN;
}

export function hasShownDailyDoorSplashToday(): boolean {
  try {
    return storageGet(DAILY_DOOR_SPLASH_DATE_KEY, localStorage) === getEasternDateStr();
  } catch {
    return false;
  }
}

export function markDailyDoorSplashShown(): void {
  storageSet(DAILY_DOOR_SPLASH_DATE_KEY, getEasternDateStr(), localStorage);
}

/** After onboarding: up to 3 entry splashes per Eastern day (2 pool + door). */
export function shouldShowDailyDoorSplash(): boolean {
  return isBrandSplashSequenceComplete() && canShowPostOnboardingSplash();
}
