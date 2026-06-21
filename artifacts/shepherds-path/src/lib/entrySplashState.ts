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
const ONBOARDING_COMPLETE_KEY = "sp_onboarding_splashes_done";
const ONBOARDING_COMPLETE_COOKIE = "sp_osd";
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

export function isOnboardingSplashesComplete(): boolean {
  try {
    if (localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "1") return true;
    const m = document.cookie.match(/(?:^|; )sp_osd=1(?:;|$)/);
    return !!m;
  } catch {
    return false;
  }
}

function markOnboardingSplashesComplete(): void {
  try {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "1");
    const dom = `${cookieDomain()}; path=/; max-age=63072000; SameSite=Lax; Secure`;
    document.cookie = `${ONBOARDING_COMPLETE_COOKIE}=1${dom}`;
  } catch {
    /* noop */
  }
}

function resolveOnboardingCount(legacyCount: number, dailyOpens: number): number {
  if (isOnboardingSplashesComplete() || dailyOpens > 0) return ONBOARDING_SPLASH_LEN;
  return Math.max(0, Math.min(ONBOARDING_SPLASH_LEN, legacyCount));
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
  let onboarding = Math.max(0, Math.min(ONBOARDING_SPLASH_LEN, partial.onboarding ?? 0));
  const dailyDate = partial.dailyDate === today ? today : today;
  const dailyOpens =
    partial.dailyDate === today
      ? Math.max(0, Math.min(MAX_DAILY_POST_ONBOARDING_SPLASHES, partial.dailyOpens ?? 0))
      : 0;
  if (dailyOpens > 0 || isOnboardingSplashesComplete()) {
    onboarding = ONBOARDING_SPLASH_LEN;
  }
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
  hydrateSplashProg();
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
  if (normalized.onboarding >= ONBOARDING_SPLASH_LEN) {
    markOnboardingSplashesComplete();
  }
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
  hydrateSplashProg();
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
  if (prog.onboarding < ONBOARDING_SPLASH_LEN && isOnboardingSplashesComplete()) {
    prog.onboarding = ONBOARDING_SPLASH_LEN;
  }
  if (prog.dailyOpens >= MAX_DAILY_POST_ONBOARDING_SPLASHES) return null;

  let slide: SplashSlide;
  let isShortDoor = false;

  if (prog.dailyOpens === 0) {
    slide = DAILY_SPLASH_POOL[prog.dailyFeature]!;
    if (prog.dailySecond === null) {
      prog.dailySecond = pickSecondIndex(prog.dailyFeature, DAILY_SPLASH_POOL.length);
    }
  } else if (prog.dailyOpens === 1) {
    const secondIdx = prog.dailySecond ?? pickSecondIndex(prog.dailyFeature, DAILY_SPLASH_POOL.length);
    slide = DAILY_SPLASH_POOL[secondIdx]!;
    if (slide.image === DAILY_SPLASH_POOL[prog.dailyFeature]!.image) {
      const alt = (secondIdx + 1) % DAILY_SPLASH_POOL.length;
      slide = DAILY_SPLASH_POOL[alt]!;
      prog.dailySecond = alt;
    } else if (prog.dailySecond === null) {
      prog.dailySecond = secondIdx;
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

function readSplashBscCookie(): number {
  try {
    const m = document.cookie.match(/(?:^|; )sp_bsc=([^;]*)/);
    if (!m) return 0;
    const n = parseInt(decodeURIComponent(m[1]!), 10);
    return Number.isNaN(n) ? 0 : Math.max(0, Math.min(ONBOARDING_SPLASH_LEN, n));
  } catch {
    return 0;
  }
}

function readNativeOnboardingCount(): number {
  try {
    if (typeof window === "undefined") return 0;
    const n = (window as unknown as { __spNativeSplashCount?: number }).__spNativeSplashCount;
    if (typeof n !== "number" || Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(ONBOARDING_SPLASH_LEN, n));
  } catch {
    return 0;
  }
}

/** Legacy + native fallbacks when the unified JSON blob is missing (WKWebView storage wipe). */
function readLegacyOnboardingCount(): number {
  if (isOnboardingSplashesComplete()) return ONBOARDING_SPLASH_LEN;
  let max = readSplashBscCookie();
  max = Math.max(max, readNativeOnboardingCount());
  try {
    const ls = parseInt(localStorage.getItem("sp_brand_splash_count") ?? "0", 10);
    if (!Number.isNaN(ls)) max = Math.max(max, ls);
  } catch {
    /* noop */
  }
  return Math.max(0, Math.min(ONBOARDING_SPLASH_LEN, max));
}

type DailyFields = Pick<SplashProgV1, "dailyDate" | "dailyOpens" | "dailyFeature" | "dailySecond">;

function readDscCookieDaily(): DailyFields | null {
  try {
    const m = document.cookie.match(/(?:^|; )sp_dsc=([^;]*)/);
    if (!m) return null;
    const parts = decodeURIComponent(m[1]!).split("|");
    if (parts.length < 3) return null;
    const dailyDate = parts[0]!;
    const dailyOpens = parseInt(parts[1] ?? "0", 10);
    const dailyFeature = parseInt(parts[2] ?? "-1", 10);
    const secondPart = parts[3] ?? "";
    if (!dailyDate || Number.isNaN(dailyOpens)) return null;
    const poolLen = DAILY_SPLASH_POOL.length;
    const feature =
      dailyFeature >= 0 && dailyFeature < poolLen ? dailyFeature : hashDateStr(dailyDate, poolLen);
    const parsedSecond = secondPart === "" ? null : parseInt(secondPart, 10);
    const dailySecond =
      parsedSecond !== null && !Number.isNaN(parsedSecond) && parsedSecond >= 0 && parsedSecond < poolLen
        ? parsedSecond
        : pickSecondIndex(feature, poolLen);
    return {
      dailyDate,
      dailyOpens: Math.max(0, Math.min(MAX_DAILY_POST_ONBOARDING_SPLASHES, dailyOpens)),
      dailyFeature: feature,
      dailySecond,
    };
  } catch {
    return null;
  }
}

function readNativeDailyFields(): DailyFields | null {
  try {
    if (typeof window === "undefined") return null;
    const native = (
      window as unknown as {
        __spNativeDailySplash?: {
          date: string;
          count: number;
          featureIdx: number;
          secondIdx: number | null;
        };
      }
    ).__spNativeDailySplash;
    if (!native?.date) return null;
    const poolLen = DAILY_SPLASH_POOL.length;
    const feature =
      typeof native.featureIdx === "number" && native.featureIdx >= 0 && native.featureIdx < poolLen
        ? native.featureIdx
        : hashDateStr(native.date, poolLen);
    const parsedSecond = native.secondIdx;
    const dailySecond =
      typeof parsedSecond === "number" && !Number.isNaN(parsedSecond) && parsedSecond >= 0 && parsedSecond < poolLen
        ? parsedSecond
        : pickSecondIndex(feature, poolLen);
    return {
      dailyDate: native.date,
      dailyOpens: Math.max(
        0,
        Math.min(MAX_DAILY_POST_ONBOARDING_SPLASHES, typeof native.count === "number" ? native.count : 0),
      ),
      dailyFeature: feature,
      dailySecond,
    };
  } catch {
    return null;
  }
}

function readLegacyDailyFieldsFromLs(): DailyFields | null {
  try {
    const dailyDate = localStorage.getItem("sp_daily_open_date");
    if (!dailyDate) return null;
    const poolLen = DAILY_SPLASH_POOL.length;
    const dailyOpens = parseInt(localStorage.getItem("sp_daily_open_count") ?? "0", 10) || 0;
    const storedFeature = parseInt(localStorage.getItem("sp_daily_feature_idx") ?? "-1", 10);
    const dailyFeature =
      storedFeature >= 0 && storedFeature < poolLen ? storedFeature : hashDateStr(dailyDate, poolLen);
    const secondRaw = localStorage.getItem("sp_daily_second_idx");
    const parsedSecond = secondRaw === null || secondRaw === "" ? null : parseInt(secondRaw, 10);
    const dailySecond =
      parsedSecond !== null && !Number.isNaN(parsedSecond) && parsedSecond >= 0 && parsedSecond < poolLen
        ? parsedSecond
        : pickSecondIndex(dailyFeature, poolLen);
    return {
      dailyDate,
      dailyOpens: Math.max(0, Math.min(MAX_DAILY_POST_ONBOARDING_SPLASHES, dailyOpens)),
      dailyFeature,
      dailySecond,
    };
  } catch {
    return null;
  }
}

/** Best daily progress for today from cookie, native, and legacy keys. */
function readBestDailyFieldsForToday(today: string): DailyFields | null {
  const candidates = [readDscCookieDaily(), readNativeDailyFields(), readLegacyDailyFieldsFromLs()].filter(
    (c): c is DailyFields => !!c && c.dailyDate === today,
  );
  if (candidates.length === 0) return null;

  let best = candidates[0]!;
  for (const c of candidates.slice(1)) {
    if (c.dailyOpens > best.dailyOpens) best = c;
    else if (c.dailyOpens === best.dailyOpens && c.dailySecond !== null && best.dailySecond === null) best = c;
  }
  return best;
}

function mergeDailyFieldsIfAhead(prog: SplashProgV1, today: string): SplashProgV1 {
  const bestDaily = readBestDailyFieldsForToday(today);
  if (!bestDaily) return prog;
  if (prog.dailyDate !== today) {
    return { ...prog, ...bestDaily };
  }
  if (
    bestDaily.dailyOpens > prog.dailyOpens ||
    (bestDaily.dailyOpens === prog.dailyOpens && prog.dailySecond === null && bestDaily.dailySecond !== null)
  ) {
    return { ...prog, ...bestDaily };
  }
  return prog;
}

export function hydrateSplashProg(): void {
  const legacyOnboarding = readLegacyOnboardingCount();
  const today = easternDate();
  const fromCookie = readCookieJson();
  const fromLs = readLsJson();

  if (!fromCookie && !fromLs) {
    const daily = readBestDailyFieldsForToday(today) ?? freshDailyFields(today);
    const onboarding = resolveOnboardingCount(legacyOnboarding, daily.dailyOpens);
    if (onboarding > 0 || daily.dailyOpens > 0) {
      saveSplashProg({ v: 1, onboarding, lastImage: null, ...daily });
    }
    return;
  }

  let merged = fromCookie && fromLs ? mergeProg(fromCookie, fromLs) : (fromCookie ?? fromLs!);
  merged = {
    ...merged,
    onboarding: Math.max(merged.onboarding, resolveOnboardingCount(legacyOnboarding, merged.dailyOpens)),
  };
  const withDaily = mergeDailyFieldsIfAhead(merged, today);
  if (withDaily.onboarding >= ONBOARDING_SPLASH_LEN) {
    markOnboardingSplashesComplete();
  }
  if (
    withDaily.onboarding !== merged.onboarding ||
    withDaily.dailyOpens !== merged.dailyOpens ||
    withDaily.dailyDate !== merged.dailyDate ||
    withDaily.dailyFeature !== merged.dailyFeature ||
    withDaily.dailySecond !== merged.dailySecond
  ) {
    saveSplashProg(withDaily);
  }
}

if (typeof window !== "undefined") {
  hydrateSplashProg();
  try {
    const fromCookie = readCookieJson();
    const fromLs = readLsJson();
    const prog = fromCookie && fromLs ? mergeProg(fromCookie, fromLs) : fromCookie ?? fromLs;
    if (prog && prog.onboarding >= ONBOARDING_SPLASH_LEN) {
      markOnboardingSplashesComplete();
    }
  } catch {
    /* noop */
  }
}
