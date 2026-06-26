import { isLateNight } from "./nightMode";
import { apiSessionExtras } from "./requestExtras";
export type {
  GuidanceMessage,
  Phase1Spine,
  GuidancePhase1SpineInput,
  SessionExtras,
  BuildGuidanceResponsePayloadInput,
  BuildGuidancePhase1PayloadInput,
} from "./guidanceConversationCore";
export {
  buildPhase1SpineFields,
  buildTwoPhaseRequestMessages,
  appendUserMessage,
  appendAssistantMessage,
  commitAssistantTurn,
} from "./guidanceConversationCore";
import {
  buildGuidancePhase1Payload as buildGuidancePhase1PayloadCore,
  buildGuidanceResponsePayload as buildGuidanceResponsePayloadCore,
  type BuildGuidancePhase1PayloadInput as Phase1PayloadInput,
  type BuildGuidanceResponsePayloadInput as ResponsePayloadInput,
} from "./guidanceConversationCore";

type ResponsePayloadArgs = Omit<ResponsePayloadInput, "isLateNight" | "sessionExtras"> & {
  sessionExtras?: ResponsePayloadInput["sessionExtras"];
};

/** Canonical POST body for /api/guidance/response. */
export function buildGuidanceResponsePayload(input: ResponsePayloadArgs): Record<string, unknown> {
  return buildGuidanceResponsePayloadCore({
    ...input,
    isLateNight: isLateNight(),
    sessionExtras: input.sessionExtras ?? apiSessionExtras(),
  });
}

type Phase1PayloadArgs = Omit<Phase1PayloadInput, "sessionExtras"> & {
  sessionExtras?: Phase1PayloadInput["sessionExtras"];
};

/** Canonical POST body for /api/guidance/phase1. */
export function buildGuidancePhase1Payload(input: Phase1PayloadArgs): Record<string, unknown> {
  return buildGuidancePhase1PayloadCore({
    ...input,
    sessionExtras: input.sessionExtras ?? apiSessionExtras(),
  });
}
