/**
 * Hard enforcement for Philip presence-layer threshold moments.
 * Prompt instructions alone are not reliable — short-circuit or sanitize when detected.
 */

import {
  detectAlmostSaidIt,
  detectSacredPauseUserMessage,
  buildStatePromptBlock,
  type ConversationState,
} from "../conversationState.ts";
import { hasScriptureReference } from "./presenceFixtureValidator.ts";

export type PresenceLane = "almost_said_it" | "sacred_pause";

const ALMOST_SAID_RESPONSES = [
  "Go ahead.",
  "Take your time with that.",
  "I'm here whenever you're ready.",
];

const SACRED_PAUSE_RESPONSES = [
  "That took courage to say out loud.",
  "Thank you for trusting this room with that.",
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countSentences(text: string): number {
  const cleaned = text
    .replace(/\b(e\.g|i\.e|vs|etc|mr|ms|dr|st|rev)\./gi, "$1<DOT>")
    .replace(/\d+\.\d+/g, "<VERSEREF>");
  const matches = cleaned.match(/[^.!?]+[.!?]+/g);
  return matches ? matches.length : (text.trim() ? 1 : 0);
}

function firstSentence(text: string): string {
  const match = text.trim().match(/^[^.!?]+[.!?]+/);
  return match ? match[0].trim() : text.trim();
}

function seedFromText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash + text.charCodeAt(i)) % 1000;
  }
  return hash;
}

export function resolvePresenceLane(
  userMessage: string,
  state?: Pick<ConversationState, "almost_said_it_detected" | "sacred_pause_warranted"> | null,
): PresenceLane | null {
  if (state?.sacred_pause_warranted || detectSacredPauseUserMessage(userMessage)) {
    return "sacred_pause";
  }
  if (state?.almost_said_it_detected || detectAlmostSaidIt(userMessage)) {
    return "almost_said_it";
  }
  return null;
}

export function buildPresenceShortCircuitResponse(lane: PresenceLane, seedText = ""): string {
  const pool = lane === "almost_said_it" ? ALMOST_SAID_RESPONSES : SACRED_PAUSE_RESPONSES;
  const idx = seedFromText(seedText) % pool.length;
  return pool[idx] ?? pool[0];
}

export function enforcePresenceResponse(text: string, lane: PresenceLane): string {
  const trimmed = text.trim();
  if (!trimmed) return buildPresenceShortCircuitResponse(lane);

  if (lane === "almost_said_it") {
    if (!/\?/.test(trimmed) && countWords(trimmed) <= 30) return trimmed;
    return buildPresenceShortCircuitResponse("almost_said_it", trimmed);
  }

  const one = firstSentence(trimmed).replace(/\?/g, "").trim();
  const sacredOk = one
    && countSentences(one) === 1
    && !/\?/.test(one)
    && countWords(one) <= 25
    && !hasScriptureReference(one)
    && !/\b(but god|the good news is|what you need to do|god forgives)\b/i.test(one);
  if (sacredOk) {
    return one.endsWith(".") ? one : `${one}.`;
  }
  return buildPresenceShortCircuitResponse("sacred_pause", trimmed);
}

export function tryPresenceShortCircuit(
  userMessage: string,
  state?: Pick<ConversationState, "almost_said_it_detected" | "sacred_pause_warranted"> | null,
): { lane: PresenceLane; text: string } | null {
  const presenceLane = resolvePresenceLane(userMessage, state);
  if (!presenceLane) return null;
  return {
    lane: presenceLane,
    text: buildPresenceShortCircuitResponse(presenceLane, userMessage),
  };
}

export function bootstrapPresenceStateBlock(
  situation: string,
  lastUserMessage: string,
): string {
  const almost = detectAlmostSaidIt(lastUserMessage);
  const sacred = detectSacredPauseUserMessage(lastUserMessage);
  if (!almost && !sacred) return "";

  return buildStatePromptBlock({
    core_issue: situation.slice(0, 80),
    facts_learned: [],
    areas_explored: [],
    areas_unexplored: [],
    questions_asked: [],
    metaphors_used: [],
    user_exact_words: [],
    conversation_closing: false,
    recognition_delivered: false,
    weight_level: sacred ? "high" : "medium",
    permission_level: sacred ? "high" : "medium",
    current_depth_layer: sacred ? 4 : 2,
    almost_said_it_detected: almost,
    sacred_pause_warranted: sacred,
    delight_expressed_this_session: false,
    humor_attempted_this_session: false,
    ecosystem_recommendation_given: false,
  });
}
