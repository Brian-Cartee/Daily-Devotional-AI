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
  isLowSubstanceDeferral,
  detectConversationControl,
  resolveFrontDoorClassification,
  runFrontDoorTurn,
  INTENT,
} from "../artifacts/api-server/src/philip-voice-lab/frontDoor.mjs";
import { evaluateContributionQuality } from "../artifacts/api-server/src/philip-voice-lab/contributionContract.mjs";
import {
  groundedRelationalHint,
  groundedPriorRelationalHints,
  detectRelationalWeight,
  isRelationallyContinuousTurn,
  relationalAnchorProvenance,
} from "../artifacts/api-server/src/philip-voice-lab/relationalWeight.mjs";
import {
  measureSpokenLength,
  softTrimSpokenResponse,
  SPOKEN_TARGET_MAX_SENTENCES,
  SPOKEN_TARGET_MAX_MS,
  SPOKEN_TARGET_MAX_WORDS,
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

/** Genuine session philip-lab-mrjs2inh-va4-2b1b0306 (post-deploy phone). */
const SESSION_2B1B = [
  "Hello, Philip, how are you today?",
  "I've just been working out and watching a little bit of the World Cup and then spending time with my mom, along with working. I'm a little sore lately from my workouts because I've actually improved them to do some kettlebell workout.",
  "Absolutely, I agree. Definitely a new time, a new type of workout that I'm not used to performing, but it definitely has some huge benefits. But so far, so good.",
  "Yeah, yeah, I, uh, yeah, I...",
  "I was just saying, yes, I'm very familiar with, I've been working out my whole life, so I'm familiar with all of this and very adaptive to, just because I don't do it all the time doesn't mean that I don't kind of understand what all to look for.",
  "Absolutely.",
  "Um, nothing stands out at the moment.",
  "Oh, by the way.",
  "Do you know anything about...",
  "Um, are you going to watch the world cup, uh, championship match?",
  "Yes, that's right.",
  "OK, well, I'll be glad to do that later. For now, I've got to run, but can we connect later?",
  "Are you there?",
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

await check("closing negatives: deeper/over/walk/back/run-activity do not close", async () => {
  const negatives = [
    "I need to go deeper into that.",
    "I need to go over the plan.",
    "I need to go for a walk later.",
    "I have to go back to what I was saying.",
    "I'm going for a run later",
    "I need to run through the plan",
    "I have to run an errand",
    "I need to go deeper",
    "I need to go over something",
    "We can talk about the match later",
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

await check("by-the-way fragment hold creates without asking; extends without Terra", async () => {
  let state = createFrontDoorState();
  state.turnCount = 4;
  const deep = deepStub("SHOULD_NOT_TERRA");
  const t10 = await runFrontDoorTurn({
    transcript: "Oh, by the way, um...",
    state,
    deepGenerate: deep,
  });
  assert.equal(t10.lane, "fragment_hold");
  assert.equal(t10.engine, "front_door");
  assert.equal(t10.meta.fragmentLifecycle, "created");
  assert.equal(t10.meta.fragmentAskCount, 0);
  assert.ok(t10.state.pendingFragment);
  assert.equal(/\?/.test(t10.text), false);

  const t11 = await runFrontDoorTurn({
    transcript: "By the way...",
    state: t10.state,
    deepGenerate: deep,
  });
  assert.equal(t11.lane, "fragment_hold");
  assert.equal(t11.engine, "front_door");
  assert.equal(t11.meta.fragmentLifecycle, "extended");
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
  assert.equal(out.lane, "thin_acknowledgment");
  assert.equal(/\?/.test(out.text), false);
  assert.equal(/stands out|tell me more|hear more|how is that|what has that/i.test(out.text), false);
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
  const prov = relationalAnchorProvenance({
    turnLocal: detectRelationalWeight("How is the morning going?"),
    retrievedMemory: { hint: "caring for a parent", provenance: "durable_memory:anchor_12" },
  });
  assert.equal(prov.source, "retrieved_memory");
});

await check("mom anchor continuity requires relational connection", async () => {
  const prior = ["caring for a parent"];
  assert.equal(
    isRelationallyContinuousTurn("Um, are you going to watch the world cup championship match?", prior),
    false,
  );
  assert.equal(
    isRelationallyContinuousTurn("spending time with her has mattered a lot lately", prior),
    true,
  );
  assert.equal(isRelationallyContinuousTurn("Just the World Cup tonight.", []), false);
  const worldLocal = detectRelationalWeight("Just the World Cup tonight.");
  assert.equal(
    groundedRelationalHint({
      turnLocal: worldLocal,
      priorHints: prior,
      allowSessionContinuation: false,
    }),
    null,
  );
  assert.equal(
    relationalAnchorProvenance({
      turnLocal: worldLocal,
      priorHints: prior,
      allowSessionContinuation: false,
    }).source,
    "none",
  );
});

await check("Terra spoken-length soft trim keeps audible budget", async () => {
  const long =
    "Discipline is not the relationship itself; it is one way of protecting room for the relationship to remain real. The goal is not to earn God's nearness, but to keep turning toward Him with an available heart. Faithfulness in that small morning place quietly forms the rest of the day.";
  const trimmed = softTrimSpokenResponse(long);
  assert.equal(trimmed.trimmed, true);
  const m = measureSpokenLength(trimmed.text);
  assert.ok(m.sentenceCount <= SPOKEN_TARGET_MAX_SENTENCES);
  assert.ok(m.words <= SPOKEN_TARGET_MAX_WORDS);
  assert.ok(m.estimatedSpokenDurationMs <= SPOKEN_TARGET_MAX_MS);
  const kettle =
    "Kettlebells can make even familiar training feel new, since they ask your grip, core, and stabilizers to join the work. A little soreness can be part of adapting, but sharp or lingering joint pain is a cue to ease the load or check the movement.";
  const kettleTrim = softTrimSpokenResponse(kettle);
  assert.equal(kettleTrim.trimmed, true);
  assert.ok(kettleTrim.after.estimatedSpokenDurationMs <= SPOKEN_TARGET_MAX_MS);
  assert.ok(kettleTrim.after.words <= SPOKEN_TARGET_MAX_WORDS);
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
  assert.ok(assembled.spokenLength.words <= SPOKEN_TARGET_MAX_WORDS);
  assert.ok(assembled.spokenLength.trimApplied);
  assert.ok(assembled.spokenLength.before);
  assert.ok(assembled.spokenLength.after);
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

await check("replay 2b1b0306: T7–T13 routing, fragment coalesce, presence, closing", async () => {
  const deep = async (ctx) => {
    const text =
      ctx?.transcript && /world cup|championship/i.test(ctx.transcript)
        ? "I don't watch matches myself, but finals often turn on one small moment."
        : "A short warranted contribution.";
    return deepStub(text)();
  };
  let state = createFrontDoorState("Brian");
  const outs = [];
  for (const transcript of SESSION_2B1B) {
    const out = await runFrontDoorTurn({ transcript, state, deepGenerate: deep });
    outs.push(out);
    state = out.state;
  }

  // T2/T3/T5/T10 substantive → Terra
  assert.equal(outs[1].meta.routedDeep, true, "T2 deep");
  assert.equal(outs[2].meta.routedDeep, true, "T3 deep");
  assert.equal(outs[4].meta.routedDeep, true, "T5 deep");
  assert.equal(outs[9].meta.routedDeep, true, "T10 deep");

  // T7 low-substance rejection
  assert.equal(isLowSubstanceDeferral(SESSION_2B1B[6]), true);
  assert.equal(outs[6].meta.routedDeep, false, "T7 shallow");
  assert.equal(outs[6].meta.terraQualification?.terraRejectedReason, "low_substance_deferral");
  assert.equal(outs[6].engine, "front_door");

  // T8 fragment created, no ask
  assert.equal(outs[7].lane, "fragment_hold");
  assert.equal(outs[7].meta.fragmentLifecycle, "created");
  assert.equal(outs[7].meta.routedDeep, false);
  assert.equal(/\?/.test(outs[7].text), false);

  // T9 fragment extended, no Terra
  assert.equal(outs[8].lane, "fragment_hold");
  assert.equal(outs[8].meta.fragmentLifecycle, "extended");
  assert.equal(outs[8].meta.routedDeep, false);
  assert.equal(outs[8].engine, "front_door");

  // T10 completed once — only one Terra call for the World Cup completion path among T8–T10
  assert.equal(outs[9].meta.fragmentLifecycle, "completed");
  assert.match(String(outs[9].engine), /terra|gpt/i);
  const terraInFragWindow = [outs[7], outs[8], outs[9]].filter((o) => o.meta.routedDeep).length;
  assert.equal(terraInFragWindow, 1, "World Cup question routes once");

  // T11 thin ack, no interview prompt
  assert.equal(outs[10].engine, "front_door");
  assert.equal(outs[10].lane, "thin_acknowledgment");
  assert.equal(/\?/.test(outs[10].text), false);
  assert.equal(/stands out|tell me more|hear more|how is that/i.test(outs[10].text), false);

  // T12 closing precedence + sentOff
  assert.equal(outs[11].intent, INTENT.CLOSING);
  assert.equal(outs[11].engine, "front_door");
  assert.equal(outs[11].state.sentOff, true);
  assert.equal(outs[11].meta.routedDeep, false);
  assert.equal(/\?/.test(outs[11].text), false);

  // T13 presence check deterministic
  assert.equal(detectConversationControl(SESSION_2B1B[12])?.type, "presence_check");
  assert.equal(outs[12].lane, "conversation_control");
  assert.equal(outs[12].meta.conversationControl, true);
  assert.equal(outs[12].meta.conversationControlType, "presence_check");
  assert.equal(outs[12].meta.routedDeep, false);
  assert.equal(outs[12].engine, "front_door");
  assert.match(outs[12].text, /here/i);

  // Mom anchor not carried into World Cup-only T10
  assert.equal(outs[9].meta.relationalAnchorProvenance?.source, "none");
  assert.ok(!outs[9].meta.relationalAnchorsUsed?.some((h) => /mom|parent|caregiv/i.test(String(h))));

  // Mom was current-turn on T2
  assert.equal(outs[1].meta.relationalDetailDetected, true);
  assert.equal(outs[1].meta.relationalAnchorProvenance?.source, "current_turn");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
