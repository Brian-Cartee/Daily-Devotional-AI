import { useState, useEffect } from "react";

function computeInitialActive(): boolean {
  // Default false — LandingHome sets this when a full-screen overlay is actually visible.
  // Guessing "splash will show" here hid the top/bottom nav for the whole session.
  return false;
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
