/**
 * Unified entry splash progression — one JSON blob mirrored to localStorage + cookie.
 * iOS WKWebView can drop localStorage between kills; cookie with domain is the backup.
 */

import {
  DAILY_DOOR_SPLASH,
  DAILY_SPLASH_POOL,
  MAX_DAILY_POST_ONBOARDING_SPLASHES,
} from "./dailySplash";

export const ONBOARDING_SPLASH_LEN = 5;
const PROG_LS_KEY = "sp_splash_prog";
const PROG_COOKIE_KEY = "sp_splash_prog";
const SESSION_COMMIT_KEY = "sp_entry_splash_committed";

export type SplashProgV1 = {
  v: 1;
  /** Lifetime onboarding splashes already shown (0–5). */
  onboarding: number;
  dailyDate: string;
  dailyOpens: number;
  dailyFeature: number;
  dailySecond: number | null;
  lastImage: string | null;
};

export type SplashSlide = {
  image: string;
  headline: string;
  subline: string | null;
  cta: string;
};

function easternDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function cookieDomain(): string {
  try {
    const host = window.location.hostname.replace(/^www\./, "");
    if (host === "shepherdspathai.com" || host.endsWith(".shepherdspathai.com")) {
      return "; domain=.shepherdspathai.com";
    }
  } catch {
    /* noop */
  }
  return "";
}

