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
assert("uses session mind signal", !!q && /Mark|tried|respond|awake|said yet|Say more about/i.test(q));

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

assert("enabled by default", isMindPlannerEnabled());

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
