import {
  conversationHadSessionSendOff,
  shouldOfferSessionSendOff,
  buildPostSendOffResponse,
  buildSendOffPushbackResponse,
  buildPassivePresenceRecoveryResponse,
  buildPresenceRuptureRecoveryResponse,
  detectsSendOffPushback,
  detectPassivePresenceFrustration,
  detectPresenceRupture,
  priorPhilipUsedStockPresence,
  inventsUnsupportedDetail,
} from "../../conversationState";
import {
  enforceAmbiguousRiskCheck,
  enforceDependencyRedirect,
  needsDependencyRedirect,
} from "../../guidanceSafety";
import {
  buildPresenceShortCircuitResponse,
  enforcePresenceResponse,
  resolvePresenceLane,
  tryPresenceShortCircuit,
} from "../../lib/presenceEnforcement";
import type { ConversationState } from "../../conversationState";
import type { PhilipGate, PhilipLane, PreTurnGateResult } from "./types";

export { tryPresenceShortCircuit };

export function evaluatePreTurnGates(input: {
  isFollowUp: boolean;
  conversationStateBlock: string;
  conversationHistory: Array<{ role: string; content: string }>;
}): PreTurnGateResult {
  const gates: PhilipGate[] = [];
  const empty: PreTurnGateResult = {
    gates,
    lane: null,
    shortCircuitText: null,
    isClosing: false,
    alreadySentOff: false,
    needsDependency: false,
    isSendOff: false,
    noQuestionMode: false,
  };

  if (!input.isFollowUp) return empty;

  const claudeHistory = input.conversationHistory as Array<{ role: "user" | "assistant"; content: string }>;
  const philipMsgs = claudeHistory.filter(m => m.role === "assistant");
  const userMsgs = claudeHistory.filter(m => m.role === "user").map(m => m.content);
  const lastUser = userMsgs[userMsgs.length - 1] ?? "";
  const exchangeNum = Math.floor(input.conversationHistory.length / 2);

  const isClosing = input.conversationStateBlock.includes("CLOSING");
  const alreadySentOff = conversationHadSessionSendOff(philipMsgs);
  const needsDependency = needsDependencyRedirect(lastUser, philipMsgs, userMsgs);
  const isSendOff = !isClosing && !alreadySentOff && !needsDependency
    && shouldOfferSessionSendOff(exchangeNum, philipMsgs, lastUser, { allUserMessages: userMsgs });

  const priorTexts = philipMsgs.map((m) => m.content);
  if (detectPresenceRupture(lastUser)) {
    gates.push("presence_rupture_recovery");
    return {
      gates,
      lane: "presence_rupture_recovery",
      shortCircuitText: buildPresenceRuptureRecoveryResponse(lastUser, userMsgs.slice(0, -1), priorTexts),
      isClosing: false,
      alreadySentOff: false,
      needsDependency,
      isSendOff: false,
      noQuestionMode: true,
    };
  }

  if (priorPhilipUsedStockPresence(priorTexts) && detectPassivePresenceFrustration(lastUser)) {
    gates.push("passive_presence_recovery");
    return {
      gates,
      lane: "passive_presence_recovery",
      shortCircuitText: buildPassivePresenceRecoveryResponse(
        lastUser,
        [],
        userMsgs.slice(0, -1),
        priorTexts,
      ),
      isClosing: false,
      alreadySentOff: false,
      needsDependency,
      isSendOff: false,
      noQuestionMode: false,
    };
  }

  // Send-off pushback beats closing detection — "That's enough?" after Philip sent them off is protest, not goodbye.
  if (alreadySentOff) {
    if (detectsSendOffPushback(lastUser)) {
      gates.push("sendoff_pushback");
      return {
        gates,
        lane: "sendoff_reopen",
        shortCircuitText: buildSendOffPushbackResponse(lastUser),
        isClosing: false,
        alreadySentOff: true,
        needsDependency,
        isSendOff: false,
        noQuestionMode: false,
      };
    }
    gates.push("already_sent_off", "post_send_off", "no_question_mode");
    return {
      gates,
      lane: "post_send_off",
      shortCircuitText: buildPostSendOffResponse(exchangeNum, priorTexts),
      isClosing: false,
      alreadySentOff: true,
      needsDependency,
      isSendOff: false,
      noQuestionMode: true,
    };
  }

  if (isClosing) {
    gates.push("user_closing");
    return {
      gates,
      lane: "closing",
      shortCircuitText: null,
      isClosing: true,
      alreadySentOff,
      needsDependency,
      isSendOff: false,
      noQuestionMode: true,
    };
  }

  if (needsDependency) {
    gates.push("dependency_redirect");
  }

  if (isSendOff) {
    gates.push("session_send_off", "no_question_mode");
    return {
      gates,
      lane: "session_send_off",
      shortCircuitText: null,
      isClosing: false,
      alreadySentOff: false,
      needsDependency,
      isSendOff: true,
      noQuestionMode: true,
    };
  }

  return {
    gates,
    lane: null,
    shortCircuitText: null,
    isClosing: false,
    alreadySentOff: false,
    needsDependency,
    isSendOff: false,
    noQuestionMode: false,
  };
}

