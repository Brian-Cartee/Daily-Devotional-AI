#!/usr/bin/env node
/**
 * Unit checks for Philip Session Mind (PR-1) + mind telemetry (PR-2).
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-session-mind.mjs
 */
import {
  reconstructCanonicalHistory,
  commitSessionMind,
  inferSessionMindStage,
  clearSessionMindStoreForTests,
  getSessionMind,
  setSessionMind,
} from "../artifacts/api-server/src/philip-runtime/mind/sessionMind.ts";
import {
  turnMetadataToHeaders,
  parseTurnHeaders,
  PHILIP_MIND_VERSION_HEADER,
  PHILIP_STATE_SOURCE_HEADER,
} from "../artifacts/api-server/src/philip-runtime/runtime/headers.ts";
import {
  buildPhilipTurnLogEntry,
  PHILIP_TURN_LOG_EVENT,
} from "../artifacts/api-server/src/philip-runtime/runtime/log.ts";
import { PHILIP_RUNTIME_VERSION } from "../artifacts/api-server/src/philip-runtime/version.ts";
import {
  buildTurnContextPackage,
} from "../artifacts/api-server/src/philip-runtime/context/turnContextPackage.ts";
import {
  serializeLegacyDynamicNotes,
  serializeTurnContextPackage,
} from "../artifacts/api-server/src/philip-runtime/context/serialize.ts";

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

function emptyState() {
  return {
    core_issue: "test",
    facts_learned: [],
    areas_explored: [],
    areas_unexplored: [],
    questions_asked: [],
    metaphors_used: [],
    user_exact_words: [],
    conversation_closing: false,
  };
}

console.log("Session Mind — reconstructCanonicalHistory");

const situation = "My husband and I have been distant.";
const phase1 = "That distance sounds heavy.";
const phase1Reply = "His name is Mark. I don't know how to reach him.";

const turn3Messages = [
  { role: "user", content: situation },
  { role: "assistant", content: "Philip's deeper response after phase 2." },
  { role: "user", content: "I tried texting him last night." },
];

const canonical = reconstructCanonicalHistory({
  situation,
  messages: turn3Messages,
  phase1Response: phase1,
  phase1UserReply: phase1Reply,
});

assert("turn 3 includes phase-1 mirror", canonical[1]?.content === phase1);
assert("turn 3 includes phase-1 user reply", canonical[2]?.content === phase1Reply);
assert("turn 3 has five turns", canonical.length === 5);
assert("last user message preserved", canonical[4]?.content.includes("texting"));

const twoPhase = reconstructCanonicalHistory({
  situation,
  messages: [{ role: "user", content: situation }],
  phase1Response: phase1,
  phase1UserReply: phase1Reply,
});
assert("two-phase spine is three turns", twoPhase.length === 3);

const legacy = reconstructCanonicalHistory({
  situation,
  messages: turn3Messages,
});
assert("legacy without phase1 fields unchanged", legacy.length === 3);

console.log("\nSession Mind — commit + cache");

clearSessionMindStoreForTests();
const committed = commitSessionMind(null, {
  conversationState: emptyState(),
  philipResponse: "What happened the last time you tried to reach Mark?",
  canonicalHistory: twoPhase,
  phase1Included: true,
});
assert("first commit version is 1", committed.version === 1);
assert("stage is recognition after one Philip turn", committed.stage === "recognition");
assert("exchangeNum counts Philip turns", committed.exchangeNum === 1);

setSessionMind("test-session", committed);
const loaded = getSessionMind("test-session");
assert("cache round-trip", loaded?.version === 1);

const committed2 = commitSessionMind(loaded, {
  conversationState: { ...emptyState(), facts_learned: ["Mark is her husband"] },
  philipResponse: "When did the distance start between you and Mark?",
  canonicalHistory: [...twoPhase, { role: "assistant", content: "x" }, { role: "user", content: "y" }],
  phase1Included: true,
});
assert("second commit increments version", committed2.version === 2);
assert("exploration stage after two Philip turns", committed2.stage === "exploration");
assert("closing stage when flagged", inferSessionMindStage(3, true) === "closing");

console.log("\nMind telemetry — headers + log shape");

