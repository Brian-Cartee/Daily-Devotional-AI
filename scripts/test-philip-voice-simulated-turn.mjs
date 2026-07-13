#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

import { runPhilipLabTurn } from "../artifacts/api-server/src/philip-voice-lab/roomLoop.mjs";
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

const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  calls.push({ url, method: init.method || "GET" });
  if (url.endsWith("/api/guidance/transcribe")) {
    assert.ok(init.body instanceof FormData, "transcribe must receive multipart form data");
    return Response.json({ text: "I feel overwhelmed and I do not know where to begin." });
  }
  if (url.endsWith("/api/guidance/phase1")) {
    const body = JSON.parse(String(init.body));
    assert.equal(body.companionMode, "philip");
    return new Response("That sounds like more than one heart should have to sort through at once. What feels heaviest right now?", {
      headers: { "Content-Type": "text/plain" },
    });
  }
  if (url.endsWith("/api/tts")) {
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
    audioFrameFactory: async (chunk) => ({ chunk }),
  });

  assert.ok(result?.phase1Text.includes("feels heaviest"));
  assert.ok(result.audioBytes > 100);
  assert.ok(capturedFrames > 0, "decoded PCM should publish at least one frame");
  assert.deepEqual(calls.map((call) => call.url.split("/api/")[1]), [
    "guidance/transcribe",
    "guidance/phase1",
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
    turnMetrics: timeline.turns[0].metrics,
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
