/** Coach mode — consent before direct pastoral courage. */

const SESSION_KEY = "sp_coach_consent_session";

export function hasCoachConsentThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function grantCoachConsentThisSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* noop */
  }
}

export function revokeCoachConsentThisSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}
