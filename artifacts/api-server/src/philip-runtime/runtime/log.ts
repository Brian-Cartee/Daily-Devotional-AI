import type { PhilipTurnMetadata } from "./types";

export const PHILIP_TURN_LOG_EVENT = "philip_runtime_turn";

/** Structured log for Philip Runtime turn metadata — no user content. */
export function logPhilipTurn(metadata: PhilipTurnMetadata, sessionId?: string): void {
  console.log(JSON.stringify(buildPhilipTurnLogEntry(metadata, sessionId)));
}

/** Dashboard-ready JSON line — safe to aggregate without PII. */
export function buildPhilipTurnLogEntry(
  metadata: PhilipTurnMetadata,
  sessionId?: string,
): Record<string, string | number | boolean | null | string[]> {
  return {
    event: PHILIP_TURN_LOG_EVENT,
    sessionId: sessionId ?? null,
    philipRuntimeVersion: metadata.philipRuntimeVersion,
    exchangeNum: metadata.exchangeNum,
    lane: metadata.lane,
    move: metadata.move ?? null,
    gates: metadata.gates,
    engine: metadata.engine,
    mechanical: metadata.mechanical,
    mindVersion: metadata.mindVersion ?? null,
    mindStage: metadata.mindStage ?? null,
    stateSource: metadata.stateSource ?? null,
    phase1Included: metadata.phase1Included ?? null,
    canonicalHistoryTurns: metadata.canonicalHistoryTurns ?? null,
    questionsAskedCount: metadata.questionsAskedCount ?? null,
    contextMode: metadata.contextMode ?? null,
    tcpCharCount: metadata.tcpCharCount ?? null,
    plannerSource: metadata.plannerSource ?? null,
    relationshipTrustBand: metadata.relationshipTrustBand ?? null,
    relationshipSessionCount: metadata.relationshipSessionCount ?? null,
    memoryPolicy: metadata.memoryPolicy ?? null,
    memoryRetrievalChars: metadata.memoryRetrievalChars ?? null,
    transcriptMode: metadata.transcriptMode ?? null,
    transcriptTurnCount: metadata.transcriptTurnCount ?? null,
    conversationId: metadata.conversationId ?? null,
    identityKernelMode: metadata.identityKernelMode ?? null,
  };
}
