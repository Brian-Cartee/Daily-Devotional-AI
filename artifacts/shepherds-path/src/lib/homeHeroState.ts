/** Home hero — returning vs new, Why panel gating */

import { getWelcomeVisitCount, isIntroFlowComplete } from "@/lib/introState";
import { getRelationshipAge } from "@/lib/relationship";
import { isNativeWebViewShell } from "@/lib/platform";
import { fetchWhyPanelFromServer, pushWhyPanelToServer } from "@/lib/whyPanelApi";

const WHY_STATE_KEY = "sp_why_panel_state_v2";
const WHY_STATE_COOKIE = "sp_why_panel_state_v2";

/** Legacy keys (migrated into v2 state) */
const WHY_DISMISSED_KEY = "sp_why_panel_dismissed";
const WHY_AUTO_SHOWN_KEY = "sp_why_panel_auto_shown";
const WHY_DISMISS_COUNT_KEY = "sp_why_panel_dismiss_count";
const WHY_AUTO_SHOW_COUNT_KEY = "sp_why_panel_auto_show_count";

/** Max automatic pop-ups on web; native app shell never auto-opens (see shouldAutoOpenWhyPanel). */
export const WHY_PANEL_MAX_AUTO_SHOWS = 1;

export type WhyPanelState = {
  autoShows: number;
  dismissals: number;
  done: boolean;
};

const EMPTY_STATE: WhyPanelState = { autoShows: 0, dismissals: 0, done: false };

let memoryState: WhyPanelState | null = null;
let hydratePromise: Promise<WhyPanelState> | null = null;

function parseState(raw: string | null): WhyPanelState | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<WhyPanelState>;
    const autoShows = Math.max(0, Number(o.autoShows) || 0);
    const dismissals = Math.max(0, Number(o.dismissals) || 0);
    const done =
      o.done === true ||
      autoShows >= WHY_PANEL_MAX_AUTO_SHOWS ||
      dismissals >= WHY_PANEL_MAX_AUTO_SHOWS;
    return { autoShows, dismissals, done };
  } catch {
    return null;
  }
}

function readCookie(key: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function writeCookie(key: string, value: string): void {
  if (typeof document === "undefined") return;
  try {
    const secure = typeof location !== "undefined" && location.protocol === "https:" ? ";Secure" : "";
    document.cookie = `${key}=${encodeURIComponent(value)};path=/;max-age=63072000;SameSite=Lax${secure}`;
  } catch {
    /* noop */
  }
}

function readLegacyCounts(): WhyPanelState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    let autoShows = 0;
    let dismissals = 0;
    const dismissRaw = localStorage.getItem(WHY_DISMISS_COUNT_KEY);
    const autoRaw = localStorage.getItem(WHY_AUTO_SHOW_COUNT_KEY);
    if (dismissRaw) dismissals = Math.max(dismissals, parseInt(dismissRaw, 10) || 0);
    if (autoRaw) autoShows = Math.max(autoShows, parseInt(autoRaw, 10) || 0);
    if (localStorage.getItem(WHY_DISMISSED_KEY) === "1") dismissals = WHY_PANEL_MAX_AUTO_SHOWS;
    if (localStorage.getItem(WHY_AUTO_SHOWN_KEY) === "1") autoShows = Math.max(autoShows, WHY_PANEL_MAX_AUTO_SHOWS);
    if (autoShows === 0 && dismissals === 0) return null;
    const done =
      autoShows >= WHY_PANEL_MAX_AUTO_SHOWS || dismissals >= WHY_PANEL_MAX_AUTO_SHOWS;
    return { autoShows, dismissals, done };
  } catch {
    return null;
  }
}

function mergeWhyPanelState(a: WhyPanelState, b: WhyPanelState): WhyPanelState {
  const autoShows = Math.max(a.autoShows, b.autoShows);
  const dismissals = Math.max(a.dismissals, b.dismissals);
  const done =
    a.done ||
    b.done ||
    autoShows >= WHY_PANEL_MAX_AUTO_SHOWS ||
    dismissals >= WHY_PANEL_MAX_AUTO_SHOWS;
  return { autoShows, dismissals, done };
}

function loadWhyPanelStateLocal(): WhyPanelState {
  let state: WhyPanelState | null = null;
  if (typeof localStorage !== "undefined") {
    try {
      state = parseState(localStorage.getItem(WHY_STATE_KEY));
    } catch {
      /* noop */
    }
  }
  if (!state) state = parseState(readCookie(WHY_STATE_COOKIE));
  if (!state) state = readLegacyCounts();
  return state ?? { ...EMPTY_STATE };
}

function notifyNativeWhyPanelState(state: WhyPanelState): void {
  if (!isNativeWebViewShell()) return;
  try {
    (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "sp_why_panel_state", state }),
    );
  } catch {
    /* noop */
  }
}

