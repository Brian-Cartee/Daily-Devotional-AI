import { useState, useEffect } from "react";

function computeInitialActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // data-sp-shell is set by injectedJavaScriptBeforeContentLoaded — always ready.
    if (document.documentElement.dataset.spShell !== "native") return false;
    const last = parseInt(localStorage.getItem("sp_last_active_ts") ?? "0", 10);
    // Missing timestamp = first open or force-close without bg event → show splash
    const elapsed = last > 0 ? Date.now() - last : Infinity;
    return elapsed >= 5_000;
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
