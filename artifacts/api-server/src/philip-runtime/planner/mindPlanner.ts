import {
  containsMysticalColdRead,
  inventsUnsupportedDetail,
  isBannedQuestion,
  isGenericTerritoryArea,
  isTemplateLeakQuestion,
  isMechanicalForwardProbe,
  detectAlmostSaidIt,
  mergeQuestionsAsked,
  pickFreshTerritoryQuestion,
  pickRecoveryFallbackQuestion,
  collectFallbackQuestionCandidates,
  pickUniqueFallbackQuestion,
  questionInventsRelationship,
  recyclesPriorQuestion,
  asksMetaHardestProbe,
  reasksWhatUserJustStated,
  sanitizeAreasUnexplored,
  shouldRejectPriorExploredQuestion,
  territoryToNaturalQuestion,
  userMessageHasFreshDetail,
  userMessageWarrantsReceiveOnly,
  userSharedConcreteBeat,
  isSubstantiveDisclosure,
  presenceThreadBlocksPlannerProbe,
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
  priorPhilipMessages?: string[];
  openingSituation?: string;
}

export interface QuestionValidationContext {
  lastUserMessage: string;
  userMessages: string[];
  factsLearned: string[];
  priorExplored: string[];
  exchangeNum: number;
  questionsAsked: string[];
}

function mergedQuestionsAsked(input: PlanQuestionFromMindInput): string[] {
  return mergeQuestionsAsked(
    input.state.questions_asked ?? [],
    input.priorPhilipMessages ?? [],
  );
}

function buildValidationContext(input: PlanQuestionFromMindInput): QuestionValidationContext {
  return {
    lastUserMessage: input.lastUserMessage,
    userMessages: [...input.priorUserMessages, input.lastUserMessage],
    factsLearned: input.state.facts_learned ?? [],
    priorExplored: input.priorExplored,
    exchangeNum: input.exchangeNum,
    questionsAsked: mergedQuestionsAsked(input),
  };
}

