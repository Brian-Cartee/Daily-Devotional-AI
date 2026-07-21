/**
 * Opening-stabilization protocol for Philip Realtime Lab only.
 *
 * Sequence (no race with first audio):
 * 1) Send/confirm interrupt_response:false BEFORE conversation_ready.
 * 2) Ready only after session.updated acknowledges that protection.
 * 3) 1000ms audible grace still starts at first output_audio_buffer.started.
 * 4) During audible grace, create_response:false so provider auto-create cannot
 *    overlap the first reply; user audio/turns are preserved.
 * 5) After 1000ms (or early audio end), restore interrupt_response:true and
 *    create_response:true once; if needed, cancel assistant and/or issue exactly
 *    one response.create for a deferred completed user turn.
 *
 * No raw audio.
 */

export const OPENING_ASSISTANT_BARGEIN_GRACE_MS = 1000;
export const OPENING_PROTECTION_ACK_TIMEOUT_MS = 8_000;

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
 * @param {number | null | undefined} graceStartedAtMs
 * @param {number} nowMs
 * @param {number} [graceMs]
 */
export function isWithinOpeningBargeInGrace(
  graceStartedAtMs,
  nowMs,
  graceMs = OPENING_ASSISTANT_BARGEIN_GRACE_MS,
) {
  if (graceStartedAtMs == null || typeof graceStartedAtMs !== "number") return false;
  if (typeof nowMs !== "number") return false;
  return nowMs - graceStartedAtMs < graceMs;
}

/**
 * @param {{ interruptResponse: boolean, createResponse: boolean }} args
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
            create_response: !!args.createResponse,
            interrupt_response: !!args.interruptResponse,
          },
        },
      },
    },
  };
}

/** @deprecated use buildTurnDetectionUpdate */
export function buildTurnDetectionInterruptUpdate(interruptResponse) {
  return buildTurnDetectionUpdate({
    interruptResponse: !!interruptResponse,
    createResponse: true,
  });
}

/**
 * Documented / SDK-legitimate turn_detection locations on session.updated.
 * Prefer GA nesting; fall back to legacy beta top-level turn_detection.
 * Do not deep-search arbitrary nesting (unexpected shapes must not ack).
 */
export const SESSION_UPDATED_TURN_DETECTION_PATHS = Object.freeze([
  "session.audio.input.turn_detection",
  "session.turn_detection",
]);

/**
 * Inspect a provider session.updated for turn_detection without treating the
 * client's outgoing session.update as proof.
 *
 * Official GA shape (openai@6.35 SessionUpdatedEvent / RealtimeSessionCreateRequest):
 *   { type: "session.updated", session: { audio: { input: { turn_detection: {
 *       type, eagerness?, create_response?, interrupt_response?
 *   }}}}}
 * Docs: session.updated carries the full effective configuration. Client
 * session.update may omit unchanged fields; the ack must still positively
 * include interrupt_response when we require it — absence is not false.
 *
 * @param {Record<string, unknown> | null | undefined} event
 * @returns {{
 *   turnDetection: { type: unknown, create_response: unknown, interrupt_response: unknown } | null,
 *   verificationPath: string | null,
 *   interruptResponsePresent: boolean,
 *   interruptResponseValue: boolean | null,
 * }}
 */
export function inspectSessionUpdatedTurnDetection(event) {
  const empty = {
    turnDetection: null,
    verificationPath: null,
    interruptResponsePresent: false,
    interruptResponseValue: null,
  };
  if (!event || typeof event !== "object") return empty;
  const session = event.session;
  if (!session || typeof session !== "object") return empty;

  /** @type {Array<{ path: string, td: Record<string, unknown> | null | undefined }>} */
  const candidates = [];
  const audio = session.audio;
  if (audio && typeof audio === "object") {
    const input = audio.input;
    if (input && typeof input === "object") {
      candidates.push({
        path: "session.audio.input.turn_detection",
        td: /** @type {Record<string, unknown> | null | undefined} */ (input.turn_detection),
      });
    }
  }
  candidates.push({
    path: "session.turn_detection",
    td: /** @type {Record<string, unknown> | null | undefined} */ (session.turn_detection),
  });

  for (const { path, td } of candidates) {
    if (!td || typeof td !== "object" || Array.isArray(td)) continue;
    const present = Object.prototype.hasOwnProperty.call(td, "interrupt_response");
    const raw = present ? td.interrupt_response : undefined;
    return {
      turnDetection: {
        type: td.type ?? null,
        create_response: td.create_response,
        interrupt_response: present ? raw : undefined,
      },
      verificationPath: path,
      interruptResponsePresent: present,
      interruptResponseValue: typeof raw === "boolean" ? raw : null,
    };
  }
  return empty;
}

