#!/usr/bin/env node
/**
 * Context-aware VAD short-answer gate — deterministic, no network.
 *
 * Threshold reasoning (also in vadConfigFromEnv):
 *  - Default minSpeechMs=380 protects against clicks / room noise
 *  - shortAnswerMinSpeechMs=100 allows conversational yes/no after a pending offer
 *  - Energy threshold still applies; sub-energy frames never enter speech
 */
import assert from "node:assert/strict";
import { UtteranceCollector, vadConfigFromEnv } from "../artifacts/api-server/src/philip-voice-lab/audioUtil.mjs";
import { awaitingConstrainedShortAnswer, createFrontDoorState } from "../artifacts/api-server/src/philip-voice-lab/frontDoor.mjs";

const cfg = vadConfigFromEnv();
assert.equal(cfg.minSpeechMs, 380);
assert.equal(cfg.shortAnswerMinSpeechMs, 100);

function toneFrame(sampleRate, durationMs, amplitude = 8000) {
  const n = Math.floor((sampleRate * durationMs) / 1000);
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    samples[i] = (i % 2 === 0 ? 1 : -1) * amplitude;
  }
  return samples;
}

function silenceFrame(sampleRate, durationMs) {
  return new Int16Array(Math.floor((sampleRate * durationMs) / 1000));
}

function makeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => {
      t += ms;
    },
  };
}

function pushUntilResult(collector, sampleRate, speechMs, clock) {
  const frameMs = 20;
  let result = null;
  const frames = Math.max(1, Math.ceil(speechMs / frameMs));
  for (let i = 0; i < frames; i++) {
    clock.advance(frameMs);
    result = collector.push(toneFrame(sampleRate, frameMs));
    if (result) return result;
  }
  const silenceNeeded = (collector.silenceMs || 200) + 40;
  const silenceFrames = Math.ceil(silenceNeeded / frameMs);
  for (let i = 0; i < silenceFrames; i++) {
    clock.advance(frameMs);
    result = collector.push(silenceFrame(sampleRate, frameMs));
    if (result) return result;
  }
  return result;
}

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

const sampleRate = cfg.sampleRate || 48000;

check("awaitingConstrainedShortAnswer follows pendingPrayerOffer", () => {
  const s = createFrontDoorState();
  assert.equal(awaitingConstrainedShortAnswer(s), false);
  s.pendingPrayerOffer = true;
  assert.equal(awaitingConstrainedShortAnswer(s), true);
});

check("ordinary state rejects ~180ms speech as too short", () => {
  const clock = makeClock();
  const c = new UtteranceCollector({ ...cfg, silenceMs: 200, nowFn: () => clock.now() });
  c.setAwaitingShortAnswer(false);
  const r = pushUntilResult(c, sampleRate, 180, clock);
  assert.ok(r, "expected a VAD result");
  assert.equal(r.vadReason, "vad_speech_too_short");
  assert.equal(r.utterance, null);
  assert.equal(r.shortAnswerGate, false);
});

check("pending short-answer gate accepts ~180ms speech", () => {
  const clock = makeClock();
  const c = new UtteranceCollector({ ...cfg, silenceMs: 200, nowFn: () => clock.now() });
  c.setAwaitingShortAnswer(true);
  const r = pushUntilResult(c, sampleRate, 180, clock);
  assert.ok(r, "expected a VAD result");
  assert.equal(r.vadReason, "vad_silence");
  assert.ok(r.utterance && r.utterance.length > 0);
  assert.equal(r.shortAnswerGate, true);
});

check("pending short-answer gate still rejects ~40ms click/noise", () => {
  const clock = makeClock();
  const c = new UtteranceCollector({ ...cfg, silenceMs: 200, nowFn: () => clock.now() });
  c.setAwaitingShortAnswer(true);
  const r = pushUntilResult(c, sampleRate, 40, clock);
  assert.ok(r, "expected a VAD result");
  assert.equal(r.vadReason, "vad_speech_too_short");
  assert.equal(r.utterance, null);
});

check("normal ~500ms utterance accepted without short-answer gate", () => {
  const clock = makeClock();
  const c = new UtteranceCollector({ ...cfg, silenceMs: 200, nowFn: () => clock.now() });
  c.setAwaitingShortAnswer(false);
  const r = pushUntilResult(c, sampleRate, 500, clock);
  assert.ok(r);
  assert.equal(r.vadReason, "vad_silence");
  assert.ok(r.utterance && r.utterance.length > 0);
  assert.equal(r.shortAnswerGate, false);
});

console.log(`\nVAD short-answer: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log(JSON.stringify({ ok: true, passed }, null, 2));
