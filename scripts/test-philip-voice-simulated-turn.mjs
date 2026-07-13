#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

// Skip the 600ms early-mic settle delay — the test awaits the real background
// frame-publish promise below, so it stays deterministic without the wall-clock wait.
process.env.PHILIP_VOICE_LAB_EARLY_MIC_SETTLE_MS = "0";

import {
  runPhilipLabTurn,
  createConversationState,
} from "../artifacts/api-server/src/philip-voice-lab/roomLoop.mjs";
import { SessionTimeline } from "../artifacts/api-server/src/philip-voice-lab/sessionTimeline.mjs";
import { checkFfmpegReady } from "../artifacts/api-server/src/philip-voice-lab/readiness.mjs";

function generateDeterministicMp3() {
  const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";
  return new Promise((resolve, reject) => {
    const chunks = [];
    let stderr = "";
    const proc = spawn(ffmpegBin, [
      "-hide_banner",
      "-loglevel", "error",
      "-f", "lavfi",
      "-i", "sine=frequency=440:sample_rate=48000:duration=0.12",
      "-ac", "1",
      "-codec:a", "libmp3lame",
      "-b:a", "64k",
      "-f", "mp3",
      "pipe:1",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    proc.stdout.on("data", (chunk) => chunks.push(chunk));
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
      else resolve(Buffer.concat(chunks));
    });
  });
}

const ffmpeg = await checkFfmpegReady();
assert.equal(ffmpeg.ok, true, ffmpeg.error || "ffmpeg readiness failed");

const mp3 = await generateDeterministicMp3();
assert.ok(mp3.length > 100, "fixture MP3 should contain audio bytes");

// Point media (transcribe/TTS) at :3001 and the candidate brain at :3101 so the
// test also verifies the isolated media/guidance split is wired correctly.
process.env.PHILIP_VOICE_LAB_MEDIA_API_BASE = "http://127.0.0.1:3001";
process.env.PHILIP_VOICE_LAB_GUIDANCE_API_BASE = "http://127.0.0.1:3101";

const CANDIDATE_REPLY =
  "That sounds like a lot to be carrying at once. I'm here — tell me what's weighing heaviest.";

const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  calls.push({ url, method: init.method || "GET" });
  if (url.endsWith("/api/guidance/transcribe")) {
    assert.ok(init.body instanceof FormData, "transcribe must receive multipart form data");
    assert.ok(url.startsWith("http://127.0.0.1:3001"), "transcribe must use the media base (:3001)");
    return Response.json({ text: "I feel overwhelmed and I do not know where to begin." });
  }
  if (url.endsWith("/api/internal/philip-voice/guidance/turn")) {
    assert.ok(
      url.startsWith("http://127.0.0.1:3101"),
      "candidate guidance must use the isolated lab base (:3101), never production",
    );
    const body = JSON.parse(String(init.body));
    assert.equal(typeof body.transcript, "string");
    return Response.json({
      text: CANDIDATE_REPLY,
      intent: "emotional",
      lane: "emotional",
      engine: "candidate-brain-test",
      reopened: false,
      personalMeaning: false,
      faithOffered: false,
      state: {
        turnCount: 1,
        lastIntent: "emotional",
        sentOff: false,
        history: [
          { role: "user", content: body.transcript },
          { role: "assistant", content: CANDIDATE_REPLY },
        ],
      },
      meta: { sentenceCount: 2, usedName: false, sentOff: false, turnCount: 1 },
    });
  }
  if (url.endsWith("/api/tts")) {
    assert.ok(url.startsWith("http://127.0.0.1:3001"), "TTS must use the media base (:3001)");
    return new Response(mp3, { headers: { "Content-Type": "audio/mpeg" } });
  }
  throw new Error(`Unexpected fetch in simulated turn: ${url}`);
};

let capturedFrames = 0;
const audioSource = {
  clearQueue() {},
  async captureFrame(frame) {
    assert.ok(frame, "captureFrame must receive an AudioFrame");
    capturedFrames += 1;
  },
};
const publishedData = [];
const room = {
  localParticipant: {
    async publishData(data) {
      publishedData.push(JSON.parse(new TextDecoder().decode(data)));
    },
  },
};
const timeline = new SessionTimeline({
  conversationId: "simulated-conversation",
  sessionId: "simulated-session",
  roomName: "simulated-room",
  source: "gate-1-test",
});

// Multi-turn runtime requires conversation state + a playback queue on the job.
// Turn 0 exercises the /api/guidance/phase1 opening path.
const conversationState = createConversationState("simulated-conversation");
const playbackQueue = { pending: Promise.resolve() };

try {
  const pcmUtterance = Buffer.alloc(48000 * 2 * 1);
  const result = await runPhilipLabTurn({
    roomName: "simulated-room",
    sessionId: "simulated-session",
    utterance: pcmUtterance,
    vadReason: "simulated_fixture",
    audioSource,
    timeline,
    room,
    conversationState,
    playbackQueue,
    audioFrameFactory: async (chunk) => ({ chunk }),
  });

  // Audio delivery is detached (background); await it so the frame-capture
  // assertion below reflects the full publish rather than a race.
  await playbackQueue.pending;

  assert.ok(result?.phase1Text.includes("weighing heaviest"));
  assert.ok(result.audioBytes > 100);
  assert.ok(capturedFrames > 0, "decoded PCM should publish at least one frame");
  assert.equal(conversationState.completedTurns, 1, "turn 0 should advance conversation state");
  assert.deepEqual(calls.map((call) => call.url.split("/api/")[1]), [
    "guidance/transcribe",
    "internal/philip-voice/guidance/turn",
    "tts",
  ]);
  assert.equal(timeline.turns.length, 1);
  assert.equal(timeline.turns[0].transcript, "I feel overwhelmed and I do not know where to begin.");
  assert.equal(timeline.turns[0].events.some((event) => event.event === "turn_complete"), true);
  assert.equal(publishedData.at(-1)?.type, "gate_b_timeline");

  console.log(JSON.stringify({
    ok: true,
    ffmpeg: ffmpeg.version,
    endpoints: calls.map((call) => call.url.split("/api/")[1]),
    mp3Bytes: mp3.length,
    capturedFrames,
    completedTurns: conversationState.completedTurns,
    turnMetrics: timeline.turns[0].metrics,
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
