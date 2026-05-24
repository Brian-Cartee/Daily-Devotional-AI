/**
 * Approved preacher tiers for sermon/video discovery.
 * Source: shepherds_path_pastor_tiers.pdf
 */

export type YouTubeSearchItem = {
  id: { videoId: string };
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

/** Tier 1 — Core (Truth + Conviction + Scripture Authority) */
const TIER_1_CHANNEL_IDS = [
  "UCrPGIKiPtgQ25TaW1fLdR0Q", // 2819 Church (Phillip Anthony Mitchell)
  "UCRZweRCzcK5ObXPCNKvdMOQ", // The Urban Alternative (Tony Evans)
  "UC5tzTmPEue1OMqkT9CIAP0g", // The Village Church (Matt Chandler)
  "UCzvq_2THJhueXOP8JdAO2-A", // Real Life with Jack Hibbs
  "UCmJ_L35KPnDoIfzbe4sfRQA", // Allen Jackson Ministries
  "UCexLpWnpWeHGlrlqywU3bWA", // Dharius Daniels / Change Church
];

/** Tier 2 — Strong but Stylistically Different */
const TIER_2_CHANNEL_IDS = [
  "UChxJPnZ0x9I8iYrm4jjuo0w", // Free Chapel (Jentezen Franklin)
  "UCjQbTcszB-gRhDByY9WhySw", // The Potter's House (T.D. Jakes)
];

/** Tier 3 — Cultural Bridge / Engagement */
const TIER_3_CHANNEL_IDS = [
  "UCYv-siSKd3Gn9IsliO95gIw", // Transformation Church (Michael Todd)
  "UCqzgGwRrOLH20OIc8bM_VAg", // The Basement with Tim Ross
  "UCZRjT2mSmOVE5ROt51ifIyg", // VOUS Church (Rich Wilkerson Jr)
  "UC1d28mrBqCQliL_N48tZZiw", // ET The Hip Hop Preacher (Eric Thomas)
];

/** Removed / not aligned — block by ID where known */
const BLOCKED_CHANNEL_IDS = [
  "UCxeTfmxpF9WGIB_BolAwr6w", // North Point Ministries (Andy Stanley)
  "UCJWhOXqBRzxnJwhHuovc1Q", // Life.Church (Craig Groeschel)
  "UCs7KTugBhbThJI66COuAzFg", // Elevation Church (Steven Furtick)
  "UCQdMOYr_ErR7-KQ-TU9-S3_w", // BibleProject
  "UC7Us3eGqPkRprU3FaK6uaww", // Passion City Church (Louie Giglio)
];

const TIER_1_NAME_FRAGMENTS = [
  "phillip anthony mitchell",
  "phillip mitchell",
  "2819 church",
  "tony evans",
  "urban alternative",
  "matt chandler",
  "the village church",
  "village church",
  "jack hibbs",
  "real life with jack hibbs",
  "allen jackson",
  "allen jackson ministries",
  "dharius daniels",
  "change church",
];

const TIER_2_NAME_FRAGMENTS = [
  "jentezen franklin",
  "free chapel",
  "td jakes",
  "t.d. jakes",
  "potter's house",
  "potters house",
];

const TIER_3_NAME_FRAGMENTS = [
  "michael todd",
  "transformation church",
  "tim ross",
  "the basement",
  "rich wilkerson",
  "vous church",
  "eric thomas",
  "hip hop preacher",
];

/** Generic overview / explainer channels — not pastoral sermons */
const BLOCKED_TITLE_FRAGMENTS = [
  "animated overview",
  "complete overview",
  "book of ",
  " summary:",
  "visual bible",
  "the bible project",
];

const BLOCKED_NAME_FRAGMENTS = [
  "andy stanley",
  "north point",
  "craig groeschel",
  "life.church",
  "life church",
  "steven furtick",
  "elevation church",
  "elevation worship",
  "elevation with",
  "louie giglio",
  "passion city",
  "passion conference",
  "bibleproject",
  "bible project",
];

/** Lower score = higher priority. 50 = blocked, 99 = not on approved list. */
export function getPastorChannelScore(channelId: string, channelTitle: string): number {
  const id = channelId || "";
  const name = (channelTitle || "").toLowerCase();

  if (BLOCKED_CHANNEL_IDS.includes(id) || BLOCKED_NAME_FRAGMENTS.some((f) => name.includes(f))) {
    return 50;
  }
  if (TIER_1_CHANNEL_IDS.includes(id)) return 0;
  if (TIER_2_CHANNEL_IDS.includes(id)) return 10;
  if (TIER_3_CHANNEL_IDS.includes(id)) return 20;
  if (TIER_1_NAME_FRAGMENTS.some((f) => name.includes(f))) return 1;
  if (TIER_2_NAME_FRAGMENTS.some((f) => name.includes(f))) return 11;
  if (TIER_3_NAME_FRAGMENTS.some((f) => name.includes(f))) return 21;
  return 99;
}

export function isBlockedVideoItem(item: YouTubeSearchItem): boolean {
  const channelId = item.snippet?.channelId || "";
  const channelTitle = item.snippet?.channelTitle || "";
  const title = (item.snippet?.title || "").toLowerCase();
  if (getPastorChannelScore(channelId, channelTitle) === 50) return true;
  return BLOCKED_TITLE_FRAGMENTS.some((f) => title.includes(f));
}

export function isBlockedPastorChannel(channelId: string, channelTitle: string): boolean {
  return getPastorChannelScore(channelId, channelTitle) === 50;
}

export function rankPastorYouTubeItems(items: YouTubeSearchItem[]): YouTubeSearchItem[] {
  return [...items]
    .filter((item) => !isBlockedVideoItem(item))
    .sort((a, b) => {
      const aScore = getPastorChannelScore(a.snippet?.channelId || "", a.snippet?.channelTitle || "");
      const bScore = getPastorChannelScore(b.snippet?.channelId || "", b.snippet?.channelTitle || "");
      return aScore - bScore;
    });
}

export function pickPastorYouTubeItem(
  items: YouTubeSearchItem[],
  allowNonListedFallback = false,
): YouTubeSearchItem | null {
  if (!items.length) return null;
  const ranked = rankPastorYouTubeItems(items);
  const approved = ranked.filter(
    (item) => getPastorChannelScore(item.snippet?.channelId || "", item.snippet?.channelTitle || "") < 99,
  );
  if (approved.length) return approved[0];
  if (allowNonListedFallback && ranked.length) return ranked[0];
  return null;
}

/** For OpenAI prompts — tier list + removed ministries */
export const PASTOR_TIER_AI_GUIDE = `Use ONLY approved pastors from Shepherd's Path tiers. Every searchQuery MUST include one approved pastor name.

Tier 1 (default — truth, conviction, scripture authority): Phillip Anthony Mitchell (2819 Church), Tony Evans (The Urban Alternative), Matt Chandler (The Village Church), Jack Hibbs (Real Life with Jack Hibbs), Allen Jackson (Allen Jackson Ministries), Dharius Daniels (Change Church).

Tier 2 (structured, biblical depth): Jentezen Franklin (Free Chapel), T.D. Jakes (The Potter's House).

Tier 3 (cultural bridge, engagement): Michael Todd (Transformation Church), Tim Ross (The Basement with Tim Ross), Rich Wilkerson Jr (VOUS Church), Eric Thomas (ET The Hip Hop Preacher).

REMOVED — never search or recommend: Andy Stanley (North Point), Craig Groeschel (Life.Church), Steven Furtick (Elevation), Louie Giglio (Passion City), BibleProject, or generic Bible overview / animated summary channels.

Default to Tier 1 unless the verse clearly calls for Tier 3 engagement or encouragement.`;

/** Ordered fallback searches when the initial YouTube results have no approved channel */
const APPROVED_PASTOR_SEARCH_ORDER: { tier: 1 | 2 | 3; searchName: string }[] = [
  { tier: 1, searchName: "Tony Evans" },
  { tier: 1, searchName: "Phillip Mitchell 2819 Church" },
  { tier: 1, searchName: "Matt Chandler Village Church" },
  { tier: 1, searchName: "Jack Hibbs" },
  { tier: 1, searchName: "Allen Jackson Ministries" },
  { tier: 1, searchName: "Dharius Daniels Change Church" },
  { tier: 2, searchName: "Jentezen Franklin" },
  { tier: 2, searchName: "T.D. Jakes" },
  { tier: 3, searchName: "Michael Todd Transformation Church" },
  { tier: 3, searchName: "Tim Ross The Basement" },
  { tier: 3, searchName: "Rich Wilkerson VOUS Church" },
  { tier: 3, searchName: "Eric Thomas hip hop preacher" },
];

export function buildYouTubeSearchUrl(
  query: string,
  ytKey: string,
  opts?: { maxResults?: number; videoDuration?: "short" | "medium" | "long" },
): string {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(opts?.maxResults ?? 10),
    relevanceLanguage: "en",
    safeSearch: "strict",
    key: ytKey,
    order: "relevance",
    videoEmbeddable: "true",
  });
  if (opts?.videoDuration) params.set("videoDuration", opts.videoDuration);
  return `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
}

export async function fetchYouTubeSearchItems(url: string): Promise<YouTubeSearchItem[]> {
  const ytRes = await fetch(url);
  const ytData = (await ytRes.json()) as { items?: YouTubeSearchItem[]; error?: unknown };
  if (ytData.error) {
    console.warn("[pastorTiers] YouTube API error:", ytData.error);
    return [];
  }
  return ytData.items ?? [];
}

function normalizePastorHint(hint: string): string {
  return hint.toLowerCase().replace(/\./g, "").trim();
}

function pastorHintMatchesApproved(hint: string): boolean {
  const h = normalizePastorHint(hint);
  const all = [...TIER_1_NAME_FRAGMENTS, ...TIER_2_NAME_FRAGMENTS, ...TIER_3_NAME_FRAGMENTS];
  return all.some((f) => h.includes(f) || f.includes(h));
}

function buildFallbackQuery(pastorSearchName: string, verseReference?: string, themeHint?: string): string {
  const parts = [pastorSearchName];
  if (verseReference) parts.push(verseReference);
  if (themeHint) parts.push(themeHint.slice(0, 80));
  parts.push("sermon clip");
  return parts.join(" ");
}

/**
 * Pick the best video from search results, then search approved pastors in tier order
 * before optionally falling back to non-listed channels.
 */
export async function resolvePastorYouTubeVideo(
  initialItems: YouTubeSearchItem[],
  ytKey: string,
  context: { verseReference?: string; themeHint?: string; pastorHint?: string },
  options?: { videoDuration?: "short" | "medium" | "long"; allowNonListedFallback?: boolean },
): Promise<YouTubeSearchItem | null> {
  const fromInitial = pickPastorYouTubeItem(initialItems, false);
  if (fromInitial) return fromInitial;

  const searchOrder = [...APPROVED_PASTOR_SEARCH_ORDER];
  if (context.pastorHint && pastorHintMatchesApproved(context.pastorHint)) {
    const hintName = context.pastorHint.trim();
    const idx = searchOrder.findIndex((p) =>
      normalizePastorHint(hintName).includes(normalizePastorHint(p.searchName.split(" ")[0])),
    );
    if (idx > 0) {
      const [preferred] = searchOrder.splice(idx, 1);
      searchOrder.unshift(preferred);
    } else if (idx < 0) {
      searchOrder.unshift({ tier: 1, searchName: hintName });
    }
  }

  for (const pastor of searchOrder) {
    const query = buildFallbackQuery(pastor.searchName, context.verseReference, context.themeHint);
    const url = buildYouTubeSearchUrl(query, ytKey, {
      maxResults: 8,
      videoDuration: options?.videoDuration ?? "medium",
    });
    const items = await fetchYouTubeSearchItems(url);
    const pick = pickPastorYouTubeItem(items, false);
    if (pick) return pick;
  }

  if (options?.allowNonListedFallback) {
    return pickPastorYouTubeItem(initialItems, true);
  }
  return null;
}
