import type { SessionMindStage } from "../mind/types";
import type { TurnKind } from "../context/turnContextPackage";

export type MemorySourceKey =
  | "journalMemory"
  | "journalEcho"
  | "savedVerses"
  | "priorSession"
  | "relationshipProfile"
  | "walkingThePath"
  | "patterns";

export type RetrievalMode =
  | "off"
  | "themes"
  | "carryForward"
  | "explored"
  | "compact"
  | "conditional"
  | "full";

export type StageMemoryPolicy = Record<MemorySourceKey, RetrievalMode>;

/** Policy-driven retrieval by Session Mind stage (PR-7). */
export const STAGE_MEMORY_POLICIES: Record<SessionMindStage, StageMemoryPolicy> = {
  recognition: {
    journalMemory: "themes",
    journalEcho: "themes",
    savedVerses: "off",
    priorSession: "carryForward",
    relationshipProfile: "compact",
    walkingThePath: "off",
    patterns: "off",
  },
  exploration: {
    journalMemory: "off",
    journalEcho: "off",
    savedVerses: "conditional",
    priorSession: "off",
    relationshipProfile: "compact",
    walkingThePath: "off",
    patterns: "compact",
  },
  deepening: {
    journalMemory: "off",
    journalEcho: "off",
    savedVerses: "conditional",
    priorSession: "off",
    relationshipProfile: "compact",
    walkingThePath: "full",
    patterns: "compact",
  },
  closing: {
    journalMemory: "off",
    journalEcho: "off",
    savedVerses: "off",
    priorSession: "off",
    relationshipProfile: "off",
    walkingThePath: "off",
    patterns: "off",
  },
};

export const VERSE_RELEVANCE_THRESHOLD = 0.7;

export function isMemoryOrchestratorEnabled(): boolean {
  return process.env.PHILIP_MEMORY_POLICY !== "legacy";
}

export function resolveEffectivePolicy(
  stage: SessionMindStage,
  turnKind: TurnKind,
): StageMemoryPolicy {
  const policy = { ...STAGE_MEMORY_POLICIES[stage] };

  if (turnKind === "follow_up") {
    policy.journalMemory = "off";
    policy.journalEcho = "off";
    policy.priorSession = "off";
    if (stage !== "deepening") {
      policy.walkingThePath = "off";
    }
    if (stage === "closing") {
      policy.relationshipProfile = "off";
      policy.savedVerses = "off";
      policy.patterns = "off";
    }
  }

  return policy;
}
