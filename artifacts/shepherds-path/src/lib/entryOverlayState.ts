import { useState, useEffect } from "react";
import { getBrandSplashCount } from "./introState";

const BRAND_SPLASH_SEQUENCE_LEN = 5;

function computeInitialActive(): boolean {
  try {
    if (typeof document === "undefined") return false;
    if (document.documentElement.dataset.spShell !== "native") return false;
    // Hide nav on first paint while brand splash (door / Philip) mounts.
    return getBrandSplashCount() < BRAND_SPLASH_SEQUENCE_LEN;
  } catch {
    return false;
  }
}

let _active = computeInitialActive();
const _listeners = new Set<() => void>();

export function setEntryOverlayActive(active: boolean) {
  if (_active === active) return;
  _active = active;
  _listeners.forEach((fn) => fn());
}

export function useEntryOverlayActive(): boolean {
  const [active, setActive] = useState(_active);
  useEffect(() => {
    const notify = () => setActive(_active);
    _listeners.add(notify);
    return () => { _listeners.delete(notify); };
  }, []);
  return active;
}
