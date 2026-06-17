export type SubscriptionTier = "free" | "pro" | "mission_partner";

export type FreeTrialFeature = "talk_it_through" | "listen" | "journeys";

export type FreeTrialState = {
  active: boolean;
  feature: FreeTrialFeature | null;
  label: string | null;
  endsAt: string | null;
  daysRemaining: number;
};

const TIER_KEY = "sp_subscription_tier";

export function getStoredSubscriptionTier(): SubscriptionTier {
  const raw = localStorage.getItem(TIER_KEY);
  if (raw === "mission_partner" || raw === "pro") return raw;
  return "free";
}

export function setStoredSubscriptionTier(tier: SubscriptionTier): void {
  if (tier === "free") localStorage.removeItem(TIER_KEY);
  else localStorage.setItem(TIER_KEY, tier);
}

export function clearStoredSubscriptionTier(): void {
  localStorage.removeItem(TIER_KEY);
}

export function hasPaidTier(tier: SubscriptionTier): boolean {
  return tier === "pro" || tier === "mission_partner";
}

export function hasListenEntitlement(tier: SubscriptionTier, trial: FreeTrialState | null): boolean {
  if (tier === "mission_partner") return true;
  if (tier === "pro") return true;
  if (trial?.active && trial.feature === "listen") return true;
  return false;
}

export function hasTalkItThroughEntitlement(tier: SubscriptionTier, trial: FreeTrialState | null): boolean {
  if (hasPaidTier(tier)) return true;
  return !!(trial?.active && trial.feature === "talk_it_through");
}

export function hasJourneyEntitlement(tier: SubscriptionTier, trial: FreeTrialState | null): boolean {
  if (hasPaidTier(tier)) return true;
  return !!(trial?.active && trial.feature === "journeys");
}
