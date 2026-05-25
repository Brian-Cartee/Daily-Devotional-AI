/** Touch-first phones — YouTube IFrame API volume is unsupported on most mobile browsers */
export function isMobileTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  const ua = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return (coarse && narrow) || ua;
}
