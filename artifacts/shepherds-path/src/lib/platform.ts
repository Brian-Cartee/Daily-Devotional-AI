export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Boot HTML in index.html — removed once real UI has painted */
export function hasNativeBootPlaceholder(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.getElementById("sp-boot-splash");
}

/** True when home/threshold UI is actually on screen (not an empty React shell) */
export function isNativeShellUiReady(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.nativeUiReady === "1";
}

export function removeNativeBootPlaceholder(): void {
  if (typeof document === "undefined") return;
  document.getElementById("sp-boot-splash")?.remove();
  document.getElementById("sp-native-boot-placeholder")?.remove();
}

function postNativeAppReady(): void {
  const payload = JSON.stringify({ type: "app_ready" });
  try {
    (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView?.postMessage(payload);
  } catch {
    /* noop */
  }
}

/** React mounted — hide purple cross; keep web splash until home paints */
export function notifyNativeReactBooted(): void {
  if (typeof window === "undefined" || !isNativeWebViewShell()) return;
  try {
    (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView?.postMessage(JSON.stringify({ type: "react_booted" }));
  } catch {
    /* noop */
  }
}

/** Tell the App Store iOS shell to hide its loading overlay */
export function notifyNativeShellReady(): void {
  if (typeof window === "undefined") return;
  if (!isNativeShellUiReady()) return;
  try {
    window.dispatchEvent(new Event("sp-app-ready"));
    postNativeAppReady();
    (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView?.postMessage(JSON.stringify({ type: "web_ui_visible" }));
  } catch {
    /* noop */
  }
}

/** Call when a real screen (home, threshold, nav) is visible in the WebView */
export function markNativeShellUiPainted(): void {
  if (typeof document === "undefined") return;
  if (!isNativeWebViewShell()) return;
  if (isNativeShellUiReady()) return;
  document.documentElement.dataset.nativeUiReady = "1";
  removeNativeBootPlaceholder();
  void import("./nativeDiag").then(({ nativeDiag }) => nativeDiag("app_ready_sent"));
  notifyNativeShellReady();
}

/** True inside the App Store WebView shell (.mobile-build loads shepherdspathai.com) */
export function isNativeWebViewShell(): boolean {
  if (typeof window === "undefined") return false;
  if ((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView) {
    return true;
  }
  return document.documentElement.dataset.spShell === "native";
}

/** YouTube embed volume — use device side buttons on iPhone/iPad (Safari or App Store app) */
export function youtubeNeedsSideVolumeOnThisDevice(): boolean {
  return isIOS() && isMobileTouchDevice();
}

export function isMobileTouchDevice(): boolean {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  const ua = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return (coarse && narrow) || ua;
}

/** iPhone Safari or App Store shell — same two-icon top bar as native. */
export function usesCompactTopNav(): boolean {
  return isNativeWebViewShell() || (isIOS() && isMobileTouchDevice());
}

/** Mobile Safari tab bar (not PWA / not App Store WebView). */
export function isIosMobileBrowser(): boolean {
  return isIOS() && isMobileTouchDevice() && !isNativeWebViewShell() && !isStandalone();
}

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

export function isTWA(): boolean {
  return document.referrer.startsWith("android-app://") ||
    (isAndroid() && isStandalone());
}

export function hasDigitalGoodsAPI(): boolean {
  return typeof (window as any).getDigitalGoodsService === "function";
}

/** App Store WebView shell — use native Apple IAP via RevenueCat, not Stripe. */
export function shouldUseNativeAppleIap(): boolean {
  return isNativeWebViewShell();
}

export function getPaymentPlatform(): "play" | "ios" | "apple-native" | "web" {
  if (hasDigitalGoodsAPI()) return "play";
  if (shouldUseNativeAppleIap()) return "apple-native";
  if (isIOS() && isStandalone()) return "ios";
  return "web";
}
