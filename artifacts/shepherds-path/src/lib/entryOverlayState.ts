import { useState, useEffect } from "react";
import { isNativeWebViewShell } from "@/lib/platform";
import { shouldShowHomeEntry } from "@/components/HomeEntryScreen";

function computeInitialActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (!isNativeWebViewShell()) return false;
    const last = parseInt(localStorage.getItem("sp_last_active_ts") ?? "0", 10);
    return Date.now() - last >= 5_000 && shouldShowHomeEntry(true);
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
