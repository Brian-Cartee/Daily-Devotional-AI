import type { SpeakLifeArchiveEntry, SpeakLifeConversationState } from "./types";

const STORAGE_KEY = "sp_speak_life_1821";

export function loadSpeakLifeArchive(): SpeakLifeArchiveEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SpeakLifeArchiveEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSpeakLifeEntry(
  state: SpeakLifeConversationState,
  overrides?: Partial<Pick<SpeakLifeArchiveEntry, "prayer_text" | "appreciation_text">>
): SpeakLifeArchiveEntry {
  const entry: SpeakLifeArchiveEntry = {
    id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recipient_name: state.recipient_name,
    appreciation_text: overrides?.appreciation_text ?? state.appreciation_text ?? "",
    prayer_text: overrides?.prayer_text ?? state.prayer_text,
    saved_at: new Date().toISOString(),
    private_only: state.private_only || state.recipient_is_living === false,
    recipient_is_living: state.recipient_is_living,
  };

  const existing = loadSpeakLifeArchive();
  existing.unshift(entry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 200)));
  } catch {
    /* noop */
  }
  return entry;
}

export function getSpeakLifeEntry(id: string): SpeakLifeArchiveEntry | null {
  return loadSpeakLifeArchive().find((e) => e.id === id) ?? null;
}