const sampleMetadata = {
  philipRuntimeVersion: PHILIP_RUNTIME_VERSION,
  exchangeNum: 3,
  lane: "follow_up",
  move: "plain_question",
  gates: ["mechanical_construction"],
  engine: "claude",
  mechanical: true,
  mindVersion: 2,
  mindStage: "exploration",
  stateSource: "cache",
  phase1Included: true,
  canonicalHistoryTurns: 5,
  questionsAskedCount: 2,
};

const headerMap = turnMetadataToHeaders(sampleMetadata);
const fakeHeaders = new Headers(headerMap);
const parsed = parseTurnHeaders(fakeHeaders);

assert("header round-trip mindVersion", parsed.mindVersion === 2);
assert("header round-trip stateSource", parsed.stateSource === "cache");
assert("header round-trip phase1Included", parsed.phase1Included === true);
assert("header round-trip canonicalHistoryTurns", parsed.canonicalHistoryTurns === 5);
assert("header round-trip questionsAskedCount", parsed.questionsAskedCount === 2);
assert("mind version header name", headerMap[PHILIP_MIND_VERSION_HEADER] === "2");
assert("state source header name", headerMap[PHILIP_STATE_SOURCE_HEADER] === "cache");

const logEntry = buildPhilipTurnLogEntry(sampleMetadata, "sess-abc");
assert("log event name", logEntry.event === PHILIP_TURN_LOG_EVENT);
assert("log has mindVersion", logEntry.mindVersion === 2);
assert("log has questionsAskedCount", logEntry.questionsAskedCount === 2);
assert("log has no message text keys", !("userMessage" in logEntry) && !("text" in logEntry));

console.log("\nTurn Context Package — policy + budget");

const sampleNotes = {
  nameNote: "\n\nThe person's name is Alex.",
  memoryNote: "\n\nWhat you already know:\nThey journaled about grief last week.",
  journalEchoNote: "\n\nRecent entries:\nHard day at work.",
  relationshipNote: "\n\nThey have been with the app for two weeks.",
  voiceNote: "\n\nVoice: warm and direct.",
  guidanceSafetyNote: "\n\nNo acute risk detected.",
  conversationStateBlock: "\n\n━━━━━━━━━━━━━━━━━━━━\nCONVERSATION STATE\n━━━━━━━━━━━━━━━━━━━━\nCore issue: distance",
};

const followPkg = buildTurnContextPackage("follow_up", sampleNotes);
assert("follow-up omits journal memory", !followPkg.sections.journalMemory);
assert("follow-up omits journal echo", !followPkg.sections.journalEcho);
assert("follow-up keeps session mind", !!followPkg.sections.sessionMind);
assert("follow-up keeps person", !!followPkg.sections.person);

const firstPkg = buildTurnContextPackage("first_response", sampleNotes);
assert("first response keeps journal memory", !!firstPkg.sections.journalMemory);

const bulkyNotes = {
  ...sampleNotes,
  memoryNote: `\n\nJournal context:\n${"grief and loss ".repeat(60)}`,
  journalEchoNote: `\n\nRecent entries:\n${"work stress ".repeat(60)}`,
};
const bulkyFollowTcp = serializeTurnContextPackage(buildTurnContextPackage("follow_up", bulkyNotes));
const bulkyLegacy = serializeLegacyDynamicNotes(Object.values(bulkyNotes));
const followTcp = serializeTurnContextPackage(followPkg);
const firstTcp = serializeTurnContextPackage(firstPkg);
assert("follow-up TCP smaller when journal sections omitted", bulkyFollowTcp.charCount < bulkyLegacy.length);
assert("follow-up TCP includes SESSION label", followTcp.text.includes("SESSION UNDERSTANDING"));
assert("serialized TCP has charCount", followTcp.charCount > 0);
assert("first response TCP includes journal section", firstTcp.text.includes("KNOWN FROM PAST"));

sampleMetadata.contextMode = "tcp";
sampleMetadata.tcpCharCount = followTcp.charCount;
const tcpHeaders = turnMetadataToHeaders(sampleMetadata);
assert("context mode header", tcpHeaders["X-Philip-Context-Mode"] === "tcp");
assert("tcp chars header", tcpHeaders["X-Philip-TCP-Chars"] === String(followTcp.charCount));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
