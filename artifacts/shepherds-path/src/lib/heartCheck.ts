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

// Heart check shows once per day — first open of each new calendar day.
// Repeating more often turns a sacred threshold into a form.
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

function readHeartStateCookie(): HeartState | null {
  try {
    const m = document.cookie.match(/(?:^|; )sp_hs=([^;]+)/);
    if (!m) return null;
    const [w, t, ts] = decodeURIComponent(m[1]!).split("|");
    if (!w || !ts) return null;
    return { weather: w as HeartWeather, topic: (t || null) as HeartTopic | null, ts: parseInt(ts, 10) };
  } catch { return null; }
}

function writeHeartStateCookie(state: HeartState): void {
  try {
    const val = encodeURIComponent(`${state.weather}|${state.topic ?? ""}|${state.ts}`);
    const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `sp_hs=${val}; path=/; max-age=63072000; SameSite=Lax${secure}; domain=.shepherdspathai.com`;
  } catch {}
}

function readNativeHeartState(): HeartState | null {
  try {
    const v = typeof window !== "undefined" ? (window as any).__spNativeHeartState : undefined;
    if (v && typeof v.weather === "string" && typeof v.ts === "number") {
      return {
        weather: v.weather as HeartWeather,
        topic: (v.topic ?? null) as HeartTopic | null,
        ts: v.ts,
      };
    }
  } catch {}
  return null;
}

function pickNewestHeartState(...candidates: (HeartState | null)[]): HeartState | null {
  let best: HeartState | null = null;
  for (const c of candidates) {
    if (!c) continue;
    if (!best || c.ts > best.ts) best = c;
  }
  return best;
}

export function getCurrentHeartState(): HeartState | null {
  return pickNewestHeartState(
    safeGet<HeartState | null>(KEY_CURRENT, null),
    readNativeHeartState(),
    readHeartStateCookie(),
  );
}

export function saveHeartCheck(weather: HeartWeather, topic: HeartTopic | null): void {
  const ts = Date.now();
  const entry: HeartEntry = { date: todayStr(), weather, topic, ts };
  const state: HeartState = { weather, topic, ts };
  safeSet(KEY_CURRENT, state);
  writeHeartStateCookie(state);
  safeSet(KEY_LAST_SHOWN, ts);
  syncHeartStateToNative(state);
  syncHeartLastShownToNative(ts);

  const history = safeGet<HeartEntry[]>(KEY_HISTORY, []);
  history.unshift(entry);
  safeSet(KEY_HISTORY, history.slice(0, HISTORY_MAX));
}

function getNativeHeartLastShown(): number {
  try {
    const v = typeof window !== "undefined" ? (window as any).__spNativeHeartLastShown : undefined;
    return typeof v === "number" && !isNaN(v) ? v : 0;
  } catch { return 0; }
}

function syncHeartLastShownToNative(ts: number): void {
  try {
    if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
      (window as any).__spNativeHeartLastShown = ts;
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: "sp_ui_state", heartLastShown: ts }));
    }
  } catch {}
}

function syncHeartStateToNative(state: HeartState): void {
  try {
    if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
      (window as any).__spNativeHeartState = state;
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({ type: "sp_ui_state", heartState: state, heartLastShown: state.ts }),
      );
    }
  } catch {}
}

export function markHeartCheckShown(): void {
  const ts = Date.now();
  safeSet(KEY_LAST_SHOWN, ts);
  // Also stamp today's date so daily-cadence check works cross-session
  try { localStorage.setItem("sp_heart_shown_date", todayStr()); } catch {}
  syncHeartLastShownToNative(ts);
}

