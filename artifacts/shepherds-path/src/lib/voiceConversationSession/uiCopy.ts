import type { VoiceConversationState, VoiceFallbackMode } from "./types";

/** Pastoral status copy — calm, present, not technical. */
export function voiceConversationStatusLabel(
  state: VoiceConversationState,
  fallbackMode: VoiceFallbackMode,
): string | null {
  switch (state) {
    case "idle":
      return null;
    case "requestingMicPermission":
      return "Getting ready to listen…";
    case "listening":
      return "Philip is listening";
    case "speechDetected":
      return "I heard you";
    case "transcribing":
      return "Philip is holding your words…";
    case "thinking":
      return "Philip is sitting with that";
    case "speaking":
      return "Philip is speaking";
    case "waitingToResumeListening":
      return "Listening again…";
    case "error":
      if (fallbackMode === "text") {
        return "Philip's voice had trouble for a moment, but your words are still here. You can keep going by text.";
      }
      return "Philip's voice had trouble for a moment — tap when you're ready to speak again.";
    case "ended":
      return null;
    default:
      return null;
  }
}
