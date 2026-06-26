#!/usr/bin/env node
/**
 * Presence enforcement unit checks — short-circuit + sanitize.
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-presence-enforcement.mjs
 */
import {
  tryPresenceShortCircuit,
  enforcePresenceResponse,
  resolvePresenceLane,
} from "../artifacts/api-server/src/lib/presenceEnforcement.ts";
import { applyPostTurnGates } from "../artifacts/api-server/src/philip-runtime/runtime/gates.ts";

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

console.log("Presence enforcement — short-circuit");

const almost = tryPresenceShortCircuit(
  "I don't know if this makes sense but I've never told anyone this.",
);
assert("almost-said-it short-circuits", !!almost && almost.lane === "almost_said_it");
assert("almost-said-it under 30 words", almost && almost.text.split(/\s+/).length <= 30);
assert("almost-said-it no question", almost && !almost.text.includes("?"));

const sacred = tryPresenceShortCircuit(
  "Honestly I've never said this out loud — I don't think God could forgive me.",
);
assert("sacred pause short-circuits", !!sacred && sacred.lane === "sacred_pause");
assert("sacred pause one sentence", sacred && !sacred.text.includes("?"));

console.log("\nPresence enforcement — sanitize");

const badAlmost = enforcePresenceResponse(
  "Not telling anyone can feel heavy. What makes now the right time to share?",
  "almost_said_it",
);
assert("bad almost-said-it replaced", badAlmost === "Go ahead." || badAlmost === "Take your time with that." || badAlmost === "I'm here whenever you're ready.");

const badSacred = enforcePresenceResponse(
  "God forgives you. Romans 8:1. What do you think?",
  "sacred_pause",
);
assert("bad sacred pause replaced", badSacred.includes("courage") || badSacred.includes("Thank you"));

console.log("\nPresence enforcement — post-turn gate (two-phase path)");

const postTwoPhase = applyPostTurnGates({
  text: "Not telling anyone — it's like carrying a secret. What makes now feel right?",
  isFollowUp: false,
  noQuestionMode: false,
  conversationHistory: [
    { role: "user", content: "I don't know if this makes sense but I've never told anyone." },
  ],
  exchangeNum: 1,
  conversationState: null,
});
assert("two-phase post-turn fixes almost-said-it", !postTwoPhase.text.includes("?"));
assert("two-phase post-turn gate recorded", postTwoPhase.gates.includes("presence_almost_said_it"));
assert("two-phase lane is presence_hold", postTwoPhase.lane === "presence_hold");

assert("plain message has no lane", resolvePresenceLane("My marriage has been hard lately.") === null);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
