const CRISIS_REENTRY_KEY = "sp_guidance_crisis_reentry_at";
const PHILIP_DISCLAIMER_KEY = "sp_guidance_philip_disclaimer_shown";
const REENTRY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function markGuidanceCrisisEncounter(): void {
  try {
    localStorage.setItem(CRISIS_REENTRY_KEY, new Date().toISOString());
  } catch {
    /* noop */
  }
}

/** One-time reentry line after a prior crisis encounter (within 14 days). */
export function consumeCrisisReentryLine(): string | null {
  try {
    const raw = localStorage.getItem(CRISIS_REENTRY_KEY);
    if (!raw) return null;
    const at = new Date(raw).getTime();
    if (Number.isNaN(at) || Date.now() - at > REENTRY_WINDOW_MS) {
      localStorage.removeItem(CRISIS_REENTRY_KEY);
      return null;
    }
    localStorage.removeItem(CRISIS_REENTRY_KEY);
    return "Last time you shared something that sounded deeply painful. How are you doing today?";
  } catch {
    return null;
  }
}

export function shouldShowPhilipDisclaimer(): boolean {
  try {
    return !localStorage.getItem(PHILIP_DISCLAIMER_KEY);
  } catch {
    return false;
  }
}

export function markPhilipDisclaimerShown(): void {
  try {
    localStorage.setItem(PHILIP_DISCLAIMER_KEY, "1");
  } catch {
    /* noop */
  }
}

export const PHILIP_DISCLAIMER =
  "Philip is an AI spiritual companion — here to help you reflect, pray, and engage with Scripture. He is not a pastor, therapist, or emergency service.";

/** Set false when hands-free voice is stable — shown only in Philip voice mode. */
export const PHILIP_VOICE_TECHNICAL_NOTICE_ENABLED = true;

export const PHILIP_VOICE_TECHNICAL_NOTICE =
  "Technical work in progress — we're improving the hands-free voice experience. Thank you for your patience.";

export function isGuidanceSafetyBlock(level: string | null): boolean {
  return !!level && level !== "safe" && level !== "concerning";
}
