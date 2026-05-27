/** Set after sigh / night / closet / guidance stillness — suppress gamified popups briefly. */

const KEY = "sp_sacred_session_until";

const QUIET_MS = 30 * 60 * 1000;

export function markSacredSessionQuiet(): void {
  try {
    sessionStorage.setItem(KEY, String(Date.now() + QUIET_MS));
  } catch {
    /* noop */
  }
}

export function isSacredSessionQuiet(): boolean {
  try {
    const until = parseInt(sessionStorage.getItem(KEY) ?? "0", 10);
    return until > Date.now();
  } catch {
    return false;
  }
}
