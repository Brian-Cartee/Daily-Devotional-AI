const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date()); // "2026-04-15"

interface DevotionalCache {
  date: string;
  verseId?: number;
  reflection?: string;
  prayer?: string;
  /** First name used when reflection/prayer were generated (null = anonymous). */
  personalizedForName?: string | null;
}

const STORAGE_KEY = "shepherds_devotional_session_v2";

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    /* localStorage can be blocked (Safari private / some WebViews) */
  }
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRaw(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
    return;
  } catch {
    /* fall back */
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {}
}

function load(): DevotionalCache | null {
  try {
    const raw = readRaw();
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
    writeRaw(JSON.stringify({ ...existing, ...data, date: todayKey() }));
  } catch {}
}

function normalizeName(name?: string | null): string | null {
  const trimmed = name?.trim();
  return trimmed || null;
}

function namesMatch(cached: string | null | undefined, current: string | null | undefined): boolean {
  return normalizeName(cached) === normalizeName(current);
}

/** True when cached reflection + prayer match today's verse and the same name context. */
export function shouldUseCachedDevotional(verseId: number, currentName?: string | null): boolean {
  const cached = load();
  if (!cached?.reflection || !cached?.prayer) return false;
  if (cached.verseId != null && cached.verseId !== verseId) return false;
  return namesMatch(cached.personalizedForName, currentName);
}

/** Returns cached reflection only when it belongs to today's verse and name still matches. */
export function getCachedReflection(verseId?: number, currentName?: string | null): string {
  const cached = load();
  if (!cached?.reflection) return "";
  if (verseId != null && cached.verseId != null && cached.verseId !== verseId) return "";
  if (verseId != null && !namesMatch(cached.personalizedForName, currentName)) return "";
  return cached.reflection;
}

export function getCachedPrayer(verseId?: number, currentName?: string | null): string {
  const cached = load();
  if (!cached?.prayer) return "";
  if (verseId != null && cached.verseId != null && cached.verseId !== verseId) return "";
  if (verseId != null && !namesMatch(cached.personalizedForName, currentName)) return "";
  return cached.prayer;
}

export function cacheReflection(text: string, verseId: number, forName?: string | null) {
  save({ reflection: text, verseId, personalizedForName: normalizeName(forName) });
}

export function cachePrayer(text: string, verseId: number, forName?: string | null) {
  const existing = load();
  save({
    prayer: text,
    verseId,
    personalizedForName: normalizeName(forName ?? existing?.personalizedForName),
  });
}

export function clearDevotionalSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}
