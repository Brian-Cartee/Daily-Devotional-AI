import type { WorshipBedSource } from "@/lib/worshipBedSource";
import type { WorshipYoutubeMixId } from "@/lib/worshipYouTubeMixes";

/** Personal prayer closet — local preferences (Matthew 6:6) */

export const CLOSET_STORAGE_KEY = "sp_prayer_closet_v1";
export const CLOSET_NOTE_KEY = "sp_prayer_closet_note";
export const CLOSET_VISIT_KEY = "sp_prayer_closet_last_visit";

export type ClosetBackgroundId =
  | "daily-art"
  | "path-road"
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
}[] = [
  { id: "daily-art", label: "Today's art", src: "" },
  { id: "path-road", label: "The path on the hill", src: "/hero-landing.webp", position: "center 42%" },
  { id: "mountain-lake", label: "Still waters", src: "/hero-prayer-wall-lake.jpg", position: "center 40%" },
  { id: "misty-forest", label: "Quiet forest", src: "/daily-art/natural-mountain.jpg" },
  { id: "sunset-hill", label: "Golden hour", src: "/daily-art/natural-sunset.jpg" },
];

export const DEFAULT_CLOSET_SETTINGS: ClosetSettings = {
  name: "",
  backgroundId: "path-road",
  pinnedReference: null,
  pinnedText: null,
  candleLevel: 0.55,
  worshipEnabled: false,
  worshipSource: "youtube",
  worshipTrackId: "morning-stillness",
  worshipYoutubeMixId: "soaking-moment-with-god",
  worshipVolume: 0.35,
};

export function loadClosetSettings(): ClosetSettings {
  try {
    const raw = localStorage.getItem(CLOSET_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CLOSET_SETTINGS };
    return { ...DEFAULT_CLOSET_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CLOSET_SETTINGS };
  }
}

export function saveClosetSettings(patch: Partial<ClosetSettings>): ClosetSettings {
  const next = { ...loadClosetSettings(), ...patch };
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

export function closetDisplayName(settings: ClosetSettings, fallback = "My prayer closet"): string {
  const n = settings.name.trim();
  if (!n) return fallback;
  return n.endsWith("'s") || n.endsWith("'s closet") || n.toLowerCase().includes("closet")
    ? n
    : `${n}'s closet`;
}
