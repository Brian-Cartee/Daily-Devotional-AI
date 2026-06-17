import type { FreeTrialState } from "@/lib/subscriptionTier";

let cachedFreeTrial: FreeTrialState | null = null;

export function getCachedFreeTrial(): FreeTrialState | null {
  return cachedFreeTrial;
}

export function setCachedFreeTrial(state: FreeTrialState | null): void {
  cachedFreeTrial = state;
}

export async function refreshFreeTrial(): Promise<FreeTrialState | null> {
  try {
    const res = await fetch("/api/subscription/free-trial");
    if (!res.ok) return null;
    const data = await res.json();
    const state: FreeTrialState = {
      active: !!data.active,
      feature: data.feature ?? null,
      label: data.label ?? null,
      endsAt: data.endsAt ?? null,
      daysRemaining: Number(data.daysRemaining) || 0,
    };
    setCachedFreeTrial(state);
    return state;
  } catch {
    return null;
  }
}
