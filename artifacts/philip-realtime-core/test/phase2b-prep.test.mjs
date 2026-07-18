import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PHASE2B_LIMITS,
  PHASE2B_REALTIME_SESSION,
  PHILIP_REALTIME_QUALITY_INSTRUCTIONS,
} from "../phase2b/config.mjs";
import { startPhase2BServer } from "../phase2b/server.mjs";

test("pins the authorized conversational and transcription models", () => {
  assert.equal(PHASE2B_LIMITS.model, "gpt-realtime-2.1");
  assert.equal(PHASE2B_LIMITS.transcriptionModel, "gpt-4o-mini-transcribe");
  assert.equal(PHASE2B_LIMITS.maximumNewSessions, 3);
  assert.equal(PHASE2B_LIMITS.maximumDurationMs, 295_000);
  assert.equal(PHASE2B_LIMITS.absoluteCumulativeSpendUsd, 3);
  assert.deepEqual(PHASE2B_REALTIME_SESSION.output_modalities, ["audio"]);
  assert.equal(
    PHASE2B_REALTIME_SESSION.audio.input.transcription.model,
    "gpt-4o-mini-transcribe",
  );
  assert.equal(PHASE2B_REALTIME_SESSION.audio.input.transcription.language, "en");
  assert.equal(
    PHASE2B_REALTIME_SESSION.audio.input.turn_detection.type,
    "semantic_vad",
  );
  assert.equal(
    PHASE2B_REALTIME_SESSION.audio.input.turn_detection.interrupt_response,
    true,
  );
});

test("keeps the identity compact and covers binding conversational behavior", () => {
  assert.ok(PHILIP_REALTIME_QUALITY_INSTRUCTIONS.length < 7_500);
  for (const required of [
    "roughly 20 to 35 spoken words",
    "central meaning across multiple topics",
    "Caregiving is a relationship",
    "Never invent a body",
    "Never guess about current-changing facts",
    "If explicitly asked to pray",
    "On a natural closing",
    "When interrupted",
    "SHORT EXAMPLES",
    "Bad:",
  ]) {
    assert.match(PHILIP_REALTIME_QUALITY_INSTRUCTIONS, new RegExp(required, "i"));
  }
  assert.doesNotMatch(
    PHILIP_REALTIME_QUALITY_INSTRUCTIONS,
    /deterministic phrase library/i,
  );
});

test("browser observability captures async transcripts by item_id without audio recording", async () => {
  const source = await readFile(
    new URL("../phase2b/public/app.mjs", import.meta.url),
    "utf8",
  );
  for (const required of [
    "conversation.item.input_audio_transcription.completed",
    "conversation.item.input_audio_transcription.failed",
    "input_audio_buffer.committed",
    "turnByItemId",
    "transcriptCompletionFromSpeechEndMs",
    "speechEndToFirstAudibleMs",
    "interruptionToAudioStoppedMs",
    "realtimeEstimatedCostUsd",
    "transcriptionEstimatedCostUsd",
    "response.output_audio_transcript.delta",
  ]) {
    assert.match(source, new RegExp(required.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(source, /MediaRecorder|audio\/wav|createObjectURL/);
  assert.match(source, /direct_browser_provider_access_blocked/);
  assert.match(source, /session_creation_blocked_until_manual_begin/);
});

test("prep server rejects session creation before counting or provider access", async () => {
  const previous = process.env.ALLOW_PHASE2B_SESSION1;
  delete process.env.ALLOW_PHASE2B_SESSION1;
  const running = await startPhase2BServer();
  try {
    const before = await fetch(`${running.origin}/api/status`).then((res) => res.json());
    const response = await fetch(`${running.origin}/api/session`, {
      method: "POST",
      headers: { "content-type": "application/sdp" },
      body: "v=0\r\n",
    });
    assert.equal(response.status, 423);
    assert.deepEqual(await response.json(), {
      error: "phase2b_session1_not_armed",
      sessionCounted: false,
      providerCalled: false,
    });
    const after = await fetch(`${running.origin}/api/status`).then((res) => res.json());
    assert.equal(after.sessionsUsed, before.sessionsUsed);
    assert.equal(after.cumulativeEstimatedCostUsd, before.cumulativeEstimatedCostUsd);
  } finally {
    await running.close();
    if (previous == null) delete process.env.ALLOW_PHASE2B_SESSION1;
    else process.env.ALLOW_PHASE2B_SESSION1 = previous;
  }
});

test("exposes only sanitized configuration and status in prep mode", async () => {
  const running = await startPhase2BServer();
  try {
    const config = await fetch(`${running.origin}/api/config`).then((res) => res.json());
    const serialized = JSON.stringify(config);
    assert.match(serialized, /server-side bearer only/);
    assert.match(serialized, /gpt-realtime-2\.1/);
    assert.match(serialized, /gpt-4o-mini-transcribe/);
    assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{10,}/);
    assert.doesNotMatch(serialized, /Authorization/);
  } finally {
    await running.close();
  }
});
