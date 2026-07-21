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
  BUILD_256_OPENING_ORDER_FIXTURE,
  OPENING_HALF_DUPLEX_FAILSAFE_MS,
  buildOpeningHalfDuplexFailedEvent,
  buildOpeningHalfDuplexRestoredEvent,
  buildOpeningHalfDuplexStartedEvent,
  buildOpeningHalfDuplexTimeoutEvent,
  buildTurnDetectionUpdate,
  canAnnounceConversationReady,
  decideHalfDuplexRestoreLatch,
  decideHalfDuplexStart,
  emptyOpeningHalfDuplexLatch,
  halfDuplexMutePrecedesFirstAudio,
  halfDuplexRestoreFollowsPlaybackStop,
  isLocalMicrophoneReadyForConversation,
  isLocalMicrophoneTransmissionDisabled,
  setLocalMicrophoneTransmitting,
  snapshotMicTransmissionState,
  snapshotOpeningHalfDuplexLatch,
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

/**
 * Simulate the two-condition latch the way LabSession applies it.
 * Returns event types + whether mic was transmitting after each step.
 */
function runLatchSimulation(steps) {
  const track = { id: "mic-1", enabled: true, muted: false, readyState: "live" };
  const latch = emptyOpeningHalfDuplexLatch();
  let halfDuplexActive = false;
  let halfDuplexConsumed = false;
  let restores = 0;
  const events = [];
  const decisions = [];

  function maybeRestore(reason) {
    const decision = decideHalfDuplexRestoreLatch({
      halfDuplexActive,
      restorationCompleted: latch.restorationCompleted,
      firstResponseTerminal: latch.firstResponseTerminal,
      firstAudioStarted: latch.firstAudioStarted,
      firstAudioStopped: latch.firstAudioStopped,
      completed: false,
      clearedWhileDisabled: reason === "cleared_while_disabled",
    });
    decisions.push({ reason, decision, latch: { ...latch }, micEnabled: track.enabled });
    if (
      decision === "restore_no_audio" ||
      decision === "restore_after_playback" ||
      decision === "restore_abnormal_clear"
    ) {
      assert.equal(latch.restorationCompleted, false);
      setLocalMicrophoneTransmitting(track, true, "published");
      halfDuplexActive = false;
      latch.restorationCompleted = true;
      restores += 1;
      events.push("opening_half_duplex_restored");
    }
    return decision;
  }

  for (const step of steps) {
    if (step === "user_turn") {
      events.push("input_audio_buffer.speech_started", "input_audio_buffer.speech_stopped");
    } else if (step === "response.created") {
      const start = decideHalfDuplexStart({
        conversationallyReady: true,
        firstUserTurnCompleted: true,
        halfDuplexConsumed,
        halfDuplexActive,
        assistantAudioAlreadyStarted: false,
        openingFailed: false,
        completed: false,
      });
      assert.equal(start, "start");
      setLocalMicrophoneTransmitting(track, false, "published");
      halfDuplexActive = true;
      halfDuplexConsumed = true;
      events.push("response.created", "opening_half_duplex_started");
    } else if (step === "output_audio_buffer.started") {
      latch.firstAudioStarted = true;
      events.push("output_audio_buffer.started");
      assert.equal(track.enabled, false);
    } else if (step === "response.done") {
      if (!latch.firstResponseTerminal) {
        latch.firstResponseTerminal = true;
        events.push("response.done");
        const d = maybeRestore("response.done");
        if (d === "hold_until_audio_stopped") {
          events.push("opening_half_duplex_hold_for_playback");
          assert.equal(track.enabled, false);
        }
      } else {
        events.push("response.done_duplicate");
        maybeRestore("response.done_duplicate");
      }
    } else if (step === "output_audio_buffer.stopped") {
      if (!latch.firstAudioStopped) {
        latch.firstAudioStopped = true;
        events.push("output_audio_buffer.stopped");
        maybeRestore("output_audio_buffer.stopped");
      } else {
        events.push("output_audio_buffer.stopped_duplicate");
        maybeRestore("output_audio_buffer.stopped_duplicate");
      }
    } else if (step === "cleared") {
      events.push("output_audio_buffer.cleared", "opening_cleared_while_mic_disabled");
      maybeRestore("cleared_while_disabled");
    } else if (step === "later_response.done") {
      events.push("later_response.done");
      // Unrelated later response must not re-open half-duplex.
      assert.equal(halfDuplexConsumed, true);
      const start = decideHalfDuplexStart({
        conversationallyReady: true,
        firstUserTurnCompleted: true,
        halfDuplexConsumed,
        halfDuplexActive,
        assistantAudioAlreadyStarted: false,
        openingFailed: false,
        completed: false,
      });
      assert.equal(start, "noop");
      maybeRestore("later_response.done");
    }
  }

  return { track, latch, events, decisions, restores, halfDuplexConsumed };
}

