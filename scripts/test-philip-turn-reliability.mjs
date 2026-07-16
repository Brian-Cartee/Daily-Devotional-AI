/**
 * Philip Voice Lab — turn-taking / routing reliability package tests.
 * Deterministic. No paid API calls.
 */
import assert from "node:assert/strict";
import {
  createFrontDoorState,
  isClosingTurn,
  isGoPhraseSessionFarewell,
  isSessionLeaveWithOptionalReconnect,
  isThinSocialAcknowledgment,
  isIncompleteLeadInFragment,
  isHighConfidenceIncompleteSpeech,
  resolveFrontDoorClassification,
  runFrontDoorTurn,
  INTENT,
} from "../artifacts/api-server/src/philip-voice-lab/frontDoor.mjs";
import { evaluateContributionQuality } from "../artifacts/api-server/src/philip-voice-lab/contributionContract.mjs";
import {
  groundedRelationalHint,
  groundedPriorRelationalHints,
  detectRelationalWeight,
} from "../artifacts/api-server/src/philip-voice-lab/relationalWeight.mjs";
import {
  measureSpokenLength,
  softTrimSpokenResponse,
  SPOKEN_TARGET_MAX_SENTENCES,
} from "../artifacts/api-server/src/philip-voice-lab/spokenLength.mjs";
import { assembleTerraDeepResult } from "../artifacts/api-server/src/philip-voice-lab/terraContributionEngine.mjs";
import { startPcmPublishAsync } from "../artifacts/api-server/src/philip-voice-lab/audioUtil.mjs";
import { validateTerraContributionPlan } from "../artifacts/api-server/src/philip-voice-lab/terraContributionSchema.mjs";

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
    console.error(`    ${err?.message || err}`);
  }
}

const SESSION_F33 = [
  "Hello, Phillip, how are you?",
  "I've just been watching the news this morning, just up early and doing a little prayer and meditation and then also reading some scripture and then get ready for the day.",
  "Absolutely, I agree. It's something that's very important to do and make it a staple and a very important and dedicated part of your morning. That way, at least in case something happens in the evening and you miss it, you've actually accomplished something early in the morning and giving all the glory to God.",
  "Yes, it does matter a lot. Very much so.",
  "Absolutely, I agree. It's a good habit to start. It also, you know, brightens your day, gives you a certain sense of peace and strength for whatever you're going through. It's definitely, it's almost like having a meal or getting fuel for a spiritual fuel every morning.",
  "That's still is not your comfort for the morning.",
  "Absolutely, it sure is. You're absolutely right about that.",
  "It sure does. It sure does. It's all about relationship, not just going through the motions or being committed. It really, but it does take discipline to continue that experience and being there and being present, but it's deeper than just the actual going through the motions.",
  "Absolutely. Well, I feel like I need to go for now, but is there is there a way we can reconnect later this afternoon or evening?",
  "Oh, by the way, um...",
  "By the way...",
  "Yeah, by the way, I was...",
  "I was wondering if you had any opinion upon how I deal with the mornings and making sure that I continue to stay dedicated and, you know, commitment and so on and so forth to everything else that I have to go on through the day. Obviously it's important, but do you have any advice on how to be present in those moments?",
];

function deepStub(text = "A short warranted contribution about morning presence.") {
  return async () => ({
    text,
    engine: "gpt-5.6-terra",
    contributionEngineVersion: "philip-contribution-terra-structured-v1",
    schemaValid: true,
    spokenLength: measureSpokenLength(text),
    contributionQuality: evaluateContributionQuality(text, { requireContribution: true }),
    contributionQualityShadow: true,
    shadowGatePassed: true,
    shadowGateFailReasons: [],
    faithPosture: "descriptive",
    questionNeeded: false,
    warrantedContributionPresent: true,
    relationalAnchorTypes: [],
    privatePlanLogged: false,
  });
}

console.log("\nPhilip turn-taking / routing reliability\n");

await check("closing precedence: f33 T9 leave+reconnect closes Front Door", async () => {
  const t = SESSION_F33[8];
  assert.equal(isGoPhraseSessionFarewell(t), true);
  assert.equal(isSessionLeaveWithOptionalReconnect(t), true);
  assert.equal(isClosingTurn(t), true);
  const r = resolveFrontDoorClassification(t, createFrontDoorState());
  assert.equal(r.intent, INTENT.CLOSING);
  assert.equal(r.routeDeep, false);
  assert.equal(r.terraQualification?.reason, "closing_precedence");
  const out = await runFrontDoorTurn({
    transcript: t,
    state: createFrontDoorState(),
    deepGenerate: deepStub("SHOULD_NOT_FIRE"),
  });
  assert.equal(out.intent, INTENT.CLOSING);
  assert.equal(out.engine, "front_door");
  assert.equal(out.state.sentOff, true);
  assert.equal(out.meta.routedDeep, false);
  assert.equal(/\?/.test(out.text), false);
  assert.notEqual(out.text, "SHOULD_NOT_FIRE");
});

