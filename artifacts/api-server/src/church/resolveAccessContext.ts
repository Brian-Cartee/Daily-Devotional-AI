import type { ChurchPlan } from "@workspace/db";
import { storage } from "../storage";
import { tierFromSubscriber } from "../subscriptionTier";
import type { AccessContext, UserTier } from "./types";
import { churchStorage } from "./storage";

async function resolveUserTier(sessionId: string): Promise<UserTier> {
  const isPro = await storage.isSessionPro(sessionId);
  if (!isPro) return "free";

  const subscriber = await storage.getActiveSubscriberBySession(sessionId);
  if (subscriber?.email) {
    const pro = await storage.getProSubscriberByEmail(subscriber.email);
    const tier = tierFromSubscriber(pro);
    if (tier !== "free") return tier;
  }

  return "pro";
}

export async function resolveAccessContext(
  sessionId: string,
  churchIdOrSlug?: string,
): Promise<AccessContext> {
  if (!sessionId?.trim()) {
    throw new Error("sessionId required");
  }

  const userTier = await resolveUserTier(sessionId.trim());
  const base: AccessContext = { sessionId: sessionId.trim(), userTier };

  if (!churchIdOrSlug?.trim()) {
    return base;
  }

  const key = churchIdOrSlug.trim();
  const church =
    (await churchStorage.getChurchById(key)) ??
    (await churchStorage.getChurchBySlug(key));

  if (!church) {
    return base;
  }

  const membership = await churchStorage.getMembership(church.id, sessionId.trim());
  if (!membership || membership.status !== "active") {
    return base;
  }

  return {
    sessionId: sessionId.trim(),
    userTier,
    church: {
      id: church.id,
      slug: church.slug,
      plan: church.plan as ChurchPlan,
      membership,
    },
  };
}

export async function resolveAccessContextForChurchId(
  sessionId: string,
  churchId: string,
): Promise<AccessContext> {
  return resolveAccessContext(sessionId, churchId);
}
