import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  IPHONE_LAB_INSTRUCTIONS,
  IPHONE_LAB_REALTIME_SESSION,
} from "../iphone-lab/config.mjs";
import { SANITIZED_REALTIME_SESSION } from "../phase2/config.mjs";
import { PHASE2B_REALTIME_SESSION } from "../phase2b/config.mjs";
import {
  OPENING_HALF_DUPLEX_FAILSAFE_MS,
  buildOpeningHalfDuplexFailedEvent,
  buildOpeningHalfDuplexRestoredEvent,
  buildOpeningHalfDuplexStartedEvent,
  buildTurnDetectionUpdate,
  canAnnounceConversationReady,
  decideHalfDuplexRestore,
  decideHalfDuplexStart,
  halfDuplexMutePrecedesFirstAudio,
  halfDuplexRestoreFollowsTerminal,
  isLocalMicrophoneReadyForConversation,
  isLocalMicrophoneTransmissionDisabled,
  setLocalMicrophoneTransmitting,
  snapshotMicTransmissionState,
} from "../../../mobile-build/lib/philipRealtimeOpeningHalfDuplex.mjs";
import { evidenceContainsRawAudioPayload } from "../../../mobile-build/lib/philipRealtimeDiagnostics.mjs";

const sessionSource = await readFile(
  new URL("../../../mobile-build/lib/philipRealtimeLabSession.ts", import.meta.url),
  "utf8",
);
const screenSource = await readFile(
  new URL("../../../mobile-build/app/philip-realtime-lab.tsx", import.meta.url),
  "utf8",
);
const halfDuplexSource = await readFile(
  new URL("../../../mobile-build/lib/philipRealtimeOpeningHalfDuplex.mjs", import.meta.url),
  "utf8",
);
const graceShimSource = await readFile(
  new URL("../../../mobile-build/lib/philipRealtimeOpeningGrace.mjs", import.meta.url),
  "utf8",
);

/** Explicit state-trace fixture for unpaid proof (no provider / no audio). */
function simulateOpeningHalfDuplexTimeline() {
  const events = [];
  const track = { id: "mic-1", enabled: true, muted: false, readyState: "live" };
  let firstUserTurnCompleted = false;
  let halfDuplexConsumed = false;
  let halfDuplexActive = false;
  let halfDuplexResponseId = null;
  let bargeInRestored = false;
  const conversationallyReady = true;

  // 1) First user speech remains enabled and fully captured.
  assert.equal(track.enabled, true);
  events.push("input_audio_buffer.speech_started");
  events.push("input_audio_buffer.speech_stopped");
  firstUserTurnCompleted = true;
  events.push("opening_first_user_turn_completed");

  // 2) First response.created → mute BEFORE assistant audio.
  const startDecision = decideHalfDuplexStart({
    conversationallyReady,
    firstUserTurnCompleted,
    halfDuplexConsumed,
    halfDuplexActive,
    assistantAudioAlreadyStarted: false,
    openingFailed: false,
    completed: false,
  });
  assert.equal(startDecision, "start");
  const before = snapshotMicTransmissionState(track, "published");
  const mute = setLocalMicrophoneTransmitting(track, false, "published");
  assert.equal(mute.ok, true);
  assert.equal(isLocalMicrophoneTransmissionDisabled(mute.after), true);
  halfDuplexActive = true;
  halfDuplexConsumed = true;
  halfDuplexResponseId = "resp_open_1";
  events.push(
    buildOpeningHalfDuplexStartedEvent({
      atMs: 100,
      reason: "first_response_created",
      responseId: halfDuplexResponseId,
      trackBefore: before,
      trackAfter: mute.after,
    }).type,
  );
  events.push("response.created");

  // 3–4) Mic confirmed disabled; no local VAD speech_started from transmission.
  assert.equal(track.enabled, false);
  assert.equal(isLocalMicrophoneTransmissionDisabled(mute.after), true);

  // 5) First assistant audio after mute; client does not cancel/clear.
  events.push("output_audio_buffer.started");
  assert.equal(halfDuplexMutePrecedesFirstAudio(events), true);
  assert.doesNotMatch(sessionSource, /opening_bargein_deferred/);
  assert.doesNotMatch(
    sessionSource.slice(
      sessionSource.indexOf("beginOpeningHalfDuplex"),
      sessionSource.indexOf("restoreOpeningHalfDuplex"),
    ),
    /response\.cancel|output_audio_buffer\.clear/,
  );

  // 6–7) Terminal → restore mic before Listening UI.
  events.push("response.done");
  const restoreDecision = decideHalfDuplexRestore({
    halfDuplexActive,
    halfDuplexResponseId,
    terminalResponseId: halfDuplexResponseId,
    completed: false,
  });
  assert.equal(restoreDecision, "restore_after_terminal");
  const restore = setLocalMicrophoneTransmitting(track, true, "published");
  assert.equal(restore.ok, true);
  assert.equal(isLocalMicrophoneReadyForConversation(restore.after), true);
  halfDuplexActive = false;
  bargeInRestored = true;
  events.push(
    buildOpeningHalfDuplexRestoredEvent({
      atMs: 900,
      reason: "first_response_terminal",
      responseId: halfDuplexResponseId,
      responseStatus: "completed",
      trackAfter: restore.after,
      elapsedMsFromHalfDuplexStart: 800,
      interruptResponseRestored: bargeInRestored,
    }).type,
  );
  assert.equal(halfDuplexRestoreFollowsTerminal(events), true);

  // 8) Later responses remain interruptible (interrupt restored once; no second mute).
  const later = decideHalfDuplexStart({
    conversationallyReady,
    firstUserTurnCompleted: true,
    halfDuplexConsumed,
    halfDuplexActive,
    assistantAudioAlreadyStarted: false,
    openingFailed: false,
    completed: false,
  });
  assert.equal(later, "noop");
  assert.equal(bargeInRestored, true);

  // 9) No duplicate user turn / response.create in this handshake path.
  assert.equal(events.filter((e) => e === "opening_first_user_turn_completed").length, 1);
  assert.equal(events.filter((e) => e === "opening_half_duplex_started").length, 1);
  assert.equal(events.filter((e) => e === "opening_half_duplex_restored").length, 1);

  return { events, track, halfDuplexConsumed, bargeInRestored };
}