await check("closing negatives: deeper/over/walk/back do not close", async () => {
  const negatives = [
    "I need to go deeper into that.",
    "I need to go over the plan.",
    "I need to go for a walk later.",
    "I have to go back to what I was saying.",
  ];
  for (const t of negatives) {
    assert.equal(isGoPhraseSessionFarewell(t), false, `go farewell? ${t}`);
    assert.equal(isClosingTurn(t), false, `close? ${t}`);
    assert.notEqual(resolveFrontDoorClassification(t, createFrontDoorState()).intent, INTENT.CLOSING, t);
  }
});

await check("closing then later re-entry clears sentOff and can deep-route", async () => {
  const closed = await runFrontDoorTurn({
    transcript: "I need to go for now, but I'd like to reconnect later.",
    state: createFrontDoorState(),
    deepGenerate: deepStub(),
  });
  assert.equal(closed.state.sentOff, true);
  const reentry = await runFrontDoorTurn({
    transcript:
      "Actually one more thing — how should I stay present in morning prayer when the day gets full?",
    state: closed.state,
    deepGenerate: deepStub("Protect the first minutes as presence, then carry one intention."),
  });
  assert.equal(reentry.state.sentOff, false);
  assert.equal(reentry.meta.routedDeep, true);
  assert.match(reentry.engine, /terra|candidate|gpt/i);
});

await check("by-the-way fragment coalesce asks once and never reaches Terra", async () => {
  let state = createFrontDoorState();
  state.turnCount = 4;
  const deep = deepStub("SHOULD_NOT_TERRA");
  const t10 = await runFrontDoorTurn({
    transcript: "Oh, by the way, um...",
    state,
    deepGenerate: deep,
  });
  assert.equal(t10.lane, "fragment_repair");
  assert.equal(t10.engine, "front_door");
  assert.equal(t10.meta.fragmentAskCount, 1);
  assert.ok(t10.state.pendingFragment);

  const t11 = await runFrontDoorTurn({
    transcript: "By the way...",
    state: t10.state,
    deepGenerate: deep,
  });
  assert.equal(t11.lane, "fragment_hold");
  assert.equal(t11.engine, "front_door");
  assert.equal(/\?/.test(t11.text), false);

  const t12 = await runFrontDoorTurn({
    transcript: "Yeah, by the way, I was...",
    state: t11.state,
    deepGenerate: deep,
  });
  assert.equal(t12.engine, "front_door");
  assert.notEqual(t12.text, "SHOULD_NOT_TERRA");
  assert.equal(t12.meta.terraQualification?.qualified, false);
});

await check("thin affirmation stays shallow even after personalMeaningSeen", async () => {
  const st = createFrontDoorState();
  st.turnCount = 6;
  st.personalMeaningSeen = true;
  st.lastIntent = INTENT.CASUAL;
  const t = "Absolutely, it sure is. You're absolutely right about that.";
  assert.equal(isThinSocialAcknowledgment(t), true);
  const r = resolveFrontDoorClassification(t, st);
  assert.equal(r.routeDeep, false);
  assert.equal(r.terraQualification?.reason, "thin_acknowledgment");
  const out = await runFrontDoorTurn({
    transcript: t,
    state: st,
    deepGenerate: deepStub("SHOULD_NOT_TERRA"),
  });
  assert.equal(out.engine, "front_door");
  assert.notEqual(out.text, "SHOULD_NOT_TERRA");
});

await check("substantive turn still reaches Terra", async () => {
  const t = SESSION_F33[7];
  const st = createFrontDoorState();
  st.turnCount = 7;
  st.personalMeaningSeen = true;
  const r = resolveFrontDoorClassification(t, st);
  assert.equal(r.routeDeep, true);
  assert.match(r.terraQualification?.reason || "", /ordinary_substance|deep_intent/);
  const out = await runFrontDoorTurn({
    transcript: t,
    state: st,
    deepGenerate: deepStub(
      "Discipline protects room for the relationship; it is not the relationship itself.",
    ),
  });
  assert.match(String(out.engine), /terra|gpt/i);
  assert.equal(out.meta.routedDeep, true);
});

await check("practical advice turn still qualifies for Terra", async () => {
  const t = SESSION_F33[12];
  const r = resolveFrontDoorClassification(t, createFrontDoorState());
  assert.equal(r.routeDeep, true);
  assert.match(r.deepRoutingReason || "", /practical|ordinary|deep_intent/);
});

await check("no phantom caregiving from moments / unrelated morning advice", async () => {
  const user = SESSION_F33[12];
  assert.equal(detectRelationalWeight(user).detected, false);
  const hint = groundedRelationalHint({
    turnLocal: detectRelationalWeight(user),
    priorHints: ["caring for a parent"],
  });
  assert.equal(hint, null);
  const priors = groundedPriorRelationalHints({
    turnLocal: detectRelationalWeight(user),
    priorHints: ["caring for a parent"],
  });
  assert.deepEqual(priors, []);
  // Loose fixture priors must not inject even if someone sets continuation without session evidence.
  assert.deepEqual(
    groundedPriorRelationalHints({
      turnLocal: detectRelationalWeight(user),
      priorHints: ["caring for a parent"],
      allowSessionContinuation: false,
    }),
    [],
  );
  const q = evaluateContributionQuality(
    "Give the first minutes one clear boundary, then one intention for the day.",
    { transcript: user, relationalHint: null },
  );
  assert.notEqual(q.meaningfulDetailGuess, "mother / caregiving");
});

