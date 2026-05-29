/** Scroll the main document to the top (window + html/body for native WebView shells). */
export function scrollPageToTop(behavior: ScrollBehavior = "auto"): void {
  try {
    window.scrollTo({ top: 0, left: 0, behavior });
  } catch {
    window.scrollTo(0, 0);
  }
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
