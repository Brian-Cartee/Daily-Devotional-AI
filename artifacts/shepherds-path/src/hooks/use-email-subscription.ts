import { useEffect, useState } from "react";
import {
  getSubscribedEmail,
  isEmailSubscribed,
  markEmailSubscribed,
} from "@/components/EmailSubscribe";
import { getProEmail, hasRealProEmail } from "@/lib/proStatus";
import { getSessionId } from "@/lib/session";

type SubscriptionStatus = {
  subscribed: boolean;
  email: string | null;
  hydrated: boolean;
};

let syncPromise: Promise<SubscriptionStatus> | null = null;

export async function syncEmailSubscriptionStatus(): Promise<SubscriptionStatus> {
  if (isEmailSubscribed()) {
    return {
      subscribed: true,
      email: getSubscribedEmail(),
      hydrated: true,
    };
  }

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const sessionId = getSessionId();
    const params = new URLSearchParams({ sessionId });
    const knownEmail = getSubscribedEmail() || (hasRealProEmail() ? getProEmail() : null);
    if (knownEmail?.includes("@")) {
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

export function useEmailSubscriptionStatus(): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>(() => ({
    subscribed: isEmailSubscribed(),
    email: getSubscribedEmail(),
    hydrated: isEmailSubscribed(),
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
