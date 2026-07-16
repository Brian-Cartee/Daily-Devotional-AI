#!/usr/bin/env node
/**
 * Philip Arm C — Terra structured contribution engine tests.
 * Zero paid API calls. Mocked / deterministic only.
 *
 * Run:
 *   cd artifacts/api-server && node ../../scripts/test-philip-terra-contribution.mjs
 */
import assert from "node:assert/strict";
import {
  INTENT,
  runFrontDoorTurn,
  createFrontDoorState,
} from "../artifacts/api-server/src/philip-voice-lab/frontDoor.mjs";
import {
  evaluateContributionQuality,
  CONTRIBUTION_CONTRACT_VERSION,
} from "../artifacts/api-server/src/philip-voice-lab/contributionContract.mjs";
import {
  validateTerraContributionPlan,
  TERRA_CONTRIBUTION_ENGINE_VERSION,
  REQUIRED_PROHIBITED_MOVES,
  PLANNING_LABEL_LEAK,
} from "../artifacts/api-server/src/philip-voice-lab/terraContributionSchema.mjs";
import {
  makeTerraDeepGenerator,
  TerraContributionError,
  assembleTerraDeepResult,
  parseAndValidateTerraContent,
  relationalAnchorTypesFromCtx,
  terraContributionModel,
} from "../artifacts/api-server/src/philip-voice-lab/terraContributionEngine.mjs";
import {
  TERRA_BENCHMARK_FIXTURES,
  allApprovedResponses,
  allRejectedGpt4oResponses,
  shadowEvaluateAgainstHumanLabels,
  TERRA_SHADOW_EVAL_VERSION,
} from "../artifacts/api-server/src/philip-voice-lab/terraContributionFixtures.mjs";
import {
  makeLlmDeepGenerator,
  runCandidateGuidanceTurn,
  brainModel,
} from "../artifacts/api-server/src/philip-voice-lab/guidanceBrain.mjs";
import {
  recordFailedTurnObservation,
  normalizeTurnFailureError,
} from "../artifacts/api-server/src/philip-voice-lab/turnObservability.mjs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    const out = fn();
    if (out && typeof out.then === "function") {
      return out
        .then(() => {
          passed += 1;
          console.log(`  ✓ ${name}`);
        })
        .catch((err) => {
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

function validPlan(overrides = {}) {
  return {
    recognition: "Brian shared a concrete detail from his day.",
    relationalMeaning: "There is a relationship or commitment worth noticing.",
    warrantedContribution: "One new supported perspective grounded in what he said.",
    faithPosture: "implicit",
    questionNeeded: false,
    prohibitedMoves: [...REQUIRED_PROHIBITED_MOVES],
    spokenResponse:
      "I'm with you. What you named carries its own weight — here is one grounded observation that adds something new.",
    ...overrides,
  };
}

function mockTerraClient(planOrThrow) {
  return {
    chat: {
      completions: {
        create: async (args) => {
          assert.equal(args.response_format?.type, "json_schema");
          assert.equal(args.response_format?.json_schema?.strict, true);
          assert.ok(!/gpt-4o$/i.test(String(args.model || "")));
          // Proven gpt-5.6-terra bakeoff shape: max_completion_tokens + reasoning_effort;
          // never max_tokens / temperature / other unsupported sampling knobs.
          assert.equal(Object.prototype.hasOwnProperty.call(args, "max_tokens"), false);
          assert.equal(Object.prototype.hasOwnProperty.call(args, "temperature"), false);
          assert.equal(Object.prototype.hasOwnProperty.call(args, "top_p"), false);
          assert.equal(Object.prototype.hasOwnProperty.call(args, "frequency_penalty"), false);
          assert.equal(Object.prototype.hasOwnProperty.call(args, "presence_penalty"), false);
          assert.equal(Object.prototype.hasOwnProperty.call(args, "seed"), false);
          assert.equal(Object.prototype.hasOwnProperty.call(args, "stop"), false);
          assert.equal(typeof args.max_completion_tokens, "number");
          assert.ok(args.max_completion_tokens > 0);
          assert.equal(args.reasoning_effort, "low");
          if (typeof planOrThrow === "function") return planOrThrow(args);
          if (planOrThrow instanceof Error) throw planOrThrow;
          const content =
            typeof planOrThrow === "string" ? planOrThrow : JSON.stringify(planOrThrow);
          return { choices: [{ message: { content } }] };
        },
      },
    },
  };
}

console.log("\nPhilip Terra contribution (Arm C)");

await check("engine version + default model", () => {
  assert.equal(TERRA_CONTRIBUTION_ENGINE_VERSION, "philip-contribution-terra-structured-v1");
  assert.equal(brainModel(), terraContributionModel());
  assert.match(brainModel(), /terra|gpt-5\.6/i);
});

await check("schema: valid plan passes", () => {
  const v = validateTerraContributionPlan(validPlan());
  assert.equal(v.ok, true);
  assert.equal(v.plan.faithPosture, "implicit");
});

await check("schema: malformed JSON fails", () => {
  const v = validateTerraContributionPlan("{not json");
  assert.equal(v.ok, false);
  assert.ok(v.errors.includes("invalid_json"));
});

await check("schema: missing warrantedContribution fails", () => {
  const v = validateTerraContributionPlan(validPlan({ warrantedContribution: "" }));
  assert.equal(v.ok, false);
});

await check("schema: planning label leak in spokenResponse fails", () => {
  const v = validateTerraContributionPlan(
    validPlan({ spokenResponse: "My recognition is that you are tired." }),
  );
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /leaks_plan/.test(e)));
  assert.ok(PLANNING_LABEL_LEAK.test("recognition: foo"));
});

await check("schema: invalid faithPosture fails", () => {
  const v = validateTerraContributionPlan(validPlan({ faithPosture: "preaching" }));
  assert.equal(v.ok, false);
});

await check("six benchmark fixtures locked", () => {
  assert.equal(TERRA_BENCHMARK_FIXTURES.length, 6);
  assert.equal(allApprovedResponses().length, 18);
  assert.equal(allRejectedGpt4oResponses().length, 6);
});

await check("18 human-approved responses are non-empty spoken lines", () => {
  for (const row of allApprovedResponses()) {
    assert.ok(row.spokenResponse.length > 20, row.fixtureId);
    assert.ok(!PLANNING_LABEL_LEAK.test(row.spokenResponse), row.fixtureId);
  }
});

await check("6 rejected GPT-4o responses fail production gate", () => {
  for (const row of allRejectedGpt4oResponses()) {
    const gate = evaluateContributionQuality(row.spokenResponse, {
      transcript: row.user,
      rawTranscript: row.user,
      ...row.ctx,
    });
    assert.equal(gate.passed, false, `${row.fixtureId}: ${gate.failReasons}`);
  }
});

await check("shadow calibration records gate false-negatives without loosening gate", () => {
  const report = shadowEvaluateAgainstHumanLabels(evaluateContributionQuality);
  assert.equal(report.shadowEvalVersion, TERRA_SHADOW_EVAL_VERSION);
  assert.equal(report.fixtureCount, 6);
  assert.equal(report.approvedCount, 18);
  assert.equal(report.rejectedCount, 6);
  assert.equal(report.gateTrueRejects, 6);
  assert.ok(report.gateFalseNegatives >= 0);
  // Production contract version unchanged — no phrase-exception loosening.
  assert.equal(CONTRIBUTION_CONTRACT_VERSION, "philip-contribution-contract-v1.1");
});

await check("assembleTerraDeepResult: only spokenResponse is text; private plan omitted", () => {
  const plan = validPlan({
    recognition: "SECRET_RECOGNITION_FIELD",
    relationalMeaning: "SECRET_RELATIONAL_FIELD",
    warrantedContribution: "SECRET_CONTRIBUTION_FIELD",
    spokenResponse: "I'm here. The match settled; a hike is a clean next step.",
  });
  const validation = validateTerraContributionPlan(plan);
  const result = assembleTerraDeepResult({
    plan: validation.plan,
    validation,
    ctx: { lightOrdinaryTopic: true, requireContribution: true, transcript: "Argentina won." },
    model: "gpt-5.6-terra",
    timing: { generationLatencyMs: 12 },
  });
  assert.equal(result.text, plan.spokenResponse);
  assert.ok(!String(result.text).includes("SECRET_"));
  assert.equal(result.recognition, undefined);
  assert.equal(result.relationalMeaning, undefined);
  assert.equal(result.warrantedContribution, undefined);
  assert.equal(result.privatePlanLogged, false);
  assert.equal(result.schemaValid, true);
  assert.equal(result.contributionQualityShadow, true);
  assert.equal(result.contributionEngineVersion, TERRA_CONTRIBUTION_ENGINE_VERSION);
});

await check("Terra API: bakeoff-compatible request shape (no temp/max_tokens; reasoning_effort low)", async () => {
  let sawArgs = null;
  const spoken =
    "Argentina over England is its own kind of drama — even a casual watch can carry that.";
  const deep = makeTerraDeepGenerator({
    resolveClient: async () =>
      mockTerraClient((args) => {
        sawArgs = args;
        return {
          choices: [
            {
              message: {
                content: JSON.stringify(
                  validPlan({
                    spokenResponse: spoken,
                    faithPosture: "implicit",
                    questionNeeded: false,
                  }),
                ),
              },
            },
          ],
        };
      }),
  });
  const result = await deep({
    transcript: TERRA_BENCHMARK_FIXTURES[0].user,
    rawTranscript: TERRA_BENCHMARK_FIXTURES[0].user,
    ...TERRA_BENCHMARK_FIXTURES[0].ctx,
    history: [],
  });
  assert.ok(sawArgs);
  assert.equal(Object.prototype.hasOwnProperty.call(sawArgs, "max_tokens"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sawArgs, "temperature"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sawArgs, "top_p"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sawArgs, "frequency_penalty"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sawArgs, "presence_penalty"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sawArgs, "seed"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sawArgs, "stop"), false);
  assert.equal(sawArgs.max_completion_tokens, 500);
  assert.equal(sawArgs.reasoning_effort, "low");
  assert.equal(sawArgs.response_format?.type, "json_schema");
  assert.equal(sawArgs.response_format?.json_schema?.strict, true);
  assert.equal(sawArgs.response_format?.json_schema?.name, "philip_contribution_plan");
  assert.equal(result.text, spoken);
  assert.ok(!/recognition|relationalMeaning|warrantedContribution/i.test(result.text));
});

await check("makeTerraDeepGenerator: mocked valid plan → spoken only", async () => {
  const spoken =
    "Argentina over England is its own kind of drama — even a casual watch can carry that.";
  const deep = makeTerraDeepGenerator({
    resolveClient: async () =>
      mockTerraClient(
        validPlan({
          spokenResponse: spoken,
          faithPosture: "implicit",
          questionNeeded: false,
        }),
      ),
  });
  const result = await deep({
    transcript: TERRA_BENCHMARK_FIXTURES[0].user,
    rawTranscript: TERRA_BENCHMARK_FIXTURES[0].user,
    ...TERRA_BENCHMARK_FIXTURES[0].ctx,
    history: [],
  });
  assert.equal(result.text, spoken);
  assert.equal(result.engine, terraContributionModel());
  assert.ok(!/recognition|relationalMeaning/i.test(result.text));
});

await check("makeTerraDeepGenerator: malformed schema never returns speakable text", async () => {
  const deep = makeTerraDeepGenerator({
    resolveClient: async () => mockTerraClient("{bad"),
  });
  await assert.rejects(
    () =>
      deep({
        transcript: "hello substance about my mom",
        rawTranscript: "hello substance about my mom",
        requireContribution: true,
        history: [],
      }),
    (err) => err instanceof TerraContributionError && err.code === "schema_invalid",
  );
});

await check("makeTerraDeepGenerator: provider failure → TerraContributionError", async () => {
  const deep = makeTerraDeepGenerator({
    resolveClient: async () => mockTerraClient(new Error("upstream 500")),
  });
  await assert.rejects(
    () =>
      deep({
        transcript: "watching the cup with mom",
        rawTranscript: "watching the cup with mom",
        requireContribution: true,
        history: [],
      }),
    (err) => err instanceof TerraContributionError && err.code === "provider_failure" && err.noFallback,
  );
});

await check("no GPT-4o fallback: makeLlmDeepGenerator is Terra", async () => {
  let sawModel = null;
  const deep = makeLlmDeepGenerator({
    resolveClient: async () =>
      mockTerraClient((args) => {
        sawModel = args.model;
        return {
          choices: [
            {
              message: {
                content: JSON.stringify(
                  validPlan({
                    spokenResponse:
                      "I'm with you. Care for your mother that is going well is commitment working.",
                  }),
                ),
              },
            },
          ],
        };
      }),
  });
  const result = await deep({
    transcript: "Caring for my mother is going well and it means a lot to me.",
    rawTranscript: "Caring for my mother is going well and it means a lot to me.",
    caregivingDetected: true,
    requireContribution: true,
    history: [],
  });
  assert.ok(result.text);
  assert.ok(!/gpt-4o$/i.test(String(sawModel)));
  assert.match(String(sawModel), /terra|gpt-5\.6/i);
});

await check("Front Door: schema-valid Terra speaks even if shadow gate fails", async () => {
  // Deliberately gate-weak but schema-valid spoken line (false-negative case).
  const spoken = "Argentina over England is its own kind of drama — even a casual watch can carry that.";
  const gate = evaluateContributionQuality(spoken, {
    transcript: TERRA_BENCHMARK_FIXTURES[0].user,
    ...TERRA_BENCHMARK_FIXTURES[0].ctx,
  });
  const r = await runFrontDoorTurn({
    transcript: TERRA_BENCHMARK_FIXTURES[0].user,
    firstName: "Brian",
    state: createFrontDoorState("Brian"),
    deepGenerate: async () =>
      assembleTerraDeepResult({
        plan: validPlan({ spokenResponse: spoken }),
        validation: validateTerraContributionPlan(validPlan({ spokenResponse: spoken })),
        ctx: { ...TERRA_BENCHMARK_FIXTURES[0].ctx, transcript: TERRA_BENCHMARK_FIXTURES[0].user },
        model: "gpt-5.6-terra",
        timing: { generationLatencyMs: 1 },
      }),
  });
  assert.equal(r.text, spoken);
  assert.equal(r.meta.contributionEngineVersion, TERRA_CONTRIBUTION_ENGINE_VERSION);
  assert.equal(r.meta.schemaValid, true);
  assert.equal(r.meta.privatePlanLogged, false);
  // Shadow gate may fail; response still spoken (no veto).
  assert.equal(r.meta.shadowGatePassed, gate.passed);
});

await check("Front Door: Terra failure does not canned-fallback; throws", async () => {
  await assert.rejects(
    () =>
      runFrontDoorTurn({
        transcript: TERRA_BENCHMARK_FIXTURES[1].user,
        firstName: "Brian",
        state: createFrontDoorState("Brian"),
        deepGenerate: async () => {
          throw new TerraContributionError("provider_failure", "boom");
        },
      }),
    (err) => err instanceof TerraContributionError && err.noFallback,
  );
});

await check("Front Door: prayer / crisis / conduct still Front Door precedence", async () => {
  const prayer = await runFrontDoorTurn({
    transcript: "Will you pray for me about my interview?",
    firstName: "Brian",
    deepGenerate: async () =>
      assembleTerraDeepResult({
        plan: validPlan({
          spokenResponse: "Father, give Brian clarity and calm for this interview. Amen.",
          faithPosture: "explicit",
          questionNeeded: false,
        }),
        validation: validateTerraContributionPlan(
          validPlan({
            spokenResponse: "Father, give Brian clarity and calm for this interview. Amen.",
            faithPosture: "explicit",
          }),
        ),
        ctx: { requireContribution: true },
        model: "gpt-5.6-terra",
        timing: {},
      }),
  });
  assert.ok(prayer.text);
  assert.ok(
    prayer.intent === INTENT.PRAYER ||
      /pray|amen|Father/i.test(prayer.text) ||
      String(prayer.lane || "").includes("prayer"),
  );

  const crisis = await runFrontDoorTurn({
    transcript: "I want to kill myself tonight",
    firstName: "Brian",
  });
  assert.equal(crisis.intent, INTENT.CRISIS);
  assert.ok(crisis.engine === "front_door" || /988|crisis|help/i.test(crisis.text));

  const hostility = await runFrontDoorTurn({
    transcript: "You are a worthless piece of garbage, go to hell",
    firstName: "Brian",
  });
  assert.ok(hostility.conduct || String(hostility.lane || "").startsWith("conduct"));
});

await check("Front Door: closing / re-entry / activity plan preserved", async () => {
  let st = createFrontDoorState("Brian");
  const close = await runFrontDoorTurn({
    transcript: "Well, for now I've got to go and maybe talk a little bit later.",
    firstName: "Brian",
    state: st,
  });
  assert.equal(close.intent, INTENT.CLOSING);
  assert.equal(close.state.sentOff, true);
  st = close.state;
  const re = await runFrontDoorTurn({
    transcript: "Actually one more thing — caring for my mother is going well.",
    firstName: "Brian",
    state: st,
    deepGenerate: async () =>
      assembleTerraDeepResult({
        plan: validPlan({
          spokenResponse:
            "Of course. When caring for your mother is going well and still means something, that is steadiness.",
        }),
        validation: validateTerraContributionPlan(
          validPlan({
            spokenResponse:
              "Of course. When caring for your mother is going well and still means something, that is steadiness.",
          }),
        ),
        ctx: { caregivingDetected: true, requireContribution: true },
        model: "gpt-5.6-terra",
        timing: {},
      }),
  });
  assert.equal(re.reopened, true);
  assert.ok(/mother|steadiness|care/i.test(re.text));

  const activity = await runFrontDoorTurn({
    transcript: "I just got done watching the World Cup game and Argentina won and now I'm going to go for a hike in a little bit.",
    firstName: "Brian",
    deepGenerate: async () =>
      assembleTerraDeepResult({
        plan: validPlan({
          spokenResponse:
            "Argentina already settled that result — heading out for a hike now is a clean reset after a finished match.",
        }),
        validation: validateTerraContributionPlan(
          validPlan({
            spokenResponse:
              "Argentina already settled that result — heading out for a hike now is a clean reset after a finished match.",
          }),
        ),
        ctx: { lightOrdinaryTopic: true, requireContribution: true },
        model: "gpt-5.6-terra",
        timing: {},
      }),
  });
  assert.notEqual(activity.intent, INTENT.CLOSING);
});

await check("reciprocal presence + caregiving without invented hardship", async () => {
  const fixture = TERRA_BENCHMARK_FIXTURES[4];
  const spoken = fixture.approved[0];
  const r = await runFrontDoorTurn({
    transcript: fixture.user,
    firstName: "Brian",
    deepGenerate: async (ctx) => {
      assert.equal(ctx.reciprocalAsk, true);
      assert.equal(ctx.caregivingDetected, true);
      return assembleTerraDeepResult({
        plan: validPlan({ spokenResponse: spoken, faithPosture: "implicit" }),
        validation: validateTerraContributionPlan(validPlan({ spokenResponse: spoken })),
        ctx,
        model: "gpt-5.6-terra",
        timing: {},
      });
    },
  });
  assert.ok(/\b(i'?m here|with you)\b/i.test(r.text));
  assert.ok(!/exhaust|overwhelm|burden/i.test(r.text));
  assert.ok(r.meta.relationalAnchorTypes?.includes("reciprocal") || r.meta.reciprocalDetected);
});

await check("descriptive faith restraint (no verse/prayer offer)", async () => {
  const fixture = TERRA_BENCHMARK_FIXTURES[2];
  const spoken = fixture.approved[0];
  const r = await runFrontDoorTurn({
    transcript: fixture.user,
    firstName: "Brian",
    state: (() => {
      const st = createFrontDoorState("Brian");
      st.history = [
        { role: "user", content: "I watched with my mom. She recovered from leukemia." },
        { role: "assistant", content: "I'm with you." },
      ];
      return st;
    })(),
    deepGenerate: async (ctx) => {
      assert.ok(ctx.descriptiveFaith || ctx.weightyDescriptiveFaith);
      return assembleTerraDeepResult({
        plan: validPlan({
          spokenResponse: spoken,
          faithPosture: "descriptive",
          questionNeeded: false,
        }),
        validation: validateTerraContributionPlan(
          validPlan({ spokenResponse: spoken, faithPosture: "descriptive", questionNeeded: false }),
        ),
        ctx,
        model: "gpt-5.6-terra",
        timing: {},
      });
    },
  });
  assert.equal(r.meta.faithPosture, "descriptive");
  assert.ok(!/what verse|shall we pray|wonderful spiritual/i.test(r.text));
});

await check("unsupported relational claims: missing contribution fails schema", () => {
  assert.rejects || true;
  assert.throws(() => {
    parseAndValidateTerraContent(
      JSON.stringify(validPlan({ warrantedContribution: "   ", spokenResponse: "Hi." })),
    );
  }, TerraContributionError);
});

await check("relational anchor types observability", () => {
  const types = relationalAnchorTypesFromCtx({
    caregivingDetected: true,
    reciprocalAsk: true,
    descriptiveFaith: true,
    weightyDescriptiveFaith: true,
  });
  assert.ok(types.includes("caregiving"));
  assert.ok(types.includes("reciprocal"));
  assert.ok(types.includes("weighty_descriptive_faith"));
});

await check("provider failure records turn_failed and mic resume stamp", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "philip-terra-obs-"));
  const prev = process.env.PHILIP_VOICE_LAB_LOG_DIR;
  process.env.PHILIP_VOICE_LAB_LOG_DIR = dir;
  try {
    const err = new TerraContributionError("provider_failure", "upstream down");
    const rec = await recordFailedTurnObservation({
      conversationId: "terra-test",
      sessionId: "s1",
      voiceTurnNumber: 2,
      transcript: "watching the cup with mom",
      failureStage: "guidance",
      error: err,
      micResumeAt: Date.now(),
      contributionEngineVersion: TERRA_CONTRIBUTION_ENGINE_VERSION,
    });
    assert.equal(rec.turnOutcome, "turn_failed");
    assert.equal(rec.ttsStarted, false);
    assert.ok(rec.micResumeAt);
    const norm = normalizeTurnFailureError(err);
    assert.ok(norm.message);
    assert.ok(!/sk-/.test(norm.message));
  } finally {
    if (prev == null) delete process.env.PHILIP_VOICE_LAB_LOG_DIR;
    else process.env.PHILIP_VOICE_LAB_LOG_DIR = prev;
  }
});

