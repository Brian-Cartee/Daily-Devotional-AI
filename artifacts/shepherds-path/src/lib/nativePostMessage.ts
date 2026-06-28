/** Queue native bridge messages during HTML parse + module eval — prevents WKWebView sync-inject loops. */

type NativePostWindow = Window & {
  __spDeferNativePostMessage?: boolean;
  __spNativePostQueue?: string[];
  __spNativePostQueueFlushed?: boolean;
  __spPostToNative?: (payload: string | Record<string, unknown>) => void;
  __spFlushNativePostQueue?: () => void;
  ReactNativeWebView?: { postMessage: (s: string) => void };
};

function serializePayload(payload: string | Record<string, unknown>): string {
  return typeof payload === "string" ? payload : JSON.stringify(payload);
}

/** Queued while `__spDeferNativePostMessage` is true (set in index.html for native shell). */
export function postToNativeShell(payload: string | Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const win = window as NativePostWindow;
  if (win.__spDeferNativePostMessage) {
    try {
      const o = typeof payload === "string" ? (JSON.parse(payload) as Record<string, unknown>) : payload;
      if (o?.type === "sp_diag" || o?.type === "js_error") {
        postToNativeShellImmediate(payload);
        return;
      }
    } catch {
      /* fall through to queue */
    }
  }
  if (win.__spPostToNative) {
    win.__spPostToNative(payload);
    return;
  }
  postToNativeShellImmediate(payload);
}

/** Always sends immediately — use for `react_booted` after React has painted. */
export function postToNativeShellImmediate(payload: string | Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const win = window as NativePostWindow;
    win.ReactNativeWebView?.postMessage(serializePayload(payload));
  } catch {
    /* noop */
  }
}

/** Drain pre-boot queue — call once, after `react_booted`. */
export function flushNativePostMessageQueue(): void {
  if (typeof window === "undefined") return;
  const win = window as NativePostWindow;
  win.__spFlushNativePostQueue?.();
}