function readCookieJson(): SplashProgV1 | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${PROG_COOKIE_KEY}=([^;]*)`));
    if (!m) return null;
    const parsed = JSON.parse(decodeURIComponent(m[1]!)) as Partial<SplashProgV1>;
    if (parsed.v !== 1 || typeof parsed.onboarding !== "number") return null;
    return normalizeProg(parsed);
  } catch {
    return null;
  }
}

function readLsJson(): SplashProgV1 | null {
  try {
    const raw = localStorage.getItem(PROG_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SplashProgV1>;
    if (parsed.v !== 1 || typeof parsed.onboarding !== "number") return null;
    return normalizeProg(parsed);
  } catch {
    return null;
  }
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
  let idx = (featureIdx + 1 + (hashDateStr(easternDate(), poolLen) % (poolLen - 1))) % poolLen;
  if (idx === featureIdx) idx = (idx + 1) % poolLen;
  return idx;
}

function freshDailyFields(today: string): Pick<SplashProgV1, "dailyDate" | "dailyOpens" | "dailyFeature" | "dailySecond"> {
  const feature = hashDateStr(today, DAILY_SPLASH_POOL.length);
  return {
    dailyDate: today,
    dailyOpens: 0,
    dailyFeature: feature,
    dailySecond: pickSecondIndex(feature, DAILY_SPLASH_POOL.length),
  };
}

function normalizeProg(partial: Partial<SplashProgV1>): SplashProgV1 {
  const today = easternDate();
  const poolLen = DAILY_SPLASH_POOL.length;
  const onboarding = Math.max(0, Math.min(ONBOARDING_SPLASH_LEN, partial.onboarding ?? 0));
  const dailyDate = partial.dailyDate === today ? today : today;
  const dailyOpens =
    partial.dailyDate === today
      ? Math.max(0, Math.min(MAX_DAILY_POST_ONBOARDING_SPLASHES, partial.dailyOpens ?? 0))
      : 0;
  const dailyFeature =
    typeof partial.dailyFeature === "number" && partial.dailyFeature >= 0 && partial.dailyFeature < poolLen
      ? partial.dailyFeature
      : hashDateStr(today, poolLen);
  const dailySecond =
    typeof partial.dailySecond === "number" && partial.dailySecond >= 0 && partial.dailySecond < poolLen
      ? partial.dailySecond
      : pickSecondIndex(dailyFeature, poolLen);
  return {
    v: 1,
    onboarding,
    dailyDate,
    dailyOpens,
    dailyFeature,
    dailySecond,
    lastImage: partial.lastImage ?? null,
  };
}

function mergeProg(a: SplashProgV1, b: SplashProgV1): SplashProgV1 {
  const today = easternDate();
  const onboarding = Math.max(a.onboarding, b.onboarding);
  let dailyDate = today;
  let dailyOpens = 0;
  let dailyFeature = hashDateStr(today, DAILY_SPLASH_POOL.length);
  let dailySecond = pickSecondIndex(dailyFeature, DAILY_SPLASH_POOL.length);
  let lastImage = a.lastImage ?? b.lastImage;

  for (const src of [a, b]) {
    if (src.dailyDate !== today) continue;
    if (src.dailyOpens > dailyOpens) {
      dailyOpens = src.dailyOpens;
      dailyDate = src.dailyDate;
      dailyFeature = src.dailyFeature;
      dailySecond = src.dailySecond;
      lastImage = src.lastImage ?? lastImage;
    }
  }

  return { v: 1, onboarding, dailyDate, dailyOpens, dailyFeature, dailySecond, lastImage };
}

export function loadSplashProg(): SplashProgV1 {
  const today = easternDate();
  const fromCookie = readCookieJson();
  const fromLs = readLsJson();
  let prog: SplashProgV1;
  if (fromCookie && fromLs) prog = mergeProg(fromCookie, fromLs);
  else if (fromCookie) prog = fromCookie;
  else if (fromLs) prog = fromLs;
  else {
    const daily = freshDailyFields(today);
    prog = { v: 1, onboarding: 0, lastImage: null, ...daily };
  }
  if (prog.dailyDate !== today) {
    prog = { ...prog, ...freshDailyFields(today), lastImage: prog.lastImage };
  }
  return prog;
}

export function saveSplashProg(prog: SplashProgV1): void {
  const normalized = normalizeProg(prog);
  const json = JSON.stringify(normalized);
  try {
    localStorage.setItem(PROG_LS_KEY, json);
    localStorage.setItem("sp_brand_splash_count", String(normalized.onboarding));
    localStorage.setItem("sp_daily_open_date", normalized.dailyDate);
    localStorage.setItem("sp_daily_open_count", String(normalized.dailyOpens));
    localStorage.setItem("sp_daily_feature_idx", String(normalized.dailyFeature));
    if (normalized.dailySecond !== null) {
      localStorage.setItem("sp_daily_second_idx", String(normalized.dailySecond));
    }
  } catch {
    /* private mode */
  }
  try {
    const dom = `${cookieDomain()}; path=/; max-age=63072000; SameSite=Lax; Secure`;
    document.cookie = `${PROG_COOKIE_KEY}=${encodeURIComponent(json)}${dom}`;
    document.cookie = `sp_bsc=${normalized.onboarding}${dom}`;
    const dsc = `${normalized.dailyDate}|${normalized.dailyOpens}|${normalized.dailyFeature}|${normalized.dailySecond ?? ""}`;
    document.cookie = `sp_dsc=${encodeURIComponent(dsc)}${dom}`;
  } catch {
    /* noop */
  }
  try {
    if (typeof window !== "undefined") {
      (window as unknown as { __spNativeSplashCount?: number }).__spNativeSplashCount = normalized.onboarding;
      (window as unknown as { __spNativeDailySplash?: object }).__spNativeDailySplash = {
        date: normalized.dailyDate,
        count: normalized.dailyOpens,
        featureIdx: normalized.dailyFeature,
        secondIdx: normalized.dailySecond,
      };
      const wv = (window as unknown as { ReactNativeWebView?: { postMessage: (s: string) => void } })
        .ReactNativeWebView;
      if (wv) {
        wv.postMessage(
          JSON.stringify({
            type: "sp_ui_state",
            splashCount: normalized.onboarding,
            splashProg: json,
            dailySplash: {
              date: normalized.dailyDate,
              count: normalized.dailyOpens,
              featureIdx: normalized.dailyFeature,
              secondIdx: normalized.dailySecond,
            },
          }),
        );
      }
    }
  } catch {
    /* noop */
  }
}

/** Read-only — can we show another entry splash? */
export function canShowEntrySplash(): boolean {
  const p = loadSplashProg();
  if (p.onboarding < ONBOARDING_SPLASH_LEN) return true;
  return p.dailyOpens < MAX_DAILY_POST_ONBOARDING_SPLASHES;
}

export type AdvancedSplash = SplashSlide & { isShortDoor: boolean; slot: "onboarding" | "daily" };

/**
 * Advance progression and return the splash for this app open.
 * Call once per cold open (guarded by session commit flag).
 */
export function advanceEntrySplash(): AdvancedSplash | null {
  const prog = loadSplashProg();
  const today = easternDate();

  if (prog.onboarding < ONBOARDING_SPLASH_LEN) {
    const idx = prog.onboarding;
    const slide = ONBOARDING_SLIDES[idx];
    if (!slide) return null;
    saveSplashProg({
      ...prog,
      onboarding: idx + 1,
      lastImage: slide.image,
    });
    return { ...slide, isShortDoor: false, slot: "onboarding" };
  }

  if (prog.dailyDate !== today) {
    Object.assign(prog, freshDailyFields(today));
  }
  if (prog.dailyOpens >= MAX_DAILY_POST_ONBOARDING_SPLASHES) return null;

  let slide: SplashSlide;
  let isShortDoor = false;

  if (prog.dailyOpens === 0) {
    slide = DAILY_SPLASH_POOL[prog.dailyFeature]!;
  } else if (prog.dailyOpens === 1) {
    const secondIdx = prog.dailySecond ?? pickSecondIndex(prog.dailyFeature, DAILY_SPLASH_POOL.length);
    slide = DAILY_SPLASH_POOL[secondIdx]!;
    if (slide.image === DAILY_SPLASH_POOL[prog.dailyFeature]!.image) {
      const alt = (secondIdx + 1) % DAILY_SPLASH_POOL.length;
      slide = DAILY_SPLASH_POOL[alt]!;
      prog.dailySecond = alt;
    }
  } else {
    slide = DAILY_DOOR_SPLASH;
    isShortDoor = true;
  }

  saveSplashProg({
    ...prog,
    dailyOpens: prog.dailyOpens + 1,
    lastImage: slide.image,
  });

  return { ...slide, isShortDoor, slot: "daily" };
}

export function getOnboardingSplashCount(): number {
  return loadSplashProg().onboarding;
}

export function canShowPostOnboardingSplash(): boolean {
  const p = loadSplashProg();
  return p.onboarding >= ONBOARDING_SPLASH_LEN && p.dailyOpens < MAX_DAILY_POST_ONBOARDING_SPLASHES;
}

export function hasCommittedEntrySplashThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_COMMIT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markEntrySplashCommittedThisSession(): void {
  try {
    sessionStorage.setItem(SESSION_COMMIT_KEY, "1");
  } catch {
    /* noop */
  }
}

export function clearEntrySplashSessionCommit(): void {
  try {
    sessionStorage.removeItem(SESSION_COMMIT_KEY);
  } catch {
    /* noop */
  }
}

/** Onboarding slides — keep in sync with HomeEntryScreen SPLASH_SEQUENCE. */
export const ONBOARDING_SLIDES: SplashSlide[] = [
  { image: "/splash-door.jpg", headline: "Step inside.", subline: null, cta: "Enter" },
  { image: "/splash-road-sunset-REV.jpg", headline: "There you are.", subline: "He never left.", cta: "I'm here" },
  { image: "/splash-bible-glow-REV.jpg", headline: "He's been waiting.", subline: null, cta: "Enter" },
  { image: "/splash-mic-REV.jpg", headline: "Talk it through.", subline: "He's listening.", cta: "I'm here" },
  { image: "/splash-shepherd.jpg", headline: "The path is still here.", subline: null, cta: "Enter" },
];

/** Hydrate prog from legacy keys on first load (migration). */
export function migrateLegacySplashKeys(): void {
  if (readCookieJson() || readLsJson()) return;
  try {
    const onboarding = parseInt(localStorage.getItem("sp_brand_splash_count") ?? "0", 10) || 0;
    const today = easternDate();
    const dailyDate = localStorage.getItem("sp_daily_open_date") ?? today;
    const dailyOpens = parseInt(localStorage.getItem("sp_daily_open_count") ?? "0", 10) || 0;
    const dailyFeature = parseInt(localStorage.getItem("sp_daily_feature_idx") ?? "-1", 10);
    const secondRaw = localStorage.getItem("sp_daily_second_idx");
    const prog = normalizeProg({
      v: 1,
      onboarding,
      dailyDate,
      dailyOpens: dailyDate === today ? dailyOpens : 0,
      dailyFeature: dailyFeature >= 0 ? dailyFeature : undefined,
      dailySecond: secondRaw ? parseInt(secondRaw, 10) : null,
      lastImage: null,
    });
    saveSplashProg(prog);
  } catch {
    /* noop */
  }
}

if (typeof window !== "undefined") {
  migrateLegacySplashKeys();
}
