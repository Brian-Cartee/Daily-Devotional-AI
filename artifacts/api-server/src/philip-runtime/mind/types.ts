import type { ConversationState } from "../../conversationState";

export type SessionMindStage = "recognition" | "exploration" | "deepening" | "closing";

export type SessionMindStateSource = "cache" | "bootstrap" | "fallback" | "disabled";

export interface SessionMind {
  version: number;
  exchangeNum: number;
  stage: SessionMindStage;
  philipSummaries: string[];
  state: ConversationState;
  phase1Included: boolean;
  canonicalTurnCount: number;
}

export interface CanonicalHistoryInput {
  situation: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  phase1Response?: string;
  phase1UserReply?: string;
}

export interface CommitSessionMindInput {
  conversationState: ConversationState;
  philipResponse: string;
  canonicalHistory: Array<{ role: "user" | "assistant"; content: string }>;
  phase1Included: boolean;
}
