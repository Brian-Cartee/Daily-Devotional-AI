import { useEffect, useState } from "react";
import {
  getSubscribedEmail,
  markEmailSubscribed,
} from "@/components/EmailSubscribe";
import {
  getStoredSubscriberEmail,
  hydrateSubscriberFromUrlParam,
  hydrateSubscriberStateFromStorage,
  isEmailSubscribedLocally,
  persistSubscriberState,
} from "@/lib/subscriberState";
import { getProEmail, hasRealProEmail } from "@/lib/proStatus";
import { getSessionId } from "@/lib/session";
import {
  getConfirmedSubscriberEmail,
  setConfirmedSubscriberEmail,
} from "@/lib/dailyEmailState";

type SubscriptionStatus = {
  subscribed: boolean;
  email: string | null;
  hydrated: boolean;
};

type StatusResponse = { subscribed?: boolean; email?: string | null };

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

/** Single source of truth for both Home footer and My rhythm email UI. */
export function isDailyEmailLinked(): boolean {
  hydrateSubscriberStateFromStorage();
  hydrateSubscriberFromUrlParam();
  if (isEmailSubscribedLocally() || !!getConfirmedSubscriberEmail() || !!getKnownDeviceEmail()) {
    return true;
  }
  try {
    const se = new URLSearchParams(window.location.search).get("se")?.trim().toLowerCase();
    if (se?.includes("@")) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function buildLocalStatus(): SubscriptionStatus {
  hydrateSubscriberStateFromStorage();
  const email = getStoredSubscriberEmail() ?? getSubscribedEmail() ?? getConfirmedSubscriberEmail();
  const subscribed = isDailyEmailLinked();
  return {
    subscribed,
    email,
    hydrated: true,
  };
}

let syncPromise: Promise<SubscriptionStatus> | null = null;

async function fetchSubscriptionStatus(query: string): Promise<StatusResponse | null> {
  try {
    const res = await fetch(`/api/subscribe/status${query}`, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as StatusResponse;
  } catch {
    return null;
  }
}

export async function syncEmailSubscriptionStatus(): Promise<SubscriptionStatus> {
  hydrateSubscriberStateFromStorage();
  hydrateSubscriberFromUrlParam();
  const local = buildLocalStatus();

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const sessionId = getSessionId();
    const knownEmail = getKnownDeviceEmail();

    const attempts: string[] = [];
    const primary = new URLSearchParams();
    if (sessionId) primary.set("sessionId", sessionId);
    if (knownEmail) primary.set("email", knownEmail);
    if ([...primary.keys()].length > 0) {
      attempts.push(`?${primary.toString()}`);
    }
    if (sessionId) {
      attempts.push(`?sessionId=${encodeURIComponent(sessionId)}`);
    }
    if (knownEmail) {
      attempts.push(`?email=${encodeURIComponent(knownEmail)}`);
    }
    attempts.push("");

    for (const query of attempts) {
      const data = await fetchSubscriptionStatus(query);
      if (data?.subscribed && data.email) {
        setConfirmedSubscriberEmail(data.email);
        persistSubscriberState(data.email);
        return {
          subscribed: true,
          email: data.email,
          hydrated: true,
        };
      }
    }

    if (local.subscribed || knownEmail) {
      const email = local.email ?? knownEmail;
      if (email) {
        setConfirmedSubscriberEmail(email);
        persistSubscriberState(email);
        void linkStoredEmailToSession(email);
      }
      return {
        subscribed: true,
        email,
        hydrated: true,
      };
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
    const data = await fetchSubscriptionStatus(`?${params.toString()}`);
    if (data?.subscribed && data.email) {
      setConfirmedSubscriberEmail(data.email);
      persistSubscriberState(data.email);
    }
  } catch {
    /* non-blocking */
  }
}

export function useEmailSubscriptionStatus(): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>(() => buildLocalStatus());

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      if (cancelled) return;
      setStatus(buildLocalStatus());
    };

    void syncEmailSubscriptionStatus().then((next) => {
      if (cancelled) return;
      setStatus((prev) => ({
        subscribed: prev.subscribed || next.subscribed || isDailyEmailLinked(),
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
