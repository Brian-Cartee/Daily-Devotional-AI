/** First-run intro gating — localStorage-first (Safari-safe), not session-only. */

export const INTRO_COMPLETE_KEY = "sp_intro_flow_complete";
export const VISIT_COUNT_KEY = "sp_visit_count";
export const BRAND_SPLASH_COUNT_KEY = "sp_brand_splash_count";
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

export function isIntroFlowComplete(): boolean {
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
}

export function markReturningHome(): void {
  storageSet(RETURNING_HOME_KEY, "1", sessionStorage);
}

export function isReturningHome(): boolean {
  return storageGet(RETURNING_HOME_KEY, sessionStorage) === "1";
}

export function clearReturningHome(): void {
  try {
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

/** Brand splash visit count — persists across all time, never resets. */
export function getBrandSplashCount(): number {
  return parseInt(storageGet(BRAND_SPLASH_COUNT_KEY, localStorage) ?? "0", 10);
}

export function incrementBrandSplashCount(): number {
  const next = getBrandSplashCount() + 1;
  storageSet(BRAND_SPLASH_COUNT_KEY, String(next), localStorage);
  return next;
}
