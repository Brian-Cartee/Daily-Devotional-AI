const todayKey = () => new Date().toISOString().slice(0, 10); // "2026-04-15"

interface DevotionalCache {
  date: string;
  verseId?: number;
  reflection?: string;
  prayer?: string;
}

const STORAGE_KEY = "shepherds_devotional_session";

function load(): DevotionalCache | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: DevotionalCache = JSON.parse(raw);
    if (parsed.date !== todayKey()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(data: Partial<Omit<DevotionalCache, "date">>) {
  try {
    const existing = load() ?? { date: todayKey() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...data, date: todayKey() }));
  } catch {}
}

/** Returns cached reflection only when it belongs to today's verse (if verseId provided). */
export function getCachedReflection(verseId?: number): string {
  const cached = load();
  if (!cached?.reflection) return "";
  if (verseId != null && cached.verseId != null && cached.verseId !== verseId) return "";
  return cached.reflection;
}

export function getCachedPrayer(verseId?: number): string {
  const cached = load();
  if (!cached?.prayer) return "";
  if (verseId != null && cached.verseId != null && cached.verseId !== verseId) return "";
  return cached.prayer;
}

export function cacheReflection(text: string, verseId: number) {
  save({ reflection: text, verseId });
}

export function cachePrayer(text: string, verseId: number) {
  save({ prayer: text, verseId });
}

export function clearDevotionalSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}
