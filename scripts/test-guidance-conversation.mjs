#!/usr/bin/env node
/**
 * Unit checks for guidance conversation payload assembly (PR-4).
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-guidance-conversation.mjs
 */
import {
  buildPhase1SpineFields,
  buildTwoPhaseRequestMessages,
  appendUserMessage,
  appendAssistantMessage,
  buildGuidanceResponsePayload,
  buildGuidancePhase1Payload,
  commitAssistantTurn,
  buildUserTurnEvent,
} from "../artifacts/shepherds-path/src/lib/guidanceConversationCore.ts";

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

console.log("Phase-1 spine fields");

const spine = buildPhase1SpineFields({
  phase1Response: " That sounds heavy.",
  phase1UserReplySubmitted: "His name is Mark.",
});
assert("spine includes phase1Response", spine.phase1Response === "That sounds heavy.");
assert("spine includes phase1UserReply", spine.phase1UserReply === "His name is Mark.");
assert("empty without reply", Object.keys(buildPhase1SpineFields({ phase1Response: "x" })).length === 0);

console.log("\nMessage assembly");

const situation = "We have been distant for months.";
const twoPhase = buildTwoPhaseRequestMessages(situation);
assert("two-phase messages are situation only", twoPhase.length === 1 && twoPhase[0].role === "user");

let thread = twoPhase;
thread = commitAssistantTurn(thread, "Philip depth response.");
thread = appendUserMessage(thread, "I tried texting him.");
assert("thread grows user then assistant", thread.length === 3);
assert("last message is user follow-up", thread[2].role === "user");

console.log("\nResponse payload");

const payload = buildGuidanceResponsePayload({
  situation,
  messages: twoPhase,
  guidanceMode: "encouraging",
  phase1Spine: spine,
  heartContext: "heavy",
  companionMode: "philip",
  userName: "Alex",
  sessionExtras: { sessionId: "sess-1", isPro: true, daysWithApp: 10 },
});
assert("payload carries spine", payload.phase1Response === spine.phase1Response);
assert("payload messages unchanged", payload.messages.length === 1);
assert("payload session extras", payload.sessionId === "sess-1");
assert("two-phase does not embed phase1 in messages", !payload.messages.some(m => m.role === "assistant"));

const followPayload = buildGuidanceResponsePayload({
  situation,
  messages: thread,
  guidanceMode: "encouraging",
  phase1Spine: spine,
  companionMode: "philip",
  sessionExtras: { sessionId: "sess-1", isPro: false, daysWithApp: 3 },
});
assert("follow-up still sends spine", followPayload.phase1UserReply === "His name is Mark.");

const eventPayload = buildGuidanceResponsePayload({
  situation,
  messages: twoPhase,
  guidanceMode: "encouraging",
  conversationId: "conv-abc",
  turnEvent: buildUserTurnEvent("His name is Mark.", "turn-1"),
  sessionExtras: { sessionId: "sess-1", isPro: false, daysWithApp: 3 },
});
assert("payload carries conversationId", eventPayload.conversationId === "conv-abc");
assert("payload carries turnEvent", eventPayload.turnEvent?.role === "user");

const phase1Payload = buildGuidancePhase1Payload({
  situation,
  userName: "Alex",
  companionMode: "philip",
  sessionExtras: { sessionId: "sess-1", isPro: false, daysWithApp: 1 },
});
assert("phase1 payload has situation", phase1Payload.situation === situation);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
