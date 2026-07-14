#!/usr/bin/env node
/**
 * Isolated lab STT path + budget + production guard invariance.
 * Deterministic — no paid OpenAI calls.
 *
 * Run from api-server so package deps resolve:
 *   cd artifacts/api-server && node --import tsx/esm ../../scripts/test-philip-lab-stt.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../artifacts/api-server/package.json"),
);
const express = require("express");

import {
  checkLabSttAllowance,
  labSttLimitsFromEnv,
  recordLabSttUsage,
  resetLabSttBudgetForTests,
  snapshotLabSttUsage,
} from "../artifacts/api-server/src/philip-voice-lab/labSttBudget.mjs";
import {
  estimateAudioDurationMs,
  transcribeLabUtterance,
  validateLabAudioFile,
} from "../artifacts/api-server/src/philip-voice-lab/labTranscribe.mjs";
import { sttApiBase, mediaApiBase } from "../artifacts/api-server/src/philip-voice-lab/guidanceClient.mjs";
import {
  checkFeatureBudget,
  bindRateLimiter,
} from "../artifacts/api-server/src/costGuards.ts";
import { registerPhilipVoiceLabTranscribeRoutes } from "../artifacts/api-server/src/routes/philipVoiceLabTranscribe.ts";

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${label}\n      ${err.message}`);
  }
}

async function checkAsync(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${label}\n      ${err.message}`);
  }
}

console.log("Lab STT isolation + budgets");

resetLabSttBudgetForTests();

check("sttApiBase defaults to isolated :3101 (not production :3001)", () => {
  const prev = {
    stt: process.env.PHILIP_VOICE_LAB_STT_API_BASE,
    g: process.env.PHILIP_VOICE_LAB_GUIDANCE_API_BASE,
    a: process.env.PHILIP_VOICE_LAB_API_BASE,
    m: process.env.PHILIP_VOICE_LAB_MEDIA_API_BASE,
  };
  delete process.env.PHILIP_VOICE_LAB_STT_API_BASE;
  delete process.env.PHILIP_VOICE_LAB_GUIDANCE_API_BASE;
  delete process.env.PHILIP_VOICE_LAB_API_BASE;
  process.env.PHILIP_VOICE_LAB_MEDIA_API_BASE = "http://127.0.0.1:3001";
  assert.equal(sttApiBase(), "http://127.0.0.1:3101");
  assert.equal(mediaApiBase(), "http://127.0.0.1:3001");
  for (const [k, v] of Object.entries({
    PHILIP_VOICE_LAB_STT_API_BASE: prev.stt,
    PHILIP_VOICE_LAB_GUIDANCE_API_BASE: prev.g,
    PHILIP_VOICE_LAB_API_BASE: prev.a,
    PHILIP_VOICE_LAB_MEDIA_API_BASE: prev.m,
  })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

check("validate rejects missing audio", () => {
  const r = validateLabAudioFile(null);
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

check("validate rejects oversized buffer", () => {
  const limits = { ...labSttLimitsFromEnv(), maxFileBytes: 100 };
  const r = validateLabAudioFile({ buffer: Buffer.alloc(200), mimetype: "audio/wav" }, limits);
  assert.equal(r.ok, false);
  assert.equal(r.status, 413);
  assert.equal(r.code, "philip_voice_lab_stt_file_too_large");
});

check("validate rejects unsupported MIME", () => {
  const r = validateLabAudioFile({ buffer: Buffer.alloc(10), mimetype: "text/plain" });
  assert.equal(r.ok, false);
  assert.equal(r.status, 415);
});

check("utterance-too-long returns distinct 413 code", () => {
  const limits = { ...labSttLimitsFromEnv(), maxUtteranceMs: 1000 };
  const r = checkLabSttAllowance({ sessionId: "s1", utteranceMs: 5000, limits });
  assert.equal(r.ok, false);
  assert.equal(r.status, 413);
  assert.equal(r.code, "philip_voice_lab_stt_utterance_too_long");
});

check("lab budget exhaustion returns philip_voice_lab_stt_limit", () => {
  resetLabSttBudgetForTests();
  const limits = {
    ...labSttLimitsFromEnv(),
    maxRequestsPerSessionDay: 2,
    maxRequestsPerLabDay: 100,
    maxMinutesPerLabDay: 60,
    maxUtteranceMs: 60_000,
  };
  assert.equal(checkLabSttAllowance({ sessionId: "lab-a", utteranceMs: 100, limits }).ok, true);
  recordLabSttUsage({ sessionId: "lab-a", utteranceMs: 100 });
  recordLabSttUsage({ sessionId: "lab-a", utteranceMs: 100 });
  const blocked = checkLabSttAllowance({ sessionId: "lab-a", utteranceMs: 100, limits });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.code, "philip_voice_lab_stt_limit");
  assert.equal(blocked.usage.tag, "philip-voice-lab-stt");
});

check("lab usage is tagged separately", () => {
  resetLabSttBudgetForTests();
  recordLabSttUsage({ sessionId: "tag-session", utteranceMs: 2000 });
  const snap = snapshotLabSttUsage({ sessionId: "tag-session" });
  assert.equal(snap.tag, "philip-voice-lab-stt");
  assert.equal(snap.sessionRequestsToday, 1);
  assert.ok(snap.labMinutesToday > 0);
});

await checkAsync("transcribe helper records usage without network when mocked", async () => {
  resetLabSttBudgetForTests();
  const fakeClient = {
    audio: {
      transcriptions: {
        create: async () => ({ text: "hello from mock" }),
      },
    },
  };
  const result = await transcribeLabUtterance({
    file: { buffer: Buffer.alloc(48000), mimetype: "audio/wav", originalname: "u.wav" },
    sessionId: "mock-session",
    conversationId: "mock-convo",
    openaiClient: fakeClient,
  });
  assert.equal(result.ok, true);
  assert.equal(result.text, "hello from mock");
  assert.equal(result.tagged, "philip-voice-lab-stt");
  assert.equal(result.usage.tag, "philip-voice-lab-stt");
});

console.log("HTTP auth / kill-switch / production invariance");

const hits = new Map();
bindRateLimiter((key, max, windowMs) => {
  const now = Date.now();
  let arr = hits.get(key) || [];
  arr = arr.filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return true;
  }
  arr.push(now);
  hits.set(key, arr);
  return false;
});

check("production guidance-transcribe free budget still returns guidance-transcribe_limit", () => {
  const sid = "customer-sess-prod-test";
  for (let i = 0; i < 12; i++) {
    const g = checkFeatureBudget(sid, "guidance-transcribe", false);
    assert.equal(g.ok, true, `request ${i} should pass`);
  }
  const blocked = checkFeatureBudget(sid, "guidance-transcribe", false);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.code, "guidance-transcribe_limit");
});

process.env.PHILIP_VOICE_LAB_ENABLED = "true";
process.env.PHILIP_VOICE_LAB_SECRET = "test-lab-secret-abcdef";

const app = express();
registerPhilipVoiceLabTranscribeRoutes(app);
const server = createServer(app);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

await checkAsync("wrong lab secret → 401", async () => {
  const form = new FormData();
  form.append("audio", new Blob([Buffer.alloc(100)], { type: "audio/wav" }), "u.wav");
  form.append("sessionId", "s");
  const res = await fetch(`${base}/api/internal/philip-voice/transcribe`, {
    method: "POST",
    headers: { "X-Philip-Lab-Secret": "wrong" },
    body: form,
  });
  assert.equal(res.status, 401);
});

await checkAsync("missing lab secret → 401", async () => {
  const form = new FormData();
  form.append("audio", new Blob([Buffer.alloc(100)], { type: "audio/wav" }), "u.wav");
  const res = await fetch(`${base}/api/internal/philip-voice/transcribe`, {
    method: "POST",
    body: form,
  });
  assert.equal(res.status, 401);
});

await checkAsync("disabled lab → 404", async () => {
  process.env.PHILIP_VOICE_LAB_ENABLED = "false";
  const form = new FormData();
  form.append("audio", new Blob([Buffer.alloc(100)], { type: "audio/wav" }), "u.wav");
  const res = await fetch(`${base}/api/internal/philip-voice/transcribe`, {
    method: "POST",
    headers: { "X-Philip-Lab-Secret": "test-lab-secret-abcdef" },
    body: form,
  });
  assert.equal(res.status, 404);
  process.env.PHILIP_VOICE_LAB_ENABLED = "true";
});

await checkAsync("HTTP lab allowance exhaustion → distinct 429", async () => {
  resetLabSttBudgetForTests();
  process.env.PHILIP_VOICE_LAB_STT_MAX_REQUESTS_PER_SESSION_DAY = "1";
  recordLabSttUsage({ sessionId: "http-exhaust", utteranceMs: 100 });
  const form = new FormData();
  form.append("audio", new Blob([Buffer.alloc(4800)], { type: "audio/wav" }), "u.wav");
  form.append("sessionId", "http-exhaust");
  const res = await fetch(`${base}/api/internal/philip-voice/transcribe`, {
    method: "POST",
    headers: { "X-Philip-Lab-Secret": "test-lab-secret-abcdef" },
    body: form,
  });
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.equal(body.code, "philip_voice_lab_stt_limit");
  assert.equal(body.tagged, "philip-voice-lab-stt");
  delete process.env.PHILIP_VOICE_LAB_STT_MAX_REQUESTS_PER_SESSION_DAY;
});

await checkAsync("overlong audio rejected before OpenAI", async () => {
  resetLabSttBudgetForTests();
  process.env.PHILIP_VOICE_LAB_STT_MAX_UTTERANCE_MS = "50";
  const form = new FormData();
  form.append("audio", new Blob([Buffer.alloc(96000)], { type: "audio/wav" }), "u.wav");
  form.append("sessionId", "long-utt");
  const res = await fetch(`${base}/api/internal/philip-voice/transcribe`, {
    method: "POST",
    headers: { "X-Philip-Lab-Secret": "test-lab-secret-abcdef" },
    body: form,
  });
  assert.equal(res.status, 413);
  const body = await res.json();
  assert.equal(body.code, "philip_voice_lab_stt_utterance_too_long");
  delete process.env.PHILIP_VOICE_LAB_STT_MAX_UTTERANCE_MS;
});

check("estimateAudioDurationMs is positive for pcm blob", () => {
  assert.ok(estimateAudioDurationMs(Buffer.alloc(48000)) > 0);
});

await new Promise((resolve) => server.close(resolve));

console.log(`\nLab STT: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log(JSON.stringify({ ok: true, passed }, null, 2));