/** Load server caps first (fixes iOS WebView losing localStorage between launches). */
export function hydrateWhyPanelFromServer(): Promise<WhyPanelState> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    memoryState = null;
    const local = loadWhyPanelStateLocal();
    const remote = await fetchWhyPanelFromServer();
    const merged = remote ? mergeWhyPanelState(local, remote) : local;
    persistWhyPanelState(merged, { skipRemote: true });
    return merged;
  })();

  return hydratePromise;
}

/** Persist to memory, localStorage, cookie, and server. */
export function persistWhyPanelState(
  state: WhyPanelState,
  opts?: { skipRemote?: boolean },
): void {
  const normalized: WhyPanelState = {
    autoShows: Math.max(0, state.autoShows),
    dismissals: Math.max(0, state.dismissals),
    done:
      state.done ||
      state.autoShows >= WHY_PANEL_MAX_AUTO_SHOWS ||
      state.dismissals >= WHY_PANEL_MAX_AUTO_SHOWS,
  };
  memoryState = normalized;
  const json = JSON.stringify(normalized);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(WHY_STATE_KEY, json);
      if (normalized.done) {
        localStorage.setItem(WHY_DISMISSED_KEY, "1");
        localStorage.setItem(WHY_AUTO_SHOWN_KEY, "1");
      }
      localStorage.setItem(WHY_DISMISS_COUNT_KEY, String(normalized.dismissals));
      localStorage.setItem(WHY_AUTO_SHOW_COUNT_KEY, String(normalized.autoShows));
    } catch {
      /* noop */
    }
  }
  writeCookie(WHY_STATE_COOKIE, json);
  notifyNativeWhyPanelState(normalized);
  if (!opts?.skipRemote) {
    pushWhyPanelToServer(normalized);
  }
}

export function getWhyPanelState(): WhyPanelState {
  if (memoryState) return memoryState;
  memoryState = loadWhyPanelStateLocal();
  return memoryState;
}

export function isWhyPanelAutoComplete(): boolean {
  return getWhyPanelState().done;
}

export function getWhyPanelDismissCount(): number {
  return getWhyPanelState().dismissals;
}

export function getWhyPanelAutoShowCount(): number {
  return getWhyPanelState().autoShows;
}

export function hasWhyPanelDismissed(): boolean {
  return isWhyPanelAutoComplete();
}

export function hasWhyPanelAutoShown(): boolean {
  return getWhyPanelAutoShowCount() >= WHY_PANEL_MAX_AUTO_SHOWS;
}

/** User closed the sheet (X, swipe, backdrop, CTA). */
export function markWhyPanelDismissed(): void {
  const state = getWhyPanelState();
  const next: WhyPanelState = {
    autoShows: state.autoShows,
    dismissals: state.dismissals + 1,
    done: false,
  };
  next.done =
    next.dismissals >= WHY_PANEL_MAX_AUTO_SHOWS ||
    next.autoShows >= WHY_PANEL_MAX_AUTO_SHOWS;
  persistWhyPanelState(next);
}

/** Auto-open actually displayed (not merely scheduled). */
export function markWhyPanelAutoShown(): void {
  const state = getWhyPanelState();
  const next: WhyPanelState = {
    autoShows: state.autoShows + 1,
    dismissals: state.dismissals,
    done: false,
  };
  next.done =
    next.autoShows >= WHY_PANEL_MAX_AUTO_SHOWS ||
    next.dismissals >= WHY_PANEL_MAX_AUTO_SHOWS;
  persistWhyPanelState(next);
}

/**
 * Auto-open “Why we built this” at most once on web only.
 * App shell: never auto-open (manual link on home). See index.html __SP_DISABLE_WHY_AUTO_OPEN.
 */
export function shouldAutoOpenWhyPanel(): boolean {
  if (typeof window !== "undefined") {
    if ((window as Window & { __SP_DISABLE_WHY_AUTO_OPEN?: boolean }).__SP_DISABLE_WHY_AUTO_OPEN) {
      return false;
    }
  }
  if (isNativeWebViewShell()) {
    return false;
  }

  const state = getWhyPanelState();
  if (state.done) return false;
  if (state.dismissals >= WHY_PANEL_MAX_AUTO_SHOWS) return false;
  if (state.autoShows >= WHY_PANEL_MAX_AUTO_SHOWS) return false;

  const visits = getWelcomeVisitCount();
  return visits <= 1 && !isIntroFlowComplete();
}

/** Day 2+ — verse before Talk It Through on home */
export function isReturningHomeHero(): boolean {
  return getRelationshipAge() >= 2 || getWelcomeVisitCount() >= 2 || isIntroFlowComplete();
}
