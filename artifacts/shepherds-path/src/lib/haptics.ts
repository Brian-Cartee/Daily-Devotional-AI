import { useReducedMotionPreference } from "@/hooks/use-reduced-motion";

type HapticLevel = "soft" | "medium";

export function fireHaptic(level: HapticLevel = "soft"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(level === "medium" ? 14 : 8);
  } catch {
    /* no-op */
  }
}

/** Optional helper for components that disable haptics with reduced motion. */
export function useGentleHaptics() {
  const reduceMotion = useReducedMotionPreference();
  return (level: HapticLevel = "soft") => {
    if (reduceMotion) return;
    fireHaptic(level);
  };
}
