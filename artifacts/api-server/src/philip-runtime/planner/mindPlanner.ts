import {
  containsMysticalColdRead,
  inventsUnsupportedDetail,
  isBannedQuestion,
  pickFreshTerritoryQuestion,
  pickRecoveryFallbackQuestion,
  questionInventsRelationship,
  recyclesPriorQuestion,
  reasksWhatUserJustStated,
  shouldRejectPriorExploredQuestion,
  userMessageHasFreshDetail,
  type ConversationState,
  type PhilipMove,
} from "../../conversationState";

export type PlannerSource = "mind" | "llm" | "fallback" | "none";

export function isMindPlannerEnabled(): boolean {
  return process.env.PHILIP_MIND_PLANNER !== "0";
}

export interface PlanQuestionFromMindInput {
  state: ConversationState;
  lastUserMessage: string;
  priorUserMessages: string[];
  priorExplored: string[];
  exchangeNum: number;
  isGuardedUser: boolean;
  move: PhilipMove | "sit";
  repetitionRecovery?: boolean;
}

export interface QuestionValidationContext {
  lastUserMessage: string;
  userMessages: string[];
  factsLearned: string[];
  priorExplored: string[];
  exchangeNum: number;
  questionsAsked: string[];
}

export function isValidPlannedQuestion(
  question: string,
  ctx: QuestionValidationContext,
): boolean {
  const q = question?.trim();
  if (!q || !q.includes("?")) return false;
  if (isBannedQuestion(q)) return false;
  if (containsMysticalColdRead(q)) return false;
  if (questionInventsRelationship(q, ctx.userMessages, ctx.factsLearned)) return false;
  if (inventsUnsupportedDetail(q, ctx.userMessages, ctx.factsLearned, ctx.exchangeNum)) return false;
  if (shouldRejectPriorExploredQuestion(q, ctx.priorExplored, ctx.lastUserMessage)) return false;
  if (reasksWhatUserJustStated(ctx.lastUserMessage, q)) return false;
  if (recyclesPriorQuestion(q, ctx.questionsAsked)) return false;
  return true;
}

function extractNamedPerson(facts: string[]): string | null {
  for (const fact of facts) {
    const nameMatch = fact.match(/\b(?:husband|wife|son|daughter|mother|father|brother|sister|friend)\s+([A-Z][a-z]+)\b/);
    if (nameMatch) return nameMatch[1];
    const namedMatch = fact.match(/\b([A-Z][a-z]+)\s+\((?:he|she|they)\/him|her|them\)\b/);
    if (namedMatch) return namedMatch[1];
  }
  return null;
}

function buildGuardedCandidate(state: ConversationState, lastUserMessage: string): string | null {
  const named = extractNamedPerson(state.facts_learned);
  if (named) return `What happened with ${named} after that?`;
  if (lastUserMessage.split(/\s+/).length >= 6) return "What happened next?";
  return "Can you say a little more about that?";
}

function buildDeepenCandidate(state: ConversationState, lastUserMessage: string): string | null {
  const phrase = [...state.user_exact_words]
    .reverse()
    .find(w => w.trim().length >= 8 && lastUserMessage.toLowerCase().includes(w.toLowerCase().slice(0, 24)));
  if (!phrase) return null;
  const short = phrase.length > 50 ? `${phrase.slice(0, 47)}…` : phrase;
  return `Say more about "${short}"?`;
}

function buildUnexploredCandidate(
  state: ConversationState,
  priorExplored: string[],
): string | null {
  const unexplored = (state.areas_unexplored ?? []).filter(area =>
    area.trim()
    && !priorExplored.some(e => area.toLowerCase().includes(e.toLowerCase().slice(0, 12))),
  );
  if (unexplored.length === 0) return null;
  return `What haven't you said yet about ${unexplored[0].toLowerCase()}?`;
}

