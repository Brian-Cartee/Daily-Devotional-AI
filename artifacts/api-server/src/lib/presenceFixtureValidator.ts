/**
 * Validates scripted presence-layer turn fixtures (offline samples + prompt expectations).
 * Used by scripts/test-presence-policy.mjs and eval/run-presence-fixtures.ts.
 */

import {
  buildStatePromptBlock,
  detectAlmostSaidIt,
  type ConversationState,
  type DepthLayer,
  type PermissionLevel,
  type WeightLevel,
} from "../conversationState.ts";

export interface PresenceResponseRules {
  maxWords?: number;
  maxSentences?: number;
  forbidQuestion?: boolean;
  forbidPatterns?: string[];
  requirePatterns?: string[];
  forbidScripture?: boolean;
}

export interface PresencePromptExpect {
  includes?: string[];
  excludes?: string[];
}

export interface PresenceTurnFixture {
  user: string;
  state?: Partial<ConversationState>;
  expectPrompt?: PresencePromptExpect;
  responseRules?: PresenceResponseRules;
  samples?: { pass?: string[]; fail?: string[] };
}

export interface PresenceFixture {
  id: string;
  description: string;
  stateDefaults?: Partial<ConversationState>;
  /** When true, each turn's state merges onto the prior turn's resolved state. */
  carryStateAcrossTurns?: boolean;
  turns: PresenceTurnFixture[];
}

export interface TurnValidationResult {
  fixtureId: string;
  turnIndex: number;
  kind: "prompt" | "sample-pass" | "sample-fail" | "live";
  label: string;
  ok: boolean;
  errors: string[];
}

const SCRIPTURE_PHRASES = [
  /\bscripture\b/i,
  /\bjesus says\b/i,
  /\bjesus said\b/i,
  /\bpaul writes\b/i,
  /\bthe bible\b/i,
  /\b(god|jesus|paul) (says?|said|wrote?)\b/i,
];

/** Book names that rarely collide with ordinary English. */
const UNAMBIGUOUS_BOOK_NAMES =
  /\b(psalm|proverbs|matthew|luke|romans|corinthians|galatians|ephesians|philippians|colossians|hebrews|genesis|isaiah|jeremiah|ezekiel|daniel|deuteronomy|leviticus|numbers|exodus|revelation|ecclesiastes|nehemiah|habakkuk|zephaniah|malachi|micah|nahum|amos|hosea|joel|obadiah|haggai|zechariah|lamentations)\b/i;

/** Names that are common words — only count when paired with a chapter:verse. */
const AMBIGUOUS_BOOK_WITH_VERSE =
  /\b(?:\d\s+)?(mark|john|peter|james|acts|job|ruth|judges|kings|samuel|timothy|thessalonians|chronicles)\s+\d+\s*:\s*\d+/i;

const CHAPTER_VERSE = /\b\d+\s*:\s*\d+\b/;

function hasScriptureReference(text: string): boolean {
  if (SCRIPTURE_PHRASES.some((pattern) => pattern.test(text))) return true;
  if (UNAMBIGUOUS_BOOK_NAMES.test(text)) return true;
  if (AMBIGUOUS_BOOK_WITH_VERSE.test(text)) return true;
  // Standalone chapter:verse (e.g. "3:16") without a book name is still a scripture signal.
  if (CHAPTER_VERSE.test(text)) return true;
  return false;
}

export { hasScriptureReference };

export function basePresenceState(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    core_issue: "carrying something heavy",
    facts_learned: [],
    areas_explored: [],
    areas_unexplored: [],
    questions_asked: [],
    metaphors_used: [],
    user_exact_words: [],
    conversation_closing: false,
    recognition_delivered: false,
    weight_level: "low",
    permission_level: "low",
    current_depth_layer: 1,
    almost_said_it_detected: false,
    sacred_pause_warranted: false,
    delight_expressed_this_session: false,
    humor_attempted_this_session: false,
    ecosystem_recommendation_given: false,
    ...overrides,
  };
}

