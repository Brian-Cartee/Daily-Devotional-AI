import type { PhilipMove } from "../../conversationState";
import type { SessionMindStage, SessionMindStateSource } from "../mind/types";
import type { PlannerSource } from "../planner/mindPlanner";
import type { TrustBand } from "../mind/relationshipProfile";
import type { MemorySourceKey } from "../memory/policies";

export type PhilipLane =
  | "first_response"
  | "two_phase"
  | "follow_up"
  | "closing"
  | "session_send_off"
  | "post_send_off"
  | "dependency"
  | "reciprocal"
  | "repetition_recovery"
  | "guarded"
  | "standard"
  | "sendoff_reopen";

export type PhilipGate =
  | "already_sent_off"
  | "user_closing"
  | "session_send_off"
  | "dependency_redirect"
  | "post_send_off"
  | "ambiguous_risk"
  | "reciprocal_lane"
  | "repetition_recovery"
  | "force_sit"
  | "no_question_mode"
  | "question_count_retry"
  | "mechanical_construction"
  | "invented_session_history"
  | "invented_unsupported_detail"
  | "sendoff_pushback"
  | "guarded_reask_block";

export interface PhilipTurnMetadata {
  philipRuntimeVersion: string;
  exchangeNum: number;
  lane: PhilipLane;
  move: PhilipMove | "sit" | null;
  gates: PhilipGate[];
  engine: "claude" | "gpt-4o" | null;
  mechanical: boolean;
  /** Session Mind — present when PHILIP_SESSION_MIND is enabled. */
  mindVersion?: number;
  mindStage?: SessionMindStage;
  stateSource?: SessionMindStateSource;
  phase1Included?: boolean;
  canonicalHistoryTurns?: number;
  questionsAskedCount?: number;
  /** Turn Context Package — tcp when structured context is active. */
  contextMode?: "tcp" | "legacy";
  tcpCharCount?: number;
  plannerSource?: PlannerSource;
  relationshipTrustBand?: TrustBand;
  relationshipSessionCount?: number;
  memoryPolicy?: "stage" | "legacy";
  memoryRetrievalChars?: number;
  memorySectionsIncluded?: MemorySourceKey[];
}

export interface GuidanceTurnResult {
  text: string;
  metadata: PhilipTurnMetadata;
}

/** Outcome of pre-turn mechanical gates — may short-circuit before the reasoning engine. */
export interface PreTurnGateResult {
  gates: PhilipGate[];
  lane: PhilipLane | null;
  shortCircuitText: string | null;
  isClosing: boolean;
  alreadySentOff: boolean;
  needsDependency: boolean;
  isSendOff: boolean;
  noQuestionMode: boolean;
}
