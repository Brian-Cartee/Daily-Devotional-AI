/**
 * Actual runtime-path G-lite observability:
 * mocked model result -> Front Door/guidance -> roomLoop -> JSONL -> reread.
 * Zero paid calls.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

process.env.PHILIP_VOICE_LAB_ORCHESTRATION_GLITE = "true";
process.env.PHILIP_VOICE_LAB_EARLY_MIC_SETTLE_MS = "0";
process.env.PHILIP_VOICE_LAB_MEDIA_API_BASE = "http://127.0.0.1:3001";
process.env.PHILIP_VOICE_LAB_STT_API_BASE = "http://127.0.0.1:3101";
process.env.PHILIP_VOICE_LAB_SECRET = "runtime-observability-secret";
const logDir = await fs.mkdtemp(path.join(os.tmpdir(), "philip-glite-runtime-"));
process.env.PHILIP_VOICE_LAB_LOG_DIR = logDir;

const {
  runPhilipLabTurn,
  createConversationState,
} = await import("../artifacts/api-server/src/philip-voice-lab/roomLoop.mjs");
const {
  runCandidateGuidanceTurn,
  createFrontDoorState,
} = await import("../artifacts/api-server/src/philip-voice-lab/guidanceBrain.mjs");
const {
  LOCKED_40BC24A8_T2_TRANSCRIPT,
  buildInterruptionInput,
  GLITE_ORCHESTRATION_VERSION,
  ORDINARY_ENGINE_LABEL,
} = await import("../artifacts/api-server/src/philip-voice-lab/gliteOrchestration.mjs");
const {
  validateTurnUnderstanding,
} = await import("../artifacts/api-server/src/philip-voice-lab/turnUnderstandingSchema.mjs");
const {
  assembleGliteDeepResult,
} = await import("../artifacts/api-server/src/philip-voice-lab/ordinaryContributionEngine.mjs");
const {
  SessionTimeline,
} = await import("../artifacts/api-server/src/philip-voice-lab/sessionTimeline.mjs");

function generateMp3() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let stderr = "";
    const proc = spawn(process.env.FFMPEG_PATH || "ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:sample_rate=48000:duration=0.08",
      "-ac",
      "1",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "64k",
      "-f",
      "mp3",
      "pipe:1",
    ]);
    proc.stdout.on("data", (chunk) => chunks.push(chunk));
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr || `ffmpeg exited ${code}`));
      else resolve(Buffer.concat(chunks));
    });
  });
}

const mp3 = await generateMp3();
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  if (url.endsWith("/api/internal/philip-voice/transcribe")) {
    return Response.json({ text: LOCKED_40BC24A8_T2_TRANSCRIPT });
  }
  if (url.endsWith("/api/tts")) {
    return new Response(mp3, { headers: { "Content-Type": "audio/mpeg" } });
  }
  throw new Error(`Unexpected runtime observability fetch: ${url}`);
};

const plan = {
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
  provenance: { source: "fixture_mock_runtime_path" },
  spokenResponse:
    "Care for your mom and the app's purpose belong together here, with faith grounding the commitments and recreation preserving some margin.",
};

const validation = validateTurnUnderstanding(plan);
assert.equal(validation.ok, true, validation.errors?.join(","));

async function deepGenerate(ctx) {
  return assembleGliteDeepResult({
    plan: validation.plan,
    validation,
    ctx,
    model: "gpt-5.6-terra",
    timing: {
      modelRequestStartAt: 100,
      modelFirstTokenAt: 110,
      modelCompletionAt: 112,
      generationLatencyMs: 12,
    },
  });
}

const conversationId = "glite-runtime-observability";
const conversationState = createConversationState(conversationId, {
  firstName: "Brian",
});
conversationState.brainState = {
  ...createFrontDoorState("Brian"),
  interruptionInput: buildInterruptionInput({
    previousResponseInterrupted: true,
    previousResponseAbandoned: true,
    previousResponseTopic: "prior_response",
    estimatedAudioPublishedMs: 8000,
    estimatedAudioHeardMs: 1300,
  }),
};
const timeline = new SessionTimeline({
  conversationId,
  sessionId: "runtime-observability-session",
  roomName: conversationId,
  source: "runtime-observability-test",
});
const playbackQueue = { pending: Promise.resolve() };
const audioSource = {
  clearQueue() {},
  async captureFrame() {},
};
const room = {
  localParticipant: {
    async publishData() {},
  },
};

try {
  const result = await runPhilipLabTurn({
    roomName: conversationId,
    sessionId: "runtime-observability-session",
    utterance: Buffer.alloc(48000 * 2),
    vadReason: "runtime_observability_fixture",
    audioSource,
    timeline,
    room,
    conversationState,
    playbackQueue,
    audioFrameFactory: async (chunk) => ({ chunk }),
    isSessionActive: () => true,
    callGuidanceTurn: (opts) =>
      runCandidateGuidanceTurn({
        ...opts,
        deepGenerate,
      }),
  });
  await playbackQueue.pending;
  assert.equal(result?.discarded, undefined);

  const raw = await fs.readFile(
    path.join(logDir, `${conversationId}.turns.jsonl`),
    "utf8",
  );
  const record = JSON.parse(raw.trim());

  assert.equal(record.orchestrationVersion, GLITE_ORCHESTRATION_VERSION);
  assert.equal(record.orchestrationPath, "glite");
  assert.equal(record.understandingProducer, ORDINARY_ENGINE_LABEL);
  assert.equal(record.selectedEngine, "ordinary_structured");
  assert.equal(record.engineSelectionReason, "ordinary_contribution_criteria");
  assert.deepEqual(record.conversationalActs, plan.conversationalActs);
  assert.equal(record.primaryBurden, plan.primaryBurden);
  assert.equal(record.primaryMeaning, plan.primaryMeaning);
  assert.deepEqual(record.secondaryThreads, plan.secondaryThreads);
  assert.deepEqual(record.relationalEntities, plan.relationalEntities);
  assert.deepEqual(record.commitments, plan.commitments);
  assert.deepEqual(record.restorativeElements, plan.restorativeElements);
  assert.equal(record.faithRole, plan.faithRole);
  assert.equal(record.emotionalWeight, plan.emotionalWeight);
  assert.equal(record.responseWorthiness, plan.responseWorthiness);
  assert.equal(record.recommendedResponseAct, plan.recommendedResponseAct);
  assert.equal(record.questionNeeded, false);
  assert.equal(record.spokenDepth, "ordinary");
  assert.equal(record.factualFreshnessRequired, false);
  assert.equal(record.interruptionInput.previousResponseInterrupted, true);
  assert.equal(record.interruptionInput.previousResponseAbandoned, true);
  assert.equal(record.interruptionInput.estimatedAudioPublishedMs, 8000);
  assert.equal(record.interruptionInput.estimatedAudioHeardMs, 1300);
  assert.ok(record.interruptionInput.likelyHeardRatio > 0);
  assert.equal(record.spokenBudget.minWords, 18);
  assert.equal(record.spokenBudget.maxWords, 30);
  assert.ok(record.spokenLength.finalWords >= 18);
  assert.equal(record.schemaValid, true);
  assert.equal(record.privatePlanLogged, false);
  assert.ok(!("secretReasoning" in record));
  assert.ok(!JSON.stringify(record).includes("chain-of-thought"));
  assert.ok(!JSON.stringify(record).includes("TURN UNDERSTANDING + SPOKEN CONTRIBUTION"));

  console.log(
    JSON.stringify(
      {
        ok: true,
        path:
          "mocked model -> guidance -> front door -> room loop -> serializer -> JSONL",
        assertedFields: [
          "orchestrationVersion",
          "orchestrationPath",
          "understandingProducer",
          "selectedEngine",
          "engineSelectionReason",
          "conversationalActs",
          "primaryBurden",
          "primaryMeaning",
          "secondaryThreads",
          "relationalEntities.provenance",
          "commitments",
          "restorativeElements",
          "faithRole",
          "emotionalWeight",
          "responseWorthiness",
          "recommendedResponseAct",
          "questionNeeded",
          "spokenDepth",
          "factualFreshnessRequired",
          "interruptionInput",
          "spokenBudget",
          "spokenLength",
          "schemaValid",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  globalThis.fetch = originalFetch;
}
