/**
 * Worship bed tracks — host MP3s at public/worship/{id}.mp3
 * Pixabay / licensed Christian EDM or ambient (see public/worship/README.md)
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
  /** Path under site root; file may be added later */
  src: string;
};

export const WORSHIP_TRACKS: WorshipTrack[] = [
  {
    id: "morning-stillness",
    title: "Morning stillness",
    mood: "Soft ambient · prayer",
    src: "/worship/morning-stillness.mp3",
  },
  {
    id: "soaking-prayer",
    title: "Soaking prayer",
    mood: "Warm pads · unhurried",
    src: "/worship/soaking-prayer.mp3",
  },
  {
    id: "hope-rise",
    title: "Hope rise",
    mood: "Praise house · gentle",
    src: "/worship/hope-rise.mp3",
  },
  {
    id: "night-rest",
    title: "Night rest",
    mood: "Low tempo · evening",
    src: "/worship/night-rest.mp3",
  },
];

export function getWorshipTrack(id: string | null | undefined): WorshipTrack {
  return WORSHIP_TRACKS.find((t) => t.id === id) ?? WORSHIP_TRACKS[0];
}
