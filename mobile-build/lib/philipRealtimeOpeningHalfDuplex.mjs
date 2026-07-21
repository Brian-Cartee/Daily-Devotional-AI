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
 * 4) On first response terminal state (or fail-safe timeout), restore the mic
 *    once, restore interrupt_response:true once, and return to full duplex.
 *
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
 * Pure decision: may we restore after a terminal response?
 * @param {{
 *   halfDuplexActive: boolean,
 *   halfDuplexResponseId: string | null,
 *   terminalResponseId: string | null | undefined,
 *   completed: boolean,
 * }} state
 */
export function decideHalfDuplexRestore(state) {
  if (!state.halfDuplexActive) return "noop";
  if (state.completed) return "restore_cleanup";
  // While half-duplex is active the local mic is disabled, so this terminal
  // event is the opening response (or a failed opening). Restore exactly once.
  if (state.terminalResponseId) {
    if (
      !state.halfDuplexResponseId ||
      String(state.terminalResponseId) === String(state.halfDuplexResponseId)
    ) {
      return "restore_after_terminal";
    }
    // Id mismatch is anomalous; still restore so the mic cannot stick muted.
    return "restore_after_terminal";
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
    reason: args.reason || "first_response_terminal",
    responseId: args.responseId ?? null,
    responseStatus: args.responseStatus ?? null,
    trackAfter: args.trackAfter ?? null,
    elapsedMsFromHalfDuplexStart: args.elapsedMsFromHalfDuplexStart ?? null,
    interruptResponseRestored: !!args.interruptResponseRestored,
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
    audioRecorded: false,
    audioPersisted: false,
  };
}

/**
 * Protocol ordering: mic must be disabled before first assistant audio in a recorded timeline.
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
 * Protocol ordering: restore must follow first audio (or still valid if no audio).
 * @param {string[]} eventTypes
 */
export function halfDuplexRestoreFollowsTerminal(eventTypes) {
  const started = eventTypes.indexOf("opening_half_duplex_started");
  const restored = eventTypes.indexOf("opening_half_duplex_restored");
  if (started < 0 || restored < 0) return false;
  return started < restored;
}
