export function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
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
