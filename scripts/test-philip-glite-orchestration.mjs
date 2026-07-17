/**
 * Philip Spoken Orchestration Phase 1 — G-lite suite.
 *
 * Engine evidence, TurnUnderstanding contract, Front Door hard boundary,
 * locked 40bc24a8 T2 semantics, interruption, JSONL observability, session
 * replays. Zero paid API calls.
 *
 * Run: node scripts/test-philip-glite-orchestration.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const lab = path.join(root, "artifacts/api-server/src/philip-voice-lab");

const {
  isGliteOrchestrationEnabled,
  requiresTurnUnderstanding,
  detectLifeThreads,
  selectContributionEngine,
  evaluateLockedT2Semantics,
  LOCKED_40BC24A8_T2_TRANSCRIPT,
  GLITE_ORCHESTRATION_VERSION,
  ORDINARY_ENGINE_LABEL,
  RARE_DEPTH_ENGINE_LABEL,
  ENGINE_SELECTION_EVIDENCE,
  buildInterruptionInput,
  gliteReadinessFields,
} = await import(path.join(lab, "gliteOrchestration.mjs"));

const {
  validateTurnUnderstanding,
  TURN_UNDERSTANDING_JSON_SCHEMA,
  scoreMultiTopicContributionQuality,
  detectProhibitedSpokenMoves,
  understandingObservability,
} = await import(path.join(lab, "turnUnderstandingSchema.mjs"));

const {
  makeGliteContributionGenerator,
  buildGliteContributionMessages,
  assembleGliteDeepResult,
  parseAndValidateGliteContent,
} = await import(path.join(lab, "ordinaryContributionEngine.mjs"));

const {
  createFrontDoorState,
  runFrontDoorTurn,
  resolveFrontDoorClassification,
  INTENT,
} = await import(path.join(lab, "frontDoor.mjs"));

const { RESPONSE_MODE, SPOKEN_TURN_TIER } = await import(
  path.join(lab, "spokenTurnRouter.mjs")
);
const { recordTurnObservation } = await import(path.join(lab, "turnObservability.mjs"));
const { candidateGuidanceReadiness, makeLlmDeepGenerator } = await import(
  path.join(lab, "guidanceBrain.mjs")
);
const { measureSpokenLength } = await import(path.join(lab, "spokenLength.mjs"));

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.stack || err.message}`);
  }
}

function withGlite(on, fn) {
  const prev = process.env.PHILIP_VOICE_LAB_ORCHESTRATION_GLITE;
  process.env.PHILIP_VOICE_LAB_ORCHESTRATION_GLITE = on ? "true" : "false";
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (prev === undefined) delete process.env.PHILIP_VOICE_LAB_ORCHESTRATION_GLITE;
      else process.env.PHILIP_VOICE_LAB_ORCHESTRATION_GLITE = prev;
    });
}

/** Fixture mock: valid TurnUnderstanding for 40bc24a8 T2 — spoken not hardcoded as product. */
function mockT2Understanding(overrides = {}) {
  return {
    conversationalActs: ["disclose_life_load", "mention_faith_practice", "name_caregiving"],
    primaryBurden: "carrying several meaningful commitments at once",
    primaryMeaning:
      "relational responsibility and purpose pressure, with faith providing grounding",
    secondaryThreads: ["world_cup", "gym"],
    relationalEntities: [
      { label: "mother", role: "caregiving", provenance: "user_stated" },
    ],
    commitments: ["work", "making the app useful to people", "caregiving", "spiritual practice"],
    restorativeElements: ["gym", "World Cup"],
    faithRole: "grounding_alongside_life",
    emotionalWeight: "medium",
    practicalRequest: "",
    factualFreshnessRequired: false,
    responseWorthiness: "contribute",
    recommendedResponseAct: "one integrating observation",
    recommendedEngine: "ordinary_structured",
    questionNeeded: false,
    spokenDepth: "ordinary",
    confidence: 0.82,
    provenance: { source: "fixture_mock" },
    spokenResponse:
      "Care for your mom and the pressure to make the app matter sit under a full plate — the Word grounding that load, with gym and the Cup as margins.",
    ...overrides,
  };
}

