/** Heart check — "How is your heart today?" persistence and trend logic. */

export type HeartWeather = "peaceful" | "hopeful" | "uncertain" | "heavy" | "overwhelmed";
export type HeartTopic =
  | "relationships" | "finances" | "work" | "health"
  | "family" | "faith" | "anxiety" | "gratitude";

export interface HeartEntry {
  date: string;       // YYYY-MM-DD eastern
  weather: HeartWeather;
  topic: HeartTopic | null;
  ts: number;
}

export interface HeartState {
  weather: HeartWeather;
  topic: HeartTopic | null;
  ts: number;
}

const KEY_CURRENT  = "sp_heart_current";
const KEY_HISTORY  = "sp_heart_history";
const KEY_LAST_SHOWN = "sp_heart_last_shown";

const SHOW_INTERVAL_MS  = 3 * 60 * 60 * 1000;  // 3 hours min between prompts
const TREND_WINDOW_DAYS = 7;
const TREND_MIN_ENTRIES = 3;                     // need ≥3 recent entries to surface a trend
const HISTORY_MAX       = 30;

function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function safeSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function getCurrentHeartState(): HeartState | null {
  return safeGet<HeartState | null>(KEY_CURRENT, null);
}

export function saveHeartCheck(weather: HeartWeather, topic: HeartTopic | null): void {
  const entry: HeartEntry = { date: todayStr(), weather, topic, ts: Date.now() };
  const state: HeartState = { weather, topic, ts: Date.now() };
  safeSet(KEY_CURRENT, state);
  safeSet(KEY_LAST_SHOWN, Date.now());

  const history = safeGet<HeartEntry[]>(KEY_HISTORY, []);
  history.unshift(entry);
  safeSet(KEY_HISTORY, history.slice(0, HISTORY_MAX));
}

export function markHeartCheckShown(): void {
  safeSet(KEY_LAST_SHOWN, Date.now());
}

export function shouldShowHeartCheck(): boolean {
  try {
    const lastShown = safeGet<number>(KEY_LAST_SHOWN, 0);
    if (Date.now() - lastShown < SHOW_INTERVAL_MS) return false;
    // Don't show if checked in today already and weather is still fresh (<3h)
    const current = getCurrentHeartState();
    if (current && Date.now() - current.ts < SHOW_INTERVAL_MS) return false;
    return true;
  } catch { return false; }
}

export type TrendType = "heavy" | "shift-lighter" | "shift-heavier" | null;

export interface HeartTrend {
  type: TrendType;
  dominantTopic: HeartTopic | null;
  message: string | null;
}

const HEAVY_WEATHER: HeartWeather[] = ["heavy", "overwhelmed"];
const LIGHT_WEATHER: HeartWeather[] = ["peaceful", "hopeful"];

export function getHeartTrend(currentWeather: HeartWeather): HeartTrend {
  const history = safeGet<HeartEntry[]>(KEY_HISTORY, []);
  const cutoff = Date.now() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  // Exclude today's entry (index 0 — just saved) from the "prior" window
  const prior = history.slice(1).filter(e => e.ts >= cutoff);

  if (prior.length < TREND_MIN_ENTRIES) return { type: null, dominantTopic: null, message: null };

  const priorHeavy = prior.filter(e => HEAVY_WEATHER.includes(e.weather));
  const heavyRatio = priorHeavy.length / prior.length;

  // Detect shift to lighter
  if (LIGHT_WEATHER.includes(currentWeather) && heavyRatio >= 0.6) {
    return {
      type: "shift-lighter",
      dominantTopic: dominantTopic(priorHeavy),
      message: "Something lighter today. That matters.",
    };
  }

  // Detect ongoing heavy — only if current also confirms it
  if (HEAVY_WEATHER.includes(currentWeather) && heavyRatio >= 0.6) {
    const topic = dominantTopic(priorHeavy);
    const topicLine = topic ? topicTrendLine(topic) : "You've been carrying a lot lately.";
    return {
      type: "heavy",
      dominantTopic: topic,
      message: topicLine,
    };
  }

  return { type: null, dominantTopic: null, message: null };
}

function dominantTopic(entries: HeartEntry[]): HeartTopic | null {
  const counts: Partial<Record<HeartTopic, number>> = {};
  for (const e of entries) {
    if (e.topic) counts[e.topic] = (counts[e.topic] ?? 0) + 1;
  }
  let max = 0, top: HeartTopic | null = null;
  for (const [t, c] of Object.entries(counts) as [HeartTopic, number][]) {
    if (c > max) { max = c; top = t; }
  }
  return max >= 2 ? top : null;
}

function topicTrendLine(topic: HeartTopic): string {
  const lines: Record<HeartTopic, string> = {
    relationships: "Something in your relationships has been weighing on you.",
    finances:      "The financial pressure has been real this week.",
    work:          "Work has been heavy on you lately.",
    health:        "You've been carrying health concerns for a few days now.",
    family:        "Family has been on your heart a lot this week.",
    faith:         "Your faith journey has felt heavy lately.",
    anxiety:       "Anxiety has followed you this week. You don't have to carry it alone.",
    gratitude:     "You've been holding gratitude close this week.",
  };
  return lines[topic];
}

/** Build a context string to inject into AI prompts */
export function buildHeartContext(state: HeartState | null): string {
  if (!state) return "";
  const age = Date.now() - state.ts;
  if (age > 12 * 60 * 60 * 1000) return ""; // stale after 12h — don't inject
  const weatherDesc: Record<HeartWeather, string> = {
    peaceful:    "at peace / settled",
    hopeful:     "hopeful / looking forward",
    uncertain:   "uncertain / unsure",
    heavy:       "heavy / burdened",
    overwhelmed: "overwhelmed / depleted",
  };
  const topicDesc: Partial<Record<HeartTopic, string>> = {
    relationships: "relationships",
    finances:      "financial stress",
    work:          "work",
    health:        "health",
    family:        "family",
    faith:         "their faith",
    anxiety:       "anxiety",
    gratitude:     "gratitude",
  };
  let ctx = `Heart check (shared moments ago): this person is feeling ${weatherDesc[state.weather]}`;
  if (state.topic) ctx += `, with ${topicDesc[state.topic]} most on their heart`;
  ctx += ".";
  return ctx;
}
