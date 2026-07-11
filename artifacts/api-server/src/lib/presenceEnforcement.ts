/**
 * Hard enforcement for Philip presence-layer threshold moments.
 * Prompt instructions alone are not reliable — short-circuit or sanitize when detected.
 */

import {
  detectAlmostSaidIt,
  detectRepetitionPushback,
  detectSacredPauseUserMessage,
  detectSacredReceivePushback,
  userContinuesSacredDisclosure,
  conversationOpenedWithSacredConfession,
  conversationOpenedAlmostSaidIt,
  userStillHoveringAtDisclosure,
  userMessageWarrantsReceiveOnly,
  isSubstantiveDisclosure,
  userSharedConcreteBeat,
  buildReceiveFromDisclosure,
  buildMirroredReceiveLine,
  pickMirroredReceiveFromThread,
  pickMinimalPresenceReceive,
  priorPhilipRepeatedReceiveLine,
  priorPhilipUsedStockPresence,
  detectPassivePresenceFrustration,
  detectPresenceRupture,
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
  "I'm glad you said that here.",
  "That matters — thank you for saying it.",
  "You didn't have to say that. I'm glad you did.",
];

function stockLineRecentlyUsed(line: string, priorTexts: string[]): boolean {
  const needle = line.trim().toLowerCase().slice(0, 18);
  if (!needle) return false;
  return priorTexts.some((text) => text.trim().toLowerCase().includes(needle));
}

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
  context?: {
    priorUserMessages?: string[];
    priorPhilipTexts?: string[];
    openingSituation?: string;
    exchangeNum?: number;
  },
): PresenceLane | null {
  if (detectPresenceRupture(userMessage)) return null;
  if (detectRepetitionPushback(userMessage)) return null;

  if (detectPassivePresenceFrustration(userMessage)) return null;

  const priorPhilip = context?.priorPhilipTexts ?? [];
  const priorUsers = context?.priorUserMessages ?? [];
  const exchangeNum = context?.exchangeNum ?? 0;
  if (priorPhilipRepeatedReceiveLine(priorPhilip)) return null;

  if (priorPhilipUsedStockPresence(priorPhilip) && userSharedConcreteBeat(userMessage)) {
    return "sacred_pause";
  }

  if (userMessageWarrantsReceiveOnly(userMessage, { exchangeNum })) {
    return "sacred_pause";
  }

  if (isSubstantiveDisclosure(userMessage)) return null;

  if (state?.sacred_pause_warranted || detectSacredPauseUserMessage(userMessage)) {
    if (detectSacredReceivePushback(userMessage)) return null;
    return "sacred_pause";
  }

  const openedSacred = conversationOpenedWithSacredConfession(
    context?.openingSituation ?? "",
    priorUsers,
  );

  if (
    openedSacred
    && exchangeNum > 0
    && exchangeNum <= 6
    && !detectPresenceRupture(userMessage)
    && (
      userContinuesSacredDisclosure(userMessage)
      || detectSacredPauseUserMessage(userMessage)
    )
  ) {
    return "sacred_pause";
  }

  const lastPhilip = priorPhilip[priorPhilip.length - 1] ?? "";
  const lastWasSacredReceive = SACRED_PAUSE_RESPONSES.some((line) =>
    lastPhilip.toLowerCase().includes(line.toLowerCase().slice(0, 18)),
  );
  if (lastWasSacredReceive) {
    if (detectSacredReceivePushback(userMessage)) return null;
    if (userContinuesSacredDisclosure(userMessage) || detectSacredPauseUserMessage(userMessage)) {
      return "sacred_pause";
    }
    return null;
  }

  const openedAlmost = conversationOpenedAlmostSaidIt(
    context?.openingSituation ?? "",
    priorUsers,
  );
  if (
    openedAlmost
    && exchangeNum >= 1
    && exchangeNum <= 6
    && !isSubstantiveDisclosure(userMessage)
    && !userSharedConcreteBeat(userMessage)
    && !detectSacredReceivePushback(userMessage)
    && userStillHoveringAtDisclosure(userMessage)
  ) {
    return "almost_said_it";
  }

  if (state?.almost_said_it_detected || detectAlmostSaidIt(userMessage)) {
    if (userSharedConcreteBeat(userMessage) || isSubstantiveDisclosure(userMessage)) {
      return null;
    }
    const lastPhilip = priorPhilip[priorPhilip.length - 1] ?? "";
    if (priorPhilipUsedStockPresence(priorPhilip) && !userContinuesSacredDisclosure(userMessage)) {
      return null;
    }
    const stockLines = [...ALMOST_SAID_RESPONSES, ...SACRED_PAUSE_RESPONSES];
    const lastWasStockPresence = stockLines.some((line) =>
      lastPhilip.trim().toLowerCase() === line.toLowerCase()
      || lastPhilip.toLowerCase().includes(line.toLowerCase().slice(0, 14)),
    );
    if (
      lastWasStockPresence
      && !detectAlmostSaidIt(userMessage)
      && !detectSacredPauseUserMessage(userMessage)
      && !userContinuesSacredDisclosure(userMessage)
    ) {
      return null;
    }
    return "almost_said_it";
  }
  return null;
}