await check("retrieved memory provenance can supply relational hint", async () => {
  const hint = groundedRelationalHint({
    turnLocal: detectRelationalWeight("How is the morning going?"),
    priorHints: [],
    retrievedMemory: { hint: "caring for a parent", provenance: "durable_memory:anchor_12" },
  });
  assert.equal(hint, "caring for a parent");
});

await check("Terra spoken-length soft trim keeps 1–2 sentences", async () => {
  const long =
    "Discipline is not the relationship itself; it is one way of protecting room for the relationship to remain real. The goal is not to earn God's nearness, but to keep turning toward Him with an available heart. Faithfulness in that small morning place quietly forms the rest of the day.";
  const trimmed = softTrimSpokenResponse(long);
  assert.equal(trimmed.trimmed, true);
  const m = measureSpokenLength(trimmed.text);
  assert.ok(m.sentenceCount <= SPOKEN_TARGET_MAX_SENTENCES);
  // Single long sentence under soft max is measured, not hard-cut.
  const singleLong =
    "What I'm noticing is that the morning Scripture and prayer were not only private discipline — they walked with you while you stayed beside her through that ordeal, and the peace you name sits next to the strength you hoped for her.";
  const single = softTrimSpokenResponse(singleLong);
  assert.equal(single.trimmed, false);
  assert.equal(single.text, singleLong);
  const plan = {
    recognition: "Brian named discipline and relationship.",
    relationalMeaning: "Morning devotion as relationship.",
    warrantedContribution: "Discipline protects room for relationship.",
    faithPosture: "explicit",
    questionNeeded: false,
    prohibitedMoves: [
      "generic praise",
      "paraphrase-only",
      "invented struggle",
      "schedule inventory",
      "unnecessary question",
    ],
    spokenResponse: long,
  };
  const validation = validateTerraContributionPlan(plan);
  assert.equal(validation.ok, true);
  const assembled = assembleTerraDeepResult({
    plan,
    validation,
    ctx: { transcript: SESSION_F33[7], intent: "casual" },
    model: "gpt-5.6-terra",
    timing: {},
  });
  assert.ok(assembled.spokenTrimmed);
  assert.ok(assembled.spokenLength.sentenceCount <= SPOKEN_TARGET_MAX_SENTENCES);
  assert.ok(!assembled.text.includes("Faithfulness in that small morning place"));
});

await check("playback publish is abortable (genuine cancel)", async () => {
  const ac = new AbortController();
  const pcm = Buffer.alloc(48000 * 2 * 2); // ~2s
  let cleared = false;
  const source = {
    async captureFrame() {
      await new Promise((r) => setTimeout(r, 2));
    },
    clearQueue() {
      cleared = true;
    },
  };
  const { completion } = startPcmPublishAsync(pcm, source, 48000, {
    signal: ac.signal,
    audioFrameFactory: async (chunk) => chunk,
  });
  setTimeout(() => ac.abort(), 12);
  const result = await completion;
  assert.equal(result.cancelled, true);
  assert.ok(result.framesPublished < 200);
  assert.equal(cleared, true);
});

await check("incomplete fragment detectors prefer false negatives on conjunctions", async () => {
  const st = createFrontDoorState();
  st.turnCount = 3;
  assert.equal(isIncompleteLeadInFragment("But my mother comes first."), false);
  assert.equal(isHighConfidenceIncompleteSpeech("And then I kept praying through it.", st), false);
  assert.equal(isIncompleteLeadInFragment("Oh, by the way, um..."), true);
});

await check("replay f33 classifications: T9 close, T7 shallow, T8/T13 deep", async () => {
  const st = createFrontDoorState();
  st.turnCount = 1;
  const results = [];
  for (const [i, transcript] of SESSION_F33.entries()) {
    st.turnCount = i;
    if (i >= 3) st.personalMeaningSeen = true;
    const r = resolveFrontDoorClassification(transcript, {
      ...st,
      pendingFragment: results[results.length - 1]?.pendingFragment || null,
    });
    results.push(r);
  }
  assert.equal(results[8].intent, INTENT.CLOSING);
  assert.equal(results[8].routeDeep, false);
  assert.equal(results[6].routeDeep, false);
  assert.equal(results[7].routeDeep, true);
  assert.equal(results[12].routeDeep, true);
  assert.ok(
    results[9].terraQualification?.reason === "incomplete_fragment" ||
      isIncompleteLeadInFragment(SESSION_F33[9]) ||
      isHighConfidenceIncompleteSpeech(SESSION_F33[9], { turnCount: 9 }),
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
