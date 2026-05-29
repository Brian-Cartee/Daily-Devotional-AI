/** Elements that mean the home shell has real UI (native overlay + splash can dismiss). */
export const NATIVE_UI_READY_SELECTORS = [
  '[data-testid="card-devotional"]',
  '[data-testid="bottom-nav-for-you"]',
  '[data-testid="home-threshold-hero"]',
  "#sp-home-top",
  '[data-testid="text-threshold-welcome"]',
  '[data-testid="threshold-arrival"]',
  '[data-testid="btn-threshold-enter"]',
].join(",");

export function hasNativeUiReadyElement(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.dataset.nativeUiReady === "1") return true;
  return !!document.querySelector(NATIVE_UI_READY_SELECTORS);
}
