import { useState, useEffect } from "react";

let _active = false;
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
