import {
  flushNativePostMessageQueue,
  postToNativeShellImmediate,
} from "./nativePostMessage";
import { isNativeWebViewShell, notifyNativeShellReady, removeNativeBootPlaceholder } from "./platform";

/** Real painted UI — same bar as when toolbars broke through on build 266. */
export const GATE_A_VISIBLE_SELECTORS = [
  '[data-testid="bottom-nav-for-you"]',
  '[data-testid="card-devotional"]',
  '[data-testid="home-threshold-hero"]',
  '[data-testid="sp-splash-active"]',
  '[data-testid="threshold-arrival"]',
  '[data-testid="night-shepherd"]',
].join(",");

export function hasGateAVisibleUi(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.querySelector(GATE_A_VISIBLE_SELECTORS);
}

/** Dismiss native loading overlay — only when chrome or home content is on screen. */
export function signalNativeGateAReady(source: string): boolean {
  if (!isNativeWebViewShell()) return false;
  const win = window as Window & { __spNativeBridgeNotified?: boolean; __spNativeUiPainted?: boolean };
  if (win.__spNativeBridgeNotified || win.__spNativeUiPainted) return true;
  if (!hasGateAVisibleUi()) return false;

  removeNativeBootPlaceholder();
  document.getElementById("sp-boot-splash")?.remove();
  document.getElementById("sp-fg-cover")?.remove();

  win.__spNativeBridgeNotified = true;
  win.__spNativeUiPainted = true;
  document.documentElement.dataset.nativeUiReady = "1";

  postToNativeShellImmediate({
    type: "sp_diag",
    event: "gate_a_ready",
    detail: source,
    ts: Date.now(),
  });
  postToNativeShellImmediate({ type: "web_ui_visible" });
  postToNativeShellImmediate({ type: "app_ready" });
  flushNativePostMessageQueue();
  notifyNativeShellReady();
  return true;
}
