import type { PhilipMove } from "../../conversationState";

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
  | "standard";

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
  | "invented_session_history";

export interface PhilipTurnMetadata {
  philipRuntimeVersion: string;
  exchangeNum: number;
  lane: PhilipLane;
  move: PhilipMove | "sit" | null;
  gates: PhilipGate[];
  engine: "claude" | "gpt-4o" | null;
  mechanical: boolean;
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
