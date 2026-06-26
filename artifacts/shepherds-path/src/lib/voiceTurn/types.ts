import type { ConvoPhase } from "@/lib/useConvoMachine";

/** Which user-capture slot is active — only one at a time. */
export type VoiceCaptureSlot = "entry" | "p1" | "followup";

/**
 * Audio subsystem mode — orthogonal to convo phase but must never contradict it.
 * e.g. phase may be `entry` while audioMode is `releasing` (TTS tear-down before mic).
 */
export type VoiceAudioMode =
  | "idle"
  | "speaking"
  | "releasing"
  | "arming_mic"
  | "capturing"
  | "finalizing";

export type VoiceOrbMode = "speak" | "listen" | "idle";

export type VoiceTurnState = {
  phase: ConvoPhase;
  audioMode: VoiceAudioMode;
  captureSlot: VoiceCaptureSlot | null;
  micLive: boolean;
  micArming: boolean;
  recorderReady: boolean;
  /** Monotonic — stale async callbacks must no-op when epoch changes. */
  epoch: number;
  captureRetryCount: number;
  lastError: string | null;
};

export const INITIAL_VOICE_TURN_STATE: VoiceTurnState = {
  phase: "idle",
  audioMode: "idle",
  captureSlot: null,
  micLive: false,
  micArming: false,
  recorderReady: false,
  epoch: 0,
  captureRetryCount: 0,
  lastError: null,
};

export type VoiceTurnEvent =
  | { type: "CONVO"; phase: ConvoPhase }
  | { type: "SPEAK_BEGIN" }
  | { type: "SPEAK_END" }
  | { type: "RELEASE_BEGIN" }
  | { type: "RELEASE_END" }
  | { type: "MIC_ARM"; slot: VoiceCaptureSlot }
  | { type: "MIC_LIVE"; slot: VoiceCaptureSlot }
  | { type: "RECORDER_READY" }
  | { type: "MIC_STOP" }
  | { type: "CAPTURE_FINALIZE_BEGIN" }
  | { type: "CAPTURE_FINALIZE_END" }
  | { type: "CAPTURE_INSUFFICIENT"; slot: VoiceCaptureSlot }
  | { type: "CAPTURE_RETRY"; slot: VoiceCaptureSlot }
  | { type: "RESET" }
  | { type: "ERROR"; message: string };

export type VoiceTurnInvariantViolation = {
  code: string;
  detail: string;
};