export function mergeFixtureState(
  fixture: PresenceFixture,
  turn: PresenceTurnFixture,
): ConversationState {
  const merged = basePresenceState({
    ...fixture.stateDefaults,
    ...turn.state,
  });
  merged.almost_said_it_detected =
    detectAlmostSaidIt(turn.user) || (turn.state?.almost_said_it_detected ?? merged.almost_said_it_detected);
  return merged;
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

function testPatterns(text: string, patterns: string[], forbid: boolean): string[] {
  const errors: string[] = [];
  for (const raw of patterns) {
    const re = new RegExp(raw, "i");
    const matched = re.test(text);
    if (forbid && matched) errors.push(`forbidden pattern matched: /${raw}/i`);
    if (!forbid && !matched) errors.push(`required pattern missing: /${raw}/i`);
  }
  return errors;
}

export function evaluateTurnResponse(
  rules: PresenceResponseRules,
  responseText: string,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const text = responseText.trim();
  if (!text) errors.push("empty response");

  if (rules.maxWords != null && countWords(text) > rules.maxWords) {
    errors.push(`word count ${countWords(text)} exceeds max ${rules.maxWords}`);
  }
  if (rules.maxSentences != null && countSentences(text) > rules.maxSentences) {
    errors.push(`sentence count ${countSentences(text)} exceeds max ${rules.maxSentences}`);
  }
  if (rules.forbidQuestion && /\?/.test(text)) {
    errors.push("response contains a question mark");
  }
  if (rules.forbidScripture && hasScriptureReference(text)) {
    errors.push("response contains scripture reference");
  }
  if (rules.forbidPatterns?.length) {
    errors.push(...testPatterns(text, rules.forbidPatterns, true));
  }
  if (rules.requirePatterns?.length) {
    const anyRequired = rules.requirePatterns.some((raw) => new RegExp(raw, "i").test(text));
    if (!anyRequired) {
      errors.push(`none of required patterns matched: ${rules.requirePatterns.join(" | ")}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function evaluateTurnPrompt(
  state: ConversationState,
  expect?: PresencePromptExpect,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const block = buildStatePromptBlock(state);

  if (!block.includes("PRESENCE LAYER")) {
    errors.push("prompt block missing PRESENCE LAYER section");
  }

  for (const fragment of expect?.includes ?? []) {
    if (!block.includes(fragment)) errors.push(`prompt missing: ${fragment}`);
  }
  for (const fragment of expect?.excludes ?? []) {
    if (block.includes(fragment)) errors.push(`prompt should not include: ${fragment}`);
  }

  return { ok: errors.length === 0, errors };
}

export function runFixtureOffline(fixture: PresenceFixture): TurnValidationResult[] {
  const results: TurnValidationResult[] = [];
  let carriedState: ConversationState | null = null;

  fixture.turns.forEach((turn, turnIndex) => {
    const state = fixture.carryStateAcrossTurns && carriedState
      ? mergeFixtureState(
          { ...fixture, stateDefaults: { ...fixture.stateDefaults, ...carriedState } },
          turn,
        )
      : mergeFixtureState(fixture, turn);

    if (fixture.carryStateAcrossTurns) {
      carriedState = state;
    }

    if (turn.expectPrompt) {
      const prompt = evaluateTurnPrompt(state, turn.expectPrompt);
      results.push({
        fixtureId: fixture.id,
        turnIndex,
        kind: "prompt",
        label: `turn ${turnIndex + 1} prompt`,
        ok: prompt.ok,
        errors: prompt.errors,
      });
    }

    if (!turn.responseRules) return;

    for (const [sampleIndex, sample] of (turn.samples?.pass ?? []).entries()) {
      const verdict = evaluateTurnResponse(turn.responseRules, sample);
      results.push({
        fixtureId: fixture.id,
        turnIndex,
        kind: "sample-pass",
        label: `turn ${turnIndex + 1} pass sample ${sampleIndex + 1}`,
        ok: verdict.ok,
        errors: verdict.errors,
      });
    }

    for (const [sampleIndex, sample] of (turn.samples?.fail ?? []).entries()) {
      const verdict = evaluateTurnResponse(turn.responseRules, sample);
      const shouldFail = !verdict.ok;
      results.push({
        fixtureId: fixture.id,
        turnIndex,
        kind: "sample-fail",
        label: `turn ${turnIndex + 1} fail sample ${sampleIndex + 1}`,
        ok: shouldFail,
        errors: shouldFail ? [] : ["expected sample to violate rules but it passed"],
      });
    }
  });

  return results;
}

export function summarizeFixtureResults(results: TurnValidationResult[]): {
  passed: number;
  failed: number;
  failures: TurnValidationResult[];
} {
  const failures = results.filter((r) => !r.ok);
  return {
    passed: results.length - failures.length,
    failed: failures.length,
    failures,
  };
}

export type { WeightLevel, PermissionLevel, DepthLayer };
