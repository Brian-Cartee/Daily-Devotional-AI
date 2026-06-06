import { useEffect, useState } from "react";
import {
  getSubscribedEmail,
  isEmailSubscribed,
  markEmailSubscribed,
} from "@/components/EmailSubscribe";
import { getStoredSubscriberEmail, isEmailSubscribedLocally } from "@/lib/subscriberState";
import { getProEmail, hasRealProEmail } from "@/lib/proStatus";
import { getSessionId } from "@/lib/session";

type SubscriptionStatus = {
  subscribed: boolean;
  email: string | null;
  hydrated: boolean;
};

/** Any email this device has stored from subscribe, Pro connect, or notification prefs. */
export function getKnownDeviceEmail(): string | null {
  const stored = getStoredSubscriberEmail();
  if (stored) return stored;

  if (hasRealProEmail()) {
    const pro = getProEmail();
    if (pro?.includes("@")) return pro.toLowerCase();
  }

  return null;
}

let syncPromise: Promise<SubscriptionStatus> | null = null;

export async function syncEmailSubscriptionStatus(): Promise<SubscriptionStatus> {
  if (isEmailSubscribedLocally()) {
    const knownEmail = getStoredSubscriberEmail();
    if (knownEmail) {
      void linkStoredEmailToSession(knownEmail);
    }
    return {
      subscribed: true,
      email: knownEmail ?? getSubscribedEmail(),
      hydrated: true,
    };
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
      if (data.subscribed) {
        markEmailSubscribed(data.email ?? undefined);
        return {
          subscribed: true,
          email: data.email ?? getSubscribedEmail(),
          hydrated: true,
        };
      }
    } catch {
      /* non-blocking */
    }

    return {
      subscribed: false,
      email: null,
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
      markEmailSubscribed(data.email);
    }
  } catch {
    /* non-blocking */
  }
}

export function useEmailSubscriptionStatus(): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>(() => ({
    subscribed: isEmailSubscribedLocally(),
    email: getStoredSubscriberEmail() ?? getSubscribedEmail(),
    hydrated: isEmailSubscribedLocally(),
  }));

  useEffect(() => {
    if (status.hydrated) return;
    let cancelled = false;
    void syncEmailSubscriptionStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, [status.hydrated]);

  return status;
}
