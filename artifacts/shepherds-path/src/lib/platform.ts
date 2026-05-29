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

/** Boot HTML in index.html — gone once React has replaced #root contents */
export function hasNativeBootPlaceholder(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.getElementById("sp-boot-splash");
}

/** True when React has painted into #sp-app-mount (native shell can hide overlay) */
export function isNativeShellUiReady(): boolean {
  if (typeof document === "undefined") return false;
  const mount = document.getElementById("sp-app-mount");
  return !!(mount && mount.childElementCount > 0);
}

export function removeNativeBootPlaceholder(): void {
  if (typeof document === "undefined") return;
  document.getElementById("sp-boot-splash")?.remove();
}

function postNativeAppReady(): void {
  try {
    (
      window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } }
    ).ReactNativeWebView?.postMessage(JSON.stringify({ type: "app_ready" }));
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
  } catch {
    /* noop */
  }
}

/** Last resort — dismiss native splash even if boot placeholder is stuck (iOS WebView edge cases) */
export function forceNotifyNativeShellReady(): void {
  if (typeof window === "undefined") return;
  removeNativeBootPlaceholder();
  try {
    window.dispatchEvent(new Event("sp-app-ready"));
    postNativeAppReady();
  } catch {
    /* noop */
  }
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

function isMobileTouchDevice(): boolean {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  const ua = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return (coarse && narrow) || ua;
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

export function getPaymentPlatform(): "play" | "ios" | "web" {
  if (hasDigitalGoodsAPI()) return "play";
  if (isIOS() && isStandalone()) return "ios";
  return "web";
}
