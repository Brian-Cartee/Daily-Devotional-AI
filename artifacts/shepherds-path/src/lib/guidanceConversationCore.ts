export type GuidanceMessage = {
  role: "user" | "assistant";
  content: string;
};

export interface GuidanceTurnEvent {
  role: "user" | "assistant";
  content: string;
  clientTurnId?: string;
}

export interface Phase1Spine {
  phase1Response: string;
  phase1UserReply: string;
}

export interface GuidancePhase1SpineInput {
  phase1Response?: string | null;
  phase1UserReplySubmitted?: string | null;
  phase1UserReply?: string | null;
}

export interface SessionExtras {
  sessionId: string;
  isPro: boolean;
  daysWithApp: number;
}

/** Phase-1 mirror + first user reply — sent on every /response after phase 1 completes. */
export function buildPhase1SpineFields(
  input: GuidancePhase1SpineInput,
): Partial<Phase1Spine> {
  const phase1Response = input.phase1Response?.trim();
  const phase1UserReply = input.phase1UserReplySubmitted?.trim()
    || input.phase1UserReply?.trim();
  if (!phase1Response || !phase1UserReply) return {};
  return { phase1Response, phase1UserReply };
}

/** Two-phase depth: situation only in messages; spine fields carry phase-1 separately. */
export function buildTwoPhaseRequestMessages(situation: string): GuidanceMessage[] {
  const text = situation.trim();
  if (!text) return [];
  return [{ role: "user", content: text }];
}

export function appendUserMessage(
  messages: GuidanceMessage[],
  text: string,
): GuidanceMessage[] {
  const trimmed = text.trim();
  if (!trimmed) return messages;
  return [...messages, { role: "user", content: trimmed }];
}

export function appendAssistantMessage(
  messages: GuidanceMessage[],
  text: string,
): GuidanceMessage[] {
  const trimmed = text.trim();
  if (!trimmed) return messages;
  return [...messages, { role: "assistant", content: trimmed }];
}

export interface BuildGuidanceResponsePayloadInput {
  situation: string;
  messages: GuidanceMessage[];
  guidanceMode: string;
  phase1Spine?: Partial<Phase1Spine>;
  heartContext?: string;
  journeyContext?: string;
  companionMode?: "philip" | "solo";
  userName?: string;
  isLateNight?: boolean;
  sessionExtras: SessionExtras;
  conversationId?: string;
  turnEvent?: GuidanceTurnEvent;
}

export function buildGuidanceResponsePayload(
  input: BuildGuidanceResponsePayloadInput,
): Record<string, unknown> {
  const situation = input.situation.trim();
  const payload: Record<string, unknown> = {
    situation,
    messages: input.messages,
    userName: input.userName,
    guidanceMode: input.guidanceMode,
    isLateNight: input.isLateNight ?? false,
    heartContext: input.heartContext,
    journeyContext: input.journeyContext || undefined,
    companionMode: input.companionMode ?? "solo",
    ...input.phase1Spine,
    ...input.sessionExtras,
  };
  if (input.conversationId) payload.conversationId = input.conversationId;
  if (input.turnEvent?.content?.trim()) payload.turnEvent = input.turnEvent;
  return payload;
}

export function buildUserTurnEvent(content: string, clientTurnId?: string): GuidanceTurnEvent {
  return {
    role: "user",
    content: content.trim(),
    clientTurnId: clientTurnId ?? (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `turn-${Date.now()}`),
  };
}

export interface BuildGuidancePhase1PayloadInput {
  situation: string;
  situationTopicId?: string;
  userName?: string;
  heartContext?: string;
  companionMode?: "philip" | "solo";
  guidanceMode?: string;
  sessionExtras: SessionExtras;
}

export function buildGuidancePhase1Payload(
  input: BuildGuidancePhase1PayloadInput,
): Record<string, unknown> {
  return {
    situation: input.situation.trim(),
    situationTopicId: input.situationTopicId,
    userName: input.userName,
    heartContext: input.heartContext,
    companionMode: input.companionMode ?? "solo",
    guidanceMode: input.guidanceMode,
    ...input.sessionExtras,
  };
}

export function commitAssistantTurn(
  messages: GuidanceMessage[],
  assistantText: string,
): GuidanceMessage[] {
  return appendAssistantMessage(messages, assistantText);
}
