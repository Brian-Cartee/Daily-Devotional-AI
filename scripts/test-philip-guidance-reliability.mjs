#!/usr/bin/env node
/**
 * Reliability hotfix verification (room 74eefef4 class of failures).
 * Zero paid API calls.
 * Run from api-server so package deps resolve:
 *   cd artifacts/api-server && node --import tsx/esm ../../scripts/test-philip-guidance-reliability.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../artifacts/api-server/package.json"),
);
const express = require("express");

import {
  guidanceInstruction,
  makeLlmDeepGenerator,
  runCandidateGuidanceTurn,
  createFrontDoorState,
  PHILIP_VOICE_GENOME_VERSION,
  CONTRIBUTION_CONTRACT_VERSION,
} from "../artifacts/api-server/src/philip-voice-lab/guidanceBrain.mjs";
import {
  INTENT,
  runFrontDoorTurn,
  isClosingTurn,
  isActivityCompletionNotSessionEnd,
  isGoPhraseSessionFarewell,
} from "../artifacts/api-server/src/philip-voice-lab/frontDoor.mjs";
import {
  recordFailedTurnObservation,
  normalizeTurnFailureError,
} from "../artifacts/api-server/src/philip-voice-lab/turnObservability.mjs";
import { registerPhilipVoiceLabGuidanceRoutes } from "../artifacts/api-server/src/routes/philipVoiceLabGuidance.ts";
import { LATENCY_PIPELINE_SCHEMA_VERSION } from "../artifacts/api-server/src/philip-voice-lab/latencyPipeline.mjs";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    const out = fn();
    if (out && typeof out.then === "function") {
      return out.then(() => {
        passed += 1;
        console.log(`  ✓ ${name}`);
      }).catch((err) => {
        failed += 1;
        failures.push(`${name}: ${err.message}`);
        console.error(`  ✗ ${name}: ${err.message}`);
      });
    }
    passed += 1;
    console.log(`  ✓ ${name}`);
    return Promise.resolve();
  } catch (err) {
    failed += 1;
    failures.push(`${name}: ${err.message}`);
    console.error(`  ✗ ${name}: ${err.message}`);
    return Promise.resolve();
  }
}

function mockOpenAIClient(replyTextOrPlan) {
  const content =
    typeof replyTextOrPlan === "string" && replyTextOrPlan.trim().startsWith("{")
      ? replyTextOrPlan
      : JSON.stringify({
          recognition: "Brian shared something concrete.",
          relationalMeaning: "A relationship or commitment worth noticing.",
          warrantedContribution: "One new supported perspective grounded in what he said.",
          faithPosture: "implicit",
          questionNeeded: false,
          prohibitedMoves: [
            "generic praise",
            "paraphrase-only",
            "invented struggle",
            "schedule inventory",
            "unnecessary question",
          ],
          spokenResponse:
            typeof replyTextOrPlan === "string"
              ? replyTextOrPlan
              : "I'm with you on that.",
        });
  return {
    chat: {
      completions: {
        create: async (args) => {
          // Arm C uses strict json_schema; never freeform GPT-4o.
          if (args?.response_format) {
            assert.equal(args.response_format.type, "json_schema");
          }
          return {
            choices: [{ message: { content } }],
          };
        },
      },
    },
  };
}

const baseCtx = {
  intent: INTENT.CASUAL,
  reopened: false,
  offerFaith: false,
  conduct: null,
  meaningfulOrdinary: true,
  conversationalRepair: false,
  gratitudePreserved: false,
  recentAssistantReplies: [],
  firstName: "Brian",
  preferStatement: false,
  descriptiveFaith: false,
  weightyDescriptiveFaith: false,
  reciprocalAsk: false,
  caregivingDetected: false,
  relationalDetailDetected: false,
  relationalHint: null,
  lightOrdinaryTopic: false,
  history: [],
  transcript: "I've been thinking about the hike after the match.",
  rawTranscript: "I've been thinking about the hike after the match.",
  requireContribution: true,
};

console.log("\nPhilip guidance reliability");

await check("guidanceInstruction: light ordinary topic executes", () => {
  const text = guidanceInstruction({ ...baseCtx, lightOrdinaryTopic: true });
  assert.match(text, /LIGHT ORDINARY/);
  assert.ok(!/ctx is not defined/i.test(text));
});

await check("guidanceInstruction: weighty descriptive faith true branch", () => {
  const text = guidanceInstruction({
    ...baseCtx,
    descriptiveFaith: true,
    weightyDescriptiveFaith: true,
  });
  assert.match(text, /caregiving|answered prayer|ordeal/i);
});

await check("guidanceInstruction: descriptive faith false-weighty branch", () => {
  const text = guidanceInstruction({
    ...baseCtx,
    descriptiveFaith: true,
    weightyDescriptiveFaith: false,
  });
  assert.match(text, /Scripture\/prayer routine|faith-shaped day/i);
});

await check("guidanceInstruction: caregiving + reciprocal + reopened + ordinary", () => {
  const text = guidanceInstruction({
    ...baseCtx,
    caregivingDetected: true,
    relationalDetailDetected: true,
    relationalHint: "your mother",
    reciprocalAsk: true,
    reopened: true,
    meaningfulOrdinary: true,
    lightOrdinaryTopic: false,
    preferStatement: true,
  });
  assert.match(text, /mother/i);
  assert.match(text, /how you are/i);
  assert.match(text, /said goodbye/i);
  assert.match(text, /CADENCE/);
});

await check("guidanceInstruction: all relevant flags false / absent context", () => {
  const text = guidanceInstruction({
    intent: INTENT.CASUAL,
  });
  assert.equal(typeof text, "string");
  assert.ok(text.length > 20);
});

await check("guidanceInstruction: hydrated relational anchors as fields", () => {
  const text = guidanceInstruction({
    ...baseCtx,
    caregivingDetected: true,
    relationalHint: "mom after leukemia recovery",
    priorRelationalHints: ["mom", "leukemia recovery"],
  });
  assert.match(text, /mom after leukemia recovery/i);
});

await check("makeLlmDeepGenerator: deep path + quality gate (mocked model)", async () => {
  const deep = makeLlmDeepGenerator({
    resolveClient: async () =>
      mockOpenAIClient(
        "Argentina already settled the score earlier — a hike now is a clean next chapter after that win.",
      ),
  });
  const result = await deep({
    ...baseCtx,
    lightOrdinaryTopic: true,
    meaningfulOrdinary: true,
    preferStatement: true,
  });
  assert.ok(result?.text);
  assert.equal(result.genomeVersion, PHILIP_VOICE_GENOME_VERSION);
  assert.ok(result.contributionQuality);
  assert.equal(typeof result.contributionQuality.passed, "boolean");
  assert.equal(result.contributionRegenUsed, false);
});

await check("makeLlmDeepGenerator: weighty faith flags do not throw", async () => {
  const deep = makeLlmDeepGenerator({
    resolveClient: async () =>
      mockOpenAIClient(
        "What I'm noticing is that prayer walked with you beside her — the peace you name sits next to that loyalty.",
      ),
  });
  const result = await deep({
    ...baseCtx,
    descriptiveFaith: true,
    weightyDescriptiveFaith: true,
    caregivingDetected: true,
    relationalHint: "your mother",
    transcript: "Scripture and prayer walked with us while Mom recovered.",
    rawTranscript: "Scripture and prayer walked with us while Mom recovered.",
  });
  assert.ok(result?.text);
  assert.ok(result.contributionQuality);
});

{
  const notClose = [
    "I'm going to go for a hike.",
    "I'm going to go to the gym.",
    "I'm going to go watch the match.",
    "I'm going to go make breakfast.",
    "I'm going to go with my mom.",
    "I'm going to go over there later.",
    "I'm going to go for a walk, then come back and work.",
    "I just got done watching the game, and now I'm going to go for a hike.",
    "I'm heading out for a hike—what do you think about that trail?",
    "I have to go to the doctor with Mom this afternoon.",
    "I need to go pick up groceries before the match.",
  ];
  const mustClose = [
    "I'm going to go now.",
    "I've got to go.",
    "I need to go—talk later.",
    "I have to go for now.",
    "I'm heading out. Talk to you later.",
    "I should get going.",
    "I'll talk to you later.",
    "Thanks, but I've got to go.",
    "I'm going to leave it there for today.",
  ];
  const activity = [
    "I just got done watching the match.",
    "I just got done praying.",
    "I just finished my Scripture reading.",
    "I finished breakfast and wanted to ask you something.",
    "I'm done with that task, but I'm still figuring out what comes next.",
  ];

  await check("go-phrase activity plans are not session farewells", () => {
    for (const t of notClose) {
      assert.equal(isGoPhraseSessionFarewell(t), false, `go farewell? ${t}`);
      assert.equal(isClosingTurn(t), false, `should not close: ${t}`);
    }
  });

  await check("true leave-taking go phrases still close", () => {
    for (const t of mustClose) {
      assert.equal(isClosingTurn(t), true, `should close: ${t}`);
    }
  });

  await check("expanded activity-completion recognition", () => {
    for (const t of activity) {
      assert.equal(isActivityCompletionNotSessionEnd(t), true, t);
      assert.equal(isClosingTurn(t), false, `should not close: ${t}`);
    }
  });
}

await check("failed-turn observation preserves transcript without TTS/audio claims", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "philip-failed-turn-"));
  process.env.PHILIP_VOICE_LAB_LOG_DIR = dir;
  const conversationId = "philip-lab-test-failed-turn";
  const rec = await recordFailedTurnObservation({
    conversationId,
    sessionId: "sess-1",
    voiceTurnNumber: 4,
    turnAttemptId: 4,
    transcript:
      "I wanted to tell you more about how Argentina actually played and why the hike felt like the right thing after that win.",
    utteranceMs: 15450,
    vadReason: "vad_silence",
    sttStartAt: 1000,
    sttEndAt: 2500,
    sttMs: 1500,
    guidanceStartAt: 2500,
    guidanceEndAt: 2550,
    guidanceMs: 50,
    failureStage: "guidance",
    error: new ReferenceError("ctx is not defined"),
    httpStatus: 500,
    sentOffBefore: false,
    sentOffAfter: false,
    micResumeAt: 2600,
  });
  assert.equal(rec.turnOutcome, "turn_failed");
  assert.ok(rec.transcript && rec.transcript.length > 40);
  assert.equal(rec.transcriptChars, rec.transcript.length);
  assert.equal(rec.ttsStarted, false);
  assert.equal(rec.audioPublished, false);
  assert.equal(rec.responseText, null);
  assert.equal(rec.failureStage, "guidance");
  assert.equal(rec.error.code, "ReferenceError_ctx_undefined");
  assert.equal(rec.latencyStages.schemaVersion, LATENCY_PIPELINE_SCHEMA_VERSION);
  assert.equal(rec.genomeVersion, PHILIP_VOICE_GENOME_VERSION);
  assert.equal(rec.contributionContractVersion, CONTRIBUTION_CONTRACT_VERSION);

  const raw = await fs.readFile(path.join(dir, `${conversationId}.turns.jsonl`), "utf8");
  const line = JSON.parse(raw.trim().split("\n").pop());
  assert.equal(line.turnOutcome, "turn_failed");
  assert.ok(line.transcript.includes("Argentina"));
});

await check("normalizeTurnFailureError redacts secrets", () => {
  const n = normalizeTurnFailureError(
    new Error("candidate guidance turn 500: Bearer sk-abc123SECRET boom"),
  );
  assert.equal(n.httpStatus, 500);
  assert.ok(!/sk-abc/.test(n.message));
  assert.match(n.message, /redacted/i);
});

{
  // Live room 74eefef4 replay (stubbed deep path)
  const LIVE_T2 =
    "I just got done watching the World Cup game and Argentina won and now I'm going to go for a hike in a little bit.";
  const LIVE_T3 = "No, the match has already happened. That happened earlier today.";
  const LIVE_T4 =
    "What stood out most was how Argentina stayed patient and finished strong, and after that I just wanted some quiet outdoors before the next thing on my plate.";

  const deepStub = async (ctx) => {
    assert.ok(ctx);
    // Must be able to build instruction without throw (mirrors live deep path).
    const instr = guidanceInstruction(ctx);
    assert.equal(typeof instr, "string");
    return {
      text:
        "Argentina already sealed that result earlier — a hike soon feels like an honest reset after a match that already settled.",
      engine: "stub-74eefef4",
      contributionQuality: {
        passed: true,
        failReasons: [],
        contributionPresent: true,
        newPropositionDetected: true,
      },
    };
  };

  let state = createFrontDoorState("Brian");
  const t1 = await runFrontDoorTurn({
    transcript: "Hey Philip, how are you?",
    firstName: "Brian",
    state,
    deepGenerate: deepStub,
  });
  state = t1.state;
  const t2 = await runFrontDoorTurn({
    transcript: LIVE_T2,
    firstName: "Brian",
    state,
    deepGenerate: deepStub,
  });
  state = t2.state;
  const t3 = await runFrontDoorTurn({
    transcript: LIVE_T3,
    firstName: "Brian",
    state,
    deepGenerate: deepStub,
  });
  state = t3.state;
  const t4 = await runFrontDoorTurn({
    transcript: LIVE_T4,
    firstName: "Brian",
    state,
    deepGenerate: deepStub,
  });

  await check("74eefef4 T1 reciprocal greeting", () => {
    assert.ok(t1.lane === "hybrid_greeting" || t1.intent === INTENT.GREETING || t1.meta?.reciprocalDetected);
    assert.ok(/here|glad|going on|with you/i.test(t1.text), t1.text);
  });

  await check("74eefef4 T2 not closing; no sentOff; deep/contribution path", () => {
    assert.equal(isClosingTurn(LIVE_T2), false);
    assert.equal(isActivityCompletionNotSessionEnd(LIVE_T2), true);
    assert.notEqual(t2.intent, INTENT.CLOSING);
    assert.equal(t2.state.sentOff, false);
    assert.equal(t2.meta?.sentOffAfter, false);
    assert.ok(t2.meta?.routedDeep || t2.engine === "stub-74eefef4", JSON.stringify(t2.meta));
    assert.ok(!/enjoy the match|i'?ll be here when you'?re ready/i.test(t2.text), t2.text);
    assert.ok(/argentina|hike|match|won|settled|reset/i.test(t2.text), t2.text);
    assert.ok(
      t2.meta?.contributionQualityPassed === true ||
        t2.meta?.contributionPresent === true ||
        t2.engine === "stub-74eefef4",
      JSON.stringify(t2.meta),
    );
  });

  await check("74eefef4 T3 no theatrical reopen when sentOff never latched", () => {
    assert.equal(t2.state.sentOff, false);
    assert.equal(t3.reopened, false);
    assert.ok(!/^i'?m still with you/i.test(t3.text), t3.text);
  });

  await check("74eefef4 T4 deep path completes without ReferenceError", () => {
    assert.ok(t4.text);
    assert.notEqual(t4.intent, INTENT.CLOSING);
    assert.equal(t4.state.sentOff, false);
  });
}

await check("authenticated mocked /guidance/turn returns 200 without paid API", async () => {
  process.env.PHILIP_VOICE_LAB_ENABLED = "true";
  process.env.PHILIP_VOICE_LAB_SECRET = "test-lab-secret-reliability";
  process.env.PHILIP_VOICE_LAB_TEST_HOOKS = "1";
  process.env.OPENAI_API_KEY = "sk-test-not-used";

  const deep = makeLlmDeepGenerator({
    resolveClient: async () =>
      mockOpenAIClient(
        "A hike after a finished match keeps the day honest — celebration, then quiet motion.",
      ),
  });
  globalThis.__PHILIP_LAB_TEST_DEEP_GENERATE__ = deep;

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  registerPhilipVoiceLabGuidanceRoutes(app);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/internal/philip-voice/guidance/turn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Philip-Lab-Secret": "test-lab-secret-reliability",
      },
      body: JSON.stringify({
        transcript:
          "I just got done watching the World Cup game and Argentina won and now I'm going to go for a hike in a little bit.",
        firstName: "Brian",
        state: createFrontDoorState("Brian"),
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.text);
    assert.notEqual(body.intent, INTENT.CLOSING);
    assert.equal(body.state?.sentOff, false);
    assert.equal(res.headers.get("x-philip-runtime-version"), "candidate-front-door-1.1");
  } finally {
    delete globalThis.__PHILIP_LAB_TEST_DEEP_GENERATE__;
    delete process.env.PHILIP_VOICE_LAB_TEST_HOOKS;
    await new Promise((resolve) => server.close(resolve));
  }
});

await check("versions remain genome v3.1 + contract v1.1", () => {
  assert.equal(PHILIP_VOICE_GENOME_VERSION, "philip-voice-genome-v3.1");
  assert.equal(CONTRIBUTION_CONTRACT_VERSION, "philip-contribution-contract-v1.1");
});

console.log(`\nReliability: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("\nFailures:\n" + failures.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, passed }, null, 2));
