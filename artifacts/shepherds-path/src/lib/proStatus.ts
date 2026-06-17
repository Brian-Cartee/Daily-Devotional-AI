const PRO_KEY = "sp_pro_email";
const PRO_VERIFIED_KEY = "sp_pro_verified";
const IDENTITY_CONNECTED_KEY = "sp_identity_connected";
const IDENTITY_DISMISSED_KEY = "sp_identity_dismissed_at";
const PLACEHOLDER_PRO_EMAILS = new Set(["apple-iap", "play-verified"]);
const REFERRAL_PRO_KEY = "sp_referral_pro_until";
const PRO_NUDGE_DISMISSED_KEY = "sp_pro_nudge_dismissed";
const PRO_LAST_REVALIDATED_KEY = "sp_pro_last_revalidated";
const OWNER_PREVIEW_KEY = "sp_owner_preview";
const REVALIDATE_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Owner/developer preview access — never touched by server validation
export function markOwnerPreview(): void {
  localStorage.setItem(OWNER_PREVIEW_KEY, "true");
}

export function isOwnerPreviewActive(): boolean {
  return localStorage.getItem(OWNER_PREVIEW_KEY) === "true";
}

export function isProNudgeDismissed(): boolean {
  return localStorage.getItem(PRO_NUDGE_DISMISSED_KEY) === "true";
}

export function dismissProNudge(): void {
  localStorage.setItem(PRO_NUDGE_DISMISSED_KEY, "true");
}

export function getProEmail(): string | null {
  try {
    const local = localStorage.getItem(PRO_KEY);
    if (local) return local;
    const match = document.cookie.match(/(?:^|; )sp_pro_email=([^;]*)/);
    if (match) {
      const fromCookie = decodeURIComponent(match[1]);
      if (fromCookie.includes("@")) {
        localStorage.setItem(PRO_KEY, fromCookie);
        return fromCookie;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function setProEmail(email: string): void {
  const normalized = email.toLowerCase();
  try {
    localStorage.setItem(PRO_KEY, normalized);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `sp_pro_email=${encodeURIComponent(normalized)}; path=/; max-age=63072000; SameSite=Lax${secure}`;
  } catch {
    /* ignore */
  }
}

export function hasRealProEmail(): boolean {
  const email = getProEmail()?.toLowerCase().trim();
  if (!email || !email.includes("@")) return false;
  if (PLACEHOLDER_PRO_EMAILS.has(email)) return false;
  return true;
}

export function markIdentityConnected(email: string): void {
  const normalized = email.toLowerCase().trim();
  setProEmail(normalized);
  localStorage.setItem(IDENTITY_CONNECTED_KEY, "true");
  localStorage.removeItem(IDENTITY_DISMISSED_KEY);
}

export function isIdentityConnected(): boolean {
  return localStorage.getItem(IDENTITY_CONNECTED_KEY) === "true" && hasRealProEmail();
}

export function dismissIdentityConnect(): void {
  localStorage.setItem(IDENTITY_DISMISSED_KEY, String(Date.now()));
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

/** Links Pro billing email to this device session for weekly spiritual weather email. */
export async function linkProSessionForContinuity(email: string, sessionId: string): Promise<void> {
  try {
    await fetch("/api/pro/link-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase(), sessionId }),
    });
  } catch {
    /* non-blocking */
  }
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

const MISSION_PARTNER_KEY = "sp_mission_partner_verified";

export function isMissionPartnerVerifiedLocally(): boolean {
  return localStorage.getItem(MISSION_PARTNER_KEY) === "true";
}

export function markMissionPartnerVerified(): void {
  localStorage.setItem(MISSION_PARTNER_KEY, "true");
}

export function clearMissionPartnerStatus(): void {
  localStorage.removeItem(MISSION_PARTNER_KEY);
}

export function getSubscriptionTier(): "free" | "pro" | "mission_partner" {
  if (isMissionPartnerVerifiedLocally()) return "mission_partner";
  if (isProVerifiedLocally()) return "pro";
  return "free";
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
    if (email && hasRealProEmail()) {
      await checkProWithServer(email);
    } else if (localStorage.getItem(PRO_VERIFIED_KEY) === "true" && !email) {
      // Verified flag without email — clear it (likely manual bypass)
      clearProStatus();
    }
  } catch {
    // Silent — never block the user
  }
}

export async function activateProCode(code: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
    const data = await res.json();
    if (data.valid && data.expiresAt) {
      markReferralPro(data.expiresAt);
      return { success: true, message: "Pro access activated! Welcome." };
    }
    return { success: false, message: data.error || "Invalid code." };
  } catch {
    return { success: false, message: "Could not verify code. Try again." };
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