export function shouldShowHeartCheck(): boolean {
  try {
    // Daily cadence: show once per calendar day (Eastern time)
    const shownDate = localStorage.getItem("sp_heart_shown_date");
    if (shownDate === todayStr()) return false;
    // Also guard against native-side last-shown within the same day
    const fromNative = getNativeHeartLastShown();
    const current = getCurrentHeartState();
    const lastShown = Math.max(
      safeGet<number>(KEY_LAST_SHOWN, 0),
      fromNative,
      current?.ts ?? 0,
    );
    // If last shown was today (within same calendar day) skip
    if (lastShown > 0) {
      const lastDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" })
        .format(new Date(lastShown));
      if (lastDate === todayStr()) return false;
    }
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

// Weather + topic combination acknowledgments.
// One sentence only. No sermon. No Scripture. No Philip. Just recognition.
const COMBO_ACK: Partial<Record<HeartWeather, Partial<Record<HeartTopic, string>>>> = {
  peaceful: {
    relationships: "Peace in your relationships is worth noticing — hold onto it.",
    finances:      "Financial peace is rare. Don't rush past it today.",
    work:          "A settled day at work is a gift. Carry it well.",
    health:        "Health and peace together — that's something to be grateful for.",
    family:        "Peace in the family. That's not nothing.",
    faith:         "Settled in your faith today. That's a good place to stand.",
    anxiety:       "A peaceful day despite the anxiety — that's strength.",
    gratitude:     "Gratitude is a gift worth noticing. Don't rush past it.",
  },
  hopeful: {
    relationships: "Hope in your relationships. Let that breathe.",
    finances:      "Financial hope is hard-won. Hold it carefully.",
    work:          "Something about work feels possible today. That matters.",
    health:        "Hope about your health — that's worth carrying forward.",
    family:        "Hopeful about family. That's a good place to begin.",
    faith:         "Hopeful in your faith. There's movement there.",
    anxiety:       "Hopeful despite the anxiety. That takes courage.",
    gratitude:     "Gratitude and hope together. That's a strong foundation.",
  },
  uncertain: {
    relationships: "Uncertainty in relationships is one of the hardest things to sit with.",
    finances:      "Financial uncertainty wears on a person. You don't have to have it figured out today.",
    work:          "Uncertain about work. That's an honest place to be.",
    health:        "Health uncertainty is its own kind of weight. You can bring that here.",
    family:        "Uncertain about family. That's okay. You don't need answers today.",
    faith:         "Uncertain in your faith. That's not the end — it might be the beginning.",
    anxiety:       "Uncertain and anxious. That's a heavy combination. You're not alone in it.",
    gratitude:     "Even uncertain, you found something to be grateful for. That's not small.",
  },
  heavy: {
    relationships: "Relational weight is one of the hardest kinds. You don't have to carry it alone today.",
    finances:      "Financial pressure is real and exhausting. You can bring that here.",
    work:          "A heavy day at work. That deserves to be acknowledged.",
    health:        "Health concerns weigh differently than other things. You can set that down here.",
    family:        "Family can carry a different kind of weight. You don't have to carry it alone today.",
    faith:         "A heavy faith season. Those are real, and they matter.",
    anxiety:       "Anxiety that's heavy — that's worth taking seriously. You can bring that here.",
    gratitude:     "Heavy, but still finding something to hold onto. That's more than it sounds.",
  },
  overwhelmed: {
    relationships: "Overwhelmed in your relationships. That's a lot to carry. You can set some of it down.",
    finances:      "Overwhelmed by finances. That's one of the heaviest places to be. You're not alone.",
    work:          "Overwhelmed at work. One thing at a time is enough.",
    health:        "Overwhelmed about health. That kind of weight deserves to be seen.",
    family:        "Overwhelmed by family. That's honest. You don't have to hold all of it right now.",
    faith:         "Overwhelmed in your faith. Sometimes that's what the journey looks like. Come in anyway.",
    anxiety:       "Overwhelmed and anxious. You were right to come here.",
    gratitude:     "Overwhelmed — but still finding gratitude. That's remarkable. Don't overlook it.",
  },
};

const WEATHER_ACK_FALLBACK: Record<HeartWeather, string> = {
  peaceful:    "Carry that peace into today.",
  hopeful:     "Hope is a gift. Let's tend it.",
  uncertain:   "That's okay. You can bring that here.",
  heavy:       "That's okay. You can bring that here.",
  overwhelmed: "You were right to come here.",
};

export function getHeartAcknowledgment(weather: HeartWeather, topic: HeartTopic | null): string {
  if (topic && COMBO_ACK[weather]?.[topic]) return COMBO_ACK[weather]![topic]!;
  return WEATHER_ACK_FALLBACK[weather];
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
