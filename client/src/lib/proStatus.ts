const PRO_KEY = "sp_pro_email";
const PRO_VERIFIED_KEY = "sp_pro_verified";
const REFERRAL_PRO_KEY = "sp_referral_pro_until";

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

export function markProVerified(email: string): void {
  localStorage.setItem(PRO_KEY, email.toLowerCase());
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