test("server initial session still belts interrupt_response false; create_response stays true", () => {
  const td = IPHONE_LAB_REALTIME_SESSION.audio.input.turn_detection;
  assert.equal(td.type, "semantic_vad");
  assert.equal(td.create_response, true);
  assert.equal(td.interrupt_response, false);
});

test("fail-safe timeout is bounded at 8 seconds", () => {
  assert.equal(OPENING_HALF_DUPLEX_FAILSAFE_MS, 8_000);
  assert.ok(OPENING_HALF_DUPLEX_FAILSAFE_MS > 0);
  assert.ok(OPENING_HALF_DUPLEX_FAILSAFE_MS < 20_000);
});

test("conversation_ready does not require opening-protection ack gate", () => {
  assert.equal(
    canAnnounceConversationReady({
      dataChannelReady: true,
      providerSessionCreated: true,
      remoteAudioReady: true,
      micReady: true,
      openingFailed: false,
    }),
    true,
  );
  assert.equal(
    canAnnounceConversationReady({
      dataChannelReady: true,
      providerSessionCreated: true,
      remoteAudioReady: true,
      micReady: false,
      openingFailed: false,
    }),
    false,
  );
  assert.equal(
    canAnnounceConversationReady({
      dataChannelReady: true,
      providerSessionCreated: true,
      remoteAudioReady: true,
      micReady: true,
      openingFailed: true,
    }),
    false,
  );
});

test("half-duplex start waits for first user turn and fails if audio already started", () => {
  assert.equal(
    decideHalfDuplexStart({
      conversationallyReady: true,
      firstUserTurnCompleted: false,
      halfDuplexConsumed: false,
      halfDuplexActive: false,
      assistantAudioAlreadyStarted: false,
      openingFailed: false,
      completed: false,
    }),
    "noop",
  );
  assert.equal(
    decideHalfDuplexStart({
      conversationallyReady: true,
      firstUserTurnCompleted: true,
      halfDuplexConsumed: false,
      halfDuplexActive: false,
      assistantAudioAlreadyStarted: true,
      openingFailed: false,
      completed: false,
    }),
    "fail_too_late",
  );
  assert.equal(
    decideHalfDuplexStart({
      conversationallyReady: true,
      firstUserTurnCompleted: true,
      halfDuplexConsumed: true,
      halfDuplexActive: false,
      assistantAudioAlreadyStarted: false,
      openingFailed: false,
      completed: false,
    }),
    "noop",
  );
});

