#!/usr/bin/env node
/**
 * Presence-layer policy unit checks — fast, deterministic, no API.
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-presence-policy.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  detectAlmostSaidIt,
  buildStatePromptBlock,
} from "../artifacts/api-server/src/conversationState.ts";
import { validateResponse } from "../artifacts/api-server/src/lib/responseGuardrails.ts";
import {
  basePresenceState,
  evaluateTurnResponse,
  runFixtureOffline,
  summarizeFixtureResults,
} from "../artifacts/api-server/src/lib/presenceFixtureValidator.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, "../eval/fixtures/presence");

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

console.log("Presence policy — detectAlmostSaidIt");

assert(
  "qualifier: I don't know if this makes sense",
  detectAlmostSaidIt("I don't know if this makes sense but something happened."),
);
assert(
  "qualifier: this might sound stupid",
  detectAlmostSaidIt("This might sound stupid but I miss him."),
);
assert(
  "qualifier: I've never told anyone",
  detectAlmostSaidIt("I've never told anyone what happened that night."),
);
assert(
  "qualifier: honestly",
  detectAlmostSaidIt("Honestly, I don't think I believe anymore."),
);
assert(
  "qualifier: the truth is",
  detectAlmostSaidIt("The truth is I walked away."),
);
assert(
  "plain struggle is not almost-said-it",
  !detectAlmostSaidIt("I've been struggling with my marriage for months."),
);
assert(
  "plain grief is not almost-said-it",
  !detectAlmostSaidIt("My mom died last week and I can't sleep."),
);

console.log("\nPresence policy — buildStatePromptBlock");

const lowPerm = buildStatePromptBlock(basePresenceState({
  permission_level: "low",
  recognition_delivered: false,
}));
assert("low permission forbids reframe in prompt", lowPerm.includes("no reframes, no scripture"));
assert("low recognition warns before guidance", lowPerm.includes("NO — do not offer guidance, scripture, or reframe"));

const medPerm = buildStatePromptBlock(basePresenceState({
  permission_level: "medium",
  recognition_delivered: true,
  current_depth_layer: 2,
}));
assert("medium permission allows tentative scripture", medPerm.includes("scripture only as invitation"));
assert("layer 2 depth hint", medPerm.includes("internal response"));

const almostSaid = buildStatePromptBlock(basePresenceState({
  almost_said_it_detected: true,
}));
assert("almost said it instruction present", almostSaid.includes("ALMOST SAID IT"));
assert("almost said it word limit", almostSaid.includes("under 30 words"));

const sacredPause = buildStatePromptBlock(basePresenceState({
  sacred_pause_warranted: true,
}));
assert("sacred pause instruction present", sacredPause.includes("SACRED PAUSE"));
assert("sacred pause one sentence", sacredPause.includes("one sentence only"));

console.log("\nPresence policy — responseGuardrails");

const noScripture = validateResponse(
  "That kind of distance can sit heavy for months. What part lands hardest when the day ends?",
);
assert(
  "no scripture penalty when response has no verse",
  !noScripture.issues.some((i) => /scripture/i.test(i)),
);
assert(
  "no truth reframe penalty",
  !noScripture.issues.some((i) => /reframe/i.test(i)),
);

const cliche = validateResponse(
  "God has a plan for your marriage. Everything happens for a reason. What do you think?",
);
assert(
  "cliché still flagged",
  cliche.issues.some((i) => /cliché|god has a plan|everything happens/i.test(i)),
);
assert("cliché response not approved", !cliche.approved);

console.log("\nPresence policy — turn response rules");

const almostRules = {
  maxWords: 30,
  forbidQuestion: true,
  requirePatterns: ["go ahead|take your time|I'm here"],
};
const almostGood = evaluateTurnResponse(almostRules, "Go ahead.");
const almostBad = evaluateTurnResponse(almostRules, "What happened next?");
assert("almost-said good sample passes", almostGood.ok);
assert("almost-said probe fails", !almostBad.ok);

const sacredRules = {
  maxSentences: 1,
  forbidQuestion: true,
  forbidScripture: true,
};
const sacredGood = evaluateTurnResponse(sacredRules, "That took courage to say out loud.");
const sacredBad = evaluateTurnResponse(
  sacredRules,
  "God forgives you. Romans 8:1. What do you think?",
);
assert("sacred pause good sample passes", sacredGood.ok);
assert("sacred pause overreach fails", !sacredBad.ok);

const markFalsePositive = evaluateTurnResponse(
  { forbidScripture: true },
  "Every day without her voice must leave a mark, a reminder of what's missing.",
);
assert("ordinary 'mark' is not treated as scripture", markFalsePositive.ok);

console.log("\nPresence policy — fixture pack (offline)");

const fixtureFiles = fs.readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".json"));
assert("fixture directory has files", fixtureFiles.length >= 6);

for (const file of fixtureFiles) {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, file), "utf8"));
  const results = runFixtureOffline(fixture);
  const summary = summarizeFixtureResults(results);

  for (const result of results) {
    assert(
      `${fixture.id} — ${result.label}`,
      result.ok,
    );
    if (!result.ok) {
      for (const err of result.errors) {
        console.error(`      ${err}`);
      }
    }
  }

  assert(
    `${fixture.id} — all checks passed (${summary.passed})`,
    summary.failed === 0,
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
