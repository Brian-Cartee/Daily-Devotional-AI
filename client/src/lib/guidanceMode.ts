const STORAGE_KEY = "sp-guidance-mode";

export type GuidanceMode = "encouraging" | "coach";

export function getGuidanceMode(): GuidanceMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "coach") return "coach";
  } catch {}
  return "encouraging";
}

export function saveGuidanceMode(mode: GuidanceMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
}
