/**
 * Curated long-form worship mixes — official YouTube embed in the prayer closet.
 * Grouped by mood so people can choose what fits their prayer (not one style for everyone).
 */

export type WorshipYoutubeStyle =
  | "stillness"
  | "contemporary"
  | "gospel"
  | "praise-house";

export type WorshipYoutubeMixId =
  | "soaking-moment-with-god"
  | "gospel-piano-soaking"
  | "ambient-winter-calm"
  | "worship-songs-2026-oceans"
  | "top-praise-nonstop-2026"
  | "casley-glorious-praise"
  | "holy-voltage-ep1"
  | "kingdom-frequencies-2026"
  | "edm-christian-uplifting"
  | "christian-techno-2025-14"
  | "edm-workout-upbeat";

export type WorshipYoutubeMix = {
  id: WorshipYoutubeMixId;
  videoId: string;
  title: string;
  channel: string;
  durationLabel: string;
  /** Shown in UI — honest style label */
  mood: string;
  style: WorshipYoutubeStyle;
};

export const WORSHIP_STYLE_LABELS: Record<WorshipYoutubeStyle, string> = {
  stillness: "Still & quiet",
  contemporary: "Songs & contemporary worship",
  gospel: "Gospel & piano",
  "praise-house": "Upbeat · praise house / EDM",
};

export const WORSHIP_STYLE_ORDER: WorshipYoutubeStyle[] = [
  "stillness",
  "contemporary",
  "gospel",
  "praise-house",
];

/** Listed in display order: calm first, high-energy last */
export const WORSHIP_YOUTUBE_MIXES: WorshipYoutubeMix[] = [
  {
    id: "soaking-moment-with-god",
    videoId: "7Ah3uxF5oZQ",
    title: "Soaking instrumental — A Moment With God",
    channel: "Christian Harmonies",
    durationLabel: "~11 hr",
    mood: "Piano · prayer & rest",
    style: "stillness",
  },
  {
    id: "gospel-piano-soaking",
    videoId: "NS_VxnHdHE8",
    title: "Gospel piano soaking",
    channel: "Christian Harmonies",
    durationLabel: "~11 hr",
    mood: "Soft gospel · devotion",
    style: "gospel",
  },
  {
    id: "ambient-winter-calm",
    videoId: "GZAcQZ_t_JA",
    title: "Ambient worship — rest & prayer",
    channel: "Sparrow Ministries",
    durationLabel: "~3 hr",
    mood: "Ambient · sleep & stillness",
    style: "stillness",
  },
  {
    id: "worship-songs-2026-oceans",
    videoId: "t9FnJSY_EsQ",
    title: "Top praise & worship 2026 (Oceans)",
    channel: "Worship Songs",
    durationLabel: "Playlist",
    mood: "Contemporary · familiar songs",
    style: "contemporary",
  },
  {
    id: "top-praise-nonstop-2026",
    videoId: "h2WPDOBFTkg",
    title: "Best worship songs — nonstop",
    channel: "Top Praise and Worship Songs",
    durationLabel: "Playlist",
    mood: "Contemporary · nonstop",
    style: "contemporary",
  },
  {
    id: "casley-glorious-praise",
    videoId: "mXj6PIEm-rw",
    title: "Glorious Praise & Worship",
    channel: "Casley Music",
    durationLabel: "Mix",
    mood: "Uplifting · live worship feel",
    style: "contemporary",
  },
  {
    id: "holy-voltage-ep1",
    videoId: "fGFxj9oYpbM",
    title: "JESUS ENERGY — Holy Voltage Ep. 1",
    channel: "Holy Voltage Radio",
    durationLabel: "~1 hr",
    mood: "Praise house · energetic",
    style: "praise-house",
  },
  {
    id: "kingdom-frequencies-2026",
    videoId: "hhKpXtBG0dk",
    title: "House Praise 2026",
    channel: "Kingdom Frequencies",
    durationLabel: "~1 hr",
    mood: "Praise house · upbeat",
    style: "praise-house",
  },
  {
    id: "edm-christian-uplifting",
    videoId: "HYIl_xHF5r4",
    title: "Best uplifting EDM worship",
    channel: "EDM Christian Music",
    durationLabel: "Playlist",
    mood: "EDM · uplifting",
    style: "praise-house",
  },
  {
    id: "christian-techno-2025-14",
    videoId: "IjJ8k0DsOWE",
    title: "JESUS uplifting EDM #14",
    channel: "Christian Techno Music",
    durationLabel: "~1 hr",
    mood: "Techno · gospel energy",
    style: "praise-house",
  },
  {
    id: "edm-workout-upbeat",
    videoId: "-pP0Sy4YvZI",
    title: "Upbeat workout & feel-good",
    channel: "Christian Edm Music",
    durationLabel: "Playlist",
    mood: "EDM · feel-good",
    style: "praise-house",
  },
];

function assertUniqueWorshipMixes(mixes: WorshipYoutubeMix[]): void {
  const ids = new Set<string>();
  const videoIds = new Set<string>();
  for (const mix of mixes) {
    if (ids.has(mix.id)) {
      throw new Error(`[worshipYouTubeMixes] duplicate mix id: ${mix.id}`);
    }
    if (videoIds.has(mix.videoId)) {
      throw new Error(`[worshipYouTubeMixes] duplicate videoId: ${mix.videoId}`);
    }
    ids.add(mix.id);
    videoIds.add(mix.videoId);
  }
}

assertUniqueWorshipMixes(WORSHIP_YOUTUBE_MIXES);

const DEFAULT_STILLNESS_MIX =
  WORSHIP_YOUTUBE_MIXES.find((m) => m.style === "stillness") ?? WORSHIP_YOUTUBE_MIXES[0];

export function getWorshipYoutubeMix(id: string | null | undefined): WorshipYoutubeMix {
  return WORSHIP_YOUTUBE_MIXES.find((m) => m.id === id) ?? DEFAULT_STILLNESS_MIX;
}

export function groupWorshipYoutubeMixesByStyle(): {
  style: WorshipYoutubeStyle;
  label: string;
  mixes: WorshipYoutubeMix[];
}[] {
  return WORSHIP_STYLE_ORDER.map((style) => ({
    style,
    label: WORSHIP_STYLE_LABELS[style],
    mixes: WORSHIP_YOUTUBE_MIXES.filter((m) => m.style === style),
  })).filter((g) => g.mixes.length > 0);
}
