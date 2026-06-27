import { useState, useLayoutEffect } from "react";

let _active = false;
const _listeners = new Set<() => void>();

/** Sync overlay flag after splash progression is hydrated (call before React render). */
export function reconcileEntryOverlayIdle(): void {
  try {
    if (typeof document === "undefined") return;
    if (document.documentElement.dataset.spShell !== "native") {
      setEntryOverlayActive(false);
      return;
    }
    const splashVisible = !!document.querySelector('[data-testid="sp-splash-active"]');
    setEntryOverlayActive(splashVisible);
  } catch {
    setEntryOverlayActive(false);
  }
}

export function setEntryOverlayActive(active: boolean): void {
  if (_active === active) return;
  _active = active;
  _listeners.forEach((fn) => fn());
}

export function useEntryOverlayActive(): boolean {
  const [active, setActive] = useState(() => _active);
  useLayoutEffect(() => {
    setActive(_active);
    const notify = () => setActive(_active);
    _listeners.add(notify);
    return () => {
      _listeners.delete(notify);
    };
  }, []);
  return active;
}
