#!/usr/bin/env node
/** Unit tests for voiceConversationSession reducer (inline — no TS import). */

const INITIAL = {
  state: "idle",
  turnId: 0,
  sessionEpoch: 0,
  active: false,
  lastError: null,
  fallbackMode: "handsFree",
};

function voiceConversationReducer(prev, event) {
  switch (event.type) {
    case "START_SESSION":
      return {
        ...INITIAL,
        sessionEpoch: prev.sessionEpoch + 1,
        turnId: 1,
        active: true,
        state: "idle",
        fallbackMode: event.fallbackMode ?? prev.fallbackMode,
        lastError: null,
      };
    case "END_SESSION":
      return { ...prev, active: false, state: "ended" };
    case "BUMP_TURN":
      return { ...prev, turnId: prev.turnId + 1, lastError: null };
    case "LISTENING":
      return prev.active ? { ...prev, state: "listening", lastError: null } : prev;
    case "SPEECH_DETECTED":
      return prev.active && (prev.state === "listening" || prev.state === "speechDetected")
        ? { ...prev, state: "speechDetected" }
        : prev;
    case "SPEAKING":
      return prev.active ? { ...prev, state: "speaking", lastError: null } : prev;
    case "WAITING_TO_RESUME":
      return prev.active ? { ...prev, state: "waitingToResumeListening" } : prev;
    default:
      return prev;
  }
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

let s = INITIAL;
s = voiceConversationReducer(s, { type: "START_SESSION", fallbackMode: "handsFree" });
assert(s.active && s.turnId === 1, "START_SESSION");

s = voiceConversationReducer(s, { type: "SPEAKING" });
assert(s.state === "speaking", "SPEAKING");

s = voiceConversationReducer(s, { type: "WAITING_TO_RESUME" });
assert(s.state === "waitingToResumeListening", "WAITING_TO_RESUME");

s = voiceConversationReducer(s, { type: "LISTENING" });
assert(s.state === "listening", "LISTENING");

s = voiceConversationReducer(s, { type: "BUMP_TURN" });
assert(s.turnId === 2, "BUMP_TURN");

s = voiceConversationReducer(s, { type: "END_SESSION" });
assert(s.state === "ended" && !s.active, "END_SESSION");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
