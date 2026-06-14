/** Maps UI tone labels → pastor_videos.tone_tags values for /api/pastor-video */

export const PASTOR_VIDEO_TONE_MAP: Record<string, string> = {
  Anxiety: "anxiety",
  Grief: "grief",
  Loneliness: "not alone",
  Doubt: "doubt",
  Anger: "strength",
  Overwhelm: "overwhelm",
  Peace: "presence",
  Gratitude: "encouragement",
  Worship: "faith",
  Battle: "strength",
  Stillness: "presence",
  "Morning Surrender": "hope",
  "Night Prayer": "presence",
  "Go Deeper": "faith",
  "Scripture Deep Dive": "faith",
  Hope: "hope",
  Comfort: "presence",
  Honesty: "doubt",
};

export type PastorVideoResponse = {
  pastor_name: string;
  church_name: string;
  tier: number;
  title: string;
  youtube_url: string;
};

export function mapLabelToPastorVideoTone(label: string | null | undefined): string | null {
  if (!label?.trim()) return null;
  const direct = PASTOR_VIDEO_TONE_MAP[label.trim()];
  if (direct) return direct;
  const normalized = label.trim().toLowerCase();
  for (const [key, value] of Object.entries(PASTOR_VIDEO_TONE_MAP)) {
    if (key.toLowerCase() === normalized) return value;
  }
  return null;
}

export function mapThresholdNeedToPastorVideoTone(
  need: string | null | undefined,
): string | null {
  switch (need) {
    case "peace":
    case "stillness":
    case "night-prayer":
    case "comfort":
      return "presence";
    case "grief":
      return "grief";
    case "battle":
      return "strength";
    case "worship":
    case "deep-dive":
      return "faith";
    case "gratitude":
      return "encouragement";
    case "morning-surrender":
    case "hope":
      return "hope";
    case "honesty":
      return "doubt";
    default:
      return null;
  }
}

export function mapFaithFocusToPastorVideoTone(
  focus: string | null | undefined,
): string | null {
  switch (focus) {
    case "peace":
      return "presence";
    case "strength":
      return "strength";
    case "healing":
      return "grief";
    case "gratitude":
      return "encouragement";
    case "purpose":
    case "wisdom":
      return "faith";
    case "family":
      return "encouragement";
    default:
      return null;
  }
}

export function resolveGuidancePastorVideoTone(
  topicId: string | null,
  topicLabel: string | null,
  situation = "",
): string | null {
  if (topicLabel) {
    const mapped = mapLabelToPastorVideoTone(topicLabel);
    if (mapped) return mapped;
  }
  if (topicId) {
    const fromId = mapLabelToPastorVideoTone(
      topicId.charAt(0).toUpperCase() + topicId.slice(1),
    );
    if (fromId) return fromId;
    if (topicId === "loneliness") return "not alone";
    if (topicId === "overwhelm") return "overwhelm";
  }
  const s = situation.toLowerCase();
  if (/anxious|anxiety|overwhelm|overwhelmed/.test(s)) return "anxiety";
  if (/grief|grieving|loss|mourning/.test(s)) return "grief";
  if (/alone|lonely|loneliness/.test(s)) return "not alone";
  if (/doubt|uncertain|question/.test(s)) return "doubt";
  if (/angry|anger|frustrated/.test(s)) return "strength";
  return null;
}

export async function fetchPastorVideo(tone: string): Promise<PastorVideoResponse | null> {
  try {
    const res = await fetch(`/api/pastor-video?tone=${encodeURIComponent(tone)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object" || !data.youtube_url) return null;
    return data as PastorVideoResponse;
  } catch {
    return null;
  }
}
