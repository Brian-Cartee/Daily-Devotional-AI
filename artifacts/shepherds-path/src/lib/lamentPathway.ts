/** Lament Pathway — multi-day grief season state. */

const ACTIVE_KEY = "sp_lament_active";
const DAY_KEY = "sp_lament_day";
const STARTED_KEY = "sp_lament_started";
const LAST_COMPLETE_KEY = "sp_lament_last_complete";

export function isLamentSeasonActive(): boolean {
  try {
    return localStorage.getItem(ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getLamentCurrentDay(): number {
  try {
    const d = parseInt(localStorage.getItem(DAY_KEY) ?? "1", 10);
    return Number.isFinite(d) ? Math.min(7, Math.max(1, d)) : 1;
  } catch {
    return 1;
  }
}

export function getLamentStartedDate(): string | null {
  try {
    return localStorage.getItem(STARTED_KEY);
  } catch {
    return null;
  }
}

export function startLamentPathway(): void {
  try {
    localStorage.setItem(ACTIVE_KEY, "1");
    localStorage.setItem(DAY_KEY, "1");
    localStorage.setItem(STARTED_KEY, new Date().toISOString().split("T")[0]);
    localStorage.removeItem(LAST_COMPLETE_KEY);
  } catch {
    /* noop */
  }
}

export function completeLamentDay(day: number): void {
  try {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(LAST_COMPLETE_KEY, today);
    if (day >= 7) {
      localStorage.setItem(DAY_KEY, "7");
      return;
    }
    localStorage.setItem(DAY_KEY, String(day + 1));
  } catch {
    /* noop */
  }
}

export function endLamentSeason(): void {
  try {
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(DAY_KEY);
    localStorage.removeItem(STARTED_KEY);
    localStorage.removeItem(LAST_COMPLETE_KEY);
  } catch {
    /* noop */
  }
}

/** One encounter per calendar day */
export function canDoLamentToday(): boolean {
  try {
    const last = localStorage.getItem(LAST_COMPLETE_KEY);
    const today = new Date().toISOString().split("T")[0];
    return last !== today;
  } catch {
    return true;
  }
}
