export type BookmarkSection = "read" | "study" | "journey" | "devotional" | "journal";

export interface ReadBookmark    { book: string; chapter: number; translation: string; label: string; }
export interface StudyBookmark   { trackId: string; label: string; }
export interface JourneyBookmark { journeyId: string; label: string; }
export interface DevotionalBookmark { date: string; label: string; }
export interface JournalBookmark { tab: string; label: string; }

type SectionBookmark = {
  read:       ReadBookmark;
  study:      StudyBookmark;
  journey:    JourneyBookmark;
  devotional: DevotionalBookmark;
  journal:    JournalBookmark;
};

const PREFIX = "sp_bm_";

export function saveBookmark<K extends BookmarkSection>(section: K, data: SectionBookmark[K]) {
  localStorage.setItem(PREFIX + section, JSON.stringify({ ...data, savedAt: Date.now() }));
  window.dispatchEvent(new Event("sp-bookmark-change"));
}

export function getBookmark<K extends BookmarkSection>(section: K): (SectionBookmark[K] & { savedAt: number }) | null {
  try {
    const raw = localStorage.getItem(PREFIX + section);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearBookmark(section: BookmarkSection) {
  localStorage.removeItem(PREFIX + section);
  window.dispatchEvent(new Event("sp-bookmark-change"));
}

export function hasBookmark(section: BookmarkSection): boolean {
  return !!localStorage.getItem(PREFIX + section);
}
