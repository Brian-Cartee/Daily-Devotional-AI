/**
 * Opening half-duplex handshake for Philip Realtime Lab only.
 *
 * Deterministic protection that does NOT rely on provider interrupt_response
 * suppressing barge-in during the first assistant reply:
 *
 * 1) Capture the first user turn with the mic transmitting normally.
 * 2) On the first response.created (after that turn), disable local mic
 *    transmission BEFORE assistant audio can begin.
 * 3) Philip speaks one short opening reply without local audio feeding VAD.
 * 4) Restore the mic only when the protected response is terminal AND either
 *    (a) no audio ever started, or (b) output_audio_buffer.stopped has fired.
 *    response.done alone is NOT sufficient once audio has started.
 *
 * Fail-safe: OPENING_HALF_DUPLEX_FAILSAFE_MS begins at response.created.
 * Never repeats in the same session. No raw audio.
 */

export const OPENING_HALF_DUPLEX_FAILSAFE_MS = 8_000;

/**
 * @param {{ enabled?: boolean | null, muted?: boolean | null, readyState?: string | null, publicationState?: string | null } | null | undefined} mic
 */
export function isLocalMicrophoneReadyForConversation(mic) {
  if (!mic) return false;
  if (mic.publicationState !== "published") return false;
  if (mic.readyState !== "live") return false;
  if (mic.enabled === false) return false;
  if (mic.muted === true) return false;
  return true;
}

/**
 * @param {{ enabled?: boolean | null, muted?: boolean | null, readyState?: string | null, publicationState?: string | null } | null | undefined} mic
 */
export function isLocalMicrophoneTransmissionDisabled(mic) {
  if (!mic) return false;
  return mic.enabled === false;
}

/**
 * Snapshot a local MediaStreamTrack-like object for diagnostics (no media).
 * @param {{ id?: string, enabled?: boolean, muted?: boolean, readyState?: string } | null | undefined} track
 * @param {string} [publicationState]
 */
export function snapshotMicTransmissionState(track, publicationState = "unknown") {
  if (!track) {
    return {
      trackId: null,
      enabled: null,
      muted: null,
      readyState: null,
      publicationState,
      transmitting: false,
    };
  }
  const enabled = typeof track.enabled === "boolean" ? track.enabled : null;
  return {
    trackId: track.id ?? null,
    enabled,
    muted: typeof track.muted === "boolean" ? track.muted : null,
    readyState: track.readyState ?? null,
    publicationState,
    transmitting: enabled === true,
  };
}

/**
 * Disable or enable local microphone transmission via track.enabled.
 * Does not change OS permission and does not unpublish the track.
 *
 * @param {{ enabled?: boolean } | null | undefined} track
 * @param {boolean} transmitting
 * @param {string} [publicationState]
 */
export function setLocalMicrophoneTransmitting(track, transmitting, publicationState = "published") {
  const before = snapshotMicTransmissionState(track, publicationState);
  if (!track || typeof track !== "object") {
    return {
      ok: false,
      reason: "microphone_track_missing",
      before,
      after: before,
    };
  }
  try {
    track.enabled = !!transmitting;
  } catch (error) {
    return {
      ok: false,
      reason: `microphone_enable_set_failed:${String(error?.message || error).slice(0, 120)}`,
      before,
      after: snapshotMicTransmissionState(track, publicationState),
    };
  }
  const after = snapshotMicTransmissionState(track, publicationState);
  const ok = transmitting ? after.enabled === true : after.enabled === false;
  return {
    ok,
    reason: ok ? null : "microphone_enable_state_mismatch",
    before,
    after,
  };
}

/**
 * @param {{ interruptResponse: boolean, createResponse?: boolean }} args
 */
export function buildTurnDetectionUpdate(args) {
  return {
    type: "session.update",
    session: {
      type: "realtime",
      audio: {
        input: {
          turn_detection: {
            type: "semantic_vad",
            eagerness: "auto",
            create_response:
              args.createResponse === undefined ? true : !!args.createResponse,
            interrupt_response: !!args.interruptResponse,
          },
        },
      },
    },
  };
}

/**
 * @param {{
 *   dataChannelReady: boolean,
 *   providerSessionCreated: boolean,
 *   remoteAudioReady: boolean,
 *   micReady: boolean,
 *   openingFailed?: boolean,
 * }} state
 */
