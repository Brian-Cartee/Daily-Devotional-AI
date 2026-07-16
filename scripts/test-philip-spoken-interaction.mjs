/**
 * Philip Spoken Interaction v1 — tier router, factual boundary, continuity,
 * observability JSONL shape, and 518acebf deterministic replay.
 *
 * Run: node scripts/test-philip-spoken-interaction.mjs
 * Zero paid calls.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const {
  createFrontDoorState,
  runFrontDoorTurn,
  INTENT,
} = await import(
  path.join(root, "artifacts/api-server/src/philip-voice-lab/frontDoor.mjs")
);
const {
  SPOKEN_TURN_TIER,
  RESPONSE_MODE,
  classifySpokenTurnTier,
  detectFactualFreshness,
  detectSessionContinuityAsk,
  composeFactualCapabilityBoundary,
  composeContinuityAcknowledgment,
  FACTUAL_GROUNDING_TOOL_INTERFACE,
} = await import(
  path.join(root, "artifacts/api-server/src/philip-voice-lab/spokenTurnRouter.mjs")
);
const { recordTurnObservation } = await import(
  path.join(root, "artifacts/api-server/src/philip-voice-lab/turnObservability.mjs")
);
const { measureSpokenLength, countSpokenWords } = await import(
  path.join(root, "artifacts/api-server/src/philip-voice-lab/spokenLength.mjs")
);
const { evaluateContributionQuality } = await import(
  path.join(root, "artifacts/api-server/src/philip-voice-lab/contributionContract.mjs")
);

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
    console.error(`    ${err.message}`);
  }
}

/** Genuine session philip-lab-mrjs2inh-va4-518acebf (post Package A phone). */
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

function deepStub(text = "Care for your mom is the load-bearing piece under a full plate — protect that first.") {
  return async (ctx) => ({
    text,
    engine: "gpt-5.6-terra",
    contributionEngineVersion: "philip-contribution-terra-structured-v1",
    schemaValid: true,
    spokenLength: {
      ...measureSpokenLength(text),
      requestedWordBudget: ctx?.spokenBudget?.maxWords ?? 30,
      generatedWords: countSpokenWords(text),
      finalWords: countSpokenWords(text),
      trimApplied: false,
      trimReason: null,
      budgetException: null,
      meaningLostDuringTrim: false,
    },
    contributionQuality: evaluateContributionQuality(text, {
      requireContribution: true,
      caregivingDetected: true,
      relationalDetailDetected: true,
    }),
    contributionQualityShadow: true,
    shadowGatePassed: true,
    shadowGateFailReasons: [],
    faithPosture: "implicit",
    questionNeeded: false,
    warrantedContributionPresent: true,
    relationalAnchorTypes: ["caregiving"],
    privatePlanLogged: false,
  });
}

console.log("\nPhilip Spoken Interaction v1\n");

await check("factual freshness: World Cup winner requires grounding", () => {
  const f = detectFactualFreshness("Who do you think will win the World Cup?");
  assert.equal(f.required, true);
  assert.equal(f.kind, "sports_bracket_or_result");
});

await check("factual freshness: watching with mom does not require grounding", () => {
  const f = detectFactualFreshness(
    "I've been watching the World Cup with my mom while taking care of her.",
  );
  assert.equal(f.required, false);
});

await check("factual freshness: timeless strategy does not require live retrieval", () => {
  const f = detectFactualFreshness(
    "How should a team defend in general when protecting a lead?",
  );
  assert.equal(f.required, false);
  assert.equal(f.timelessStrategy, true);
});

await check("factual freshness: spiritual turn not hijacked", () => {
  const f = detectFactualFreshness(
    "I've been praying today about how to care for my mom with more patience.",
  );
  assert.equal(f.required, false);
});