export function buildPresenceShortCircuitResponse(
  lane: PresenceLane,
  seedText = "",
  varietyIndex = 0,
  recentResponses: string[] = [],
): string {
  const wordCount = countWords(seedText);
  const mayMirror = lane === "sacred_pause"
    ? (userSharedConcreteBeat(seedText) || isSubstantiveDisclosure(seedText) || wordCount >= 8)
    : userSharedConcreteBeat(seedText);
  if (mayMirror && wordCount >= 6) {
    const mirrored = buildMirroredReceiveLine(seedText, recentResponses);
    if (mirrored) return mirrored;
  }

  if (
    lane === "sacred_pause"
    && userSharedConcreteBeat(seedText)
  ) {
    const received = buildReceiveFromDisclosure(seedText, recentResponses);
    if (received) return received;
  }

  if (priorPhilipUsedStockPresence(recentResponses)) {
    const mirrored = buildMirroredReceiveLine(seedText, recentResponses);
    if (mirrored) return mirrored;
    return pickMinimalPresenceReceive(recentResponses) ?? "";
  }

  const pool = lane === "almost_said_it" ? ALMOST_SAID_RESPONSES : SACRED_PAUSE_RESPONSES;
  const recentExact = new Set(recentResponses.map((r) => r.trim().toLowerCase()));
  for (let offset = 0; offset < pool.length; offset += 1) {
    const idx = (seedFromText(seedText) + varietyIndex + offset) % pool.length;
    const candidate = pool[idx] ?? pool[0];
    const key = candidate.trim().toLowerCase();
    if (!recentExact.has(key) && !stockLineRecentlyUsed(candidate, recentResponses)) return candidate;
  }
  const fallbackMirror = buildMirroredReceiveLine(seedText, recentResponses);
  if (fallbackMirror) return fallbackMirror;
  return pickMinimalPresenceReceive(recentResponses) ?? "";
}

export function enforcePresenceResponse(
  text: string,
  lane: PresenceLane,
  varietyIndex = 0,
  recentResponses: string[] = [],
): string {
  const trimmed = text.trim();
  if (!trimmed) return buildPresenceShortCircuitResponse(lane, "", varietyIndex, recentResponses);

  if (lane === "almost_said_it") {
    if (!/\?/.test(trimmed) && countWords(trimmed) <= 30) return trimmed;
    return buildPresenceShortCircuitResponse("almost_said_it", trimmed, varietyIndex, recentResponses);
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
  return buildPresenceShortCircuitResponse("sacred_pause", trimmed, varietyIndex, recentResponses);
}

export function tryPresenceShortCircuit(
  userMessage: string,
  state?: Pick<ConversationState, "almost_said_it_detected" | "sacred_pause_warranted"> | null,
  varietyIndex = 0,
  recentResponses: string[] = [],
  context?: {
    priorUserMessages?: string[];
    priorPhilipTexts?: string[];
    openingSituation?: string;
    exchangeNum?: number;
  },
): { lane: PresenceLane; text: string } | null {
  if (detectPresenceRupture(userMessage)) return null;
  if (detectPassivePresenceFrustration(userMessage)) return null;
  if (detectRepetitionPushback(userMessage)) return null;

  const priorPhilip = context?.priorPhilipTexts ?? [];
  if (priorPhilipRepeatedReceiveLine(priorPhilip)) return null;

  const opening = context?.openingSituation ?? "";
  const priorUsers = context?.priorUserMessages ?? [];
  const inPresenceThread = opening && (
    conversationOpenedWithSacredConfession(opening, [opening, ...priorUsers])
    || conversationOpenedAlmostSaidIt(opening, [opening, ...priorUsers])
  );

  if (
    inPresenceThread
    && (
      userSharedConcreteBeat(userMessage)
      || isSubstantiveDisclosure(userMessage)
      || (countWords(userMessage) >= 8 && !userStillHoveringAtDisclosure(userMessage))
    )
  ) {
    const mirrored = pickMirroredReceiveFromThread(
      userMessage,
      context?.priorUserMessages ?? [],
      priorPhilip,
      context?.openingSituation ?? "",
    ) ?? buildMirroredReceiveLine(userMessage, priorPhilip);
    if (mirrored) {
      return {
        lane: "sacred_pause",
        text: mirrored,
      };
    }
  }

  if (priorPhilipUsedStockPresence(priorPhilip) && userSharedConcreteBeat(userMessage)) {
    const received = buildReceiveFromDisclosure(userMessage, priorPhilip);
    if (received) {
      return {
        lane: "sacred_pause",
        text: received,
      };
    }
  }

  const presenceLane = resolvePresenceLane(userMessage, state, context);
  if (!presenceLane) return null;
  return {
    lane: presenceLane,
    text: buildPresenceShortCircuitResponse(presenceLane, userMessage, varietyIndex, recentResponses),
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