function buildFactCandidate(state: ConversationState): string | null {
  const named = extractNamedPerson(state.facts_learned);
  if (named) return `Where is ${named} in this for you right now?`;
  const fact = [...state.facts_learned].reverse().find(f => f.trim().length > 8 && f.trim().length < 100);
  if (!fact) return null;
  return `What happened after ${fact.replace(/\.$/, "")}?`;
}

function buildMoveShapedCandidate(
  move: PhilipMove | "sit",
  state: ConversationState,
  lastUserMessage: string,
  priorUserMessages: string[],
  priorExplored: string[],
): string | null {
  if (move === "sit") return null;

  const hasFresh = userMessageHasFreshDetail(lastUserMessage, priorUserMessages);

  if (move === "plain_question" || move === "skip") {
    if (hasFresh) {
      return buildDeepenCandidate(state, lastUserMessage) ?? buildUnexploredCandidate(state, priorExplored);
    }
    return buildUnexploredCandidate(state, priorExplored) ?? buildFactCandidate(state);
  }

  if (move === "named_fact") {
    return buildFactCandidate(state) ?? buildDeepenCandidate(state, lastUserMessage);
  }

  if (move === "tension" && hasFresh) {
    const phrase = state.user_exact_words[state.user_exact_words.length - 1];
    if (phrase?.trim()) {
      return `What makes ${phrase.toLowerCase()} feel true right now?`;
    }
  }

  if (move === "reflect_back") {
    return buildDeepenCandidate(state, lastUserMessage);
  }

  return buildUnexploredCandidate(state, priorExplored);
}

function buildMindQuestionCandidates(input: PlanQuestionFromMindInput): string[] {
  const { state, lastUserMessage, priorExplored, isGuardedUser, move, repetitionRecovery } = input;

  if (repetitionRecovery) {
    return [
      pickRecoveryFallbackQuestion(state),
      pickFreshTerritoryQuestion(state, priorExplored),
      buildUnexploredCandidate(state, priorExplored) ?? "",
    ].filter(Boolean);
  }

  if (isGuardedUser) {
    return [
      buildGuardedCandidate(state, lastUserMessage) ?? "",
      buildUnexploredCandidate(state, priorExplored) ?? "",
      pickFreshTerritoryQuestion(state, priorExplored),
    ].filter(Boolean);
  }

  const shaped = buildMoveShapedCandidate(
    move,
    state,
    lastUserMessage,
    input.priorUserMessages,
    priorExplored,
  );
  const candidates = [
    shaped ?? "",
    buildDeepenCandidate(state, lastUserMessage) ?? "",
    buildFactCandidate(state) ?? "",
    buildUnexploredCandidate(state, priorExplored) ?? "",
    pickFreshTerritoryQuestion(state, priorExplored),
  ].filter(Boolean);

  return [...new Set(candidates)];
}

/** Deterministic question from Session Mind — no LLM. */
export function planQuestionFromMind(input: PlanQuestionFromMindInput): string | null {
  const ctx: QuestionValidationContext = {
    lastUserMessage: input.lastUserMessage,
    userMessages: [...input.priorUserMessages, input.lastUserMessage],
    factsLearned: input.state.facts_learned ?? [],
    priorExplored: input.priorExplored,
    exchangeNum: input.exchangeNum,
    questionsAsked: input.state.questions_asked ?? [],
  };

  for (const candidate of buildMindQuestionCandidates(input)) {
    if (isValidPlannedQuestion(candidate, ctx)) return candidate.trim();
  }

  return null;
}

export async function resolvePlannedQuestion(
  input: PlanQuestionFromMindInput,
  llmFallback: () => Promise<string>,
): Promise<{ question: string; source: PlannerSource }> {
  if (isMindPlannerEnabled()) {
    const mind = planQuestionFromMind(input);
    if (mind) return { question: mind, source: "mind" };
  }

  try {
    const llm = (await llmFallback())?.trim();
    if (llm) return { question: llm, source: "llm" };
  } catch {
    // fall through to territory fallback
  }

  return {
    question: pickFreshTerritoryQuestion(input.state, input.priorExplored),
    source: "fallback",
  };
}
