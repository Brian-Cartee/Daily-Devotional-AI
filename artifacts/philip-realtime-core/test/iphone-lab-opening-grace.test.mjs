import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { IPHONE_LAB_REALTIME_SESSION } from "../iphone-lab/config.mjs";
import { SANITIZED_REALTIME_SESSION } from "../phase2/config.mjs";
import { PHASE2B_REALTIME_SESSION } from "../phase2b/config.mjs";
import {
  OPENING_ASSISTANT_BARGEIN_GRACE_MS,
  OPENING_PROTECTION_ACK_TIMEOUT_MS,
  buildOpeningBargeInDeferredEvent,
  buildOpeningBargeInGraceEndedEvent,
  buildOpeningProtectionAckDiagnostic,
  buildTurnDetectionUpdate,
  canAnnounceConversationReady,
  decideOpeningGraceExpiryAction,
  decideOpeningSpeechStartedAction,
  evaluateOpeningProtectionAcknowledgment,
  extractTurnDetectionFromSessionUpdated,
  firstAudioCannotPrecedeOpeningProtection,
  inspectSessionUpdatedTurnDetection,
  isLocalMicrophoneReadyForConversation,
  isOpeningProtectionAcknowledged,
  isWithinOpeningBargeInGrace,
  openingProtectionAckPrecedesReady,
} from "../../../mobile-build/lib/philipRealtimeOpeningGrace.mjs";
import { applyInputTranscriptEvent } from "../../../mobile-build/lib/philipRealtimeTranscript.mjs";
import { evidenceContainsRawAudioPayload } from "../../../mobile-build/lib/philipRealtimeDiagnostics.mjs";
import {
  SESSION_UPDATED_GA_INTERRUPT_FALSE,
  SESSION_UPDATED_GA_INTERRUPT_MISSING,
  SESSION_UPDATED_GA_INTERRUPT_TRUE,
  SESSION_UPDATED_LEGACY_INTERRUPT_FALSE,
  SESSION_UPDATED_SANITIZED_EVIDENCE_ONLY,
  SESSION_UPDATED_UNEXPECTED_NESTING,
  SESSION_UPDATED_UNRELATED_VOICE_ONLY,
} from "./fixtures/session-updated-ack-shapes.mjs";

const sessionSource = await readFile(
  new URL("../../../mobile-build/lib/philipRealtimeLabSession.ts", import.meta.url),
  "utf8",
);
const screenSource = await readFile(
  new URL("../../../mobile-build/app/philip-realtime-lab.tsx", import.meta.url),
  "utf8",
);
const serverSource = await readFile(
  new URL("../iphone-lab/server.mjs", import.meta.url),
  "utf8",
);

test("server initial session starts with opening protection (interrupt_response false)", () => {
  const td = IPHONE_LAB_REALTIME_SESSION.audio.input.turn_detection;
  assert.equal(td.type, "semantic_vad");
  assert.equal(td.create_response, true);
  assert.equal(td.interrupt_response, false);
});

test("opening audible grace is exactly 1000ms from first output_audio_buffer.started", () => {
  assert.equal(OPENING_ASSISTANT_BARGEIN_GRACE_MS, 1000);
  assert.equal(isWithinOpeningBargeInGrace(5_000, 5_300), true);
  assert.equal(isWithinOpeningBargeInGrace(5_000, 5_700), true);
  assert.equal(isWithinOpeningBargeInGrace(5_000, 5_999), true);
  assert.equal(isWithinOpeningBargeInGrace(5_000, 6_000), false);
});

test("protection ack must precede conversation_ready (protocol ordering)", () => {
  assert.equal(
    openingProtectionAckPrecedesReady([
      "opening_protection_requested",
      "opening_protection_acked",
      "conversation_ready",
      "output_audio_buffer.started",
    ]),
    true,
  );
  assert.equal(
    openingProtectionAckPrecedesReady([
      "conversation_ready",
      "opening_protection_acked",
    ]),
    false,
  );
  assert.equal(
    firstAudioCannotPrecedeOpeningProtection([
      "opening_protection_acked",
      "conversation_ready",
      "output_audio_buffer.started",
    ]),
    true,
  );
  assert.equal(
    firstAudioCannotPrecedeOpeningProtection([
      "output_audio_buffer.started",
      "opening_protection_acked",
    ]),
    false,
  );
});

