const ENTRIES_KEY = "sp_surrender_entries";

export type SurrenderEntry = {
  phrase: string;
  at: string;
};

export function saveSurrenderEntry(phrase: string): void {
  try {
    const list = getSurrenderEntries();
    list.unshift({ phrase: phrase.trim().slice(0, 200), at: new Date().toISOString() });
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* noop */
  }
}

export function getSurrenderEntries(): SurrenderEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SurrenderEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
