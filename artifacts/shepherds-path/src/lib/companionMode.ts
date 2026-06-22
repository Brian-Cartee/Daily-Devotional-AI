export type CompanionMode = "philip" | "solo";

const KEY = "sp_companion_mode";
const SOLO_COUNT_KEY = "sp_solo_session_count";

export function getCompanionMode(): CompanionMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "solo" || v === "philip") return v;
  } catch { /* noop */ }
  return "philip";
}

export function setCompanionMode(mode: CompanionMode): void {
  try {
    localStorage.setItem(KEY, mode);
    if (mode === "solo") {
      // reset count on switch so the re-intro logic tracks from current switch
      localStorage.setItem(SOLO_COUNT_KEY, "0");
    }
  } catch { /* noop */ }
}

export function isPhilipMode(): boolean {
  return getCompanionMode() === "philip";
}

export function isSoloMode(): boolean {
  return getCompanionMode() === "solo";
}

/** Call once per Talk It Through session when in Solo mode. Returns new count. */
export function incrementSoloSessionCount(): number {
  try {
    const n = parseInt(localStorage.getItem(SOLO_COUNT_KEY) ?? "0", 10) + 1;
    localStorage.setItem(SOLO_COUNT_KEY, String(n));
    return n;
  } catch {
    return 0;
  }
}

export function getSoloSessionCount(): number {
  try {
    return parseInt(localStorage.getItem(SOLO_COUNT_KEY) ?? "0", 10);
  } catch {
    return 0;
  }
}

/** Show gentle Philip re-intro after 3+ solo sessions. Show once — caller marks seen. */
const SOLO_REINTRO_KEY = "sp_solo_reintro_shown";
export function shouldShowSoloReintro(): boolean {
  try {
    if (localStorage.getItem(SOLO_REINTRO_KEY)) return false;
    return getSoloSessionCount() >= 3;
  } catch {
    return false;
  }
}

export function markSoloReintroShown(): void {
  try { localStorage.setItem(SOLO_REINTRO_KEY, "1"); } catch { /* noop */ }
}
