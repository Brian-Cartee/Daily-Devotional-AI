/** Devotional is a fresh daily rhythm; Guidance holds continuity threads. */

export type DevotionalContinuityIntent = "fresh" | "continue";

const LAST_VISIT_KEY = "sp_last_devotional_visit";
const CARRY_KEY = "sp_carry_today";
const CARRY_MAX_MS = 24 * 60 * 60 * 1000;
/** Days away before we ask fresh vs continue (not on first-ever visit). */
export const DEVOTIONAL_CONTINUITY_GAP_DAYS = 2;

export function getDaysSinceLastDevotionalVisit(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_VISIT_KEY);
    if (!raw) return null;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return null;
    return Math.floor((Date.now() - ts) / 86_400_000);
  } catch {
    return null;
  }
}

export function markDevotionalVisited(): void {
  try {
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

export function shouldOfferDevotionalContinuityChoice(): boolean {
  const days = getDaysSinceLastDevotionalVisit();
  return days !== null && days >= DEVOTIONAL_CONTINUITY_GAP_DAYS;
}

export type CarryTodayPayload = {
  text: string;
  reference: string;
  source?: string;
  savedAt?: number;
  date?: string;
};

export function readCarryToday(): CarryTodayPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CARRY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CarryTodayPayload;
    if (!parsed.text || !parsed.reference) return null;

    const savedAt =
      typeof parsed.savedAt === "number"
        ? parsed.savedAt
        : parsed.date
          ? new Date(`${parsed.date}T12:00:00`).getTime()
          : 0;
    if (!savedAt || Date.now() - savedAt > CARRY_MAX_MS) {
      localStorage.removeItem(CARRY_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCarryToday(payload: Omit<CarryTodayPayload, "savedAt">): void {
  try {
    localStorage.setItem(
      CARRY_KEY,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
        date: new Date().toISOString().split("T")[0],
      }),
    );
  } catch {
    /* noop */
  }
}
