const DISMISS_PREFIX = "sp_witness_dismissed_";

export function isWitnessDismissed(memoryId: string): boolean {
  try {
    return localStorage.getItem(DISMISS_PREFIX + memoryId) === "1";
  } catch {
    return false;
  }
}

export function dismissWitnessLetter(memoryId: string): void {
  try {
    localStorage.setItem(DISMISS_PREFIX + memoryId, "1");
  } catch {
    /* noop */
  }
}
