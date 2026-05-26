import type { WorshipBedSource } from "@/lib/worshipBedSource";
import type { WorshipYoutubeMixId } from "@/lib/worshipYouTubeMixes";

/** Personal prayer closet — local preferences (Matthew 6:6) */

export const CLOSET_STORAGE_KEY = "sp_prayer_closet_v1";
export const CLOSET_NOTE_KEY = "sp_prayer_closet_note";
export const CLOSET_VISIT_KEY = "sp_prayer_closet_last_visit";
export const CLOSET_INTRO_SEEN_KEY = "sp_prayer_closet_intro_seen";
export const CLOSET_CANDLE_HINT_KEY = "sp_prayer_closet_candle_hint_seen";

export type ClosetBackgroundId =
  | "verse-art"
  | "path-road"
  | "still-waters"
  | "quiet-forest"
  | "golden-hour"
  /** @deprecated migrated to verse-art — kept for stored settings */
  | "daily-art"
  | "mountain-lake"
  | "misty-forest"
  | "sunset-hill";

export type ClosetSettings = {
  name: string;
  backgroundId: ClosetBackgroundId;
  pinnedReference: string | null;
  pinnedText: string | null;
  candleLevel: number;
  worshipEnabled: boolean;
  /** local MP3 slots vs curated YouTube hour-mixes */
  worshipSource: WorshipBedSource;
  worshipTrackId: string | null;
  worshipYoutubeMixId: WorshipYoutubeMixId;
  worshipVolume: number;
};

export const CLOSET_BACKGROUNDS: {
  id: ClosetBackgroundId;
  label: string;
  src: string;
  position?: string;
  /** Shown on framed wall; false = vision-board thumb only */
  wallArt?: boolean;
}[] = [
  { id: "verse-art", label: "Today's verse art", src: "", position: "center 40%", wallArt: true },
  { id: "path-road", label: "The path on the hill", src: "/hero-landing.webp", position: "center 42%", wallArt: true },
  { id: "still-waters", label: "Still waters", src: "/hero-prayer-wall-lake.jpg", position: "center 40%", wallArt: true },
  { id: "quiet-forest", label: "Quiet forest", src: "/hero-devotional-still.webp", position: "center 45%", wallArt: true },
  { id: "golden-hour", label: "Golden hour", src: "/hero-devotional-2.webp", position: "center 42%", wallArt: true },
];

export const DEFAULT_CLOSET_SETTINGS: ClosetSettings = {
  name: "",
  backgroundId: "verse-art",
  pinnedReference: null,
  pinnedText: null,
  candleLevel: 0.55,
  worshipEnabled: false,
  worshipSource: "youtube",
  worshipTrackId: "morning-stillness",
  worshipYoutubeMixId: "soaking-moment-with-god",
  worshipVolume: 0.35,
};

function normalizeBackgroundId(id: ClosetBackgroundId): ClosetBackgroundId {
  if (id === "daily-art" || id === "mountain-lake") return "verse-art";
  if (id === "misty-forest") return "quiet-forest";
  if (id === "sunset-hill") return "golden-hour";
  return id;
}

export function loadClosetSettings(): ClosetSettings {
  try {
    const raw = localStorage.getItem(CLOSET_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CLOSET_SETTINGS };
    const parsed = JSON.parse(raw) as ClosetSettings;
    return {
      ...DEFAULT_CLOSET_SETTINGS,
      ...parsed,
      backgroundId: normalizeBackgroundId(parsed.backgroundId ?? DEFAULT_CLOSET_SETTINGS.backgroundId),
    };
  } catch {
    return { ...DEFAULT_CLOSET_SETTINGS };
  }
}

export function saveClosetSettings(patch: Partial<ClosetSettings>): ClosetSettings {
  const next = { ...loadClosetSettings(), ...patch };
  if (next.backgroundId) next.backgroundId = normalizeBackgroundId(next.backgroundId);
  try {
    localStorage.setItem(CLOSET_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  return next;
}

export function loadClosetNote(): string {
  try {
    return localStorage.getItem(CLOSET_NOTE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveClosetNote(text: string): void {
  try {
    localStorage.setItem(CLOSET_NOTE_KEY, text);
  } catch {
    /* noop */
  }
}

export function markClosetVisit(): void {
  try {
    localStorage.setItem(CLOSET_VISIT_KEY, new Date().toISOString());
  } catch {
    /* noop */
  }
}

export function hasVisitedCloset(): boolean {
  try {
    return !!localStorage.getItem(CLOSET_VISIT_KEY);
  } catch {
    return false;
  }
}

export function shouldShowClosetIntro(): boolean {
  try {
    return !localStorage.getItem(CLOSET_INTRO_SEEN_KEY);
  } catch {
    return false;
  }
}

export function markClosetIntroSeen(): void {
  try {
    localStorage.setItem(CLOSET_INTRO_SEEN_KEY, "1");
  } catch {
    /* noop */
  }
}

export function shouldShowCandleHint(): boolean {
  try {
    return !localStorage.getItem(CLOSET_CANDLE_HINT_KEY);
  } catch {
    return false;
  }
}

export function markCandleHintSeen(): void {
  try {
    localStorage.setItem(CLOSET_CANDLE_HINT_KEY, "1");
  } catch {
    /* noop */
  }
}

export function closetDisplayName(settings: ClosetSettings, fallback = "My prayer closet"): string {
  const n = settings.name.trim();
  if (!n) return fallback;
  return n.endsWith("'s") || n.endsWith("'s closet") || n.toLowerCase().includes("closet")
    ? n
    : `${n}'s closet`;
}

/** Short status for home card after first visit */
export function closetHomeStatus(settings: ClosetSettings): string | null {
  if (!hasVisitedCloset()) return null;
  if (settings.worshipEnabled) return "Worship playing";
  if (settings.candleLevel >= 0.65) return "Candle lit";
  if (settings.pinnedText) return "Verse on the wall";
  return "Your room is ready";
}

export function visionBoardHasContent(opts: {
  pinnedText: string | null;
  draftNote: string;
  lastPrayerSnippet: string | null;
  dailyArtThumb: string | null;
}): boolean {
  return !!(
    opts.pinnedText?.trim() ||
    opts.draftNote?.trim() ||
    opts.lastPrayerSnippet?.trim() ||
    opts.dailyArtThumb
  );
}
