/**
 * Worship bed tracks — files in public/worship/{id}.wav
 * Generated via scripts/generate-worship-wavs.py (or replace with licensed MP3s).
 */

export type WorshipTrackId =
  | "morning-stillness"
  | "soaking-prayer"
  | "hope-rise"
  | "night-rest";

export type WorshipTrack = {
  id: WorshipTrackId;
  title: string;
  mood: string;
  src: string;
};

export function worshipAssetUrl(relativePath: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}

export const WORSHIP_TRACKS: WorshipTrack[] = [
  {
    id: "morning-stillness",
    title: "Morning stillness",
    mood: "Soft ambient · prayer",
    src: worshipAssetUrl("/worship/morning-stillness.wav"),
  },
  {
    id: "soaking-prayer",
    title: "Soaking prayer",
    mood: "Warm pads · unhurried",
    src: worshipAssetUrl("/worship/soaking-prayer.wav"),
  },
  {
    id: "hope-rise",
    title: "Hope rise",
    mood: "Gentle uplift · soft",
    src: worshipAssetUrl("/worship/hope-rise.wav"),
  },
  {
    id: "night-rest",
    title: "Night rest",
    mood: "Low tempo · evening",
    src: worshipAssetUrl("/worship/night-rest.wav"),
  },
];

export function getWorshipTrack(id: string | null | undefined): WorshipTrack {
  return WORSHIP_TRACKS.find((t) => t.id === id) ?? WORSHIP_TRACKS[0];
}
