import { getSessionId } from "@/lib/session";
import {
  dismissIdentityConnect,
  hasRealProEmail,
  isIdentityConnected,
  markIdentityConnected,
  setProEmail,
  linkProSessionForContinuity,
} from "@/lib/proStatus";
import { markEmailSubscribed } from "@/components/EmailSubscribe";

export const IDENTITY_DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export type ConnectIdentityInput = {
  email: string;
  name?: string;
  socialHandle?: string;
  source?: string;
  subscribeDaily?: boolean;
};

export function shouldPromptIdentityConnect(): boolean {
  if (isIdentityConnected()) return false;
  if (hasRealProEmail()) return false;
  try {
    const dismissedAt = localStorage.getItem("sp_identity_dismissed_at");
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (!Number.isNaN(elapsed) && elapsed < IDENTITY_DISMISS_COOLDOWN_MS) return false;
    }
  } catch {
    /* ignore */
  }
  return true;
}

export async function connectIdentity(input: ConnectIdentityInput): Promise<{
  connected: boolean;
  isPro?: boolean;
  message?: string;
}> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    return { connected: false, message: "Please enter a valid email address." };
  }

  const sessionId = getSessionId();
  try {
    const res = await fetch("/api/identity/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        sessionId,
        name: input.name?.trim() || undefined,
        socialHandle: input.socialHandle?.trim() || undefined,
        source: input.source ?? "pro-connect-sheet",
        subscribeDaily: input.subscribeDaily ?? true,
      }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      return { connected: false, message: data.message || "Could not save your email." };
    }

    markIdentityConnected(email);
    if (input.subscribeDaily !== false) {
      markEmailSubscribed();
    }
    void linkProSessionForContinuity(email, sessionId);
    return { connected: true, isPro: data.isPro };
  } catch {
    return { connected: false, message: "Trouble connecting — we can try again." };
  }
}

export async function subscribeWithIdentity(input: ConnectIdentityInput): Promise<{
  ok: boolean;
  message: string;
}> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  try {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: input.name?.trim() || undefined,
        socialHandle: input.socialHandle?.trim() || undefined,
        source: input.source ?? "home-footer",
        sessionId: getSessionId(),
      }),
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok || res.status === 409) {
      markEmailSubscribed();
      setProEmail(email);
      void linkProSessionForContinuity(email, getSessionId());
      return { ok: true, message: data.message || "You're subscribed!" };
    }
    return { ok: false, message: data.message || "We can try that again." };
  } catch {
    return { ok: false, message: "Could not subscribe. Please check your connection." };
  }
}

export { dismissIdentityConnect, markIdentityConnected, hasRealProEmail, isIdentityConnected };
