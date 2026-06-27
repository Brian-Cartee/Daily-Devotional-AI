import { isNativeWebViewShell } from "./platform";
import { nativeDiag } from "./nativeDiag";

const HOME_PAINT_SEL =
  '[data-testid="card-devotional"],[data-testid="home-threshold-hero"],[data-testid="bottom-nav-for-you"]';

function shouldBlockReload(bootAt: number): boolean {
  const painted = !!document.querySelector(HOME_PAINT_SEL);
  const elapsed = Date.now() - bootAt;
  if (!painted && elapsed < 45_000) {
    nativeDiag("blocked_reload_before_paint", `${elapsed}ms`);
    return true;
  }
  return false;
}

/** Old TestFlight shells call location.reload() after Apple Pro inject — kills cold start. */
export function installNativeBootGuard(): void {
  if (!isNativeWebViewShell()) return;

  const bootAt = Date.now();
  try {
    const origReload = location.reload.bind(location);
    location.reload = function (...args: Parameters<Location["reload"]>) {
      if (shouldBlockReload(bootAt)) return;
      origReload(...args);
    };
  } catch {
    // WKWebView: location.reload is read-only — patching it throws and would abort React boot.
  }
}
