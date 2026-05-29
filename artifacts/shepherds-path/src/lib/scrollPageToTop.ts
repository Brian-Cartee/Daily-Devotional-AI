import { SCROLL_TO_EXPLORE_KEY } from "@/lib/homePathsNav";

export const SCROLL_HOME_TOP_EVENT = "sp-scroll-home-top";
export const HOME_TOP_ANCHOR_ID = "sp-home-top";

let homeScrollCancel = 0;

function isNativeWebViewScrollShell(): boolean {
  return document.documentElement.dataset.spShell === "native";
}

function getNativeScrollY(): number {
  return (
    window.scrollY ||
    window.pageYOffset ||
    document.scrollingElement?.scrollTop ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

function getHomeTopAnchor(): HTMLElement | null {
  return (
    document.getElementById(HOME_TOP_ANCHOR_ID) ||
    (document.querySelector("[data-testid='home-threshold-hero']") as HTMLElement | null)
  );
}

/** Sync every scroll root WKWebView may use (finger scroll ≠ body-only). */
function setNativeScrollerTop(y: number, behavior: ScrollBehavior = "auto"): void {
  const opts: ScrollToOptions = { top: y, left: 0, behavior };
  const els: (Element | null | undefined)[] = [
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.getElementById("root"),
  ];
  for (const el of els) {
    if (!(el instanceof HTMLElement)) continue;
    try {
      el.scrollTo(opts);
    } catch {
      el.scrollTop = y;
    }
    el.scrollTop = y;
  }
  try {
    window.scrollTo(opts);
  } catch {
    window.scrollTo(0, y);
  }
}

/** Scroll to the hero anchor using the live scroll offset (works on any root). */
function scrollNativeToHomeTop(behavior: ScrollBehavior = "auto"): void {
  const anchor = getHomeTopAnchor();
  if (!anchor) {
    setNativeScrollerTop(0, behavior);
    return;
  }
  const y = Math.max(0, Math.round(anchor.getBoundingClientRect().top + getNativeScrollY()));
  setNativeScrollerTop(y, behavior);
  try {
    anchor.scrollIntoView({ block: "start", inline: "nearest", behavior });
  } catch {
    anchor.scrollIntoView(true);
  }
}

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
  if (isNativeWebViewScrollShell()) {
    setNativeScrollerTop(0, behavior);
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

/** scrollIntoView on web; native uses measured anchor offset. */
export function scrollHomeAnchorIntoView(behavior: ScrollBehavior = "auto"): void {
  if (isNativeWebViewScrollShell()) {
    scrollNativeToHomeTop(behavior);
    return;
  }
  const anchor = getHomeTopAnchor();
  if (!anchor) return;
  try {
    anchor.scrollIntoView({ block: "start", inline: "nearest", behavior });
  } catch {
    anchor.scrollIntoView(true);
  }
}

function flushNativeHomeScroll(behavior: ScrollBehavior = "auto"): void {
  scrollNativeToHomeTop(behavior);
}

export function scrollPageToTopReliable(behavior: ScrollBehavior = "auto"): void {
  if (isNativeWebViewScrollShell()) {
    flushNativeHomeScroll(behavior);
    requestAnimationFrame(() => flushNativeHomeScroll(behavior));
    window.setTimeout(() => flushNativeHomeScroll(behavior), 50);
    window.setTimeout(() => flushNativeHomeScroll(behavior), 180);
    window.setTimeout(() => flushNativeHomeScroll(behavior), 400);
    return;
  }
  scrollPageToTop(behavior);
  scrollHomeAnchorIntoView(behavior);
  requestAnimationFrame(() => {
    scrollPageToTop(behavior);
    scrollHomeAnchorIntoView(behavior);
  });
}

/** Core scroll — safe to call from listeners without re-posting to native. */
export function applyHomeScrollToTop(): void {
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
}

/** For You tab — scroll home to hero; notifies native shell once. */
export function scrollHomeToTop(): void {
  applyHomeScrollToTop();
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
