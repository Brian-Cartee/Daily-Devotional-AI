/**
 * Deterministic presence-layer gate checks for Philip Turing / deploy gate.
 */

import {
  detectAlmostSaidIt,
  detectSacredPauseUserMessage,
} from "../artifacts/api-server/src/conversationState.ts";
import {
  evaluateTurnResponse,
  hasScriptureReference,
  type PresenceResponseRules,
} from "../artifacts/api-server/src/lib/presenceFixtureValidator.ts";

export const PRESENCE_SCENARIO_IDS = [
  "presence-almost-01",
  "presence-early-scripture-01",
  "presence-confession-01",
  "presence-guarded-01",
] as const;

const EARLY_EXCHANGE_SCRIPTURE_CAP = 3;

export interface PresenceExchangeInput {
  exchangeNum: number;
  userMessage: string;
  philipResponse: string;
}

export interface PresenceScenarioInput {
  id: string;
  flags?: string[];
}

export function hasPresenceFlag(flags: string[] | undefined, flag: string): boolean {
  return (flags ?? []).includes(flag);
}

export function isSacredPauseUserMessage(userMessage: string): boolean {
  return detectSacredPauseUserMessage(userMessage);
}

export function almostSaidItRules(): PresenceResponseRules {
  return {
    maxWords: 30,
    forbidQuestion: true,
  };
}

export function sacredPauseRules(): PresenceResponseRules {
  return {
    maxSentences: 1,
    forbidQuestion: true,
    forbidScripture: true,
    forbidPatterns: [
      "but God",
      "the good news is",
      "what you need to do",
    ],
  };
}

export function lowPermissionRules(): PresenceResponseRules {
  return {
    forbidScripture: true,
    forbidPatterns: [
      "god has a plan",
      "everything happens for a reason",
      "you should",
      "have you tried",
      "what if you",
    ],
  };
}

function formatFailures(
  scenarioId: string,
  exchangeNum: number,
  label: string,
  errors: string[],
): string[] {
  return errors.map((e) => `${scenarioId} #${exchangeNum}: ${label} — ${e}`);
}

/** Universal + scenario-flag presence checks. */
export function collectPresenceGateFailures(
  scenario: PresenceScenarioInput,
  exchanges: PresenceExchangeInput[],
): string[] {
  const failures: string[] = [];
  const flags = scenario.flags ?? [];

  for (const e of exchanges) {
    // Universal: no scripture in phase 1 or early exchanges
    if (e.exchangeNum <= EARLY_EXCHANGE_SCRIPTURE_CAP && hasScriptureReference(e.philipResponse)) {
      failures.push(`${scenario.id} #${e.exchangeNum}: scripture too early`);
    }

    if (detectAlmostSaidIt(e.userMessage)) {
      const verdict = evaluateTurnResponse(almostSaidItRules(), e.philipResponse);
      failures.push(...formatFailures(scenario.id, e.exchangeNum, "almost-said-it", verdict.errors));
    }

    if (isSacredPauseUserMessage(e.userMessage)) {
      const verdict = evaluateTurnResponse(sacredPauseRules(), e.philipResponse);
      failures.push(...formatFailures(scenario.id, e.exchangeNum, "sacred-pause", verdict.errors));
    }

    if (
      hasPresenceFlag(flags, "presence-no-early-scripture")
      && e.exchangeNum <= EARLY_EXCHANGE_SCRIPTURE_CAP
      && hasScriptureReference(e.philipResponse)
    ) {
      failures.push(`${scenario.id} #${e.exchangeNum}: presence-no-early-scripture violated`);
    }

    if (
      hasPresenceFlag(flags, "presence-low-permission")
      && e.exchangeNum >= 2
      && e.exchangeNum <= 4
    ) {
      const verdict = evaluateTurnResponse(lowPermissionRules(), e.philipResponse);
      failures.push(...formatFailures(scenario.id, e.exchangeNum, "low-permission", verdict.errors));
    }

    if (hasPresenceFlag(flags, "presence-almost-said-it") && (detectAlmostSaidIt(e.userMessage) || e.exchangeNum === 1)) {
      const verdict = evaluateTurnResponse(almostSaidItRules(), e.philipResponse);
      failures.push(...formatFailures(scenario.id, e.exchangeNum, "presence-almost-said-it", verdict.errors));
    }

    if (
      hasPresenceFlag(flags, "presence-sacred-pause")
      && (isSacredPauseUserMessage(e.userMessage) || e.exchangeNum <= 2)
    ) {
      const verdict = evaluateTurnResponse(sacredPauseRules(), e.philipResponse);
      failures.push(...formatFailures(scenario.id, e.exchangeNum, "presence-sacred-pause", verdict.errors));
    }
  }

  return failures;
}