test("conversation_ready is blocked until protection is acknowledged", () => {
  assert.equal(
    canAnnounceConversationReady({
      dataChannelReady: true,
      providerSessionCreated: true,
      remoteAudioReady: true,
      openingProtectionAcked: false,
      openingProtectionFailed: false,
      micReady: true,
    }),
    false,
  );
  assert.equal(
    canAnnounceConversationReady({
      dataChannelReady: true,
      providerSessionCreated: true,
      remoteAudioReady: true,
      openingProtectionAcked: true,
      openingProtectionFailed: false,
      micReady: true,
    }),
    true,
  );
  assert.equal(
    canAnnounceConversationReady({
      dataChannelReady: true,
      providerSessionCreated: true,
      remoteAudioReady: true,
      openingProtectionAcked: true,
      openingProtectionFailed: true,
      micReady: true,
    }),
    false,
  );
});

test("session.updated extractor recognizes interrupt_response false/true", () => {
  const protectedTd = extractTurnDetectionFromSessionUpdated({
    type: "session.updated",
    session: {
      audio: {
        input: {
          turn_detection: {
            type: "semantic_vad",
            create_response: true,
            interrupt_response: false,
          },
        },
      },
    },
  });
  assert.equal(isOpeningProtectionAcknowledged(protectedTd), true);
  const restored = extractTurnDetectionFromSessionUpdated({
    session: {
      audio: {
        input: {
          turn_detection: { interrupt_response: true, create_response: true },
        },
      },
    },
  });
  assert.equal(restored?.interrupt_response, true);
});

test("ack accepts official GA shape with explicit interrupt_response false", () => {
  const evaluation = evaluateOpeningProtectionAcknowledgment(
    SESSION_UPDATED_GA_INTERRUPT_FALSE,
    { requestedAtMs: 1000, nowMs: 1125 },
  );
  assert.equal(evaluation.acknowledgmentEventReceived, true);
  assert.equal(
    evaluation.verificationPath,
    "session.audio.input.turn_detection",
  );
  assert.equal(evaluation.confirmedValue, false);
  assert.equal(evaluation.interruptResponsePresent, true);
  assert.equal(evaluation.elapsedMsFromUpdateSent, 125);
  assert.equal(evaluation.acknowledged, true);
  assert.equal(evaluation.failureReason, null);
  assert.equal(isOpeningProtectionAcknowledged(evaluation.turnDetection), true);

  const diagnostic = buildOpeningProtectionAckDiagnostic(evaluation, 1125);
  assert.equal(diagnostic.type, "opening_protection_ack_diagnostic");
  assert.equal(diagnostic.acknowledgmentEventReceived, true);
  assert.equal(diagnostic.verificationPath, "session.audio.input.turn_detection");
  assert.equal(diagnostic.confirmedValue, false);
  assert.equal(diagnostic.elapsedMsFromUpdateSent, 125);
  assert.equal(diagnostic.failureReason, null);
  assert.equal(evidenceContainsRawAudioPayload(diagnostic), false);
});

test("ack accepts legacy session.turn_detection with explicit false", () => {
  const evaluation = evaluateOpeningProtectionAcknowledgment(
    SESSION_UPDATED_LEGACY_INTERRUPT_FALSE,
    { requestedAtMs: 2000, nowMs: 2050 },
  );
  assert.equal(evaluation.acknowledged, true);
  assert.equal(evaluation.verificationPath, "session.turn_detection");
  assert.equal(evaluation.confirmedValue, false);
});

test("ack rejects explicit interrupt_response true", () => {
  const evaluation = evaluateOpeningProtectionAcknowledgment(
    SESSION_UPDATED_GA_INTERRUPT_TRUE,
    { requestedAtMs: 1000, nowMs: 1100 },
  );
  assert.equal(evaluation.acknowledgmentEventReceived, true);
  assert.equal(evaluation.confirmedValue, true);
  assert.equal(evaluation.acknowledged, false);
  assert.equal(evaluation.failureReason, "interrupt_response_true");
});

