import {
  conversationHadSessionSendOff,
  shouldOfferSessionSendOff,
  buildPostSendOffResponse,
} from "../../conversationState";
import {
  enforceAmbiguousRiskCheck,
  enforceDependencyRedirect,
  needsDependencyRedirect,
} from "../../guidanceSafety";
import type { PhilipGate, PhilipLane, PreTurnGateResult } from "./types";

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
  const lastUser = [...claudeHistory].reverse().find(m => m.role === "user")?.content ?? "";
  const exchangeNum = Math.floor(input.conversationHistory.length / 2);

  const isClosing = input.conversationStateBlock.includes("CLOSING");
  const alreadySentOff = conversationHadSessionSendOff(philipMsgs);
  const needsDependency = needsDependencyRedirect(lastUser, philipMsgs);
  const isSendOff = !isClosing && !alreadySentOff && !needsDependency
    && shouldOfferSessionSendOff(exchangeNum, philipMsgs, lastUser);

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

  if (alreadySentOff) {
    gates.push("already_sent_off", "post_send_off", "no_question_mode");
    return {
      gates,
      lane: "post_send_off",
      shortCircuitText: buildPostSendOffResponse(exchangeNum),
      isClosing: false,
      alreadySentOff: true,
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
}): boolean {
  if (!input.isFollowUp) return false;
  const philipMsgs = input.conversationHistory.filter(m => m.role === "assistant");
  const lastUser = [...input.conversationHistory].reverse().find(m => m.role === "user")?.content ?? "";
  const exchangeNum = Math.floor(input.conversationHistory.length / 2);
  const alreadySentOff = conversationHadSessionSendOff(philipMsgs);
  const willSendOff = !alreadySentOff
    && !needsDependencyRedirect(lastUser, philipMsgs)
    && shouldOfferSessionSendOff(exchangeNum, philipMsgs, lastUser);
  return input.conversationStateBlock.includes("CLOSING") || alreadySentOff || willSendOff;
}

export function applyPostTurnGates(input: {
  text: string;
  isFollowUp: boolean;
  noQuestionMode: boolean;
  conversationHistory: Array<{ role: string; content: string }>;
  exchangeNum: number;
}): { text: string; gates: PhilipGate[]; lane: PhilipLane | null } {
  const gates: PhilipGate[] = [];
  let text = input.text;
  let lane: PhilipLane | null = null;

  if (!input.isFollowUp || input.noQuestionMode) {
    return { text, gates, lane };
  }

  const claudeHistory = input.conversationHistory as Array<{ role: "user" | "assistant"; content: string }>;
  const philipMsgs = claudeHistory.filter(m => m.role === "assistant");
  const lastUserMsg = [...claudeHistory].reverse().find(m => m.role === "user")?.content ?? "";

  const beforeRisk = text;
  text = enforceAmbiguousRiskCheck(text, lastUserMsg, philipMsgs, input.exchangeNum);
  if (text !== beforeRisk) {
    gates.push("ambiguous_risk");
  }

  const beforeDependency = text;
  text = enforceDependencyRedirect(text, lastUserMsg, philipMsgs, input.exchangeNum);
  if (text !== beforeDependency) {
    gates.push("dependency_redirect");
    lane = "dependency";
  }

  return { text, gates, lane };
}

export function recordGate(gates: PhilipGate[], gate: PhilipGate): void {
  if (!gates.includes(gate)) gates.push(gate);
}
