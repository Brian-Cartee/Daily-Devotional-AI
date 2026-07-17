/**
 * Isolated Philip Voice Lab lifecycle: disconnect before TTS or publish must
 * suppress obsolete audio and persist a truthful discarded outcome.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

process.env.PHILIP_VOICE_LAB_EARLY_MIC_SETTLE_MS = "0";
process.env.PHILIP_VOICE_LAB_MEDIA_API_BASE = "http://127.0.0.1:3001";
process.env.PHILIP_VOICE_LAB_STT_API_BASE = "http://127.0.0.1:3101";
process.env.PHILIP_VOICE_LAB_SECRET = "disconnect-test-secret";
const logDir = await fs.mkdtemp(path.join(os.tmpdir(), "philip-disconnect-"));
process.env.PHILIP_VOICE_LAB_LOG_DIR = logDir;

const {
  runPhilipLabTurn,
  createConversationState,
  isTurnSessionActive,
} = await import("../artifacts/api-server/src/philip-voice-lab/roomLoop.mjs");
const {
  SessionTimeline,
} = await import("../artifacts/api-server/src/philip-voice-lab/sessionTimeline.mjs");

const originalFetch = globalThis.fetch;
let ttsCalls = 0;
let deactivateDuringTts = null;
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.endsWith("/api/internal/philip-voice/transcribe")) {
    return Response.json({ text: "All right, thank you very much. You have a great day." });
  }
  if (url.endsWith("/api/tts")) {
    ttsCalls += 1;
    deactivateDuringTts?.();
    return new Response(Buffer.from("obsolete-audio"));
  }
  throw new Error(`Unexpected disconnect test fetch: ${url}`);
};

function brainResult(transcript) {
  return {
    text: "Take care. I'll be here when you want to pick this up again.",
    intent: "closing",
    lane: "closing",
    engine: "front_door",
    reopened: false,
    personalMeaning: false,
    faithOffered: false,
    state: {
      turnCount: 1,
      lastIntent: "closing",
      sentOff: true,
      history: [
        { role: "user", content: transcript },
        {
          role: "assistant",
          content: "Take care. I'll be here when you want to pick this up again.",
        },
      ],
    },
    meta: {
      orchestrationPath: "glite",
      spokenTurnTier: 1,
      spokenTurnTierReason: "closing_or_farewell",
    },
  };
}

async function runCase({ conversationId, deactivateAfterGuidance, deactivateInTts }) {
  let active = true;
  let capturedFrames = 0;
  deactivateDuringTts = deactivateInTts ? () => {
    active = false;
  } : null;

  const conversationState = createConversationState(conversationId);
  const timeline = new SessionTimeline({
    conversationId,
    sessionId: `${conversationId}-session`,
    roomName: conversationId,
    source: "disconnect-lifecycle-test",
  });
  const result = await runPhilipLabTurn({
    roomName: conversationId,
    sessionId: `${conversationId}-session`,
    utterance: Buffer.alloc(48000 * 2),
    vadReason: "disconnect_fixture",
    audioSource: {
      clearQueue() {},
      async captureFrame() {
        capturedFrames += 1;
      },
    },
    timeline,
    room: {
      localParticipant: {
        async publishData() {},
      },
    },
    conversationState,
    playbackQueue: { pending: Promise.resolve() },
    audioFrameFactory: async (chunk) => ({ chunk }),
    isSessionActive: () => active,
    callGuidanceTurn: async ({ transcript }) => {
      const brain = brainResult(transcript);
      if (deactivateAfterGuidance) active = false;
      return brain;
    },
  });

  const raw = await fs.readFile(
    path.join(logDir, `${conversationId}.turns.jsonl`),
    "utf8",
  );
  return {
    result,
    record: JSON.parse(raw.trim()),
    capturedFrames,
    active,
  };
}

try {
  assert.equal(isTurnSessionActive({ isSessionActive: () => false }), false);
  assert.equal(isTurnSessionActive({ isSessionActive: () => true }), true);

  const beforeTts = await runCase({
    conversationId: "disconnect-before-tts",
    deactivateAfterGuidance: true,
    deactivateInTts: false,
  });
  assert.equal(beforeTts.result.discarded, true);
  assert.equal(beforeTts.result.discardReason, "session_inactive_before_tts");
  assert.equal(beforeTts.record.turnOutcome, "turn_discarded");
  assert.equal(beforeTts.record.ttsStarted, false);
  assert.equal(beforeTts.record.audioPublished, false);
  assert.equal(beforeTts.record.discardReason, "session_inactive_before_tts");
  assert.equal(beforeTts.capturedFrames, 0);
  assert.equal(ttsCalls, 0, "disconnect before TTS must not call TTS");

  const beforePublish = await runCase({
    conversationId: "disconnect-before-publish",
    deactivateAfterGuidance: false,
    deactivateInTts: true,
  });
  assert.equal(beforePublish.result.discarded, true);
  assert.equal(
    beforePublish.result.discardReason,
    "session_inactive_before_playback_publish",
  );
  assert.equal(beforePublish.record.turnOutcome, "turn_discarded");
  assert.equal(beforePublish.record.ttsStarted, true);
  assert.equal(beforePublish.record.audioPublished, false);
  assert.equal(
    beforePublish.record.discardReason,
    "session_inactive_before_playback_publish",
  );
  assert.equal(beforePublish.capturedFrames, 0);
  assert.equal(ttsCalls, 1);

  console.log(
    JSON.stringify(
      {
        ok: true,
        beforeTts: {
          ttsCalls: 0,
          audioPublished: false,
          outcome: beforeTts.record.turnOutcome,
          discardReason: beforeTts.record.discardReason,
        },
        beforePublish: {
          ttsCalls: 1,
          audioPublished: false,
          outcome: beforePublish.record.turnOutcome,
          discardReason: beforePublish.record.discardReason,
        },
      },
      null,
      2,
    ),
  );
} finally {
  globalThis.fetch = originalFetch;
}
