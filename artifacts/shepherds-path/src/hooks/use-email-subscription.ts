import { useEffect, useState } from "react";
import {
  getSubscribedEmail,
  markEmailSubscribed,
} from "@/components/EmailSubscribe";
import {
  getStoredSubscriberEmail,
  hydrateSubscriberStateFromStorage,
  isEmailSubscribedLocally,
  persistSubscriberState,
} from "@/lib/subscriberState";
import { getProEmail, hasRealProEmail } from "@/lib/proStatus";
import { getSessionId } from "@/lib/session";

type SubscriptionStatus = {
  subscribed: boolean;
  email: string | null;
  hydrated: boolean;
};

/** Any email this device has stored from subscribe, Pro connect, or notification prefs. */
export function getKnownDeviceEmail(): string | null {
  hydrateSubscriberStateFromStorage();

  const stored = getStoredSubscriberEmail();
  if (stored) return stored;

  if (hasRealProEmail()) {
    const pro = getProEmail();
    if (pro?.includes("@")) return pro.toLowerCase();
  }

  return null;
}

function buildLocalStatus(): SubscriptionStatus {
  hydrateSubscriberStateFromStorage();
  return {
    subscribed: isEmailSubscribedLocally(),
    email: getStoredSubscriberEmail() ?? getSubscribedEmail(),
    hydrated: true,
  };
}

let syncPromise: Promise<SubscriptionStatus> | null = null;

export async function syncEmailSubscriptionStatus(): Promise<SubscriptionStatus> {
  hydrateSubscriberStateFromStorage();

  const local = buildLocalStatus();
  if (local.subscribed && local.email) {
    void linkStoredEmailToSession(local.email);
    return local;
  }

  if (local.subscribed) {
    return local;
  }

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const sessionId = getSessionId();
    const params = new URLSearchParams({ sessionId });
    const knownEmail = getKnownDeviceEmail();
    if (knownEmail) {
      params.set("email", knownEmail);
    }

    try {
      const res = await fetch(`/api/subscribe/status?${params.toString()}`, {
        credentials: "include",
      });
      const data = (await res.json()) as { subscribed?: boolean; email?: string | null };
      if (data.subscribed && data.email) {
        persistSubscriberState(data.email);
        return {
          subscribed: true,
          email: data.email,
          hydrated: true,
        };
      }
    } catch {
      /* non-blocking */
    }

    // Never discard a local/cookie hint because the network hiccuped.
    const fallback = buildLocalStatus();
    if (fallback.subscribed) {
      if (fallback.email) void linkStoredEmailToSession(fallback.email);
      return fallback;
    }

    return {
      subscribed: false,
      email: knownEmail,
      hydrated: true,
    };
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

async function linkStoredEmailToSession(email: string): Promise<void> {
  try {
    const params = new URLSearchParams({
      sessionId: getSessionId(),
      email,
    });
    const res = await fetch(`/api/subscribe/status?${params.toString()}`, {
      credentials: "include",
    });
    const data = (await res.json()) as { subscribed?: boolean; email?: string | null };
    if (data.subscribed && data.email) {
      persistSubscriberState(data.email);
    }
  } catch {
    /* non-blocking */
  }
}

export function useEmailSubscriptionStatus(): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>(() => {
    hydrateSubscriberStateFromStorage();
    return {
      subscribed: isEmailSubscribedLocally(),
      email: getStoredSubscriberEmail() ?? getSubscribedEmail(),
      hydrated: false,
    };
  });

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      if (cancelled) return;
      const local = buildLocalStatus();
      setStatus((prev) => ({
        subscribed: prev.subscribed || local.subscribed,
        email: prev.email ?? local.email,
        hydrated: true,
      }));
    };

    void syncEmailSubscriptionStatus().then((next) => {
      if (cancelled) return;
      setStatus((prev) => ({
        subscribed: prev.subscribed || next.subscribed || isEmailSubscribedLocally(),
        email: next.email ?? prev.email ?? getStoredSubscriberEmail(),
        hydrated: true,
      }));
    });

    window.addEventListener("sp-email-subscription-updated", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("sp-email-subscription-updated", refresh);
    };
  }, []);

  return status;
}
