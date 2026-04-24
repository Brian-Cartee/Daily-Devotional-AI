const todayKey = () => new Date().toISOString().slice(0, 10); // "2026-04-15"

interface DevotionalCache {
  date: string;
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

export function getCachedReflection(): string {
  return load()?.reflection ?? "";
}

export function getCachedPrayer(): string {
  return load()?.prayer ?? "";
}

export function cacheReflection(text: string) {
  save({ reflection: text });
}

export function cachePrayer(text: string) {
  save({ prayer: text });
}