test("ack rejects missing interrupt_response (never infer false)", () => {
  const inspected = inspectSessionUpdatedTurnDetection(
    SESSION_UPDATED_GA_INTERRUPT_MISSING,
  );
  assert.equal(inspected.verificationPath, "session.audio.input.turn_detection");
  assert.equal(inspected.interruptResponsePresent, false);
  assert.equal(isOpeningProtectionAcknowledged(inspected.turnDetection), false);

  const evaluation = evaluateOpeningProtectionAcknowledgment(
    SESSION_UPDATED_GA_INTERRUPT_MISSING,
    { requestedAtMs: 1000, nowMs: 1100 },
  );
  assert.equal(evaluation.acknowledged, false);
  assert.equal(evaluation.failureReason, "interrupt_response_absent");
  assert.equal(evaluation.confirmedValue, null);
});

test("ack rejects unexpected nesting even when false is present", () => {
  const evaluation = evaluateOpeningProtectionAcknowledgment(
    SESSION_UPDATED_UNEXPECTED_NESTING,
    { requestedAtMs: 1000, nowMs: 1100 },
  );
  assert.equal(evaluation.acknowledgmentEventReceived, true);
  assert.equal(evaluation.acknowledged, false);
  assert.equal(evaluation.failureReason, "turn_detection_missing");
  assert.equal(evaluation.verificationPath, null);
});

test("ack rejects unrelated session.updated without turn_detection", () => {
  const evaluation = evaluateOpeningProtectionAcknowledgment(
    SESSION_UPDATED_UNRELATED_VOICE_ONLY,
    { requestedAtMs: 1000, nowMs: 1100 },
  );
  assert.equal(evaluation.acknowledged, false);
  assert.equal(evaluation.failureReason, "turn_detection_missing");
});

test("sanitized evidence-only session.updated cannot acknowledge", () => {
  const evaluation = evaluateOpeningProtectionAcknowledgment(
    SESSION_UPDATED_SANITIZED_EVIDENCE_ONLY,
    { requestedAtMs: 1000, nowMs: 1100 },
  );
  assert.equal(evaluation.acknowledgmentEventReceived, true);
  assert.equal(evaluation.acknowledged, false);
  assert.equal(evaluation.failureReason, "session_missing");
});

test("delayed acknowledgment still accepts explicit false before timeout", () => {
  const evaluation = evaluateOpeningProtectionAcknowledgment(
    SESSION_UPDATED_GA_INTERRUPT_FALSE,
    { requestedAtMs: 1000, nowMs: 1000 + 7_500 },
  );
  assert.equal(evaluation.elapsedMsFromUpdateSent, 7_500);
  assert.equal(evaluation.acknowledged, true);
  assert.ok(evaluation.elapsedMsFromUpdateSent < OPENING_PROTECTION_ACK_TIMEOUT_MS);
});

test("acknowledgment after timeout/end is not applied", () => {
  const evaluation = evaluateOpeningProtectionAcknowledgment(
    SESSION_UPDATED_GA_INTERRUPT_FALSE,
    {
      requestedAtMs: 1000,
      nowMs: 1000 + OPENING_PROTECTION_ACK_TIMEOUT_MS + 50,
      timedOutOrFailed: true,
    },
  );
  assert.equal(evaluation.confirmedValue, false);
  assert.equal(evaluation.acknowledged, false);
  assert.equal(evaluation.failureReason, "acknowledgment_after_timeout_or_end");
});

test("server interrupt_response:false is iPhone Realtime Lab only", () => {
  assert.equal(
    IPHONE_LAB_REALTIME_SESSION.audio.input.turn_detection.interrupt_response,
    false,
  );
  assert.equal(
    SANITIZED_REALTIME_SESSION.audio.input.turn_detection.interrupt_response,
    true,
  );
  assert.equal(
    PHASE2B_REALTIME_SESSION.audio.input.turn_detection.interrupt_response,
    true,
  );
  // Production / Legacy Voice Lab do not import iPhone lab session config.
  assert.doesNotMatch(sessionSource, /philip-voice-agent|legacy_spoken_v1|Front Door/i);
  assert.doesNotMatch(screenSource, /IPHONE_LAB_REALTIME_SESSION/);
});

