import { getSessionId } from "@/lib/session";
import { getSubscriptionTier, isProVerifiedLocally } from "@/lib/proStatus";
import { hasTalkItThroughEntitlement, type FreeTrialState } from "@/lib/subscriptionTier";
import { getCachedFreeTrial } from "@/lib/freeTrialState";

export const GUIDANCE_WEEKLY_LIMIT_MESSAGE =
  "You've had 3 conversations this week. Upgrade to Pro for unlimited Talk It Through access.";

export type GuidanceWeeklyAllowance = {
  unlimited: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
};

let cachedAllowance: GuidanceWeeklyAllowance | null = null;

export function getCachedGuidanceWeeklyAllowance(): GuidanceWeeklyAllowance | null {
  return cachedAllowance;
}

export function canStartGuidanceConversation(trial: FreeTrialState | null = getCachedFreeTrial()): boolean {
  if (hasTalkItThroughEntitlement(getSubscriptionTier(), trial)) return true;
  if (!cachedAllowance || cachedAllowance.unlimited) return true;
  return (cachedAllowance.remaining ?? 0) > 0;
}

export async function refreshGuidanceWeeklyAllowance(): Promise<GuidanceWeeklyAllowance> {
  const sessionId = getSessionId();
  const tier = getSubscriptionTier();
  const params = new URLSearchParams({
    sessionId,
    isPro: String(isProVerifiedLocally()),
    subscriptionTier: tier,
  });
  const res = await fetch(`/api/guidance/weekly-allowance?${params}`);
  const data = await res.json();
  cachedAllowance = {
    unlimited: !!data.unlimited,
    used: Number(data.used) || 0,
    limit: data.limit ?? null,
    remaining: data.remaining ?? null,
  };
  return cachedAllowance;
}