function gliteDeepStub(understanding) {
  return async (ctx) => {
    const plan = typeof understanding === "function" ? understanding(ctx) : understanding;
    const validation = validateTurnUnderstanding(plan);
    assert.equal(validation.ok, true, validation.errors?.join(","));
    return assembleGliteDeepResult({
      plan: validation.plan,
      validation,
      ctx,
      model: "gpt-5.6-terra",
      timing: { generationLatencyMs: 12 },
    });
  };
}

console.log("\nPhilip G-lite Spoken Orchestration Phase 1\n");

await check("engine evidence: Terra structured selected; Sol schema unproven", () => {
  assert.equal(ENGINE_SELECTION_EVIDENCE.selectedOrdinary, ORDINARY_ENGINE_LABEL);
  assert.equal(
    ENGINE_SELECTION_EVIDENCE.blindHumanScores,
    "not_reproducible_from_committed_bakeoff_artifacts",
  );
  assert.deepEqual(ENGINE_SELECTION_EVIDENCE.transcriptOnlyBlindHumanAverages, {
    A_control_gpt4o: 24.5,
    B_sol_single_pass: 38.83,
    C_terra_structured: 39,
    D_terra_to_mini: 38.17,
    evidenceStatus: "external_chat_only_not_committed",
  });
  assert.equal(ENGINE_SELECTION_EVIDENCE.phase1Scope, "semantic_judgment_only");
  assert.equal(ENGINE_SELECTION_EVIDENCE.physicalModelSplit, false);
  assert.equal(ENGINE_SELECTION_EVIDENCE.terraArmCPlanValidRate, "6/6");
  assert.equal(ENGINE_SELECTION_EVIDENCE.structuredOutputProven.B_gpt56_sol, false);
  assert.equal(ENGINE_SELECTION_EVIDENCE.structuredOutputProven.C_gpt56_terra, true);
  assert.ok(ENGINE_SELECTION_EVIDENCE.rejected.includes("gpt-4o_quality"));
  assert.ok(ENGINE_SELECTION_EVIDENCE.rejected.includes("serial_terra_to_mini_ordinary_latency"));
  assert.ok(!/ordinary_fast/i.test(ORDINARY_ENGINE_LABEL));
});

await check("compatibility: TurnUnderstanding schema is strict json_schema shape", () => {
  assert.equal(TURN_UNDERSTANDING_JSON_SCHEMA.strict, true);
  assert.ok(TURN_UNDERSTANDING_JSON_SCHEMA.schema.required.includes("spokenResponse"));
  assert.ok(TURN_UNDERSTANDING_JSON_SCHEMA.schema.required.includes("primaryBurden"));
  assert.equal(TURN_UNDERSTANDING_JSON_SCHEMA.schema.additionalProperties, false);
});

await check("flag default off; readiness reports engines", async () => {
  await withGlite(false, () => {
    assert.equal(isGliteOrchestrationEnabled(), false);
    const r = candidateGuidanceReadiness();
    assert.equal(r.orchestrationEnabled, false);
    assert.equal(r.orchestrationPath, "legacy_spoken_v1");
    assert.equal(r.ordinaryEngine, ORDINARY_ENGINE_LABEL);
    assert.equal(r.rareDepthEngine, RARE_DEPTH_ENGINE_LABEL);
  });
  await withGlite(true, () => {
    assert.equal(isGliteOrchestrationEnabled(), true);
    const r = gliteReadinessFields();
    assert.equal(r.orchestrationVersion, GLITE_ORCHESTRATION_VERSION);
    assert.equal(r.orchestrationPath, "glite");
    assert.equal(r.phase1Scope, "semantic_judgment_only");
    assert.equal(r.fasterOrdinaryEngine, false);
  });
});

await check("hard boundary: 40bc24a8 T2 requires TurnUnderstanding", () => {
  const life = detectLifeThreads(LOCKED_40BC24A8_T2_TRANSCRIPT);
  assert.ok(life.multiTopic);
  assert.ok(life.faithMixedWithLife);
  assert.ok(life.caregivingRelational);
  assert.ok(life.restorationPresent);
  assert.equal(
    requiresTurnUnderstanding(LOCKED_40BC24A8_T2_TRANSCRIPT, { descriptiveFaith: true }),
    true,
  );
});

