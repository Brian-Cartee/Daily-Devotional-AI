/** Half-duplex hands-free voice loop — one state at a time, no overlap. */
export type VoiceConversationState =
  | "idle"
  | "requestingMicPermission"
  | "listening"
  | "speechDetected"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "waitingToResumeListening"
  | "error"
  | "ended";

export type VoiceFallbackMode = "handsFree" | "tapToTalk" | "text";

export type VoiceConversationSessionState = {
  state: VoiceConversationState;
  /** Monotonic per user↔Philip turn pair — stale async must no-op when mismatched. */
  turnId: number;
  /** Session boundary — increment on start/end/reset. */
  sessionEpoch: number;
  active: boolean;
  lastError: string | null;
  fallbackMode: VoiceFallbackMode;
};

export const INITIAL_VOICE_CONVERSATION_STATE: VoiceConversationSessionState = {
  state: "idle",
  turnId: 0,
  sessionEpoch: 0,
  active: false,
  lastError: null,
  fallbackMode: "handsFree",
};

export type VoiceConversationEvent =
  | { type: "START_SESSION"; fallbackMode?: VoiceFallbackMode }
  | { type: "END_SESSION" }
  | { type: "RESET" }
  | { type: "REQUEST_MIC" }
  | { type: "LISTENING" }
  | { type: "SPEECH_DETECTED" }
  | { type: "TRANSCRIBING" }
  | { type: "THINKING" }
  | { type: "SPEAKING" }
  | { type: "WAITING_TO_RESUME" }
  | { type: "ERROR"; message?: string }
  | { type: "FALLBACK"; mode: VoiceFallbackMode }
  | { type: "BUMP_TURN" };