export function canAnnounceConversationReady(state) {
  if (state.openingFailed) return false;
  return (
    !!state.dataChannelReady &&
    !!state.providerSessionCreated &&
    !!state.remoteAudioReady &&
    !!state.micReady
  );
}

/**
 * Pure decision: may we start half-duplex on this response.created?
 * @param {{
 *   conversationallyReady: boolean,
 *   firstUserTurnCompleted: boolean,
 *   halfDuplexConsumed: boolean,
 *   halfDuplexActive: boolean,
 *   assistantAudioAlreadyStarted: boolean,
 *   openingFailed: boolean,
 *   completed: boolean,
 * }} state
 */
export function decideHalfDuplexStart(state) {
  if (state.completed || state.openingFailed) return "noop";
  if (state.halfDuplexConsumed || state.halfDuplexActive) return "noop";
  if (!state.conversationallyReady) return "noop";
  if (!state.firstUserTurnCompleted) return "noop";
  if (state.assistantAudioAlreadyStarted) return "fail_too_late";
  return "start";
}

/**
 * Empty latch for the protected first response.
 */
export function emptyOpeningHalfDuplexLatch() {
  return {
    firstResponseTerminal: false,
    firstAudioStarted: false,
    firstAudioStopped: false,
    /** @type {string | null} */
    firstResponseStatus: /** @type {string | null} */ (null),
    restorationCompleted: false,
  };
}

/**
 * Snapshot latch fields for diagnostics / timeout evidence.
 * @param {ReturnType<typeof emptyOpeningHalfDuplexLatch> & {
 *   halfDuplexActive?: boolean,
 *   halfDuplexResponseId?: string | null,
 * }} latch
 */
export function snapshotOpeningHalfDuplexLatch(latch) {
  return {
    firstResponseTerminal: !!latch.firstResponseTerminal,
    firstAudioStarted: !!latch.firstAudioStarted,
    firstAudioStopped: !!latch.firstAudioStopped,
    firstResponseStatus: latch.firstResponseStatus ?? null,
    restorationCompleted: !!latch.restorationCompleted,
    halfDuplexActive: !!latch.halfDuplexActive,
    halfDuplexResponseId: latch.halfDuplexResponseId ?? null,
  };
}

/**
 * Two-condition completion latch.
 *
 * Restore only when:
 * - half-duplex is active and restoration has not completed, AND
 * - either (terminal && never started audio) OR (terminal && audio started && audio stopped),
 *   OR an abnormal/cleanup path forces restore.
 *
 * Holding mic after response.done while audio is still playing is intentional
 * (Build 256 defect: restore-on-done alone truncated the opening).
 *
 * output_audio_buffer.stopped correlation: OpenAI buffer events are not always
 * tagged with response id. During opening half-duplex the local mic is disabled,
 * so the only assistant output in flight is the protected first response. The
 * first started→stopped pair while halfDuplexActive therefore belongs to that
 * protected output.
 *
 * @param {{
 *   halfDuplexActive: boolean,
 *   restorationCompleted: boolean,
 *   firstResponseTerminal: boolean,
 *   firstAudioStarted: boolean,
 *   firstAudioStopped: boolean,
 *   completed?: boolean,
 *   clearedWhileDisabled?: boolean,
 *   forceCleanup?: boolean,
 * }} state
 * @returns {"noop"|"hold_until_audio_stopped"|"hold_until_terminal"|"restore_no_audio"|"restore_after_playback"|"restore_abnormal_clear"|"restore_cleanup"}
 */
export function decideHalfDuplexRestoreLatch(state) {
  if (state.restorationCompleted) return "noop";
  if (!state.halfDuplexActive) return "noop";
  if (state.forceCleanup || state.completed) return "restore_cleanup";
  if (state.clearedWhileDisabled) return "restore_abnormal_clear";

  if (state.firstResponseTerminal && !state.firstAudioStarted) {
    return "restore_no_audio";
  }
  if (state.firstResponseTerminal && state.firstAudioStarted && state.firstAudioStopped) {
    return "restore_after_playback";
  }
  if (state.firstResponseTerminal && state.firstAudioStarted && !state.firstAudioStopped) {
    return "hold_until_audio_stopped";
  }
  if (!state.firstResponseTerminal && state.firstAudioStopped) {
    return "hold_until_terminal";
  }
  return "noop";
}