export function resolveNoQuestionMode(input: {
  isFollowUp: boolean;
  conversationStateBlock: string;
  conversationHistory: Array<{ role: string; content: string }>;
  conversationState?: Pick<ConversationState, "almost_said_it_detected" | "sacred_pause_warranted"> | null;
  openingSituation?: string;
}): boolean {
  const userMsgs = input.conversationHistory.filter(m => m.role === "user").map(m => m.content);
  const lastUser = userMsgs[userMsgs.length - 1] ?? "";
  const philipMsgs = input.conversationHistory.filter(m => m.role === "assistant");
  const exchangeNum = Math.floor(input.conversationHistory.length / 2);
  const presenceContext = {
    priorUserMessages: userMsgs.slice(0, -1),
    priorPhilipTexts: philipMsgs.map(m => m.content),
    openingSituation: input.openingSituation ?? "",
    exchangeNum,
  };
  if (resolvePresenceLane(lastUser, input.conversationState, presenceContext)) return true;
  if (!input.isFollowUp) return false;
  const alreadySentOff = conversationHadSessionSendOff(philipMsgs);
  const willSendOff = !alreadySentOff
    && !needsDependencyRedirect(lastUser, philipMsgs, userMsgs)
    && !detectsSendOffPushback(lastUser)
    && shouldOfferSessionSendOff(exchangeNum, philipMsgs, lastUser, { allUserMessages: userMsgs });
  return input.conversationStateBlock.includes("CLOSING") || (alreadySentOff && !detectsSendOffPushback(lastUser)) || willSendOff;
}

export function applyPostTurnGates(input: {
  text: string;
  isFollowUp: boolean;
  noQuestionMode: boolean;
  conversationHistory: Array<{ role: string; content: string }>;
  exchangeNum: number;
  conversationState?: Pick<ConversationState, "almost_said_it_detected" | "sacred_pause_warranted"> | null;
  openingSituation?: string;
}): { text: string; gates: PhilipGate[]; lane: PhilipLane | null } {
  const gates: PhilipGate[] = [];
  let text = input.text;
  let lane: PhilipLane | null = null;

  const userMsgs = input.conversationHistory.filter(m => m.role === "user").map(m => m.content);
  const lastUserMsg = userMsgs[userMsgs.length - 1] ?? "";

  const claudeHistory = input.conversationHistory as Array<{ role: "user" | "assistant"; content: string }>;
  const philipMsgs = claudeHistory.filter(m => m.role === "assistant");
  const recentPhilip = philipMsgs.slice(-4).map(m => m.content);

  const presenceLane = resolvePresenceLane(lastUserMsg, input.conversationState, {
    priorUserMessages: userMsgs.slice(0, -1),
    priorPhilipTexts: recentPhilip,
    openingSituation: input.openingSituation ?? "",
    exchangeNum: input.exchangeNum,
  });
  if (presenceLane) {
    const beforePresence = text;
    text = enforcePresenceResponse(text, presenceLane, philipMsgs.length, recentPhilip);
    gates.push(presenceLane === "almost_said_it" ? "presence_almost_said_it" : "presence_sacred_pause");
    if (text !== beforePresence || lane === null) {
      lane = "presence_hold";
    }
  }

  if (!input.isFollowUp || input.noQuestionMode) {
    return { text, gates, lane };
  }

  const beforeRisk = text;
  text = enforceAmbiguousRiskCheck(text, lastUserMsg, philipMsgs, input.exchangeNum);
  if (text !== beforeRisk) {
    gates.push("ambiguous_risk");
  }

  const beforeDependency = text;
  text = enforceDependencyRedirect(text, lastUserMsg, philipMsgs, input.exchangeNum, userMsgs);
  if (text !== beforeDependency) {
    gates.push("dependency_redirect");
    lane = "dependency";
  }

  const factsLearned: string[] = [];
  if (inventsUnsupportedDetail(text, userMsgs, factsLearned, input.exchangeNum)) {
    gates.push("invented_unsupported_detail");
    const bareQuestion = text.match(/[^.!?\n]*\?/)?.[0]?.trim();
    if (bareQuestion && bareQuestion.length > 8 && !inventsUnsupportedDetail(bareQuestion, userMsgs, factsLearned, input.exchangeNum)) {
      text = bareQuestion;
    }
  }

  return { text, gates, lane };
}

export function recordGate(gates: PhilipGate[], gate: PhilipGate): void {
  if (!gates.includes(gate)) gates.push(gate);
}
