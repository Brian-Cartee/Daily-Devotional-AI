/**
 * Provider session.updated shapes for opening-protection acknowledgment tests.
 *
 * Preserved iPhone/phase2 evidence only stores sanitized { type, atMs[, itemId] }
 * for session.updated — never the full provider payload. These fixtures follow:
 * - openai@6.35 SessionUpdatedEvent → RealtimeSessionCreateRequest
 *   nesting: session.audio.input.turn_detection
 * - Official docs: session.updated shows the full effective configuration
 * - Legacy beta fallback: session.turn_detection
 *
 * Outgoing client session.update is NOT used as acknowledgment proof.
 */

/** Official GA full effective config with interrupt_response explicitly false. */
export const SESSION_UPDATED_GA_INTERRUPT_FALSE = Object.freeze({
  type: "session.updated",
  event_id: "evt_ack_false",
  session: {
    type: "realtime",
    model: "gpt-realtime-2.1",
    audio: {
      input: {
        turn_detection: {
          type: "semantic_vad",
          eagerness: "auto",
          create_response: true,
          interrupt_response: false,
        },
      },
      output: { voice: "cedar" },
    },
  },
});

/** Explicit true — must not acknowledge opening protection. */
export const SESSION_UPDATED_GA_INTERRUPT_TRUE = Object.freeze({
  type: "session.updated",
  event_id: "evt_ack_true",
  session: {
    type: "realtime",
    audio: {
      input: {
        turn_detection: {
          type: "semantic_vad",
          eagerness: "auto",
          create_response: true,
          interrupt_response: true,
        },
      },
    },
  },
});

/**
 * turn_detection present but interrupt_response omitted.
 * Docs say full effective config should include the field; if a payload ever
 * omits it, we must NOT infer false.
 */
export const SESSION_UPDATED_GA_INTERRUPT_MISSING = Object.freeze({
  type: "session.updated",
  event_id: "evt_ack_missing",
  session: {
    type: "realtime",
    audio: {
      input: {
        turn_detection: {
          type: "semantic_vad",
          eagerness: "auto",
          create_response: true,
        },
      },
    },
  },
});

/** Unexpected nesting — must not acknowledge. */
export const SESSION_UPDATED_UNEXPECTED_NESTING = Object.freeze({
  type: "session.updated",
  event_id: "evt_ack_nested_wrong",
  session: {
    type: "realtime",
    audio: {
      turn_detection: {
        type: "semantic_vad",
        interrupt_response: false,
      },
    },
  },
});

/** Unrelated session.updated (no turn_detection) — must not acknowledge. */
export const SESSION_UPDATED_UNRELATED_VOICE_ONLY = Object.freeze({
  type: "session.updated",
  event_id: "evt_ack_unrelated",
  session: {
    type: "realtime",
    audio: {
      output: { voice: "cedar", speed: 0.9 },
    },
  },
});

/** Legacy beta top-level turn_detection with explicit false. */
export const SESSION_UPDATED_LEGACY_INTERRUPT_FALSE = Object.freeze({
  type: "session.updated",
  event_id: "evt_ack_legacy_false",
  session: {
    type: "realtime",
    turn_detection: {
      type: "semantic_vad",
      create_response: true,
      interrupt_response: false,
    },
  },
});

/** Sanitized evidence shape as actually persisted (no session payload). */
export const SESSION_UPDATED_SANITIZED_EVIDENCE_ONLY = Object.freeze({
  type: "session.updated",
  atMs: 1_784_588_727_469,
  itemId: null,
});
