/**
 * Turn-specific deterministic/model-mocked replay of genuine session 40bc24a8.
 * Zero paid calls. Each semantic turn has unique understanding and speech.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.PHILIP_VOICE_LAB_ORCHESTRATION_GLITE = "true";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const lab = path.join(root, "artifacts/api-server/src/philip-voice-lab");

const { createFrontDoorState, runFrontDoorTurn, INTENT } = await import(
  path.join(lab, "frontDoor.mjs")
);
const {
  LOCKED_40BC24A8_T2_TRANSCRIPT,
  buildInterruptionInput,
  ORDINARY_ENGINE_LABEL,
} = await import(path.join(lab, "gliteOrchestration.mjs"));
const { validateTurnUnderstanding } = await import(
  path.join(lab, "turnUnderstandingSchema.mjs")
);
const { assembleGliteDeepResult } = await import(
  path.join(lab, "ordinaryContributionEngine.mjs")
);
const { measureSpokenLength } = await import(path.join(lab, "spokenLength.mjs"));

const TURNS = [
  {
    id: "T1",
    transcript: "for you today.",
    expected: "opening_repair",
  },
  {
    id: "T2",
    transcript: LOCKED_40BC24A8_T2_TRANSCRIPT,
    expected: "semantic",
  },
  {
    id: "T3",
    transcript: "So, that's a long thing.",
    expected: "interruption_followup",
  },
  {
    id: "T4",
    transcript:
      "Well, thank you… dedication to prayer and reflection… giving God what he wants… makes the rest of your life have more meaning…",
    expected: "semantic",
  },
  {
    id: "T5",
    transcript:
      "…looking forward to World Cup Championship on Sunday. Today is Friday. …daily… today's word on social… getting ready to start working.",
    expected: "semantic",
  },
  {
    id: "T6",
    transcript: "Absolutely… I got to run. Is it OK if we connect later?",
    expected: "closing",
  },
  {
    id: "T7",
    transcript:
      "Yeah, the match isn't till Sunday, but yes, I will probably speak to you definitely before then.",
    expected: "post_closing_continuity_correction",
  },
  {
    id: "T8",
    transcript: "All right, thank you very much. You have a great day.",
    expected: "closing",
  },
];

const UNDERSTANDINGS = new Map([
  [
    LOCKED_40BC24A8_T2_TRANSCRIPT,
    {
      conversationalActs: [
        "disclose_life_load",
        "name_caregiving",
        "mention_faith_practice",
      ],
      primaryBurden: "carrying several meaningful commitments at once",
      primaryMeaning:
        "relational responsibility and purpose pressure, with faith providing grounding",
      secondaryThreads: ["world_cup", "gym"],
      relationalEntities: [
        { label: "mother", role: "caregiving", provenance: "user_stated" },
      ],
      commitments: [
        "work",
        "making the app useful to people",
        "caregiving",
        "spiritual practice",
      ],
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
      provenance: { source: "fixture_mock_40bc_t2" },
      spokenResponse:
        "Care for your mom and the pressure to make the app matter sit under one full plate, with faith grounding the commitments and recreation restoring margin.",
    },
  ],
  [
    TURNS[3].transcript,
    {
      conversationalActs: ["reflect_on_prayer", "connect_faith_to_daily_meaning"],
      primaryBurden: "ordering ordinary life around prayer and relationship with God",
      primaryMeaning:
        "faith practice is being described as shaping the meaning and order of daily life",
      secondaryThreads: ["daily_life_meaning"],
      relationalEntities: [
        { label: "God", role: "faith relationship", provenance: "user_stated" },
      ],
      commitments: ["prayer", "reflection", "relationship with God"],
      restorativeElements: [],
      faithRole: "grounding_alongside_life",
      emotionalWeight: "medium",
      practicalRequest: "",
      factualFreshnessRequired: false,
      responseWorthiness: "contribute",
      recommendedResponseAct: "distinguish relationship from religious task",
      recommendedEngine: "ordinary_structured",
      questionNeeded: false,
      spokenDepth: "ordinary",
      confidence: 0.8,
      provenance: { source: "fixture_mock_40bc_t4" },
      spokenResponse:
        "Prayer sounds less like another duty here and more like the relationship that gives the rest of your life its order.",
    },
  ],
  [
    TURNS[4].transcript,
    {
      conversationalActs: [
        "describe_daily_faith_practice",
        "transition_to_work",
        "anticipate_recreation",
      ],
      primaryBurden: "moving from the daily Word post into the workday",
      primaryMeaning:
        "the daily faith practice frames purposeful work while Sunday's match remains a concrete point of rest ahead",
      secondaryThreads: ["social_post", "work", "world_cup"],
      relationalEntities: [],
      commitments: ["daily Word post", "work"],
      restorativeElements: ["Sunday World Cup championship"],
      faithRole: "grounding_alongside_life",
      emotionalWeight: "light",
      practicalRequest: "",
      factualFreshnessRequired: false,
      responseWorthiness: "contribute",
      recommendedResponseAct: "name the distinction between purpose and rest",
      recommendedEngine: "ordinary_structured",
      questionNeeded: false,
      spokenDepth: "ordinary",
      confidence: 0.78,
      provenance: { source: "fixture_mock_40bc_t5" },
      spokenResponse:
        "The daily post gives the workday a clear purpose, while Sunday's match remains a concrete margin of rest to anticipate.",
    },
  ],
]);

let semanticCalls = 0;
let rareDepthCalls = 0;
const calledTranscripts = [];

async function turnSpecificDeepGenerate(ctx) {
  const transcript = String(ctx.rawTranscript || ctx.transcript);
  const rawPlan = UNDERSTANDINGS.get(transcript);
  assert.ok(rawPlan, `unexpected semantic call for transcript: ${transcript}`);
  assert.ok(
    !calledTranscripts.includes(transcript),
    `semantic result reused for transcript: ${transcript}`,
  );
  calledTranscripts.push(transcript);
  semanticCalls += 1;
  if (ctx.engineSelection?.engine === "rare_depth" || ctx.spokenBudget?.weighty) {
    rareDepthCalls += 1;
  }
  const validation = validateTurnUnderstanding(rawPlan);
  assert.equal(validation.ok, true, validation.errors?.join(","));
  return assembleGliteDeepResult({
    plan: validation.plan,
    validation,
    ctx,
    model: "gpt-5.6-terra",
    timing: { generationLatencyMs: 12 },
  });
}

let state = createFrontDoorState("Brian");
const outputs = [];

for (let index = 0; index < TURNS.length; index += 1) {
  const fixture = TURNS[index];
  const output = await runFrontDoorTurn({
    transcript: fixture.transcript,
    state,
    deepGenerate: turnSpecificDeepGenerate,
    interruptionInput:
      fixture.id === "T3"
        ? buildInterruptionInput({
            previousResponseInterrupted: true,
            previousResponseAbandoned: true,
            previousResponseTopic: "full_plate_response",
            estimatedAudioPublishedMs: 8000,
            estimatedAudioHeardMs: 1300,
          })
        : undefined,
  });
  state = output.state;
  outputs.push({ fixture, output, length: measureSpokenLength(output.text) });
}

const byId = Object.fromEntries(outputs.map((item) => [item.fixture.id, item]));

// T1: conservative truncated-opening repair.
assert.equal(byId.T1.output.lane, "opening_repair");
assert.equal(byId.T1.output.meta.routedDeep ?? false, false);
assert.match(byId.T1.output.text, /missed|catch|say/i);
assert.doesNotMatch(byId.T1.output.text, /on your mind|weighing|meaning/i);

// T2: integrated meaning on first semantic call.
assert.equal(byId.T2.output.meta.requiresTurnUnderstanding, true);
assert.equal(byId.T2.output.meta.selectedEngine, "ordinary_structured");
assert.equal(byId.T2.output.meta.faithRole, "grounding_alongside_life");
assert.equal(byId.T2.output.meta.questionNeeded, false);
assert.equal(byId.T2.output.meta.spokenDepth, "ordinary");
assert.notEqual(byId.T2.output.lane, "descriptive_faith");
assert.doesNotMatch(byId.T2.output.text, /morning anchors|no small discipline/i);
assert.ok(byId.T2.length.words >= 18 && byId.T2.length.words <= 30);

// T3: interruption-aware, deterministic, no abandoned-content replay.
assert.equal(byId.T3.output.lane, "interruption_followup");
assert.equal(byId.T3.output.meta.routedDeep, false);
assert.match(byId.T3.output.text, /leave that response behind/i);
assert.doesNotMatch(byId.T3.output.text, /mom|app|Word|World Cup/i);

// T4: substantive faith reflection must be semantic, ordinary-depth, non-sermon.
assert.equal(byId.T4.output.meta.requiresTurnUnderstanding, true);
assert.equal(byId.T4.output.meta.selectedEngine, "ordinary_structured");
assert.notEqual(byId.T4.output.lane, "descriptive_faith");
assert.equal(byId.T4.output.meta.primaryBurden, UNDERSTANDINGS.get(TURNS[3].transcript).primaryBurden);
assert.doesNotMatch(byId.T4.output.text, /the Lord says|let us pray|sermon/i);
assert.equal(byId.T4.output.meta.questionNeeded, false);

// T5: independently understood; no T2 semantic/output reuse.
assert.equal(byId.T5.output.meta.requiresTurnUnderstanding, true);
assert.equal(byId.T5.output.meta.primaryBurden, UNDERSTANDINGS.get(TURNS[4].transcript).primaryBurden);
assert.notEqual(byId.T5.output.meta.primaryBurden, byId.T2.output.meta.primaryBurden);
assert.notEqual(byId.T5.output.text, byId.T2.output.text);
assert.doesNotMatch(byId.T5.output.text, /mom|full plate|caregiving/i);
assert.equal(byId.T5.output.meta.questionNeeded, false);

// T6: deterministic closing and sentOff latch.
assert.equal(byId.T6.output.intent, INTENT.CLOSING);
assert.equal(byId.T6.output.engine, "front_door");
assert.equal(byId.T6.output.state.sentOff, true);

// T7: deterministic timing correction/re-entry, no Terra.
assert.equal(byId.T7.output.lane, "post_closing_continuity_correction");
assert.equal(byId.T7.output.engine, "front_door");
assert.equal(byId.T7.output.meta.routedDeep, false);
assert.match(byId.T7.output.text, /got ahead of the timing/i);
assert.doesNotMatch(byId.T7.output.text, /mom|app|full plate/i);

// T8: deterministic final closing. Disconnect suppression is tested separately.
assert.equal(byId.T8.output.intent, INTENT.CLOSING);
assert.equal(byId.T8.output.engine, "front_door");
assert.equal(byId.T8.output.state.sentOff, true);

const descriptiveFaithCaptures = outputs.filter(
  ({ output }) =>
    output.lane === "descriptive_faith" ||
    /morning anchors|no small discipline/i.test(output.text),
).length;
const shallowMeaningTemplates = outputs.filter(({ output }) =>
  ["descriptive_faith", "casual_meaning", "ordinary_template"].includes(output.lane),
).length;
const deterministicTurns = outputs.filter(
  ({ output }) => output.engine === "front_door",
).length;
const questionTurns = outputs.filter(({ output }) => /\?/.test(output.text)).length;
const unsupportedFactualClaims = outputs.filter(({ output }) =>
  /\b(france|argentina|spain (will|won)|live bracket says)\b/i.test(output.text),
).length;
const totalWords = outputs.reduce((sum, item) => sum + item.length.words, 0);
const estimatedAudibleMs = outputs.reduce(
  (sum, item) => sum + item.length.estimatedAudibleMs,
  0,
);
const projectedMedianGenerationMs = semanticCalls * 2558;
const projectedP90GenerationMs = semanticCalls * 3284;

assert.equal(descriptiveFaithCaptures, 0);
assert.equal(shallowMeaningTemplates, 0);
assert.equal(deterministicTurns, 5);
assert.equal(semanticCalls, 3);
assert.equal(rareDepthCalls, 0);
assert.equal(calledTranscripts.length, 3);
assert.equal(new Set(calledTranscripts).size, 3);
assert.deepEqual(calledTranscripts, [
  LOCKED_40BC24A8_T2_TRANSCRIPT,
  TURNS[3].transcript,
  TURNS[4].transcript,
]);
assert.equal(unsupportedFactualClaims, 0);
assert.equal(questionTurns, 1, "only the warranted T1 repair may ask a question");
assert.equal(projectedMedianGenerationMs, 7674);
assert.equal(projectedP90GenerationMs, 9852);

console.log(
  JSON.stringify(
    {
      ok: true,
      phase1Scope: "semantic_judgment_only",
      physicalModel: "gpt-5.6-terra",
      depthContractLabels: {
        ordinary: ORDINARY_ENGINE_LABEL,
        rare: "philip-semantic-terra-rare-depth-v1",
      },
      counts: {
        deterministicTurns,
        semanticStructuredCalls: semanticCalls,
        physicalTerraCalls: semanticCalls,
        rareDepthCalls,
        shallowMeaningTemplates,
        descriptiveFaithCaptures,
        unsupportedFactualClaims,
        questionTurns,
        totalWords,
        estimatedAudibleMs,
        projectedMedianGenerationMs,
        projectedP90GenerationMs,
      },
      turns: outputs.map(({ fixture, output, length }) => ({
        id: fixture.id,
        path: output.meta.responseMode || output.lane,
        lane: output.lane,
        engine: output.engine,
        selectedEngine: output.meta.selectedEngine ?? null,
        words: length.words,
        estimatedAudibleMs: length.estimatedAudibleMs,
        text: output.text,
      })),
    },
    null,
    2,
  ),
);