test("fail-safe is 8s and starts at response.created", () => {
  assert.equal(OPENING_HALF_DUPLEX_FAILSAFE_MS, 8_000);
  assert.match(halfDuplexSource, /failsafeStartsAt: "response\.created"/);
  assert.match(sessionSource, /Fail-safe starts at response\.created/);
});

test("Build 256 order: done alone holds mic; stop restores once", () => {
  const { track, events, restores, decisions } = runLatchSimulation([
    "user_turn",
    "response.created",
    "output_audio_buffer.started",
    "response.done",
    "output_audio_buffer.stopped",
  ]);
  assert.equal(halfDuplexMutePrecedesFirstAudio(events), true);
  assert.ok(events.includes("opening_half_duplex_hold_for_playback"));
  const hold = decisions.find((d) => d.reason === "response.done");
  assert.equal(hold.decision, "hold_until_audio_stopped");
  assert.equal(hold.micEnabled, false);
  const stop = decisions.find((d) => d.reason === "output_audio_buffer.stopped");
  assert.equal(stop.decision, "restore_after_playback");
  assert.equal(restores, 1);
  assert.equal(track.enabled, true);
  assert.equal(halfDuplexRestoreFollowsPlaybackStop(events), true);
  // Fixture matches forensic relative order.
  const types = BUILD_256_OPENING_ORDER_FIXTURE.map((e) => e.type);
  assert.deepEqual(types.slice(0, 4), [
    "response.created",
    "opening_half_duplex_started",
    "output_audio_buffer.started",
    "response.done",
  ]);
});

test("stopped before response.done then restores on done", () => {
  const { track, restores, decisions } = runLatchSimulation([
    "user_turn",
    "response.created",
    "output_audio_buffer.started",
    "output_audio_buffer.stopped",
    "response.done",
  ]);
  assert.equal(
    decisions.find((d) => d.reason === "output_audio_buffer.stopped").decision,
    "hold_until_terminal",
  );
  assert.equal(decisions.find((d) => d.reason === "response.done").decision, "restore_after_playback");
  assert.equal(restores, 1);
  assert.equal(track.enabled, true);
});

test("response.done with no audio ever started restores safely", () => {
  const { track, restores, decisions } = runLatchSimulation([
    "user_turn",
    "response.created",
    "response.done",
  ]);
  assert.equal(decisions.find((d) => d.reason === "response.done").decision, "restore_no_audio");
  assert.equal(restores, 1);
  assert.equal(track.enabled, true);
});

test("duplicate response.done does not restore twice", () => {
  const { restores } = runLatchSimulation([
    "user_turn",
    "response.created",
    "output_audio_buffer.started",
    "response.done",
    "response.done",
    "output_audio_buffer.stopped",
  ]);
  assert.equal(restores, 1);
});

test("duplicate output_audio_buffer.stopped does not restore twice", () => {
  const { restores } = runLatchSimulation([
    "user_turn",
    "response.created",
    "output_audio_buffer.started",
    "response.done",
    "output_audio_buffer.stopped",
    "output_audio_buffer.stopped",
  ]);
  assert.equal(restores, 1);
});

test("unrelated later response events never re-enter half-duplex", () => {
  const { halfDuplexConsumed, restores } = runLatchSimulation([
    "user_turn",
    "response.created",
    "output_audio_buffer.started",
    "response.done",
    "output_audio_buffer.stopped",
    "later_response.done",
  ]);
  assert.equal(halfDuplexConsumed, true);
  assert.equal(restores, 1);
});

test("clear while mic disabled is abnormal restore, not playback success", () => {
  const { track, restores, decisions, events } = runLatchSimulation([
    "user_turn",
    "response.created",
    "output_audio_buffer.started",
    "cleared",
  ]);
  assert.ok(events.includes("opening_cleared_while_mic_disabled"));
  assert.equal(
    decisions.find((d) => d.reason === "cleared_while_disabled").decision,
    "restore_abnormal_clear",
  );
  assert.equal(restores, 1);
  assert.equal(track.enabled, true);
  assert.match(sessionSource, /opening_cleared_while_mic_disabled/);
  assert.match(sessionSource, /abnormal_opening_failure_no_retry_no_auto_allowance/);
  assert.match(sessionSource, /end\("failed", "opening_cleared_while_mic_disabled"\)/);
});