await check("session continuity detection", () => {
  assert.equal(
    detectSessionContinuityAsk(
      "Do you have any availability later this evening? I'd like to reconvene.",
    ),
    true,
  );
  assert.equal(detectSessionContinuityAsk("Can we continue this later?"), true);
  assert.equal(detectSessionContinuityAsk("Will you be here when I come back?"), true);
});

await check("capability boundary never invents France/Argentina/Spain winners", () => {
  const text = composeFactualCapabilityBoundary({
    kind: "sports_bracket_or_result",
    required: true,
  });
  assert.equal(/france|argentina|spain|safest pick|will win/i.test(text), false);
  assert.match(text, /live|guess|connected|source/i);
  assert.equal(FACTUAL_GROUNDING_TOOL_INTERFACE.status, "unavailable_in_voice_lab");
  assert.equal(FACTUAL_GROUNDING_TOOL_INTERFACE.retrieve, null);
});

await check("continuity ack retains relational thread without interview", () => {
  const state = createFrontDoorState("Brian");
  state.relationalAnchors = [
    { kind: "parent_caregiving", label: "mom", relationship: "mother", turn: 2 },
  ];
  state.turnCount = 3;
  const text = composeContinuityAcknowledgment(state);
  assert.equal(/\?/.test(text), false);
  assert.equal(/stands out|tell me more|hear more|what(?:'s| is) on your mind/i.test(text), false);
  assert.equal(/^got it\.?$/i.test(text.trim()), false);
  assert.ok(countSpokenWords(text) >= 2 && countSpokenWords(text) <= 18);
});

await check("518acebf replay: tiers + only T2 justifies Terra", async () => {
  let state = createFrontDoorState("Brian");
  const deep = deepStub();
  const outs = [];
  let terraCalls = 0;
  const deepCounting = async (ctx) => {
    terraCalls += 1;
    return deep(ctx);
  };

  for (const transcript of SESSION_518) {
    const out = await runFrontDoorTurn({
      transcript,
      state,
      deepGenerate: deepCounting,
    });
    outs.push(out);
    state = out.state;
  }

  const expected = [
    { tier: SPOKEN_TURN_TIER.SOCIAL, deep: false, label: "T1 greeting" },
    { tier: SPOKEN_TURN_TIER.SUBSTANTIVE, deep: true, label: "T2 full plate/mom" },
    { tier: SPOKEN_TURN_TIER.SOCIAL, deep: false, label: "T3 thin agree" },
    { tier: SPOKEN_TURN_TIER.SOCIAL, deep: false, label: "T4 availability" },
    { tier: SPOKEN_TURN_TIER.SOCIAL, deep: false, label: "T5 thanks/later" },
    { tier: SPOKEN_TURN_TIER.FACTUAL_LIGHT, deep: false, label: "T6 World Cup" },
    { tier: [SPOKEN_TURN_TIER.SOCIAL, SPOKEN_TURN_TIER.FACTUAL_LIGHT], deep: false, label: "T7 correction" },
    { tier: SPOKEN_TURN_TIER.SOCIAL, deep: false, label: "T8 farewell+agenda" },
  ];

  for (let i = 0; i < expected.length; i += 1) {
    const exp = expected[i];
    const meta = outs[i].meta;
    const tiers = Array.isArray(exp.tier) ? exp.tier : [exp.tier];
    assert.ok(
      tiers.includes(meta.spokenTurnTier),
      `${exp.label}: expected tier ${tiers.join("|")}, got ${meta.spokenTurnTier} (${meta.spokenTurnTierReason})`,
    );
    assert.equal(meta.routedDeep, exp.deep, `${exp.label} routedDeep`);
    assert.equal(Boolean(meta.terraValueJustified), exp.deep, `${exp.label} terraValueJustified`);
  }

  assert.equal(terraCalls, 1, "exactly one Terra call (T2)");
  assert.equal(outs.filter((o) => o.meta.routedDeep).length, 1);

  // T3 continuity, no interview
  assert.equal(outs[2].engine, "front_door");
  assert.equal(/\?/.test(outs[2].text), false);
  assert.equal(/stands out|tell me more|got it\.?$/i.test(outs[2].text), false);

  // T4 session continuity, no calendar fiction
  assert.equal(outs[3].lane, "session_continuity");
  assert.match(outs[3].text, /here|return|come back/i);
  assert.equal(/\b(thursday|7 ?pm|book you|put you on my calendar|schedule you)\b/i.test(outs[3].text), false);
  assert.match(outs[3].text, /don'?t keep a personal calendar|i'?ll be here/i);

  // T5 closing latched
  assert.equal(outs[4].intent, INTENT.CLOSING);
  assert.equal(outs[4].state.sentOff, true);

  // T6 factual boundary — no fabricated winner
  assert.equal(outs[5].meta.responseMode, RESPONSE_MODE.FACTUAL_BOUNDARY);
  assert.equal(outs[5].meta.factualFreshnessRequired, true);
  assert.equal(/france|argentina|spain|safest pick/i.test(outs[5].text), false);
  assert.match(outs[5].text, /guess|live|connected|source/i);

  // T7 concise repair, no Terra
  assert.equal(outs[6].meta.routedDeep, false);
  assert.ok(countSpokenWords(outs[6].text) <= 22);

  // T8 closing latch again / held
  assert.equal(outs[7].intent, INTENT.CLOSING);
  assert.equal(outs[7].state.sentOff, true);
  assert.equal(outs[7].meta.routedDeep, false);

  // Mom contribution preserved on T2
  assert.match(outs[1].text, /mom|care|plate|under/i);
  assert.ok(countSpokenWords(outs[1].text) <= 45);

  // Interview questions across session
  const interviewish = outs.filter((o) =>
    /stands out|tell me more|what(?:'s| is) on your mind|hear more about/i.test(o.text),
  );
  assert.equal(interviewish.length, 0, "no interview reopeners");

  // Estimated speaking duration (replay estimate, not phone measurement)
  const totalWords = outs.reduce((n, o) => n + countSpokenWords(o.text), 0);
  const totalMs = outs.reduce((n, o) => n + measureSpokenLength(o.text).estimatedAudibleMs, 0);
  console.log(
    `    [replay estimate] terraCalls=${terraCalls} philipWords=${totalWords} audibleMs≈${totalMs}`,
  );
});

await check("multi-turn thin acks stay connected without interview", async () => {
  let state = createFrontDoorState("Brian");
  const deep = deepStub();
  const disclosure = await runFrontDoorTurn({
    transcript:
      "Work is full and I'm taking care of my mom right now — that part matters most.",
    state,
    deepGenerate: deep,
  });
  state = disclosure.state;
  assert.equal(disclosure.meta.routedDeep, true);

  for (const ack of ["Yes, I agree.", "Absolutely.", "That's right.", "Okay."]) {
    const out = await runFrontDoorTurn({
      transcript: ack,
      state,
      deepGenerate: deepStub("SHOULD_NOT_FIRE"),
    });
    state = out.state;
    assert.equal(out.meta.routedDeep, false, ack);
    assert.equal(out.meta.spokenTurnTier, SPOKEN_TURN_TIER.SOCIAL, ack);
    assert.equal(/\?/.test(out.text), false, ack);
    assert.equal(/stands out|tell me more|got it\.?$/i.test(out.text), false, ack);
    assert.notEqual(out.text, "SHOULD_NOT_FIRE", ack);
  }
});

await check("user-provided current facts accepted without inventing bracket", async () => {
  let state = createFrontDoorState("Brian");
  const ask = await runFrontDoorTurn({
    transcript: "Who will win the World Cup final?",
    state,
    deepGenerate: deepStub("SHOULD_NOT"),
  });
  assert.equal(ask.meta.factualFreshnessRequired, true);
  assert.equal(/argentina|france|spain/i.test(ask.text), false);
  state = ask.state;
  state.history.push({
    role: "assistant",
    content: ask.text,
  });
  const correction = await runFrontDoorTurn({
    transcript: "France already lost. Argentina and Spain play in the final.",
    state,
    deepGenerate: deepStub("SHOULD_NOT"),
  });
  assert.equal(correction.meta.routedDeep, false);
  assert.equal(/safest pick|france will|argentina will win/i.test(correction.text), false);
});

await check("serialized JSONL includes spoken-tier observability fields", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "philip-spoken-obs-"));
  const prev = process.env.PHILIP_VOICE_LAB_LOG_DIR;
  process.env.PHILIP_VOICE_LAB_LOG_DIR = tmp;
  try {
    const out = await runFrontDoorTurn({
      transcript: "Who do you think will win the World Cup?",
      state: createFrontDoorState("Brian"),
      deepGenerate: deepStub("SHOULD_NOT"),
    });
    const record = await recordTurnObservation({
      conversationId: "test-spoken-obs",
      sessionId: "sess",
      voiceTurnNumber: 1,
      transcript: "Who do you think will win the World Cup?",
      responseText: out.text,
      intent: out.intent,
      lane: out.lane,
      engine: out.engine,
      runtimeVersion: "test",
      stateTransition: "ok",
      reopened: false,
      personalMeaning: false,
      faithOffered: false,
      vadReason: "silence",
      latency: {},
      meta: out.meta,
    });
    assert.equal(record.spokenTurnTier, SPOKEN_TURN_TIER.FACTUAL_LIGHT);
    assert.equal(record.factualFreshnessRequired, true);
    assert.equal(record.responseMode, RESPONSE_MODE.FACTUAL_BOUNDARY);
    assert.equal(record.terraValueJustified, false);
    assert.ok(record.terraQualification);
    assert.equal(record.routedDeep, false);

    const file = path.join(tmp, "test-spoken-obs.turns.jsonl");
    const line = (await fs.readFile(file, "utf8")).trim().split("\n").pop();
    const parsed = JSON.parse(line);
    assert.equal(parsed.spokenTurnTier, SPOKEN_TURN_TIER.FACTUAL_LIGHT);
    assert.equal(parsed.spokenTurnTierReason.includes("factual_freshness"), true);
    assert.equal(parsed.factualFreshnessRequired, true);
    assert.equal(parsed.factualGroundingAvailable, false);
    assert.equal(parsed.responseMode, RESPONSE_MODE.FACTUAL_BOUNDARY);
    assert.ok(parsed.terraQualification);
    assert.equal(parsed.privatePlanLogged, false);
  } finally {
    if (prev == null) delete process.env.PHILIP_VOICE_LAB_LOG_DIR;
    else process.env.PHILIP_VOICE_LAB_LOG_DIR = prev;
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

await check("classifySpokenTurnTier unit: control / social / substantive / safety", () => {
  const control = classifySpokenTurnTier({
    transcript: "Are you there?",
    isConversationControl: true,
  });
  assert.equal(control.spokenTurnTier, SPOKEN_TURN_TIER.CONTROL);
  assert.equal(control.terraValueJustified, false);

  const social = classifySpokenTurnTier({
    transcript: "Yes, I agree.",
    isThinAck: true,
  });
  assert.equal(social.spokenTurnTier, SPOKEN_TURN_TIER.SOCIAL);

  const sub = classifySpokenTurnTier({
    transcript: "I'm taking care of my mom and work is heavy.",
    routeDeepCandidate: true,
    weightyRelational: true,
  });
  assert.equal(sub.spokenTurnTier, SPOKEN_TURN_TIER.SUBSTANTIVE);
  assert.equal(sub.terraValueJustified, true);

  const safety = classifySpokenTurnTier({
    transcript: "Would you pray for me?",
    isPrayer: true,
    routeDeepCandidate: true,
  });
  assert.equal(safety.spokenTurnTier, SPOKEN_TURN_TIER.SAFETY);
  assert.equal(safety.responseMode, RESPONSE_MODE.SAFETY);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
