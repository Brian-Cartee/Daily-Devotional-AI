import type { PhilipTurnMetadata } from "./types";
import type { SessionMindStage, SessionMindStateSource } from "../mind/types";
import type { PlannerSource } from "../planner/mindPlanner";
import type { TrustBand } from "../mind/relationshipProfile";

export const PHILIP_RUNTIME_VERSION_HEADER = "X-Philip-Runtime-Version";
/** @deprecated Read-only compat for older eval clients */
export const PHILIP_OS_VERSION_HEADER = "X-Philip-OS-Version";

export const PHILIP_LANE_HEADER = "X-Philip-Lane";
export const PHILIP_MOVE_HEADER = "X-Philip-Move";
export const PHILIP_GATES_HEADER = "X-Philip-Gates";
export const PHILIP_MIND_VERSION_HEADER = "X-Philip-Mind-Version";
export const PHILIP_MIND_STAGE_HEADER = "X-Philip-Mind-Stage";
export const PHILIP_STATE_SOURCE_HEADER = "X-Philip-State-Source";
export const PHILIP_PHASE1_INCLUDED_HEADER = "X-Philip-Phase1-Included";
export const PHILIP_CANONICAL_TURNS_HEADER = "X-Philip-Canonical-Turns";
export const PHILIP_QUESTIONS_ASKED_HEADER = "X-Philip-Questions-Asked";
export const PHILIP_CONTEXT_MODE_HEADER = "X-Philip-Context-Mode";
export const PHILIP_TCP_CHARS_HEADER = "X-Philip-TCP-Chars";
export const PHILIP_PLANNER_SOURCE_HEADER = "X-Philip-Planner-Source";
export const PHILIP_RELATIONSHIP_TRUST_HEADER = "X-Philip-Relationship-Trust";
export const PHILIP_RELATIONSHIP_SESSIONS_HEADER = "X-Philip-Relationship-Sessions";
export const PHILIP_MEMORY_POLICY_HEADER = "X-Philip-Memory-Policy";
export const PHILIP_MEMORY_RETRIEVAL_CHARS_HEADER = "X-Philip-Memory-Retrieval-Chars";

/** Full turn metadata parsed from response headers (no user content). */
export interface PhilipTurnHeaders {
  philipRuntimeVersion: string;
  lane: PhilipTurnMetadata["lane"];
  move: PhilipTurnMetadata["move"];
  gates: PhilipTurnMetadata["gates"];
  mindVersion: number | null;
  mindStage: SessionMindStage | null;
  stateSource: SessionMindStateSource | null;
  phase1Included: boolean | null;
  canonicalHistoryTurns: number | null;
  questionsAskedCount: number | null;
  contextMode: "tcp" | "legacy" | null;
  tcpCharCount: number | null;
  plannerSource: PlannerSource | null;
  relationshipTrustBand: TrustBand | null;
  relationshipSessionCount: number | null;
  memoryPolicy: "stage" | "legacy" | null;
  memoryRetrievalChars: number | null;
}