/**
 * Best-effort extract of turn_detection from a session.updated payload.
 * @param {Record<string, unknown> | null | undefined} event
 */
export function extractTurnDetectionFromSessionUpdated(event) {
  return inspectSessionUpdatedTurnDetection(event).turnDetection;
}

/**
 * Opening protection is active when interrupt_response is explicitly false.
 * Absence / undefined / null must never count as acknowledged.
 * @param {{ interrupt_response?: unknown } | null | undefined} td
 */
export function isOpeningProtectionAcknowledged(td) {
  return !!td && td.interrupt_response === false;
}

/**
 * Restoration is acknowledged when interrupt_response is explicitly true.
 * @param {{ interrupt_response?: unknown } | null | undefined} td
 */
export function isBargeInRestorationAcknowledged(td) {
  return !!td && td.interrupt_response === true;
}

/**
 * Evaluate a provider event for opening-protection acknowledgment.
 * Never accepts missing interrupt_response as false.
 *
 * @param {Record<string, unknown> | null | undefined} event
 * @param {{
 *   requestedAtMs?: number | null,
 *   nowMs?: number,
 *   alreadyAcked?: boolean,
 *   timedOutOrFailed?: boolean,
 *   completed?: boolean,
 * }} [timing]
 */
export function evaluateOpeningProtectionAcknowledgment(event, timing = {}) {
  const nowMs = typeof timing.nowMs === "number" ? timing.nowMs : Date.now();
  const requestedAtMs =
    typeof timing.requestedAtMs === "number" ? timing.requestedAtMs : null;
  const elapsedMsFromUpdateSent =
    requestedAtMs == null ? null : Math.max(0, nowMs - requestedAtMs);

  const base = {
    acknowledgmentEventReceived: false,
    verificationPath: null,
    confirmedValue: null,
    interruptResponsePresent: false,
    elapsedMsFromUpdateSent,
    acknowledged: false,
    failureReason: /** @type {string | null} */ (null),
    turnDetection: null,
  };

  if (!event || typeof event !== "object" || event.type !== "session.updated") {
    return {
      ...base,
      failureReason: "not_session_updated",
    };
  }

  base.acknowledgmentEventReceived = true;

  if (!event.session || typeof event.session !== "object") {
    return {
      ...base,
      failureReason: "session_missing",
    };
  }

  const inspected = inspectSessionUpdatedTurnDetection(event);
  base.verificationPath = inspected.verificationPath;
  base.interruptResponsePresent = inspected.interruptResponsePresent;
  base.confirmedValue = inspected.interruptResponseValue;
  base.turnDetection = inspected.turnDetection;

  if (!inspected.turnDetection || !inspected.verificationPath) {
    return {
      ...base,
      failureReason: "turn_detection_missing",
    };
  }

  if (!inspected.interruptResponsePresent) {
    return {
      ...base,
      failureReason: "interrupt_response_absent",
    };
  }

  if (inspected.interruptResponseValue !== false) {
    return {
      ...base,
      failureReason:
        inspected.interruptResponseValue === true
          ? "interrupt_response_true"
          : "interrupt_response_not_false",
    };
  }

  // Explicit false established.
  if (timing.timedOutOrFailed || timing.completed) {
    return {
      ...base,
      acknowledged: false,
      failureReason: "acknowledgment_after_timeout_or_end",
    };
  }
  if (timing.alreadyAcked) {
    return {
      ...base,
      acknowledged: false,
      failureReason: "already_acknowledged",
    };
  }

  return {
    ...base,
    acknowledged: true,
    failureReason: null,
  };
}

/**
 * Sanitized diagnostic record for evidence / UI logs (no secrets, no raw audio).
 * @param {ReturnType<typeof evaluateOpeningProtectionAcknowledgment>} evaluation
 * @param {number} atMs
 */
export function buildOpeningProtectionAckDiagnostic(evaluation, atMs) {
  return {
    type: "opening_protection_ack_diagnostic",
    atMs,
    acknowledgmentEventReceived: !!evaluation.acknowledgmentEventReceived,
    verificationPath: evaluation.verificationPath,
    confirmedValue: evaluation.confirmedValue,
    interruptResponsePresent: !!evaluation.interruptResponsePresent,
    elapsedMsFromUpdateSent: evaluation.elapsedMsFromUpdateSent,
    acknowledged: !!evaluation.acknowledged,
    failureReason: evaluation.failureReason,
    audioRecorded: false,
    audioPersisted: false,
  };
}

