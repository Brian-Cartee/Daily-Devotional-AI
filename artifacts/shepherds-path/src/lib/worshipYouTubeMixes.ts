/**
 * Curated long-form worship mixes — official YouTube embed in the prayer closet.
 */

export type WorshipYoutubeMixId =
  | "holy-voltage-ep1"
  | "kingdom-frequencies-2026"
  | "casley-glorious-praise";

export type WorshipYoutubeMix = {
  id: WorshipYoutubeMixId;
  videoId: string;
  title: string;
  channel: string;
  durationLabel: string;
  mood: string;
};

export const WORSHIP_YOUTUBE_MIXES: WorshipYoutubeMix[] = [
  {
    id: "holy-voltage-ep1",
    videoId: "fGFxj9oYpbM",
    title: "JESUS ENERGY — Holy Voltage Ep. 1",
    channel: "Holy Voltage Radio",
    durationLabel: "~1 hr",
    mood: "Christian techno · praise",
  },
  {
    id: "kingdom-frequencies-2026",
    videoId: "hhKpXtBG0dk",
    title: "House Praise 2026",
    channel: "Kingdom Frequencies",
    durationLabel: "~1 hr",
    mood: "Christian EDM · house",
  },
  {
    id: "casley-glorious-praise",
    videoId: "mXj6PIEm-rw",
    title: "Glorious Praise & Worship",
    channel: "Casley Music",
    durationLabel: "Mix",
    mood: "Christian EDM · uplifting",
  },
];

export function getWorshipYoutubeMix(id: string | null | undefined): WorshipYoutubeMix {
  return WORSHIP_YOUTUBE_MIXES.find((m) => m.id === id) ?? WORSHIP_YOUTUBE_MIXES[0];
}
