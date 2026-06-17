import type { ProSubscriber } from "@workspace/db";

export type SubscriptionTier = "free" | "pro" | "mission_partner";

export type SubscriptionPlan =
  | "monthly"
  | "annual"
  | "mission_monthly"
  | "mission_annual"
  | "ios"
  | "android"
  | "lifetime";

export function tierFromPlan(plan: string | null | undefined): SubscriptionTier {
  if (!plan) return "pro";
  if (plan.startsWith("mission_")) return "mission_partner";
  return "pro";
}

export function tierFromSubscriber(pro: ProSubscriber | undefined | null): SubscriptionTier {
  if (!pro || pro.status !== "active") return "free";
  const rowTier = (pro as ProSubscriber & { tier?: string | null }).tier;
  if (rowTier === "mission_partner") return "mission_partner";
  if (rowTier === "pro") return "pro";
  return tierFromPlan(pro.plan);
}

export function hasPaidFeatures(tier: SubscriptionTier): boolean {
  return tier === "pro" || tier === "mission_partner";
}

export function planToCheckoutMetadata(
  plan: SubscriptionPlan,
): { stripePlan: "monthly" | "annual"; tier: SubscriptionTier; productName: string } {
  if (plan === "mission_monthly") {
    return { stripePlan: "monthly", tier: "mission_partner", productName: "Shepherd's Path Mission Partner" };
  }
  if (plan === "mission_annual") {
    return { stripePlan: "annual", tier: "mission_partner", productName: "Shepherd's Path Mission Partner" };
  }
  return {
    stripePlan: plan === "annual" ? "annual" : "monthly",
    tier: "pro",
    productName: "Shepherd's Path Pro",
  };
}