/**
 * @param {{
 *   atMs: number,
 *   itemId?: unknown,
 *   assistantAudioPlayedMs: number | null,
 *   graceMs?: number,
 * }} args
 */
export function buildOpeningBargeInDeferredEvent(args) {
  return {
    type: "opening_bargein_deferred",
    atMs: args.atMs,
    itemId: args.itemId ?? null,
    assistantAudioPlayedMs: args.assistantAudioPlayedMs,
    graceMs: args.graceMs ?? OPENING_ASSISTANT_BARGEIN_GRACE_MS,
    cancellationSuppressed: true,
    userAudioPreserved: true,
    audioRecorded: false,
    audioPersisted: false,
  };
}

/**
 * @param {{
 *   atMs: number,
 *   userStillSpeaking: boolean,
 *   cancelledBecauseSpeaking: boolean,
 *   issuedDeferredResponseCreate: boolean,
 *   graceMs?: number,
 * }} args
 */
export function buildOpeningBargeInGraceEndedEvent(args) {
  return {
    type: "opening_bargein_grace_ended",
    atMs: args.atMs,
    itemId: null,
    graceMs: args.graceMs ?? OPENING_ASSISTANT_BARGEIN_GRACE_MS,
    userStillSpeaking: !!args.userStillSpeaking,
    cancelledBecauseSpeaking: !!args.cancelledBecauseSpeaking,
    issuedDeferredResponseCreate: !!args.issuedDeferredResponseCreate,
    audioRecorded: false,
    audioPersisted: false,
  };
}

/**
 * Pure decision: speech_started while first assistant audio is in the 1s window.
 */
export function decideOpeningSpeechStartedAction(state) {
  const within =
    state.audibleGraceActive &&
    isWithinOpeningBargeInGrace(state.graceStartedAtMs, state.nowMs);
  if (within && state.duringAssistantAudio) {
    return "defer_cancellation";
  }
  if (state.duringAssistantAudio) {
    return "allow_bargein";
  }
  return "no_bargein";
}

/**
 * After audible grace ends: restore barge-in, optionally cancel, optionally
 * create exactly one deferred response for speech that completed inside grace.
 *
 * @param {{
 *   audibleGraceActive: boolean,
 *   listening: boolean,
 *   deferredSpeechCompleted: boolean,
 *   restorationAlreadySent: boolean,
 * }} state
 */
export function decideOpeningGraceExpiryAction(state) {
  if (state.restorationAlreadySent) return "noop";
  if (!state.audibleGraceActive) return "noop";
  if (state.listening) {
    return "restore_cancel_assistant";
  }
  if (state.deferredSpeechCompleted) {
    return "restore_and_response_create_once";
  }
  return "restore_only";
}

/**
 * Whether conversation_ready may be announced.
 * @param {{
 *   dataChannelReady: boolean,
 *   providerSessionCreated: boolean,
 *   remoteAudioReady: boolean,
 *   openingProtectionAcked: boolean,
 *   openingProtectionFailed: boolean,
 *   micReady: boolean,
 * }} state
 */
export function canAnnounceConversationReady(state) {
  if (state.openingProtectionFailed) return false;
  return (
    !!state.dataChannelReady &&
    !!state.providerSessionCreated &&
    !!state.remoteAudioReady &&
    !!state.openingProtectionAcked &&
    !!state.micReady
  );
}

/**
 * Protocol-ordering fixture: events that must precede conversation_ready.
 * @param {string[]} eventTypes
 */
export function openingProtectionAckPrecedesReady(eventTypes) {
  const ack = eventTypes.indexOf("opening_protection_acked");
  const ready = eventTypes.indexOf("conversation_ready");
  if (ack < 0) return false;
  if (ready < 0) return true;
  return ack < ready;
}

/**
 * Prove first audio cannot precede disabling protection in a recorded timeline.
 * @param {string[]} eventTypes
 */
export function firstAudioCannotPrecedeOpeningProtection(eventTypes) {
  const prot = eventTypes.indexOf("opening_protection_acked");
  const audio = eventTypes.indexOf("output_audio_buffer.started");
  if (prot < 0) return false;
  if (audio < 0) return true;
  return prot < audio;
}
