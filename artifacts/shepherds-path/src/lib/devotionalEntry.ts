export type DevotionalEntryMode = "auto" | "tap";

const KEY = "sp_devotional_entry";
export const DEVOTIONAL_ENTRY_UPDATED_EVENT = "sp-devotional-entry-updated";

export function getDevotionalEntryMode(): DevotionalEntryMode {
  try {
    return localStorage.getItem(KEY) === "tap" ? "tap" : "auto";
  } catch {
    return "auto";
  }
}

export function setDevotionalEntryMode(mode: DevotionalEntryMode): void {
  try {
    localStorage.setItem(KEY, mode);
    window.dispatchEvent(new Event(DEVOTIONAL_ENTRY_UPDATED_EVENT));
  } catch {
    /* noop */
  }
}
