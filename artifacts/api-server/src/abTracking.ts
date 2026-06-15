/**
 * Outcome tracking for Talk It Through prompt A/B test.
 * Uses existing ai_usage_logs — no schema migration required.
 */

import { db } from "./db";
import { aiUsageLogs } from "@workspace/db";
import type { PromptVariant } from "./talkItThroughVariants";

const sessionMessageCounts = new Map<string, number>();

export function incrementMessageCount(sessionId: string): number {
  const count = (sessionMessageCounts.get(sessionId) ?? 0) + 1;
  sessionMessageCounts.set(sessionId, count);
  return count;
}

export function getMessageCount(sessionId: string): number {
  return sessionMessageCounts.get(sessionId) ?? 0;
}

export async function logAbInteraction(params: {
  sessionId: string;
  variant: PromptVariant;
  phase: "phase1" | "response";
  messageCount: number;
  crisisTriggered?: boolean;
}): Promise<void> {
  try {
    const featureTag = params.crisisTriggered
      ? `guidance_ab_${params.variant}_CRISIS`
      : `guidance_ab_${params.variant}_${params.phase}_msg${params.messageCount}`;
    await db.insert(aiUsageLogs).values({
      sessionId: params.sessionId,
      feature: featureTag,
      daysWithApp: 0,
      platform: "web",
    });
  } catch {
    // Non-blocking — never let tracking break the conversation
  }
}

export function detectCrisisSignal(text: string): boolean {
  const lower = text.toLowerCase();
  const signals = [
    "kill myself", "end my life", "suicide", "suicidal",
    "want to die", "self harm", "self-harm", "cutting myself",
    "hurt myself", "don't want to be here", "not worth living",
    "end it all", "can't go on",
  ];
  return signals.some(s => lower.includes(s));
}
