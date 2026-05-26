/** Sigh Room session helpers — soft daily limit for free tier. */

const DATE_KEY = "sp_sigh_day";
const COUNT_KEY = "sp_sigh_count";
export const FREE_SIGH_SESSIONS_PER_DAY = 3;

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function getSighSessionsToday(): number {
  try {
    if (localStorage.getItem(DATE_KEY) !== todayStr()) return 0;
    return parseInt(localStorage.getItem(COUNT_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function canStartSighSession(isPro: boolean): boolean {
  if (isPro) return true;
  return getSighSessionsToday() < FREE_SIGH_SESSIONS_PER_DAY;
}

export function recordSighSessionStarted(): void {
  try {
    const today = todayStr();
    if (localStorage.getItem(DATE_KEY) !== today) {
      localStorage.setItem(DATE_KEY, today);
      localStorage.setItem(COUNT_KEY, "1");
      return;
    }
    const n = getSighSessionsToday() + 1;
    localStorage.setItem(COUNT_KEY, String(n));
  } catch {
    /* noop */
  }
}