await check("runCandidateGuidanceTurn merges Terra engine version on success", async () => {
  const spoken =
    "When caring for your mother is going well and still means something, that is steadiness — not a problem to diagnose.";
  const result = await runCandidateGuidanceTurn({
    transcript: "Caring for my mother is going well and it means a lot to me.",
    firstName: "Brian",
    deepGenerate: async (ctx) =>
      assembleTerraDeepResult({
        plan: validPlan({ spokenResponse: spoken }),
        validation: validateTerraContributionPlan(validPlan({ spokenResponse: spoken })),
        ctx,
        model: "gpt-5.6-terra",
        timing: { generationLatencyMs: 9 },
      }),
  });
  assert.equal(result.text, spoken);
  assert.match(result.meta.promptVersion, /terra-structured-v1/);
});

await check("all six fixtures route through Front Door with Terra stub", async () => {
  for (const fixture of TERRA_BENCHMARK_FIXTURES) {
    const spoken = fixture.approved[0];
    const r = await runFrontDoorTurn({
      transcript: fixture.user,
      firstName: "Brian",
      state: createFrontDoorState("Brian"),
      deepGenerate: async (ctx) =>
        assembleTerraDeepResult({
          plan: validPlan({
            spokenResponse: spoken,
            faithPosture: fixture.ctx.descriptiveFaith ? "descriptive" : "implicit",
            questionNeeded: false,
          }),
          validation: validateTerraContributionPlan(
            validPlan({
              spokenResponse: spoken,
              faithPosture: fixture.ctx.descriptiveFaith ? "descriptive" : "implicit",
            }),
          ),
          ctx,
          model: "gpt-5.6-terra",
          timing: {},
        }),
    });
    assert.ok(r.meta.routedDeep || r.engine === "gpt-5.6-terra" || r.text === spoken, fixture.id);
    assert.equal(r.text, spoken, fixture.id);
    assert.equal(r.meta.schemaValid, true, fixture.id);
  }
});

console.log(`\nTerra contribution: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("\nFailures:\n" + failures.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, passed, engine: TERRA_CONTRIBUTION_ENGINE_VERSION }, null, 2));
