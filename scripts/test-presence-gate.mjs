#!/usr/bin/env node
/**
 * Offline unit checks for presence gate rules.
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-presence-gate.mjs
 */
import {
  collectPresenceGateFailures,
  isSacredPauseUserMessage,
  PRESENCE_SCENARIO_IDS,
} from "../eval/presenceGate.ts";
import { detectAlmostSaidIt } from "../artifacts/api-server/src/conversationState.ts";

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

console.log("Presence gate — detectors");

assert(
  "sacred pause confession",
  isSacredPauseUserMessage("Honestly I've never said this out loud — I don't think God could forgive me."),
);
assert(
  "plain anxiety not sacred pause",
  !isSacredPauseUserMessage("I keep googling symptoms at 2am."),
);
assert(
  "almost-said-it opener",
  detectAlmostSaidIt("There's something I've been wanting to say but I don't know if this makes sense."),
);

console.log("\nPresence gate — universal rules");

const earlyScriptureFail = collectPresenceGateFailures(
  { id: "test", flags: [] },
  [{
    exchangeNum: 2,
    userMessage: "My marriage is hard.",
    philipResponse: "Romans 8:28 says all things work together. What do you think?",
  }],
);
assert(
  "flags scripture in exchange 2",
  earlyScriptureFail.some((f) => f.includes("scripture too early")),
);

const almostSaidPass = collectPresenceGateFailures(
  { id: "test", flags: [] },
  [{
    exchangeNum: 1,
    userMessage: "I don't know if this makes sense but I've never told anyone.",
    philipResponse: "Go ahead.",
  }],
);
assert("almost-said-it pass sample", almostSaidPass.length === 0);

const almostSaidFail = collectPresenceGateFailures(
  { id: "test", flags: [] },
  [{
    exchangeNum: 3,
    userMessage: "Honestly, there's more.",
    philipResponse: "What happened next, and how did that make you feel about your faith journey?",
  }],
);
assert(
  "almost-said-it probe fails",
  almostSaidFail.some((f) => f.includes("almost-said-it")),
);

const sacredPass = collectPresenceGateFailures(
  { id: "test", flags: [] },
  [{
    exchangeNum: 1,
    userMessage: "I've never said this out loud — I don't think God could forgive me.",
    philipResponse: "That took courage to say out loud.",
  }],
);
assert("sacred pause pass sample", sacredPass.length === 0);

console.log("\nPresence gate — scenario flags");

const guardedFail = collectPresenceGateFailures(
  { id: "presence-guarded-01", flags: ["presence-low-permission"] },
  [{
    exchangeNum: 2,
    userMessage: "Fine.",
    philipResponse: "God has a plan — you should pray about it.",
  }],
);
assert(
  "guarded low-permission flags advice",
  guardedFail.some((f) => f.includes("low-permission")),
);

assert("presence scenario ids exported", PRESENCE_SCENARIO_IDS.length === 4);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
