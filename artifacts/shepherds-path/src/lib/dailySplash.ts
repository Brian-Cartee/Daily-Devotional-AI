/** Post-onboarding daily entry splashes: 2 curated pool images + short door anchor. */

export type DailySplashEntry = {
  image: string;
  headline: string;
  subline: string | null;
  cta: string;
};

export const DAILY_OPEN_DATE_KEY = "sp_daily_open_date";
export const DAILY_OPEN_COUNT_KEY = "sp_daily_open_count";
const DAILY_SECOND_IDX_KEY = "sp_daily_second_idx";
const DAILY_FEATURE_IDX_KEY = "sp_daily_feature_idx";
const DAILY_COOKIE_KEY = "sp_dsc";

/** Showcase splashes per Eastern day — excludes onboarding art (those are lifetime-only). */
export const DAILY_SPLASH_POOL: DailySplashEntry[] = [
  { image: "/splash-forest.jpg", headline: "Stillness waits.", subline: null, cta: "Enter" },
  { image: "/splash-well.jpg", headline: "Come as you are.", subline: null, cta: "Enter" },
  { image: "/splash-candle.jpg", headline: "Light in the quiet.", subline: null, cta: "Enter" },
  { image: "/splash-pew.jpg", headline: "Take a seat.", subline: null, cta: "I'm here" },
  { image: "/splash-prayer.jpg", headline: "He's listening.", subline: null, cta: "Enter" },
  { image: "/splash-cobblestone.jpg", headline: "One step at a time.", subline: null, cta: "Enter" },
  { image: "/splash-bible-sun-REV.jpg", headline: "Morning mercies.", subline: null, cta: "Enter" },
];

export const DAILY_DOOR_SPLASH: DailySplashEntry = {
  image: "/splash-door.jpg",
  headline: "Step inside.",
  subline: null,
  cta: "Enter",
};

/** Two pool showcases + one short door per Eastern calendar day. */
export const MAX_DAILY_POST_ONBOARDING_SPLASHES = 3;

export type NativeDailySplashState = {
  date: string;
  count: number;
  featureIdx: number;
  secondIdx: number | null;
};

function getEasternDateStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function readCookieValue(name: string): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]!) : null;
  } catch {
    return null;
  }
}

function writeDailyCookie(state: DailySplashState): void {
  try {
    const second = state.secondIdx === null ? "" : String(state.secondIdx);
    const val = `${state.date}|${state.count}|${state.featureIdx}|${second}`;
    document.cookie = `${DAILY_COOKIE_KEY}=${encodeURIComponent(val)};path=/;max-age=172800;SameSite=Lax;Secure`;
  } catch {
    /* noop */
  }
}

function readDailyCookie(): DailySplashState | null {
  const raw = readCookieValue(DAILY_COOKIE_KEY);
  if (!raw) return null;
  const parts = raw.split("|");
  if (parts.length < 3) return null;
  const date = parts[0] ?? "";
  const count = parseInt(parts[1] ?? "0", 10);
  const featureIdx = parseInt(parts[2] ?? "-1", 10);
  const secondPart = parts[3] ?? "";
  if (!date || isNaN(count) || isNaN(featureIdx) || featureIdx < 0) return null;
  const secondIdx = secondPart === "" ? null : parseInt(secondPart, 10);
  return {
    date,
    count,
    featureIdx,
    secondIdx: secondIdx !== null && !isNaN(secondIdx) ? secondIdx : null,
  };
}

function readNativeDailySplash(): DailySplashState | null {
  if (typeof window === "undefined") return null;
  const native = (window as unknown as { __spNativeDailySplash?: NativeDailySplashState })
    .__spNativeDailySplash;
  if (!native?.date) return null;
  return {
    date: native.date,
    count: typeof native.count === "number" ? native.count : 0,
    featureIdx: typeof native.featureIdx === "number" ? native.featureIdx : 0,
    secondIdx:
      typeof native.secondIdx === "number" && !isNaN(native.secondIdx)
        ? native.secondIdx
        : null,
  };
}

function hashDateStr(date: string, poolLen: number): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash + date.charCodeAt(i) * (i + 7)) % poolLen;
  }
  return hash;
}

function pickSecondIndex(featureIdx: number, poolLen: number): number {
  if (poolLen <= 1) return 0;
  let idx = Math.floor(Math.random() * poolLen);
  if (idx === featureIdx) idx = (idx + 1) % poolLen;
  return idx;
}

type DailySplashState = {
  date: string;
  count: number;
  featureIdx: number;
  secondIdx: number | null;
};

function freshDailyState(today: string, poolLen: number): DailySplashState {
  return {
    date: today,
    count: 0,
    featureIdx: hashDateStr(today, poolLen),
    secondIdx: null,
  };
}