export function isValidPlannedQuestion(
  question: string,
  ctx: QuestionValidationContext,
): boolean {
  const q = question?.trim();
  if (!q || !q.includes("?")) return false;
  if (isBannedQuestion(q)) return false;
  if (isTemplateLeakQuestion(q)) return false;
  if (isMechanicalForwardProbe(q)) return false;
  if (ctx.exchangeNum <= 5 && detectAlmostSaidIt(ctx.lastUserMessage) && isMechanicalForwardProbe(q)) return false;
  if (ctx.exchangeNum <= 2 && /what haven'?t you said yet about/i.test(q)) return false;
  if (containsMysticalColdRead(q)) return false;
  if (questionInventsRelationship(q, ctx.userMessages, ctx.factsLearned)) return false;
  if (inventsUnsupportedDetail(q, ctx.userMessages, ctx.factsLearned, ctx.exchangeNum)) return false;
  if (shouldRejectPriorExploredQuestion(q, ctx.priorExplored, ctx.lastUserMessage)) return false;
  if (reasksWhatUserJustStated(ctx.lastUserMessage, q)) return false;
  if (asksMetaHardestProbe(ctx.lastUserMessage, q)) return false;
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
  if (named) return `What's been hardest with ${named} lately?`;
  if (lastUserMessage.split(/\s+/).length >= 6) return null;
  return "What's the part you haven't said yet?";
}

function buildDeepenCandidate(state: ConversationState, lastUserMessage: string): string | null {
  if (isSubstantiveDisclosure(lastUserMessage)) return null;
  const named = extractNamedPerson(state.facts_learned);
  if (named && lastUserMessage.toLowerCase().includes(named.toLowerCase())) {
    return `Where is ${named} in this for you right now?`;
  }
  return null;
}

function buildUnexploredCandidate(
  state: ConversationState,
  priorExplored: string[],
): string | null {
  const unexplored = sanitizeAreasUnexplored(state.areas_unexplored ?? []).filter(area =>
    area.trim()
    && !isGenericTerritoryArea(area)
    && !priorExplored.some(e => area.toLowerCase().includes(e.toLowerCase().slice(0, 12))),
  );
  if (unexplored.length === 0) return null;
  return territoryToNaturalQuestion(unexplored[0]);
}

function buildFactCandidate(state: ConversationState, lastUserMessage: string): string | null {
  if (userSharedConcreteBeat(lastUserMessage)) return null;
  const named = extractNamedPerson(state.facts_learned);
  if (named) return `Where is ${named} in this for you right now?`;
  const fact = [...state.facts_learned].reverse().find(f => f.trim().length > 8 && f.trim().length < 100);
  if (!fact) return null;
  const nameInFact = fact.match(/\b([A-Z][a-z]+)\b/);
  if (nameInFact) return `What's hardest about ${nameInFact[1]} in this right now?`;
  return null;
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
    return buildUnexploredCandidate(state, priorExplored) ?? buildFactCandidate(state, lastUserMessage);
  }

  if (move === "named_fact") {
    return buildFactCandidate(state, lastUserMessage) ?? buildDeepenCandidate(state, lastUserMessage);
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
    return collectFallbackQuestionCandidates(state, priorExplored);
  }

  if (isGuardedUser) {
    return [
      buildGuardedCandidate(state, lastUserMessage) ?? "",
      buildUnexploredCandidate(state, priorExplored) ?? "",
      pickFreshTerritoryQuestion(state, priorExplored, input.priorPhilipMessages ?? []),
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
    buildFactCandidate(state, lastUserMessage) ?? "",
    buildUnexploredCandidate(state, priorExplored) ?? "",
    pickFreshTerritoryQuestion(state, priorExplored, input.priorPhilipMessages ?? []),
  ].filter(Boolean);

  return [...new Set(candidates)];
}

/** Deterministic question from Session Mind — no LLM. */
export function planQuestionFromMind(input: PlanQuestionFromMindInput): string | null {
  if (input.openingSituation && presenceThreadBlocksPlannerProbe(
    input.openingSituation,
    input.priorUserMessages,
    input.lastUserMessage,
    input.exchangeNum,
  )) {
    return null;
  }

  if (userMessageWarrantsReceiveOnly(input.lastUserMessage, { exchangeNum: input.exchangeNum })) {
    return null;
  }

  const ctx: QuestionValidationContext = buildValidationContext(input);

  for (const candidate of buildMindQuestionCandidates(input)) {
    if (isValidPlannedQuestion(candidate, ctx)) return candidate.trim();
  }

  return null;
}

export async function resolvePlannedQuestion(
  input: PlanQuestionFromMindInput,
  llmFallback: () => Promise<string>,
): Promise<{ question: string; source: PlannerSource }> {
  if (input.openingSituation && presenceThreadBlocksPlannerProbe(
    input.openingSituation,
    input.priorUserMessages,
    input.lastUserMessage,
    input.exchangeNum,
  )) {
    return { question: "", source: "none" };
  }

  const ctx = buildValidationContext(input);
  const priorPhilip = input.priorPhilipMessages ?? [];

  if (isMindPlannerEnabled()) {
    const mind = planQuestionFromMind(input);
    if (mind) return { question: mind, source: "mind" };
  }

  try {
    const llm = (await llmFallback())?.trim();
    if (llm && isValidPlannedQuestion(llm, ctx)) return { question: llm, source: "llm" };
  } catch {
    // fall through to territory fallback
  }

  for (const candidate of collectFallbackQuestionCandidates(input.state, input.priorExplored)) {
    if (isValidPlannedQuestion(candidate, ctx)) {
      return { question: candidate.trim(), source: "fallback" };
    }
  }

  const unique = pickUniqueFallbackQuestion(input.state, input.priorExplored, priorPhilip);
  if (unique && isValidPlannedQuestion(unique, ctx)) {
    return { question: unique, source: "fallback" };
  }

  return { question: "", source: "none" };
}
