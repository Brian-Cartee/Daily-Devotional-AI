import { SCROLL_TO_EXPLORE_KEY } from "@/lib/homePathsNav";

export const SCROLL_HOME_TOP_EVENT = "sp-scroll-home-top";

/** Scroll the main document to the top (window + scrollingElement + html/body). */
export function scrollPageToTop(behavior: ScrollBehavior = "auto"): void {
  try {
    window.scrollTo({ top: 0, left: 0, behavior });
  } catch {
    window.scrollTo(0, 0);
  }
  const se = document.scrollingElement;
  if (se) se.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/** iOS WKWebView often applies scroll after paint — retry briefly. */
export function scrollPageToTopReliable(behavior: ScrollBehavior = "auto"): void {
  scrollPageToTop(behavior);
  requestAnimationFrame(() => scrollPageToTop(behavior));
  requestAnimationFrame(() => {
    requestAnimationFrame(() => scrollPageToTop(behavior));
  });
  window.setTimeout(() => scrollPageToTop(behavior), 50);
  window.setTimeout(() => scrollPageToTop(behavior), 180);
}

/** For You tab — true top of home; clears explore-scroll intent and URL hash. */
export function scrollHomeToTop(): void {
  try {
    sessionStorage.removeItem(SCROLL_TO_EXPLORE_KEY);
  } catch {
    /* noop */
  }
  if (window.location.hash) {
    const url = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, "", url);
  }
  scrollPageToTopReliable("auto");
  window.dispatchEvent(new Event(SCROLL_HOME_TOP_EVENT));
}