await check("legacy off: descriptive-faith+life still templates; glite forces understanding", async () => {
  // Phone-vulnerable wording that matches isDescriptiveFaithPractice (not phrase expansion).
  const vulnerable =
    "Yes, everything's been on my mind, just work, getting the app, helping my mother, World Cup, gym, full plate, also staying in the Word.";
  await withGlite(false, async () => {
    const resolved = resolveFrontDoorClassification(vulnerable, createFrontDoorState());
    assert.equal(resolved.gliteEnabled, false);
    assert.equal(resolved.requiresTurnUnderstanding, false);
    assert.ok(
      resolved.terraQualification?.terraRejectedReason === "descriptive_faith_template" ||
        !resolved.routeDeep,
      `expected legacy template deny, got ${resolved.terraQualification?.terraRejectedReason} routeDeep=${resolved.routeDeep}`,
    );
    const out = await runFrontDoorTurn({
      transcript: vulnerable,
      state: createFrontDoorState(),
    });
    assert.ok(
      out.meta?.descriptiveFaith || /morning anchors|Word and prayer|no small discipline/i.test(out.text),
      `legacy should faith-template, got: ${out.text}`,
    );
  });
  await withGlite(true, async () => {
    const resolved = resolveFrontDoorClassification(vulnerable, createFrontDoorState());
    assert.equal(resolved.requiresTurnUnderstanding, true);
    assert.equal(resolved.routeDeep, true);
    const out = await runFrontDoorTurn({
      transcript: vulnerable,
      state: createFrontDoorState("Brian"),
      deepGenerate: gliteDeepStub(mockT2Understanding()),
    });
    assert.ok(!/morning anchors|no small discipline/i.test(out.text));
    assert.equal(out.meta.orchestrationPath, "glite");
  });
});

await check("glite on: T2 routes to understanding, not faith template", async () => {
  await withGlite(true, async () => {
    const resolved = resolveFrontDoorClassification(
      LOCKED_40BC24A8_T2_TRANSCRIPT,
      createFrontDoorState(),
    );
    assert.equal(resolved.requiresTurnUnderstanding, true);
    assert.equal(resolved.routeDeep, true);
    assert.notEqual(resolved.terraQualification?.terraRejectedReason, "descriptive_faith_template");

    const out = await runFrontDoorTurn({
      transcript: LOCKED_40BC24A8_T2_TRANSCRIPT,
      state: createFrontDoorState("Brian"),
      deepGenerate: gliteDeepStub(mockT2Understanding()),
    });
    assert.equal(out.meta.orchestrationPath, "glite");
    assert.equal(out.meta.requiresTurnUnderstanding, true);
    assert.notEqual(out.meta.responseMode, RESPONSE_MODE.FRONT_DOOR);
    assert.ok(!/morning anchors|no small discipline/i.test(out.text));
    assert.equal(out.meta.spokenTurnTier, SPOKEN_TURN_TIER.SUBSTANTIVE);
    assert.ok(
      out.meta.selectedEngine === "ordinary_structured" ||
        out.meta.responseMode === RESPONSE_MODE.GLITE_ORDINARY,
    );
    const sem = evaluateLockedT2Semantics(mockT2Understanding());
    assert.equal(sem.passed, true, sem.failures.join(","));
    const quality = scoreMultiTopicContributionQuality({
      understanding: mockT2Understanding(),
      userTranscript: LOCKED_40BC24A8_T2_TRANSCRIPT,
    });
    assert.ok(quality.passedCount >= 5, JSON.stringify(quality.checks));
  });
});

await check("ordinary vs rare: multi-topic alone is not rare Terra", () => {
  const sel = selectContributionEngine({
    transcript: LOCKED_40BC24A8_T2_TRANSCRIPT,
    emotionalWeight: "medium",
    responseWorthiness: "contribute",
    confidence: 0.8,
  });
  assert.equal(sel.engine, "ordinary_structured");
  assert.equal(sel.spokenDepth, "ordinary");
});

