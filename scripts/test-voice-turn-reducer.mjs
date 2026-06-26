#!/usr/bin/env node
/**
 * Unit checks for voice turn reducer + invariants (reliability rebuild).
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-voice-turn-reducer.mjs
 */
import {
  voiceTurnReducer,
  checkVoiceTurnInvariants,
  canRetryCapture,
  maxCaptureRetries,
  resolveVoiceOrbMode,
} from "../artifacts/shepherds-path/src/lib/voiceTurn/reducer.ts";
import { INITIAL_VOICE_TURN_STATE } from "../artifacts/shepherds-path/src/lib/voiceTurn/types.ts";

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

console.log("Voice turn reducer — happy path entry capture");

let s = { ...INITIAL_VOICE_TURN_STATE };
s = voiceTurnReducer(s, { type: "CONVO", phase: "entry" });
s = voiceTurnReducer(s, { type: "RELEASE_BEGIN" });
s = voiceTurnReducer(s, { type: "RELEASE_END" });
s = voiceTurnReducer(s, { type: "MIC_ARM", slot: "entry" });
assert("arming mic", s.audioMode === "arming_mic" && s.micArming);
s = voiceTurnReducer(s, { type: "MIC_LIVE", slot: "entry" });
assert("capturing", s.audioMode === "capturing" && s.micLive && !s.micArming);
s = voiceTurnReducer(s, { type: "RECORDER_READY" });
assert("recorder ready", s.recorderReady);
s = voiceTurnReducer(s, { type: "CAPTURE_FINALIZE_BEGIN" });
assert("finalizing", s.audioMode === "finalizing" && !s.micLive);
s = voiceTurnReducer(s, { type: "CAPTURE_FINALIZE_END" });
assert("idle after finalize", s.audioMode === "idle" && !s.recorderReady);

console.log("\nInvariants");

s = voiceTurnReducer({ ...INITIAL_VOICE_TURN_STATE }, { type: "MIC_LIVE", slot: "entry" });
assert("mic live without arm still capturing", s.micLive && s.audioMode === "capturing");

const bad = {
  ...INITIAL_VOICE_TURN_STATE,
  micLive: true,
  micArming: true,
};
assert("detect mic live+arming", checkVoiceTurnInvariants(bad).some((v) => v.code === "mic_live_and_arming"));

console.log("\nRetry policy");
assert("entry max 2", maxCaptureRetries("entry") === 2);
assert("p1 max 1", maxCaptureRetries("p1") === 1);
let retryState = { ...INITIAL_VOICE_TURN_STATE, captureRetryCount: 1 };
assert("entry can retry once", canRetryCapture(retryState, "entry"));
retryState = { ...retryState, captureRetryCount: 2 };
assert("entry cannot retry twice", !canRetryCapture(retryState, "entry"));

console.log("\nOrb mode");
const orb = resolveVoiceOrbMode(
  voiceTurnReducer({ ...INITIAL_VOICE_TURN_STATE }, { type: "MIC_LIVE", slot: "entry" }),
  { philipHandsFreeVoice: true, speaking: false, showThresholdOverlay: true },
);
assert("threshold listen when mic live", orb === "listen");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
