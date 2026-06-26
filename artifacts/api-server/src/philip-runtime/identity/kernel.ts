import {
  PHILIP_BOUNDARIES,
  PHILIP_CHARACTER_CONSTITUTION,
  PHILIP_MISSION,
} from "../../philipIdentity";
import { CRISIS_PROTOCOL } from "../../talkItThroughVariants";
import {
  TALK_IT_THROUGH_FIRST_RESPONSE,
  TALK_IT_THROUGH_FOLLOW_UP,
  TALK_IT_THROUGH_GUARDED_FOLLOW_UP,
  TALK_IT_THROUGH_RESPONSE_EXAMPLES,
  TALK_IT_THROUGH_RESPONSE_SCOPE,
} from "../../talkItThroughPrompt";
import type { TurnKind } from "../context/turnContextPackage";

export const PHILIP_IDENTITY_KERNEL_VERSION = 2;

export function isIdentityKernelEnabled(): boolean {
  return process.env.PHILIP_IDENTITY_KERNEL !== "0";
}

/** Immutable Philip identity — cacheable, model-independent. */
export function buildPhilipIdentityKernel(): string {
  return `${PHILIP_CHARACTER_CONSTITUTION}

═══════════════════════════
IMMUTABLE KERNEL (v${PHILIP_IDENTITY_KERNEL_VERSION})
═══════════════════════════
Mission anchor: ${PHILIP_MISSION.split("\n")[0]}
Posture anchor: recognition before instruction; guide, not product.
Boundaries anchor: ${PHILIP_BOUNDARIES.split("\n")[0]}

${CRISIS_PROTOCOL}`;
}

export interface PhilipTurnLayerInput {
  turnKind: TurnKind;
  isGuardedUser: boolean;
  tcpEnabled: boolean;
  conversationStateBlock?: string;
}

/** Turn-specific writer instructions — separate from identity kernel. */
export function buildPhilipTurnLayer(input: PhilipTurnLayerInput): string {
  const isFollowUp = input.turnKind === "follow_up";
  const guarded = input.isGuardedUser ? `\n\n${TALK_IT_THROUGH_GUARDED_FOLLOW_UP}` : "";

  if (isFollowUp) {
    return `${TALK_IT_THROUGH_FOLLOW_UP}${guarded}${input.tcpEnabled ? "" : input.conversationStateBlock ?? ""}`;
  }

  return `${TALK_IT_THROUGH_RESPONSE_EXAMPLES}\n\n${TALK_IT_THROUGH_FIRST_RESPONSE}`;
}

export interface AssemblePhilipWriterSystemInput {
  variantPrompt?: string;
  variantAddendum?: string;
  turnKind: TurnKind;
  isGuardedUser: boolean;
  tcpEnabled: boolean;
  conversationStateBlock?: string;
  dynamicContextBlock: string;
  promptLayers: {
    scripturalAlignment: string;
    emotionalTone: string;
    voiceAuthenticity: string;
  };
}

const WRITER_SAFETY_LAYER = `Safety and depth (when relevant — do not override Step 1–2 scope above):
— If someone expresses uncertainty about faith, meet them exactly there without assuming belief
— If someone describes controlling or unsafe relationships: reflect gently, validate impact, restore agency — do not diagnose or prescribe
— If someone is in shame (not guilt): lower temperature; receive them without evaluation
— If someone pushes back ("that didn't help"): own the miss, re-open warmly — never defend
— Never conclude the meaning of their story for them
— Never escalate emotionally beyond where they actually are`;

/** Full writer system message — kernel + scope + turn layer + TCP/legacy context. */
export function assemblePhilipWriterSystem(input: AssemblePhilipWriterSystemInput): string {
  return buildPhilipWriterSystem(input);
}

/** Legacy assembly — full variant prompt from talkItThroughVariants. */
export function assembleLegacyWriterSystem(input: AssemblePhilipWriterSystemInput): string {
  const variant = input.variantPrompt?.trim() ? `${input.variantPrompt.trim()}\n\n` : "";
  const turnLayer = buildPhilipTurnLayer({
    turnKind: input.turnKind,
    isGuardedUser: input.isGuardedUser,
    tcpEnabled: input.tcpEnabled,
    conversationStateBlock: input.conversationStateBlock,
  });

  return `${variant}${TALK_IT_THROUGH_RESPONSE_SCOPE}

${turnLayer}

${WRITER_SAFETY_LAYER}${input.dynamicContextBlock}${input.promptLayers.scripturalAlignment}${input.promptLayers.emotionalTone}${input.promptLayers.voiceAuthenticity}`;
}

export function buildPhilipWriterSystem(input: AssemblePhilipWriterSystemInput): string {
  if (!isIdentityKernelEnabled()) {
    return assembleLegacyWriterSystem(input);
  }

  const variant = input.variantAddendum?.trim() ? `${input.variantAddendum.trim()}\n\n` : "";
  const kernel = buildPhilipIdentityKernel();
  const turnLayer = buildPhilipTurnLayer({
    turnKind: input.turnKind,
    isGuardedUser: input.isGuardedUser,
    tcpEnabled: input.tcpEnabled,
    conversationStateBlock: input.conversationStateBlock,
  });

  return `${variant}${kernel}

${TALK_IT_THROUGH_RESPONSE_SCOPE}

${turnLayer}

${WRITER_SAFETY_LAYER}${input.dynamicContextBlock}${input.promptLayers.scripturalAlignment}${input.promptLayers.emotionalTone}${input.promptLayers.voiceAuthenticity}`;
}
