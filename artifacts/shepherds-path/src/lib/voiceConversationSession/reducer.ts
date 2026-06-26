import type { VoiceConversationEvent, VoiceConversationSessionState } from "./types";
import { INITIAL_VOICE_CONVERSATION_STATE } from "./types";

export function voiceConversationReducer(
  prev: VoiceConversationSessionState,
  event: VoiceConversationEvent,
): VoiceConversationSessionState {
  switch (event.type) {
    case "START_SESSION":
      return {
        ...INITIAL_VOICE_CONVERSATION_STATE,
        sessionEpoch: prev.sessionEpoch + 1,
        turnId: 1,
        active: true,
        state: "idle",
        fallbackMode: event.fallbackMode ?? prev.fallbackMode,
        lastError: null,
      };
    case "END_SESSION":
      return {
        ...prev,
        active: false,
        state: "ended",
      };
    case "RESET":
      return { ...INITIAL_VOICE_CONVERSATION_STATE, fallbackMode: prev.fallbackMode };
    case "BUMP_TURN":
      return { ...prev, turnId: prev.turnId + 1, lastError: null };
    case "REQUEST_MIC":
      return prev.active
        ? { ...prev, state: "requestingMicPermission", lastError: null }
        : prev;
    case "LISTENING":
      return prev.active ? { ...prev, state: "listening", lastError: null } : prev;
    case "SPEECH_DETECTED":
      return prev.active && (prev.state === "listening" || prev.state === "speechDetected")
        ? { ...prev, state: "speechDetected" }
        : prev;
    case "TRANSCRIBING":
      return prev.active ? { ...prev, state: "transcribing" } : prev;
    case "THINKING":
      return prev.active ? { ...prev, state: "thinking" } : prev;
    case "SPEAKING":
      return prev.active ? { ...prev, state: "speaking", lastError: null } : prev;
    case "WAITING_TO_RESUME":
      return prev.active ? { ...prev, state: "waitingToResumeListening" } : prev;
    case "ERROR":
      return prev.active
        ? { ...prev, state: "error", lastError: event.message ?? "voice_error" }
        : prev;
    case "FALLBACK":
      return { ...prev, fallbackMode: event.mode, state: prev.state === "error" ? "error" : prev.state };
    default:
      return prev;
  }
}