test("local mic transmission disable/restore uses track.enabled only", () => {
  const track = { id: "t1", enabled: true, muted: false, readyState: "live" };
  const disabled = setLocalMicrophoneTransmitting(track, false, "published");
  assert.equal(disabled.ok, true);
  assert.equal(track.enabled, false);
  assert.equal(isLocalMicrophoneTransmissionDisabled(disabled.after), true);
  assert.equal(isLocalMicrophoneReadyForConversation(disabled.after), false);

  const enabled = setLocalMicrophoneTransmitting(track, true, "published");
  assert.equal(enabled.ok, true);
  assert.equal(track.enabled, true);
  assert.equal(isLocalMicrophoneReadyForConversation(enabled.after), true);

  const missing = setLocalMicrophoneTransmitting(null, false, "published");
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, "microphone_track_missing");
});

test("turn detection restore update sets interrupt_response true without create_response toggling", () => {
  const update = buildTurnDetectionUpdate({ interruptResponse: true, createResponse: true });
  assert.equal(update.type, "session.update");
  assert.equal(update.session.audio.input.turn_detection.interrupt_response, true);
  assert.equal(update.session.audio.input.turn_detection.create_response, true);
  // Never emit create_response:false for opening half-duplex.
  assert.doesNotMatch(halfDuplexSource, /createResponse:\s*false/);
  assert.doesNotMatch(sessionSource, /sendTurnDetectionUpdate\(false,\s*false\)/);
});

test("explicit unpaid state trace proves the half-duplex handshake ordering", () => {
  const { events, track, halfDuplexConsumed, bargeInRestored } = simulateOpeningHalfDuplexTimeline();
  assert.equal(track.enabled, true);
  assert.equal(halfDuplexConsumed, true);
  assert.equal(bargeInRestored, true);
  assert.ok(events.indexOf("opening_half_duplex_started") < events.indexOf("output_audio_buffer.started"));
  assert.ok(events.indexOf("output_audio_buffer.started") < events.indexOf("opening_half_duplex_restored"));
});

test("diagnostic events are sanitized (no raw audio)", () => {
  const started = buildOpeningHalfDuplexStartedEvent({
    atMs: 1,
    reason: "first_response_created",
    responseId: "r1",
    trackBefore: { enabled: true, transmitting: true },
    trackAfter: { enabled: false, transmitting: false },
  });
  const restored = buildOpeningHalfDuplexRestoredEvent({
    atMs: 2,
    reason: "first_response_terminal",
    responseId: "r1",
    responseStatus: "completed",
    trackAfter: { enabled: true },
    elapsedMsFromHalfDuplexStart: 50,
    interruptResponseRestored: true,
  });
  const failed = buildOpeningHalfDuplexFailedEvent({
    atMs: 3,
    reason: "opening_half_duplex_mute_failed",
    responseId: "r1",
    trackState: { enabled: true },
  });
  for (const event of [started, restored, failed]) {
    assert.equal(event.audioRecorded, false);
    assert.equal(event.audioPersisted, false);
    assert.equal(evidenceContainsRawAudioPayload(event), false);
  }
});