/**
 * @param {object} args
 */
export function buildOpeningHalfDuplexStartedEvent(args) {
  return {
    type: "opening_half_duplex_started",
    atMs: args.atMs,
    itemId: null,
    reason: args.reason || "first_response_created",
    responseId: args.responseId ?? null,
    trackBefore: args.trackBefore ?? null,
    trackAfter: args.trackAfter ?? null,
    failsafeMs: args.failsafeMs ?? OPENING_HALF_DUPLEX_FAILSAFE_MS,
    failsafeStartsAt: "response.created",
    audioRecorded: false,
    audioPersisted: false,
  };
}

/**
 * @param {object} args
 */
export function buildOpeningHalfDuplexRestoredEvent(args) {
  return {
    type: "opening_half_duplex_restored",
    atMs: args.atMs,
    itemId: null,
    reason: args.reason || "first_response_playback_complete",
    responseId: args.responseId ?? null,
    responseStatus: args.responseStatus ?? null,
    trackAfter: args.trackAfter ?? null,
    elapsedMsFromHalfDuplexStart: args.elapsedMsFromHalfDuplexStart ?? null,
    interruptResponseRestored: !!args.interruptResponseRestored,
    latch: args.latch ?? null,
    audioRecorded: false,
    audioPersisted: false,
  };
}

/**
 * @param {object} args
 */
export function buildOpeningHalfDuplexTimeoutEvent(args) {
  return {
    type: "opening_half_duplex_timeout",
    atMs: args.atMs,
    itemId: null,
    reason: args.reason || "failsafe_timeout",
    responseId: args.responseId ?? null,
    trackAfterRestore: args.trackAfterRestore ?? null,
    micVerifiedReady: !!args.micVerifiedReady,
    elapsedMsFromHalfDuplexStart: args.elapsedMsFromHalfDuplexStart ?? null,
    failsafeMs: args.failsafeMs ?? OPENING_HALF_DUPLEX_FAILSAFE_MS,
    failsafeStartsAt: "response.created",
    latch: args.latch ?? null,
    audioRecorded: false,
    audioPersisted: false,
  };
}

/**
 * @param {object} args
 */
export function buildOpeningHalfDuplexFailedEvent(args) {
  return {
    type: "opening_half_duplex_failed",
    atMs: args.atMs,
    itemId: null,
    reason: args.reason,
    responseId: args.responseId ?? null,
    trackState: args.trackState ?? null,
    latch: args.latch ?? null,
    audioRecorded: false,
    audioPersisted: false,
  };
}

/**
 * Protocol ordering: mic must be disabled before first assistant audio.
 * @param {string[]} eventTypes
 */
export function halfDuplexMutePrecedesFirstAudio(eventTypes) {
  const mute = eventTypes.indexOf("opening_half_duplex_started");
  const audio = eventTypes.indexOf("output_audio_buffer.started");
  if (mute < 0) return false;
  if (audio < 0) return true;
  return mute < audio;
}

/**
 * When audio played, restore must follow output_audio_buffer.stopped
 * (not merely response.done).
 * @param {string[]} eventTypes
 */
export function halfDuplexRestoreFollowsPlaybackStop(eventTypes) {
  const started = eventTypes.indexOf("opening_half_duplex_started");
  const audioStart = eventTypes.indexOf("output_audio_buffer.started");
  const audioStop = eventTypes.indexOf("output_audio_buffer.stopped");
  const restored = eventTypes.indexOf("opening_half_duplex_restored");
  if (started < 0 || restored < 0) return false;
  if (audioStart < 0) {
    return started < restored;
  }
  if (audioStop < 0) return false;
  return audioStop < restored && started < restored;
}

/**
 * Build 256 observed order fixture (relative ms from forensic report).
 * Used by unpaid tests — no provider call.
 */
export const BUILD_256_OPENING_ORDER_FIXTURE = Object.freeze([
  { tRelMs: 5241, type: "response.created" },
  { tRelMs: 5241, type: "opening_half_duplex_started" },
  { tRelMs: 6066, type: "output_audio_buffer.started" },
  { tRelMs: 6506, type: "response.done" },
  // Defect: Build 256 restored here. Correct latch must HOLD until stopped.
  { tRelMs: 6760, type: "output_audio_buffer.stopped" },
]);
