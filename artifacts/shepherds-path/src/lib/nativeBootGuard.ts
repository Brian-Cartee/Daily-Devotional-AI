import { isNativeWebViewShell } from "./platform";
import { nativeDiag } from "./nativeDiag";

const HOME_PAINT_SEL =
  '[data-testid="card-devotional"],[data-testid="home-threshold-hero"],[data-testid="bottom-nav-for-you"]';

/** Old TestFlight shells call location.reload() after Apple Pro inject — kills cold start. */
export function installNativeBootGuard(): void {
  if (!isNativeWebViewShell()) return;

  const bootAt = Date.now();
  const origReload = location.reload.bind(location);

  location.reload = function (...args: Parameters<Location["reload"]>) {
    const painted = !!document.querySelector(HOME_PAINT_SEL);
    const elapsed = Date.now() - bootAt;
    if (!painted && elapsed < 45_000) {
      nativeDiag("blocked_reload_before_paint", `${elapsed}ms`);
      document.getElementById("sp-boot-splash")?.remove();
      document.getElementById("sp-fg-cover")?.remove();
      (window as Window & { __spSignalReady?: () => void }).__spSignalReady?.();
      return;
    }
    origReload(...args);
  };
}