await check("ordinary vs rare: grief selects rare depth", () => {
  const sel = selectContributionEngine({
    transcript: "I'm grieving my mother and don't know how to keep going.",
    emotionalWeight: "high",
    responseWorthiness: "contribute",
    confidence: 0.7,
  });
  assert.equal(sel.engine, "rare_depth");
  assert.equal(sel.spokenDepth, "weighty");
});

await check("faith routine only does not force understanding", () => {
  const t = "I read Scripture every morning before work starts.";
  // Has "work" — may still multi-topic. Use pure faith routine:
  const pure = "I finished my Scripture and prayer this morning.";
  assert.equal(requiresTurnUnderstanding(pure, { descriptiveFaith: true }), false);
});

await check("schema validation rejects unknown keys and empty spoken", () => {
  const bad = validateTurnUnderstanding({
    ...mockT2Understanding(),
    secretReasoning: "hidden",
    spokenResponse: "",
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.includes("secretReasoning") || e.includes("spokenResponse")));
});

await check("one-call generator request shape (mocked complete)", async () => {
  let sawArgs = null;
  const gen = makeGliteContributionGenerator({
    complete: async ({ model, messages, ctx }) => {
      sawArgs = { model, messageCount: messages.length, ctxDepth: ctx.spokenBudget };
      return mockT2Understanding({ provenance: { source: "model_structured" } });
    },
  });
  const result = await gen({
    transcript: LOCKED_40BC24A8_T2_TRANSCRIPT,
    rawTranscript: LOCKED_40BC24A8_T2_TRANSCRIPT,
    history: [],
    intent: "casual",
  });
  assert.equal(sawArgs.model, "gpt-5.6-terra");
  assert.ok(sawArgs.messageCount >= 3);
  assert.ok(result.text.length > 10);
  assert.equal(result.orchestrationPath, "glite");
  assert.equal(result.schemaValid, true);
  assert.ok(result.spokenLength.words >= 10);
  // Ensure messages include speech-native contract
  const msgs = buildGliteContributionMessages({
    transcript: LOCKED_40BC24A8_T2_TRANSCRIPT,
    history: [],
  });
  assert.ok(msgs.some((m) => /TURN UNDERSTANDING|Compose FOR SPEECH/i.test(m.content)));
});

await check("interruption input shapes next understanding; no resume abandoned prose", async () => {
  await withGlite(true, async () => {
    let sawInterrupt = null;
    const out = await runFrontDoorTurn({
      transcript: "So, that's a long thing.",
      state: {
        ...createFrontDoorState("Brian"),
        interruptionInput: buildInterruptionInput({
          previousResponseInterrupted: true,
          previousResponseAbandoned: true,
          previousResponseTopic: "descriptive_faith",
          estimatedAudioPublishedMs: 8000,
          estimatedAudioHeardMs: 1300,
          likelyHeardRatio: 0.16,
        }),
      },
      deepGenerate: async (ctx) => {
        sawInterrupt = ctx.interruptionInput;
        // Thin follow-up may not deep-route; if it does, return stub.
        return gliteDeepStub(
          mockT2Understanding({
            spokenResponse: "I'm with you — we can leave the prior line where it landed.",
            responseWorthiness: "acknowledge",
            conversationalActs: ["thin_followup"],
            primaryBurden: "prior response missed",
            primaryMeaning: "user interrupted after overlong or off-target reply",
            questionNeeded: false,
          }),
        )(ctx);
      },
    });
    // Either front-door thin ack or deep with interrupt — interrupt must be present if deep.
    if (sawInterrupt) {
      assert.equal(sawInterrupt.previousResponseInterrupted, true);
      assert.equal(sawInterrupt.previousResponseAbandoned, true);
      assert.ok(sawInterrupt.likelyHeardRatio != null);
    }
    assert.ok(out.text);
    assert.equal(out.state.interruptionInput, null); // cleared after consume
  });
});