test("LabSession wires mute on response.created and restore on response.done only", () => {
  assert.match(sessionSource, /beginOpeningHalfDuplex/);
  assert.match(sessionSource, /restoreOpeningHalfDuplex/);
  assert.match(sessionSource, /OPENING_HALF_DUPLEX_FAILSAFE_MS/);
  assert.match(sessionSource, /buildOpeningHalfDuplexTimeoutEvent/);
  assert.match(sessionSource, /opening_half_duplex_timeout/);
  assert.match(sessionSource, /buildOpeningHalfDuplexStartedEvent/);
  assert.match(sessionSource, /buildOpeningHalfDuplexRestoredEvent/);
  assert.match(sessionSource, /opening_cleared_while_mic_disabled/);
  // Timeout restores mic before ending; does not create another response.
  const timeoutBlock = sessionSource.slice(
    sessionSource.indexOf("this.halfDuplexFailSafeTimer = setTimeout"),
    sessionSource.indexOf("private restoreOpeningHalfDuplex"),
  );
  assert.match(timeoutBlock, /setLocalMicrophoneTransmitting/);
  assert.match(timeoutBlock, /buildOpeningHalfDuplexTimeoutEvent/);
  assert.match(timeoutBlock, /opening_half_duplex_timeout/);
  assert.doesNotMatch(timeoutBlock, /response\.create|response\.cancel/);
  assert.doesNotMatch(timeoutBlock, /startConversation/);
  // Mute is invoked from the response.created handler, not from audio-start.
  const responseCreatedHandler = sessionSource.slice(
    sessionSource.indexOf('if (type === "response.created")'),
    sessionSource.indexOf('if (type === "response.output_audio_transcript.delta")'),
  );
  assert.match(responseCreatedHandler, /beginOpeningHalfDuplex/);
  const audioStartedHandler = sessionSource.slice(
    sessionSource.indexOf('if (type === "output_audio_buffer.started")'),
    sessionSource.indexOf('if (type === "output_audio_buffer.stopped"'),
  );
  assert.doesNotMatch(audioStartedHandler, /beginOpeningHalfDuplex/);
  // Do not finish/restore on clear alone.
  const clearedHandler = sessionSource.slice(
    sessionSource.indexOf('if (type === "output_audio_buffer.stopped"'),
    sessionSource.indexOf('if (type === "response.created")'),
  );
  assert.doesNotMatch(clearedHandler, /restoreOpeningHalfDuplex/);
  assert.match(clearedHandler, /opening_cleared_while_mic_disabled/);
  // Obsolete grace machine removed.
  assert.doesNotMatch(sessionSource, /beginAudibleOpeningGrace|finishAudibleOpeningGrace|audibleGraceActive/);
  assert.doesNotMatch(sessionSource, /opening_protection_acked|deferredResponseCreateIssued|opening_bargein_deferred/);
  assert.doesNotMatch(sessionSource, /OPENING_ASSISTANT_BARGEIN_GRACE_MS/);
});

test("cleanup paths restore or reset the microphone", () => {
  assert.match(sessionSource, /resetOpeningHalfDuplexState/);
  assert.match(sessionSource, /setLocalMicrophoneTransmitting/);
  assert.match(sessionSource, /clearHalfDuplexFailSafeTimer/);
  // end() re-enables before teardown.
  const endStart = sessionSource.indexOf("async end(");
  const endBlock = sessionSource.slice(endStart, endStart + 2200);
  assert.match(endBlock, /setLocalMicrophoneTransmitting/);
  assert.match(endBlock, /resetOpeningHalfDuplexState/);
  assert.match(sessionSource, /emergencyStop[\s\S]*end\("stopped", "emergency_stop"\)/);
});

test("UI shows Philip is responding during half-duplex and Listening after restore", () => {
  assert.match(screenSource, /Philip is responding…/);
  assert.match(screenSource, /Listening…/);
  assert.match(screenSource, /openingHalfDuplex/);
  assert.doesNotMatch(screenSource, /microphone mute|muted for opening|half-duplex/i);
});

test("first response instruction is one short welcoming sentence (lab-only)", () => {
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /I'm glad we're talking\. How are you doing today\?/,
  );
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Opening only: your first spoken reply after Brian's greeting must be one short welcoming sentence/,
  );
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /That one-sentence opening rule applies only to the first reply; later replies keep the ordinary length above/,
  );
  assert.match(
    IPHONE_LAB_INSTRUCTIONS,
    /Do not add AI disclaimers, explanations, or a longer opening question on that first reply/,
  );
  // Ordinary later replies remain in the normal 20–35 word band.
  assert.match(IPHONE_LAB_INSTRUCTIONS, /about 20 to 35 words/);
});

test("Phase2 / Phase2B remain interruptible; half-duplex is Realtime Lab only", () => {
  assert.equal(SANITIZED_REALTIME_SESSION.audio.input.turn_detection.interrupt_response, true);
  assert.equal(PHASE2B_REALTIME_SESSION.audio.input.turn_detection.interrupt_response, true);
  assert.doesNotMatch(screenSource, /philipRealtimeOpeningHalfDuplex|beginOpeningHalfDuplex/);
  assert.match(sessionSource, /philipRealtimeOpeningHalfDuplex/);
  // Grace shim is retired (deprecated re-export only).
  assert.match(graceShimSource, /deprecated|retired/i);
  assert.doesNotMatch(graceShimSource, /OPENING_ASSISTANT_BARGEIN_GRACE_MS = 1000/);
});

test("cleared-while-disabled is evidence, not an automatic allowance", () => {
  assert.match(sessionSource, /opening_cleared_while_mic_disabled/);
  assert.match(sessionSource, /not_local_vad_cause_no_auto_allowance/);
  assert.doesNotMatch(sessionSource, /ALLOW_IPHONE_REALTIME\s*=\s*1/);
});
