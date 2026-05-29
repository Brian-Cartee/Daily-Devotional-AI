import { SCROLL_TO_EXPLORE_KEY } from "@/lib/homePathsNav";

export const SCROLL_HOME_TOP_EVENT = "sp-scroll-home-top";
export const HOME_TOP_ANCHOR_ID = "sp-home-top";

let homeScrollCancel = 0;

function scrollRoots(): Element[] {
  const out: Element[] = [];
  const se = document.scrollingElement;
  if (se) out.push(se);
  out.push(document.documentElement, document.body);
  const root = document.getElementById("root");
  if (root) out.push(root);
  return out;
}

/** Scroll every known root — WKWebView native shell uses body as the momentum scroller. */
export function scrollPageToTop(behavior: ScrollBehavior = "auto"): void {
  const nativeShell = document.documentElement.dataset.spShell === "native";
  if (nativeShell) {
    try {
      document.body.scrollTo({ top: 0, left: 0, behavior });
    } catch {
      document.body.scrollTop = 0;
    }
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
    return;
  }
  try {
    window.scrollTo({ top: 0, left: 0, behavior });
  } catch {
    window.scrollTo(0, 0);
  }
  for (const el of scrollRoots()) {
    if (el instanceof HTMLElement) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  }
}

/** scrollIntoView is the most reliable path on iOS when scrollTo misses. */
export function scrollHomeAnchorIntoView(behavior: ScrollBehavior = "auto"): void {
  const anchor =
    document.getElementById(HOME_TOP_ANCHOR_ID) ||
    document.querySelector("[data-testid='home-threshold-hero']");
  if (!anchor) return;
  try {
    anchor.scrollIntoView({ block: "start", inline: "nearest", behavior });
  } catch {
    anchor.scrollIntoView(true);
  }
}

export function scrollPageToTopReliable(behavior: ScrollBehavior = "auto"): void {
  scrollPageToTop(behavior);
  scrollHomeAnchorIntoView(behavior);
  requestAnimationFrame(() => {
    scrollPageToTop(behavior);
    scrollHomeAnchorIntoView(behavior);
  });
}

/** For You tab — always true top; cancels pending explore scrolls. */
export function scrollHomeToTop(): void {
  homeScrollCancel += 1;
  try {
    sessionStorage.removeItem(SCROLL_TO_EXPLORE_KEY);
  } catch {
    /* noop */
  }
  if (window.location.hash) {
    const url = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, "", url);
  }
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  scrollPageToTopReliable("auto");
  try {
    (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView?.postMessage(JSON.stringify({ type: "scroll_home_top" }));
  } catch {
    /* noop */
  }
  window.dispatchEvent(new Event(SCROLL_HOME_TOP_EVENT));
}

export function captureHomeScrollGeneration(): number {
  return homeScrollCancel;
}

export function isExploreScrollCancelled(atGeneration: number): boolean {
  return atGeneration !== homeScrollCancel;
}
