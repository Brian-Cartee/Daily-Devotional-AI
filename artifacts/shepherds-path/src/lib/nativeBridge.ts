import { isNativeWebViewShell } from "@/lib/platform";

/** True when the native shell exposes the system share sheet (newer app builds). */
export function shareViaNativeShell(payload: {
  title?: string;
  text: string;
  url?: string;
}): boolean {
  if (typeof window === "undefined" || !isNativeWebViewShell()) return false;
  try {
    (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: "share",
        title: payload.title ?? "Shepherd's Path",
        text: payload.text,
        url: payload.url,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Ask the App Store shell to open the native Apple IAP subscription screen. */
export function openNativeSubscription(): boolean {
  if (typeof window === "undefined" || !isNativeWebViewShell()) return false;
  try {
    (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView?.postMessage(JSON.stringify({ type: "open_subscription" }));
    return true;
  } catch {
    return false;
  }
}