test("session reservation is consumed at createRealtimeCall before ack", () => {
  // Allowance is reserved when SDP offer is accepted — before data-channel
  // session.updated acknowledgment. A failed ack therefore burns the session.
  const reserveIdx = serverSource.indexOf("reserved = await reserveSession()");
  const providerIdx = serverSource.indexOf('fetch("https://api.openai.com/v1/realtime/calls"');
  assert.ok(reserveIdx > 0);
  assert.ok(providerIdx > reserveIdx);
  assert.match(sessionSource, /buildOpeningProtectionAckDiagnostic/);
  assert.match(sessionSource, /evaluateOpeningProtectionAcknowledgment/);
  assert.match(sessionSource, /openingProtectionRequestedAtMs/);
});

test("interruption at 300–700ms defers cancellation while first audio grace is active", () => {
  for (const offset of [300, 472, 700]) {
    assert.equal(
      decideOpeningSpeechStartedAction({
        audibleGraceActive: true,
        graceStartedAtMs: 5_000,
        nowMs: 5_000 + offset,
        duringAssistantAudio: true,
      }),
      "defer_cancellation",
    );
  }
  const deferred = buildOpeningBargeInDeferredEvent({
    atMs: 5_472,
    itemId: "item-a",
    assistantAudioPlayedMs: 472,
  });
  assert.equal(deferred.cancellationSuppressed, true);
  assert.equal(deferred.userAudioPreserved, true);
  assert.equal(evidenceContainsRawAudioPayload(deferred), false);
});

test("interruption after 1000ms allows normal barge-in", () => {
  assert.equal(
    decideOpeningSpeechStartedAction({
      audibleGraceActive: true,
      graceStartedAtMs: 5_000,
      nowMs: 6_050,
      duringAssistantAudio: true,
    }),
    "allow_bargein",
  );
});

test("subsequent responses (grace inactive) have immediate barge-in", () => {
  assert.equal(
    decideOpeningSpeechStartedAction({
      audibleGraceActive: false,
      graceStartedAtMs: null,
      nowMs: 40_000,
      duringAssistantAudio: true,
    }),
    "allow_bargein",
  );
});

test("user speech entirely inside grace → restore + one deferred response.create", () => {
  assert.equal(
    decideOpeningGraceExpiryAction({
      audibleGraceActive: true,
      listening: false,
      deferredSpeechCompleted: true,
      restorationAlreadySent: false,
    }),
    "restore_and_response_create_once",
  );
});

test("user speech begins in grace and continues past it → restore + cancel assistant", () => {
  assert.equal(
    decideOpeningGraceExpiryAction({
      audibleGraceActive: true,
      listening: true,
      deferredSpeechCompleted: false,
      restorationAlreadySent: false,
    }),
    "restore_cancel_assistant",
  );
});

test("user begins just before the 1000ms boundary still defers", () => {
  assert.equal(
    decideOpeningSpeechStartedAction({
      audibleGraceActive: true,
      graceStartedAtMs: 5_000,
      nowMs: 5_999,
      duringAssistantAudio: true,
    }),
    "defer_cancellation",
  );
});

test("speech_stopped during active first response is preserved as one user turn", () => {
  const turns = [{ turnNumber: 1, itemId: "item-open", speechStartedAtMs: 5_300 }];
  applyInputTranscriptEvent(
    turns,
    {
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "item-open",
      transcript: "Hello, Philip, how are you?",
    },
    5_900,
  );
  assert.equal(turns.length, 1);
  assert.equal(turns[0].inputTranscript, "Hello, Philip, how are you?");
  // Audible-grace update disables create_response; expiry issues at most one create.
  const disableAuto = buildTurnDetectionUpdate({
    interruptResponse: false,
    createResponse: false,
  });
  assert.equal(disableAuto.session.audio.input.turn_detection.create_response, false);
  assert.equal(disableAuto.session.audio.input.turn_detection.interrupt_response, false);
  const restore = buildTurnDetectionUpdate({
    interruptResponse: true,
    createResponse: true,
  });
  assert.equal(restore.session.audio.input.turn_detection.interrupt_response, true);
  assert.equal(restore.session.audio.input.turn_detection.create_response, true);
});

