/**
 * @deprecated Opening-grace barge-in protection was retired after forensic
 * session iphone-lab-1784649062218-1. Import from
 * philipRealtimeOpeningHalfDuplex.mjs instead.
 *
 * This shim keeps a few shared helpers available during the transition so
 * older test paths that only need mic-ready / turn-detection builders still
 * resolve. Grace timer / deferred-cancel / create_response toggling are gone.
 */

export {
  OPENING_HALF_DUPLEX_FAILSAFE_MS,
  buildTurnDetectionUpdate,
  canAnnounceConversationReady,
  isLocalMicrophoneReadyForConversation,
  snapshotMicTransmissionState,
  setLocalMicrophoneTransmitting,
} from "./philipRealtimeOpeningHalfDuplex.mjs";

/** @deprecated Removed with grace machine. */
export const OPENING_ASSISTANT_BARGEIN_GRACE_MS = 0;
/** @deprecated Use OPENING_HALF_DUPLEX_FAILSAFE_MS. */
export const OPENING_PROTECTION_ACK_TIMEOUT_MS = 8_000;

export function isWithinOpeningBargeInGrace() {
  return false;
}

export function buildOpeningBargeInDeferredEvent() {
  throw new Error("opening_bargein_deferred_removed_use_half_duplex");
}

export function buildOpeningBargeInGraceEndedEvent() {
  throw new Error("opening_bargein_grace_ended_removed_use_half_duplex");
}

export function decideOpeningSpeechStartedAction() {
  return "no_bargein";
}

export function decideOpeningGraceExpiryAction() {
  return "noop";
}

export function openingProtectionAckPrecedesReady() {
  return false;
}

export function firstAudioCannotPrecedeOpeningProtection() {
  return false;
}