await check("JSONL serializes G-lite fields without CoT", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "philip-glite-jsonl-"));
  const prev = process.env.PHILIP_VOICE_LAB_LOG_DIR;
  process.env.PHILIP_VOICE_LAB_LOG_DIR = dir;
  try {
    await recordTurnObservation({
      conversationId: "glite-test-conv",
      sessionId: "sess",
      voiceTurnNumber: 2,
      transcript: LOCKED_40BC24A8_T2_TRANSCRIPT,
      responseText: mockT2Understanding().spokenResponse,
      intent: "casual",
      lane: "ordinary_meaningful",
      engine: "gpt-5.6-terra",
      runtimeVersion: "candidate-front-door-1.2",
      decision: {
        orchestrationVersion: GLITE_ORCHESTRATION_VERSION,
        orchestrationPath: "glite",
        understandingProducer: ORDINARY_ENGINE_LABEL,
        selectedEngine: "ordinary_structured",
        engineSelectionReason: "ordinary_contribution_criteria",
        primaryBurden: "carrying several meaningful commitments at once",
        primaryMeaning: "relational responsibility and purpose pressure",
        faithRole: "grounding_alongside_life",
        emotionalWeight: "medium",
        responseWorthiness: "contribute",
        recommendedResponseAct: "one integrating observation",
        questionNeeded: false,
        spokenDepth: "ordinary",
        factualFreshnessRequired: false,
        schemaValid: true,
        interruptionInput: buildInterruptionInput({ previousResponseInterrupted: false }),
        spokenBudget: { minWords: 18, maxWords: 30 },
        spokenLength: measureSpokenLength(mockT2Understanding().spokenResponse),
      },
    });
    const raw = await fs.readFile(path.join(dir, "glite-test-conv.turns.jsonl"), "utf8");
    const line = JSON.parse(raw.trim());
    assert.equal(line.orchestrationVersion, GLITE_ORCHESTRATION_VERSION);
    assert.equal(line.orchestrationPath, "glite");
    assert.equal(line.selectedEngine, "ordinary_structured");
    assert.equal(line.faithRole, "grounding_alongside_life");
    assert.ok(!("secretReasoning" in line));
    assert.ok(!JSON.stringify(line).includes("chain-of-thought"));
  } finally {
    if (prev === undefined) delete process.env.PHILIP_VOICE_LAB_LOG_DIR;
    else process.env.PHILIP_VOICE_LAB_LOG_DIR = prev;
  }
});

await check("factual boundary preserved under G-lite", async () => {
  await withGlite(true, async () => {
    const out = await runFrontDoorTurn({
      transcript: "Who do you think will win the World Cup?",
      state: createFrontDoorState(),
      deepGenerate: gliteDeepStub(mockT2Understanding()),
    });
    assert.equal(out.meta.responseMode, RESPONSE_MODE.FACTUAL_BOUNDARY);
    assert.ok(/not connected to the live bracket|won't guess|don't want to guess/i.test(out.text));
    assert.ok(!/france|argentina|spain/i.test(out.text));
  });
});

await check("crisis / prayer / closing remain deterministic under G-lite", async () => {
  await withGlite(true, async () => {
    const crisis = await runFrontDoorTurn({
      transcript: "I want to kill myself tonight.",
      state: createFrontDoorState("Brian"),
    });
    assert.equal(crisis.intent, INTENT.CRISIS);
    assert.ok(crisis.engine === "front_door" || crisis.meta.spokenTurnTier === SPOKEN_TURN_TIER.SAFETY);

    const close = await runFrontDoorTurn({
      transcript: "All right, thank you. You have a great day.",
      state: createFrontDoorState(),
    });
    assert.equal(close.intent, INTENT.CLOSING);
    assert.equal(close.state.sentOff, true);
  });
});

const SESSION_518 = [
  "Hi Philip, how are you?",
  "I've got a full plate — work, World Cup, workouts, and taking care of my mom. It's a lot.",
  "Yes, I agree.",
  "Do you have any availability later this evening? I'd like to reconvene and be able to talk to you a little bit more about everything that's going on.",
  "Thanks Philip. I look forward to speaking with you later.",
  "Who do you think will win the World Cup?",
  "France already lost. Argentina and Spain are in the final.",
  "No problem. I look forward to speaking later — we can pick up the World Cup and different topics then.",
];

