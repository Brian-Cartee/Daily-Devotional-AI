/** TestFlight / WebView milestone + error logging (posts to React Native shell). */
import { postToNativeShell } from "./nativePostMessage";

export function nativeDiag(event: string, detail = ""): void {
  if (typeof window === "undefined") return;

  const entry = {
    type: "sp_diag" as const,
    event,
    detail: String(detail).slice(0, 500),
    ts: Date.now(),
  };

  const win = window as Window & {
    __spDiagLogs?: typeof entry[];
    ReactNativeWebView?: { postMessage: (s: string) => void };
    __spDiag?: (event: string, detail?: string) => void;
  };

  const logs = win.__spDiagLogs ?? [];
  logs.push(entry);
  if (logs.length > 48) logs.shift();
  win.__spDiagLogs = logs;

  try {
    postToNativeShell(entry);
  } catch {
    /* noop */
  }

  try {
    window.dispatchEvent(new CustomEvent("sp-diag", { detail: entry }));
  } catch {
    /* noop */
  }
}

export function isNativeDiagPanelEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("debugNative");
  } catch {
    return false;
  }
}
