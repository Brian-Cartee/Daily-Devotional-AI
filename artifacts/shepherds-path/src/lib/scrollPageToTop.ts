import { SCROLL_TO_EXPLORE_KEY } from "@/lib/homePathsNav";

export const SCROLL_HOME_TOP_EVENT = "sp-scroll-home-top";
export const HOME_TOP_ANCHOR_ID = "sp-home-top";

let homeScrollCancel = 0;

function isNativeWebViewScrollShell(): boolean {
  return document.documentElement.dataset.spShell === "native";
}

function nativeScrollElement(): HTMLElement {
  return (document.scrollingElement as HTMLElement | null) || document.body;
}

/** Native shell: body is the viewport-height scroller — only touch that element. */
function setNativeBodyScrollTop(y: number, behavior: ScrollBehavior = "auto"): void {
  const scroller = nativeScrollElement();
  try {
    scroller.scrollTo({ top: y, left: 0, behavior });
  } catch {
    scroller.scrollTop = y;
  }
  scroller.scrollTop = y;
  if (scroller !== document.body) {
    document.body.scrollTop = y;
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

export function scrollPageToTop(behavior: ScrollBehavior = "auto"): void {
  if (isNativeWebViewScrollShell()) {
    setNativeBodyScrollTop(0, behavior);
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

export function scrollHomeAnchorIntoView(behavior: ScrollBehavior = "auto"): void {
  if (isNativeWebViewScrollShell()) {
    setNativeBodyScrollTop(0, behavior);
    return;
  }
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

function flushNativeHomeScroll(behavior: ScrollBehavior = "auto"): void {
  setNativeBodyScrollTop(0, behavior);
}

export function scrollPageToTopReliable(behavior: ScrollBehavior = "auto"): void {
  if (isNativeWebViewScrollShell()) {
    flushNativeHomeScroll(behavior);
    requestAnimationFrame(() => flushNativeHomeScroll(behavior));
    window.setTimeout(() => flushNativeHomeScroll(behavior), 120);
    return;
  }
  scrollPageToTop(behavior);
  scrollHomeAnchorIntoView(behavior);
  requestAnimationFrame(() => {
    scrollPageToTop(behavior);
    scrollHomeAnchorIntoView(behavior);
  });
}

/** Scroll home to top — no native bridge ping (avoids double-scroll). */
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

/** For You tab — scroll home to hero. */
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