function mergeDailySources(
  today: string,
  poolLen: number,
  ...sources: Array<DailySplashState | null>
): DailySplashState {
  const valid = sources.filter((s): s is DailySplashState => !!s && s.date === today);
  if (valid.length === 0) return freshDailyState(today, poolLen);

  let best = valid[0]!;
  for (const s of valid.slice(1)) {
    if (s.count > best.count) best = s;
    else if (s.count === best.count && s.secondIdx !== null && best.secondIdx === null) best = s;
  }
  return best;
}

function readDailyState(): DailySplashState {
  const today = getEasternDateStr();
  const poolLen = DAILY_SPLASH_POOL.length;

  const fromLocal: DailySplashState | null = (() => {
    const lastDate = storageGet(DAILY_OPEN_DATE_KEY);
    if (lastDate !== today) return null;
    const count = parseInt(storageGet(DAILY_OPEN_COUNT_KEY) ?? "0", 10) || 0;
    const storedFeature = parseInt(storageGet(DAILY_FEATURE_IDX_KEY) ?? "-1", 10);
    const featureIdx =
      storedFeature >= 0 && storedFeature < poolLen
        ? storedFeature
        : hashDateStr(today, poolLen);
    const secondRaw = storageGet(DAILY_SECOND_IDX_KEY);
    const secondIdx =
      secondRaw === null || secondRaw === "" ? null : parseInt(secondRaw, 10);
    return {
      date: today,
      count: isNaN(count) ? 0 : count,
      featureIdx,
      secondIdx: secondIdx !== null && !isNaN(secondIdx) ? secondIdx : null,
    };
  })();

  return mergeDailySources(today, poolLen, fromLocal, readDailyCookie(), readNativeDailySplash());
}

function syncDailySplashToNative(state: DailySplashState): void {
  try {
    if (typeof window !== "undefined" && (window as unknown as { ReactNativeWebView?: { postMessage: (s: string) => void } }).ReactNativeWebView) {
      (window as unknown as { ReactNativeWebView: { postMessage: (s: string) => void } }).ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "sp_ui_state",
          dailySplash: {
            date: state.date,
            count: state.count,
            featureIdx: state.featureIdx,
            secondIdx: state.secondIdx,
          },
        }),
      );
    }
  } catch {
    /* noop */
  }
}

function writeDailyState(state: DailySplashState): void {
  storageSet(DAILY_OPEN_DATE_KEY, state.date);
  storageSet(DAILY_OPEN_COUNT_KEY, String(state.count));
  storageSet(DAILY_FEATURE_IDX_KEY, String(state.featureIdx));
  if (state.secondIdx !== null) {
    storageSet(DAILY_SECOND_IDX_KEY, String(state.secondIdx));
  } else {
    try {
      localStorage.removeItem(DAILY_SECOND_IDX_KEY);
    } catch {
      /* noop */
    }
  }
  writeDailyCookie(state);
  if (typeof window !== "undefined") {
    (window as unknown as { __spNativeDailySplash?: NativeDailySplashState }).__spNativeDailySplash = {
      date: state.date,
      count: state.count,
      featureIdx: state.featureIdx,
      secondIdx: state.secondIdx,
    };
  }
  syncDailySplashToNative(state);
}

function splashForSlot(state: DailySplashState): { entry: DailySplashEntry; isShortDoor: boolean } | null {
  if (state.count >= MAX_DAILY_POST_ONBOARDING_SPLASHES) return null;
  if (state.count === 0) {
    return { entry: DAILY_SPLASH_POOL[state.featureIdx]!, isShortDoor: false };
  }
  if (state.count === 1) {
    const secondIdx =
      state.secondIdx ?? pickSecondIndex(state.featureIdx, DAILY_SPLASH_POOL.length);
    return { entry: DAILY_SPLASH_POOL[secondIdx]!, isShortDoor: false };
  }
  return { entry: DAILY_DOOR_SPLASH, isShortDoor: true };
}

/** Read-only: should we show a post-onboarding splash today? */
export function canShowPostOnboardingSplash(): boolean {
  const state = readDailyState();
  return state.count < MAX_DAILY_POST_ONBOARDING_SPLASHES;
}

export type ResolvedDailySplash = DailySplashEntry & { isShortDoor: boolean };

/** Pick today's splash and advance the daily counter (call once per app open). */
export function resolvePostOnboardingSplash(): ResolvedDailySplash | null {
  const state = readDailyState();
  const picked = splashForSlot(state);
  if (!picked) return null;

  const next: DailySplashState = {
    ...state,
    count: state.count + 1,
  };
  if (state.count === 0) {
    next.secondIdx = pickSecondIndex(state.featureIdx, DAILY_SPLASH_POOL.length);
  }
  writeDailyState(next);

  return { ...picked.entry, isShortDoor: picked.isShortDoor };
}

/** Preload pool images in the background. */
export function preloadDailySplashImages(): void {
  if (typeof window === "undefined") return;
  for (const { image } of DAILY_SPLASH_POOL) {
    const img = new Image();
    img.src = image;
  }
  const door = new Image();
  door.src = DAILY_DOOR_SPLASH.image;
}
