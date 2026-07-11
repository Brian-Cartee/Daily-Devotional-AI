#!/usr/bin/env node
/**
 * Mind-informed planner unit checks (PR-5).
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-mind-planner.mjs
 */
import {
  planQuestionFromMind,
  isValidPlannedQuestion,
  isMindPlannerEnabled,
} from "../artifacts/api-server/src/philip-runtime/planner/mindPlanner.ts";
import {
  recyclesPriorQuestion,
  pickUniqueFallbackQuestion,
  collectFallbackQuestionCandidates,
  extractQuestionsFromPhilipHistory,
  mergeQuestionsAsked,
} from "../artifacts/api-server/src/conversationState.ts";

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

const baseState = {
  core_issue: "distance in marriage",
  facts_learned: ["husband Mark", "they have been distant for months"],
  areas_explored: ["general distance"],
  areas_unexplored: ["what she has tried", "how Mark responds"],
  questions_asked: ["What's been hardest about the distance?"],
  metaphors_used: [],
  user_exact_words: ["lying awake at night"],
  conversation_closing: false,
};

console.log("Mind planner — deterministic questions");

const q = planQuestionFromMind({
  state: baseState,
  lastUserMessage: "I tried texting Mark last night but he didn't answer. I was lying awake at night again.",
  priorUserMessages: ["My husband and I have been distant for months."],
  priorExplored: [],
  exchangeNum: 3,
  isGuardedUser: false,
  move: "plain_question",
});
assert("returns a question", !!q && q.includes("?"));
assert("uses session mind signal", !!q && q.includes("?") && !/say more about|what haven'?t you said yet about/i.test(q));

const guarded = planQuestionFromMind({
  state: baseState,
  lastUserMessage: "I don't know.",
  priorUserMessages: ["Fine."],
  priorExplored: [],
  exchangeNum: 2,
  isGuardedUser: true,
  move: "plain_question",
});
assert("guarded user gets plain question", !!guarded && !/carrying something|beneath your words/i.test(guarded));

const recycled = isValidPlannedQuestion("What's been hardest about the distance?", {
  lastUserMessage: "More of the same.",
  userMessages: ["More of the same."],
  factsLearned: baseState.facts_learned,
  priorExplored: [],
  exchangeNum: 3,
  questionsAsked: baseState.questions_asked,
});
assert("rejects recycled question", !recycled);

assert("rejects generic relationships territory on turn 2", !isValidPlannedQuestion(
  "What haven't you said yet about relationships?",
  {
    lastUserMessage: "My husband died three weeks ago.",
    userMessages: ["My husband died three weeks ago."],
    factsLearned: [],
    priorExplored: [],
    exchangeNum: 2,
    questionsAsked: [],
  },
));

assert("rejects template leak", !isValidPlannedQuestion(
  "What haven't you said yet about user's relationship with faith?",
  {
    lastUserMessage: "I don't know.",
    userMessages: ["I don't know."],
    factsLearned: [],
    priorExplored: [],
    exchangeNum: 3,
    questionsAsked: [],
  },
));

assert("rejects say-more echo template", !isValidPlannedQuestion(
  'Say more about "Yeah. I keep his pillow there still"?',
  {
    lastUserMessage: "Yeah. I keep his pillow there still. Can't bring myself to move it.",
    userMessages: ["Yeah. I keep his pillow there still. Can't bring myself to move it."],
    factsLearned: [],
    priorExplored: [],
    exchangeNum: 4,
    questionsAsked: [],
  },
));

assert("rejects put-into-words template", !isValidPlannedQuestion(
  "What's one part of this you haven't put into words yet?",
  {
    lastUserMessage: "I poured my heart out and nobody noticed.",
    userMessages: ["I poured my heart out and nobody noticed."],
    factsLearned: [],
    priorExplored: [],
    exchangeNum: 5,
    questionsAsked: [],
  },
));

assert("rejects meta bring-that-up probe", !isValidPlannedQuestion(
  "What made you bring that up just now?",
  {
    lastUserMessage: "I said things I regret.",
    userMessages: ["I said things I regret."],
    factsLearned: [],
    priorExplored: [],
    exchangeNum: 4,
    questionsAsked: [],
  },
));

assert("rejects what happened next on hover", !isValidPlannedQuestion(
  "What happened next?",
  {
    lastUserMessage: "I don't know if this makes sense but there's something I've been wanting to say.",
    userMessages: ["There's something I've been wanting to say."],
    factsLearned: [],
    priorExplored: [],
    exchangeNum: 2,
    questionsAsked: [],
  },
));

assert("planner defers on grief pour", planQuestionFromMind({
  state: baseState,
  lastUserMessage: "Yeah. I keep his pillow there still. Can't bring myself to move it. I sleep on his side every night.",
  priorUserMessages: ["My husband died three weeks ago."],
  priorExplored: [],
  exchangeNum: 4,
  isGuardedUser: false,
  move: "plain_question",
}) === null);

assert("planner still asks on phase-1 style opening", planQuestionFromMind({
  state: baseState,
  lastUserMessage: "My daughter left the church and moved in with her boyfriend. She stopped calling.",
  priorUserMessages: [],
  priorExplored: [],
  exchangeNum: 1,
  isGuardedUser: false,
  move: "plain_question",
}) !== null);

assert("planner blocked on sacred confession thread", planQuestionFromMind({
  state: baseState,
  lastUserMessage: "I don't know. It's just heavy.",
  priorUserMessages: ["Honestly I've never said this out loud — I don't think God could forgive me for what I did."],
  priorExplored: [],
  exchangeNum: 2,
  isGuardedUser: false,
  move: "plain_question",
  openingSituation: "Honestly I've never said this out loud — I don't think God could forgive me for what I did.",
}) === null);

assert("planner blocked on almost-said-it thread", planQuestionFromMind({
  state: baseState,
  lastUserMessage: "I guess I'm scared.",
  priorUserMessages: ["There's something I've been wanting to say but I don't know if this makes sense."],
  priorExplored: [],
  exchangeNum: 2,
  isGuardedUser: false,
  move: "plain_question",
  openingSituation: "There's something I've been wanting to say but I don't know if this makes sense.",
}) === null);

assert("rejects territory fallback pool probes", !isValidPlannedQuestion(
  "What's the piece underneath this that you haven't named yet?",
  {
    lastUserMessage: "I don't know if I even have it anymore.",
    userMessages: ["I don't know if I even have it anymore."],
    factsLearned: [],
    priorExplored: [],
    exchangeNum: 4,
    questionsAsked: [],
  },
));

assert("rejects hardest-to-name template", !isValidPlannedQuestion(
  "What part of this feels hardest to name out loud?",
  {
    lastUserMessage: "Telling her the truth feels like it costs me her.",
    userMessages: ["Telling her the truth feels like it costs me her."],
    factsLearned: [],
    priorExplored: [],
    exchangeNum: 5,
    questionsAsked: [],
  },
));

assert("rejects what changed after that", !isValidPlannedQuestion(
  "What changed after that for you?",
  {
    lastUserMessage: "He reached for me and I let it ring.",
    userMessages: ["He reached for me and I let it ring."],
    factsLearned: [],
    priorExplored: [],
    exchangeNum: 6,
    questionsAsked: [],
  },
));

assert("rejects user placeholder territory leak", !isValidPlannedQuestion(
  "How does user's efforts to connect show up in this for you right now?",
  {
    lastUserMessage: "Like I never mattered.",
    userMessages: ["Like I never mattered."],
    factsLearned: [],
    priorExplored: [],
    exchangeNum: 5,
    questionsAsked: [],
  },
));

assert("fallback pool avoids exact repeats", (() => {
  const state = {
    ...baseState,
    questions_asked: ["What's the piece underneath this that you haven't named yet?"],
  };
  const next = pickUniqueFallbackQuestion(state, []);
  return !!next && !recyclesPriorQuestion(next, state.questions_asked);
})());

assert("fallback candidates rotate through pool", collectFallbackQuestionCandidates(baseState, []).length >= 6);

console.log("\nMind planner — question history dedup");

assert("extracts questions from Philip history", (() => {
  const qs = extractQuestionsFromPhilipHistory([
    "That sounds heavy. What part feels hardest right now?",
    "I'm glad you said that.",
  ]);
  return qs.length === 1 && qs[0].includes("hardest");
})());

assert("merge includes history not only state", (() => {
  const merged = mergeQuestionsAsked(
    ["What's been hardest about the distance?"],
    ["Where does this hit you hardest right now?"],
  );
  return merged.length === 2;
})());

assert("fallback skips questions Philip already shipped", (() => {
  const state = { ...baseState, questions_asked: [] };
  const priorPhilip = ["Where does this hit you hardest right now?"];
  const next = pickUniqueFallbackQuestion(state, [], priorPhilip);
  return !!next && !recyclesPriorQuestion(next, mergeQuestionsAsked(state.questions_asked, priorPhilip));
})());

assert("mind planner rejects recycled question from history", !planQuestionFromMind({
  state: { ...baseState, questions_asked: [] },
  lastUserMessage: "I tried texting Mark last night but he didn't answer.",
  priorUserMessages: ["My husband and I have been distant for months."],
  priorExplored: [],
  exchangeNum: 4,
  isGuardedUser: false,
  move: "plain_question",
  priorPhilipMessages: ["Where does this hit you hardest right now?"],
})?.includes("hit you hardest"));

assert("enabled by default", isMindPlannerEnabled());

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
