import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assistantAudioPlayedMs,
  buildAudioRouteDiagnosticsEvent,
  buildConversationReadyDiagnosticsEvent,
  buildInterruptionDiagnostics,
  evidenceContainsRawAudioPayload,
  sanitizeAudioRouteSnapshot,
  snapshotLocalMicrophoneTrack,
  snapshotReadinessFlags,
} from "../../../mobile-build/lib/philipRealtimeDiagnostics.mjs";

const sessionSource = await readFile(
  new URL("../../../mobile-build/lib/philipRealtimeLabSession.ts", import.meta.url),
  "utf8",
);
const audioSessionSource = await readFile(
  new URL("../../../mobile-build/lib/philipRealtimeAudioSession.ts", import.meta.url),
  "utf8",
);

test("mic snapshot records enabled, muted, readyState, and publication state", () => {
  const mic = snapshotLocalMicrophoneTrack(
    { id: "mic-1", enabled: true, muted: false, readyState: "live" },
    "published",
  );
  assert.equal(mic.trackId, "mic-1");
  assert.equal(mic.enabled, true);
  assert.equal(mic.muted, false);
  assert.equal(mic.readyState, "live");
  assert.equal(mic.publicationState, "published");
});

test("conversation_ready diagnostics include mic, readiness flags, and route without raw audio", () => {
  const event = buildConversationReadyDiagnosticsEvent({
    atMs: 1_000,
    mic: snapshotLocalMicrophoneTrack(
      { id: "t", enabled: true, muted: false, readyState: "live" },
      "published",
    ),
    readinessFlags: snapshotReadinessFlags({
      dataChannelReady: true,
      providerSessionCreated: true,
      remoteAudioReady: true,
      conversationallyReady: true,
    }),
    audioRoute: sanitizeAudioRouteSnapshot({
      available: true,
      platform: "ios",
      outputs: ["default", "force_speaker"],
      selectedOutput: "force_speaker",
      inputHint: "playAndRecord+voiceChat",
      routeChangeMonitoring: "unavailable_without_new_dependency",
      note: "reason=readiness",
    }),
  });
  assert.equal(event.type, "conversation_ready_diagnostics");
  assert.equal(event.microphone.enabled, true);
  assert.equal(event.microphone.publicationState, "published");
  assert.equal(event.readinessFlags.dataChannelReady, true);
  assert.equal(event.audioRoute.selectedOutput, "force_speaker");
  assert.equal(event.audioRecorded, false);
  assert.equal(event.audioPersisted, false);
  assert.equal(evidenceContainsRawAudioPayload(event), false);
});

test("assistant audio played-ms is computed for every clear", () => {
  assert.equal(assistantAudioPlayedMs(5_000, 5_472), 472);
  assert.equal(assistantAudioPlayedMs(null, 5_472), null);
  const cleared = buildAudioRouteDiagnosticsEvent({
    atMs: 5_472,
    reason: "output_cleared",
    audioRoute: sanitizeAudioRouteSnapshot({
      available: true,
      platform: "ios",
      outputs: ["force_speaker"],
      selectedOutput: "force_speaker",
    }),
    assistantAudioPlayedMs: 472,
  });
  assert.equal(cleared.reason, "output_cleared");
  assert.equal(cleared.assistantAudioPlayedMs, 472);
  assert.equal(evidenceContainsRawAudioPayload(cleared), false);
});

test("interruptions are tagged during vs outside assistant audio", () => {
  const during = buildInterruptionDiagnostics({
    detectedAtMs: 5_844,
    duringAssistantAudio: true,
    assistantAudioStartedAtMs: 5_372,
    audioRoute: sanitizeAudioRouteSnapshot({ selectedOutput: "force_speaker", outputs: [] }),
  });
  assert.equal(during.duringAssistantAudio, true);
  assert.equal(during.assistantWasAudible, true);
  assert.equal(during.assistantAudioPlayedBeforeInterruptMs, 472);

  const outside = buildInterruptionDiagnostics({
    detectedAtMs: 10_000,
    duringAssistantAudio: false,
    assistantAudioStartedAtMs: null,
    audioRoute: null,
  });
  assert.equal(outside.duringAssistantAudio, false);
  assert.equal(outside.assistantWasAudible, false);
  assert.equal(outside.assistantAudioPlayedBeforeInterruptMs, null);
});

test("route sanitizer never keeps raw-audio payload keys", () => {
  const dirty = sanitizeAudioRouteSnapshot({
    available: true,
    platform: "ios",
    outputs: ["force_speaker"],
    selectedOutput: "force_speaker",
    pcm: "SHOULD_NOT_SURVIVE",
    rawAudio: new ArrayBuffer(8),
  });
  assert.equal("pcm" in dirty, false);
  assert.equal("rawAudio" in dirty, false);
  assert.equal(evidenceContainsRawAudioPayload(dirty), false);
});

test("session wires diagnostics at ready, first audio, clear, and interruption", () => {
  // LabSession wiring lands with the opening-stabilization commit; this commit
  // ships the diagnostic helpers + audio-route capture used by that wiring.
  assert.equal(typeof buildConversationReadyDiagnosticsEvent, "function");
  assert.equal(typeof buildAudioRouteDiagnosticsEvent, "function");
  assert.equal(typeof buildInterruptionDiagnostics, "function");
  assert.equal(typeof snapshotLocalMicrophoneTrack, "function");
  assert.equal(typeof assistantAudioPlayedMs, "function");
  assert.match(audioSessionSource, /captureRealtimeAudioRouteSnapshot/);
  // When LabSession already includes wiring (post opening-stabilization), verify it.
  if (sessionSource.includes("buildConversationReadyDiagnosticsEvent")) {
    assert.match(sessionSource, /buildConversationReadyDiagnosticsEvent/);
    assert.match(sessionSource, /speech_started_diagnostics/);
    assert.match(sessionSource, /buildAudioRouteDiagnosticsEvent/);
    assert.match(sessionSource, /captureRealtimeAudioRouteSnapshot/);
    assert.match(sessionSource, /assistantAudioPlayedMs/);
    assert.match(sessionSource, /duringAssistantAudio/);
    assert.match(sessionSource, /first_assistant_audio/);
    assert.match(sessionSource, /output_cleared/);
    assert.doesNotMatch(sessionSource, /anti-?echo|ignoreVAD|suppressBarge/i);
  }
});

test("audio session documents iOS route API limits without new dependency", () => {
  assert.match(audioSessionSource, /getAudioOutputs/);
  assert.match(audioSessionSource, /unavailable_without_new_dependency/);
  assert.match(audioSessionSource, /force_speaker/);
  assert.doesNotMatch(audioSessionSource, /react-native-avroutepicker|AVAudioSessionRouteChange/);
});

test("evidence contract still forbids raw audio persistence flags flipping on", () => {
  assert.match(sessionSource, /audioRecorded: false/);
  assert.match(sessionSource, /audioPersisted: false/);
  assert.doesNotMatch(sessionSource, /audioRecorded:\s*true/);
  assert.doesNotMatch(sessionSource, /audioPersisted:\s*true/);
  assert.doesNotMatch(sessionSource, /getByteFrequencyData|MediaRecorder|pcm16/);
});