test("latch decisions cover hold / no-audio / playback / cleanup", () => {
  assert.equal(
    decideHalfDuplexRestoreLatch({
      halfDuplexActive: true,
      restorationCompleted: false,
      firstResponseTerminal: true,
      firstAudioStarted: true,
      firstAudioStopped: false,
    }),
    "hold_until_audio_stopped",
  );
  assert.equal(
    decideHalfDuplexRestoreLatch({
      halfDuplexActive: true,
      restorationCompleted: false,
      firstResponseTerminal: false,
      firstAudioStarted: true,
      firstAudioStopped: true,
    }),
    "hold_until_terminal",
  );
  assert.equal(
    decideHalfDuplexRestoreLatch({
      halfDuplexActive: true,
      restorationCompleted: true,
      firstResponseTerminal: true,
      firstAudioStarted: true,
      firstAudioStopped: true,
    }),
    "noop",
  );
  assert.equal(
    decideHalfDuplexRestoreLatch({
      halfDuplexActive: true,
      restorationCompleted: false,
      firstResponseTerminal: true,
      firstAudioStarted: true,
      firstAudioStopped: true,
      forceCleanup: true,
    }),
    "restore_cleanup",
  );
});

test("LabSession wires latch fields and does not restore solely on response.done after audio", () => {
  assert.match(sessionSource, /firstResponseTerminal/);
  assert.match(sessionSource, /firstAudioStarted/);
  assert.match(sessionSource, /firstAudioStopped/);
  assert.match(sessionSource, /halfDuplexRestorationCompleted/);
  assert.match(sessionSource, /decideHalfDuplexRestoreLatch/);
  assert.match(sessionSource, /opening_half_duplex_hold_for_playback/);
  assert.match(sessionSource, /response_done_is_not_playback_complete/);
  assert.match(sessionSource, /first_response_playback_stopped/);
  // Must not call restoreOpeningHalfDuplex directly from response.done without latch.
  const doneHandler = sessionSource.slice(
    sessionSource.indexOf('if (type === "response.done")'),
    sessionSource.indexOf('if (type === "error")'),
  );
  assert.match(doneHandler, /tryRestoreOpeningHalfDuplexFromLatch/);
  assert.match(doneHandler, /hold_until_audio_stopped/);
  assert.doesNotMatch(doneHandler, /restoreOpeningHalfDuplex\(\s*status/);
});

test("stopped handler restores only after latch; UI Listening only after restore", () => {
  const stoppedHandler = sessionSource.slice(
    sessionSource.indexOf('if (type === "output_audio_buffer.stopped"'),
    sessionSource.indexOf('if (type === "response.created")'),
  );
  assert.match(stoppedHandler, /firstAudioStopped = true/);
  assert.match(stoppedHandler, /tryRestoreOpeningHalfDuplexFromLatch/);
  assert.match(sessionSource, /this\.log\("Listening…"\)/);
  // Listening is emitted inside restoreOpeningHalfDuplex, not on response.done hold.
  const holdBlock = sessionSource.slice(
    sessionSource.indexOf("hold_until_audio_stopped"),
    sessionSource.indexOf("hold_until_audio_stopped") + 500,
  );
  assert.doesNotMatch(holdBlock, /Listening…/);
});

test("UI remains Philip is responding during half-duplex", () => {
  assert.match(screenSource, /Philip is responding…/);
  assert.match(screenSource, /openingHalfDuplex/);
  assert.match(sessionSource, /Philip is responding…/);
});

test("cleanup / emergency / connection failure restore paths remain", () => {
  assert.match(sessionSource, /resetOpeningHalfDuplexState/);
  assert.match(sessionSource, /setLocalMicrophoneTransmitting/);
  assert.match(sessionSource, /forceCleanup: true/);
  assert.match(sessionSource, /emergencyStop[\s\S]*end\("stopped", "emergency_stop"\)/);
  const endBlock = sessionSource.slice(
    sessionSource.indexOf("async end("),
    sessionSource.indexOf("async end(") + 2500,
  );
  assert.match(endBlock, /setLocalMicrophoneTransmitting/);
});

test("timeout records latch state and starts at response.created", () => {
  assert.match(sessionSource, /latchAtTimeout|latch: latchAtTimeout/);
  const timeout = buildOpeningHalfDuplexTimeoutEvent({
    atMs: 1,
    responseId: "r1",
    trackAfterRestore: { enabled: true },
    micVerifiedReady: true,
    latch: snapshotOpeningHalfDuplexLatch({
      ...emptyOpeningHalfDuplexLatch(),
      firstResponseTerminal: true,
      firstAudioStarted: true,
      firstAudioStopped: false,
      halfDuplexActive: true,
    }),
  });
  assert.equal(timeout.failsafeStartsAt, "response.created");
  assert.equal(timeout.latch.firstAudioStopped, false);
  assert.equal(evidenceContainsRawAudioPayload(timeout), false);
});

test("no deferred greeting / opening response.create paths", () => {
  assert.doesNotMatch(sessionSource, /deferredResponseCreate/);
  assert.doesNotMatch(sessionSource, /issuedDeferredResponseCreate/);
  assert.doesNotMatch(sessionSource, /pendingDeferredResponseCreate/);
  const toolBlock = sessionSource.slice(
    sessionSource.indexOf("private handleToolCall"),
    sessionSource.indexOf("private handleProviderEvent"),
  );
  assert.match(toolBlock, /type: "response\.create"/);
  const halfDuplexBlock = sessionSource.slice(
    sessionSource.indexOf("private beginOpeningHalfDuplex"),
    sessionSource.indexOf("private maybeMarkConversationallyReady"),
  );
  assert.doesNotMatch(halfDuplexBlock, /type: "response\.create"/);
});

test("later responses never use half-duplex; barge-in restored once after opening", () => {
  assert.match(sessionSource, /interruptResponseRestored/);
  assert.match(sessionSource, /sendTurnDetectionUpdate\(true,\s*true\)/);
  assert.equal(IPHONE_LAB_REALTIME_SESSION.audio.input.turn_detection.create_response, true);
  assert.equal(SANITIZED_REALTIME_SESSION.audio.input.turn_detection.interrupt_response, true);
  assert.equal(PHASE2B_REALTIME_SESSION.audio.input.turn_detection.interrupt_response, true);
});

test("first-response-only short opening instruction unchanged", () => {
  assert.match(IPHONE_LAB_INSTRUCTIONS, /Opening only: your first spoken reply/);
  assert.match(IPHONE_LAB_INSTRUCTIONS, /later replies keep the ordinary length above/);
});

test("diagnostic events remain sanitized", () => {
  for (const event of [
    buildOpeningHalfDuplexStartedEvent({ atMs: 1, responseId: "r", trackBefore: {}, trackAfter: {} }),
    buildOpeningHalfDuplexRestoredEvent({ atMs: 2, responseId: "r", latch: emptyOpeningHalfDuplexLatch() }),
    buildOpeningHalfDuplexFailedEvent({ atMs: 3, reason: "x" }),
  ]) {
    assert.equal(event.audioRecorded, false);
    assert.equal(event.audioPersisted, false);
    assert.equal(evidenceContainsRawAudioPayload(event), false);
  }
});

test("mic transmission helpers still use track.enabled only", () => {
  const track = { id: "t", enabled: true, muted: false, readyState: "live" };
  const off = setLocalMicrophoneTransmitting(track, false, "published");
  assert.equal(off.ok, true);
  assert.equal(isLocalMicrophoneTransmissionDisabled(off.after), true);
  const on = setLocalMicrophoneTransmitting(track, true, "published");
  assert.equal(isLocalMicrophoneReadyForConversation(on.after), true);
});

test("conversation_ready still independent of opening latch", () => {
  assert.equal(
    canAnnounceConversationReady({
      dataChannelReady: true,
      providerSessionCreated: true,
      remoteAudioReady: true,
      micReady: true,
    }),
    true,
  );
});

test("new-session reset clears latch via emptyOpeningHalfDuplexLatch", () => {
  assert.match(sessionSource, /emptyOpeningHalfDuplexLatch/);
  assert.match(sessionSource, /resetOpeningHalfDuplexState/);
  const empty = emptyOpeningHalfDuplexLatch();
  assert.equal(empty.firstResponseTerminal, false);
  assert.equal(empty.firstAudioStarted, false);
  assert.equal(empty.firstAudioStopped, false);
  assert.equal(empty.restorationCompleted, false);
});