test("restoration is one-shot (no duplicate restore actions)", () => {
  assert.equal(
    decideOpeningGraceExpiryAction({
      audibleGraceActive: true,
      listening: false,
      deferredSpeechCompleted: true,
      restorationAlreadySent: true,
    }),
    "noop",
  );
  const ended = buildOpeningBargeInGraceEndedEvent({
    atMs: 6_000,
    userStillSpeaking: false,
    cancelledBecauseSpeaking: false,
    issuedDeferredResponseCreate: true,
  });
  assert.equal(ended.issuedDeferredResponseCreate, true);
});

test("mic gate still requires enabled/unmuted/live/published", () => {
  assert.equal(
    isLocalMicrophoneReadyForConversation({
      enabled: true,
      muted: false,
      readyState: "live",
      publicationState: "published",
    }),
    true,
  );
  assert.equal(
    isLocalMicrophoneReadyForConversation({
      enabled: true,
      muted: true,
      readyState: "live",
      publicationState: "published",
    }),
    false,
  );
});

test("session wires pre-ready protection request/ack before ready banner", () => {
  assert.match(sessionSource, /requestOpeningProtection/);
  assert.match(sessionSource, /acknowledgeOpeningProtection/);
  assert.match(sessionSource, /opening_protection_acked/);
  assert.match(sessionSource, /opening_protection_failed/);
  assert.match(sessionSource, /OPENING_PROTECTION_ACK_TIMEOUT_MS/);
  assert.match(sessionSource, /canAnnounceConversationReady/);
  assert.equal(OPENING_PROTECTION_ACK_TIMEOUT_MS, 8_000);
  // Ready gate includes protection ack.
  const readyStart = sessionSource.indexOf("private maybeMarkConversationallyReady()");
  const readyEnd = sessionSource.indexOf("private async recordConversationReadyDiagnostics");
  const readyBlock = sessionSource.slice(readyStart, readyEnd);
  assert.match(readyBlock, /openingProtectionAcked/);
  assert.doesNotMatch(readyBlock, /setTimeout/);
});

test("audible grace starts at output_audio_buffer.started and restores once", () => {
  assert.match(sessionSource, /beginAudibleOpeningGrace/);
  assert.match(sessionSource, /finishAudibleOpeningGrace/);
  assert.match(sessionSource, /output_audio_buffer\.started[\s\S]*beginAudibleOpeningGrace/);
  assert.match(sessionSource, /bargeInRestorationSent/);
  assert.match(sessionSource, /opening_bargein_restoration_acked/);
  assert.match(sessionSource, /deferredResponseCreateIssued/);
  // create_response false during audible grace.
  assert.match(sessionSource, /sendTurnDetectionUpdate\(false, false\)/);
  // restore interrupt+create true.
  assert.match(sessionSource, /sendTurnDetectionUpdate\(true, true\)/);
});

test("failure and cleanup paths reset protection state", () => {
  assert.match(sessionSource, /failOpeningProtection/);
  assert.match(sessionSource, /opening_protection_restored_without_audio/);
  assert.match(sessionSource, /finishAudibleOpeningGrace\("session_end"\)/);
  assert.match(sessionSource, /resetOpeningGraceState/);
  assert.match(sessionSource, /clearOpeningProtectionAckTimer/);
  assert.match(sessionSource, /clearAudibleGraceTimer/);
});

test("opening grace stays isolated to Realtime Lab (no Legacy wiring)", () => {
  assert.doesNotMatch(screenSource, /beginAudibleOpeningGrace|opening_protection_acked/);
  assert.match(sessionSource, /PhilipRealtimeLabSession/);
});