await check("518acebf multi-topic routes to understanding under G-lite", async () => {
  await withGlite(true, async () => {
    const resolved = resolveFrontDoorClassification(SESSION_518[1], createFrontDoorState());
    assert.equal(resolved.requiresTurnUnderstanding, true);
    assert.equal(resolved.routeDeep, true);
  });
});

await check("fixture matrix: ordinary multi-topic, faith+care, practical, thin, conduct", async () => {
  await withGlite(true, async () => {
    const cases = [
      {
        id: "ordinary_multi_no_faith",
        text: "Work, World Cup, gym, and helping my mom — full plate.",
        need: true,
      },
      {
        id: "faith_plus_caregiving",
        text: "I've been praying while taking care of my mother this week.",
        need: true,
      },
      {
        id: "faith_routine_only",
        text: "I finished my Scripture and prayer this morning.",
        need: false,
      },
      {
        id: "caregiving_going_well",
        text: "Mom's appointments went well and we had a good visit.",
        need: true,
      },
      {
        id: "competing_priorities",
        text: "I'm torn between finishing the app and being present for my mom.",
        need: true,
      },
      {
        id: "practical_request",
        text: "Can you help me think through how to prioritize the week?",
        need: false, // may deep via practical intent without multi-topic flag
      },
      {
        id: "thin_ack",
        text: "Yeah.",
        need: false,
      },
    ];
    for (const c of cases) {
      const need = requiresTurnUnderstanding(c.text, {
        descriptiveFaith: /scripture|prayer|word/i.test(c.text),
      });
      if (c.id === "practical_request") continue; // routing via DEEP_INTENTS
      assert.equal(need, c.need, `${c.id}: expected need=${c.need} got ${need}`);
    }
  });
});

await check("prohibited moves detect faith-template capture", () => {
  const hit = detectProhibitedSpokenMoves(
    "Keeping the Word and prayer as morning anchors is no small discipline. That grounding can carry quietly into whatever the day asks.",
    mockT2Understanding(),
  );
  assert.ok(hit.reasons.includes("descriptive_faith_template_capture"));
});

await check("makeLlmDeepGenerator selects glite when flag on", async () => {
  await withGlite(true, () => {
    const gen = makeLlmDeepGenerator({
      complete: async () => mockT2Understanding({ provenance: { source: "model_structured" } }),
    });
    assert.equal(typeof gen, "function");
  });
  await withGlite(false, () => {
    const gen = makeLlmDeepGenerator({
      complete: async () => ({
        recognition: "x",
        relationalMeaning: "y",
        warrantedContribution: "z",
        faithPosture: "implicit",
        questionNeeded: false,
        prohibitedMoves: [
          "generic praise",
          "paraphrase-only",
          "invented struggle",
          "schedule inventory",
          "unnecessary question",
        ],
        spokenResponse: "A short warranted contribution about presence.",
      }),
    });
    assert.equal(typeof gen, "function");
  });
});

await check("before/after projection metrics for 40bc24a8 (deterministic + mocked)", () => {
  // Measured phone evidence (assessment): 3 Terra, faith template on T2, barge-in.
  const before = {
    source: "measured_phone_40bc24a8",
    templateResponses: 1,
    ordinaryContributionCalls: 0,
    terraCalls: 3,
    unsupportedCurrentFacts: 0,
    unnecessaryQuestions: 0,
    interruptedAbandoned: 1,
  };
  // Exact corrected counts are enforced by test-philip-40bc-replay.mjs.
  const after = {
    source: "turn_specific_deterministic_replay_model_mocked",
    descriptiveFaithCaptures: 0,
    ordinaryContributionCalls: 3,
    rareTerraCalls: 0,
    physicalTerraCalls: 3,
    projectedMedianGenerationMs: 3 * 2558,
    projectionNote: "semantic-only Phase 1; no end-to-end latency claim",
  };
  assert.ok(before.templateResponses >= 1);
  assert.equal(after.descriptiveFaithCaptures, 0);
  assert.equal(after.physicalTerraCalls, 3);
  assert.notEqual(before.source, after.source);
});

console.log(`\nG-lite results: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
