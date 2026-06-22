export type HoldDuration = "3days" | "1week" | "sunday";

export interface PrayerHold {
  id: string;
  text: string;
  duration: HoldDuration;
  createdAt: number;        // ms timestamp
  expiresAt: number;        // ms timestamp
  followedUpAt?: number;    // when Philip returned to it
  released?: boolean;
  philipReceiveText?: string;
  philipReturnText?: string;
}

const KEY = "sp_prayer_holds";
const MAX_HOLDS = 3;

function durationMs(d: HoldDuration): number {
  if (d === "3days") return 3 * 24 * 60 * 60 * 1000;
  if (d === "1week") return 7 * 24 * 60 * 60 * 1000;
  // "sunday" — next Sunday midnight ET
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  return daysUntilSunday * 24 * 60 * 60 * 1000;
}

export function getHolds(): PrayerHold[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as PrayerHold[];
  } catch {
    return [];
  }
}

function saveHolds(holds: PrayerHold[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(holds));
  } catch { /* noop */ }
}

export function addHold(text: string, duration: HoldDuration, philipReceiveText: string): PrayerHold | null {
  const holds = getHolds().filter(h => !h.released);
  if (holds.length >= MAX_HOLDS) return null;
  const now = Date.now();
  const hold: PrayerHold = {
    id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    duration,
    createdAt: now,
    expiresAt: now + durationMs(duration),
    philipReceiveText,
  };
  saveHolds([...getHolds(), hold]);
  return hold;
}

export function releaseHold(id: string): void {
  saveHolds(getHolds().map(h => h.id === id ? { ...h, released: true } : h));
}

export function markHoldFollowedUp(id: string, philipReturnText: string): void {
  saveHolds(getHolds().map(h =>
    h.id === id ? { ...h, followedUpAt: Date.now(), philipReturnText } : h
  ));
}

/** Holds where Philip has not yet followed up and they haven't been released. */
export function getHoldsDueForReturn(): PrayerHold[] {
  const now = Date.now();
  return getHolds().filter(h =>
    !h.released &&
    !h.followedUpAt &&
    now >= h.expiresAt
  );
}

/** Active holds Philip is still carrying (not released, not expired + followed up). */
export function getActiveHolds(): PrayerHold[] {
  return getHolds().filter(h => !h.released && !h.followedUpAt);
}

export function canAddHold(): boolean {
  return getActiveHolds().length < MAX_HOLDS;
}
