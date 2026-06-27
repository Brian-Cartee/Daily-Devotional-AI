import { isNativeWebViewShell } from "./platform";

/** No-op — build 198+ native shell no longer reloads mid-boot; patching location.reload caused WKWebView stack overflows. */
export function installNativeBootGuard(): void {
  if (!isNativeWebViewShell()) return;
}
