const PRO_KEY = "sp_pro_email";
const PRO_VERIFIED_KEY = "sp_pro_verified";
const REFERRAL_PRO_KEY = "sp_referral_pro_until";
const PRO_NUDGE_DISMISSED_KEY = "sp_pro_nudge_dismissed";
const PRO_LAST_REVALIDATED_KEY = "sp_pro_last_revalidated";
const REVALIDATE_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours

export function isProNudgeDismissed(): boolean {
  return localStorage.getItem(PRO_NUDGE_DISMISSED_KEY) === "true";
}

export function dismissProNudge(): void {
  localStorage.setItem(PRO_NUDGE_DISMISSED_KEY, "true");
}

export function getProEmail(): string | null {
  return localStorage.getItem(PRO_KEY);
}

export function setProEmail(email: string): void {
  localStorage.setItem(PRO_KEY, email.toLowerCase());
}

export function clearProStatus(): void {
  localStorage.removeItem(PRO_KEY);
  localStorage.removeItem(PRO_VERIFIED_KEY);
}

export function markProVerified(email?: string): void {
  const resolved = email ?? getProEmail() ?? "play-verified";
  localStorage.setItem(PRO_KEY, resolved.toLowerCase());
  localStorage.setItem(PRO_VERIFIED_KEY, "true");
}

export function markReferralPro(expiresAt: string): void {
  localStorage.setItem(REFERRAL_PRO_KEY, expiresAt);
}

export function clearReferralPro(): void {
  localStorage.removeItem(REFERRAL_PRO_KEY);
}

export function isReferralProActive(): boolean {
  const until = localStorage.getItem(REFERRAL_PRO_KEY);
  if (!until) return false;
  return new Date(until) > new Date();
}

export function isProVerifiedLocally(): boolean {
  if (isReferralProActive()) return true;
  return localStorage.getItem(PRO_VERIFIED_KEY) === "true" && !!localStorage.getItem(PRO_KEY);
}

export async function checkProWithServer(email: string): Promise<boolean> {
  try {
    const res = await fetch("/api/stripe/check-pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.isPro) {
      markProVerified(email);
      return true;
    } else {
      clearProStatus();
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Silently revalidates Pro status with the server every 8 hours.
 * This closes the localStorage bypass gap — even if someone manually
 * sets localStorage flags, the server truth will correct them within 8 hours.
 * Called on app mount; runs in the background without affecting UX.
 */
export async function silentlyRevalidatePro(): Promise<void> {
  try {
    const lastRaw = localStorage.getItem(PRO_LAST_REVALIDATED_KEY);
    const lastTime = lastRaw ? parseInt(lastRaw, 10) : 0;
    if (Date.now() - lastTime < REVALIDATE_INTERVAL_MS) return;

    localStorage.setItem(PRO_LAST_REVALIDATED_KEY, String(Date.now()));

    const email = getProEmail();
    if (email) {
      await checkProWithServer(email);
    } else if (localStorage.getItem(PRO_VERIFIED_KEY) === "true") {
      // Verified flag without email — clear it (likely manual bypass)
      clearProStatus();
    }
  } catch {
    // Silent — never block the user
  }
}

export async function checkReferralProStatus(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/referral/check-pro?sessionId=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (data.hasReferralPro && data.expiresAt) {
      markReferralPro(data.expiresAt);
      return true;
    } else {
      clearReferralPro();
      return false;
    }
  } catch {
    return false;
  }
}