function parseOptionalInt(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalBool(raw: string | null): boolean | null {
  if (raw == null || raw === "") return null;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return null;
}

export function turnMetadataToHeaders(metadata: PhilipTurnMetadata): Record<string, string> {
  const headers: Record<string, string> = {
    [PHILIP_RUNTIME_VERSION_HEADER]: metadata.philipRuntimeVersion,
    [PHILIP_LANE_HEADER]: metadata.lane,
    [PHILIP_MOVE_HEADER]: metadata.move ?? "",
    [PHILIP_GATES_HEADER]: metadata.gates.join(","),
  };

  if (metadata.mindVersion != null) {
    headers[PHILIP_MIND_VERSION_HEADER] = String(metadata.mindVersion);
  }
  if (metadata.mindStage) {
    headers[PHILIP_MIND_STAGE_HEADER] = metadata.mindStage;
  }
  if (metadata.stateSource) {
    headers[PHILIP_STATE_SOURCE_HEADER] = metadata.stateSource;
  }
  if (metadata.phase1Included != null) {
    headers[PHILIP_PHASE1_INCLUDED_HEADER] = metadata.phase1Included ? "true" : "false";
  }
  if (metadata.canonicalHistoryTurns != null) {
    headers[PHILIP_CANONICAL_TURNS_HEADER] = String(metadata.canonicalHistoryTurns);
  }
  if (metadata.questionsAskedCount != null) {
    headers[PHILIP_QUESTIONS_ASKED_HEADER] = String(metadata.questionsAskedCount);
  }
  if (metadata.contextMode) {
    headers[PHILIP_CONTEXT_MODE_HEADER] = metadata.contextMode;
  }
  if (metadata.tcpCharCount != null) {
    headers[PHILIP_TCP_CHARS_HEADER] = String(metadata.tcpCharCount);
  }
  if (metadata.plannerSource) {
    headers[PHILIP_PLANNER_SOURCE_HEADER] = metadata.plannerSource;
  }
  if (metadata.relationshipTrustBand) {
    headers[PHILIP_RELATIONSHIP_TRUST_HEADER] = metadata.relationshipTrustBand;
  }
  if (metadata.relationshipSessionCount != null) {
    headers[PHILIP_RELATIONSHIP_SESSIONS_HEADER] = String(metadata.relationshipSessionCount);
  }
  if (metadata.memoryPolicy) {
    headers[PHILIP_MEMORY_POLICY_HEADER] = metadata.memoryPolicy;
  }
  if (metadata.memoryRetrievalChars != null) {
    headers[PHILIP_MEMORY_RETRIEVAL_CHARS_HEADER] = String(metadata.memoryRetrievalChars);
  }

  return headers;
}

export function parseTurnHeaders(headers: Headers): PhilipTurnHeaders {
  const gatesRaw = headers.get(PHILIP_GATES_HEADER) ?? "";
  const moveRaw = headers.get(PHILIP_MOVE_HEADER);
  const version =
    headers.get(PHILIP_RUNTIME_VERSION_HEADER)
    ?? headers.get(PHILIP_OS_VERSION_HEADER)
    ?? "";
  const stageRaw = headers.get(PHILIP_MIND_STAGE_HEADER);

  return {
    philipRuntimeVersion: version,
    lane: (headers.get(PHILIP_LANE_HEADER) ?? "standard") as PhilipTurnMetadata["lane"],
    move: moveRaw ? (moveRaw as PhilipTurnMetadata["move"]) : null,
    gates: gatesRaw ? (gatesRaw.split(",").filter(Boolean) as PhilipTurnMetadata["gates"]) : [],
    mindVersion: parseOptionalInt(headers.get(PHILIP_MIND_VERSION_HEADER)),
    mindStage: stageRaw ? (stageRaw as SessionMindStage) : null,
    stateSource: (headers.get(PHILIP_STATE_SOURCE_HEADER) as SessionMindStateSource | null) ?? null,
    phase1Included: parseOptionalBool(headers.get(PHILIP_PHASE1_INCLUDED_HEADER)),
    canonicalHistoryTurns: parseOptionalInt(headers.get(PHILIP_CANONICAL_TURNS_HEADER)),
    questionsAskedCount: parseOptionalInt(headers.get(PHILIP_QUESTIONS_ASKED_HEADER)),
    contextMode: (headers.get(PHILIP_CONTEXT_MODE_HEADER) as "tcp" | "legacy" | null) ?? null,
    tcpCharCount: parseOptionalInt(headers.get(PHILIP_TCP_CHARS_HEADER)),
    plannerSource: (headers.get(PHILIP_PLANNER_SOURCE_HEADER) as PlannerSource | null) ?? null,
    relationshipTrustBand: (headers.get(PHILIP_RELATIONSHIP_TRUST_HEADER) as TrustBand | null) ?? null,
    relationshipSessionCount: parseOptionalInt(headers.get(PHILIP_RELATIONSHIP_SESSIONS_HEADER)),
    memoryPolicy: (headers.get(PHILIP_MEMORY_POLICY_HEADER) as "stage" | "legacy" | null) ?? null,
    memoryRetrievalChars: parseOptionalInt(headers.get(PHILIP_MEMORY_RETRIEVAL_CHARS_HEADER)),
  };
}
