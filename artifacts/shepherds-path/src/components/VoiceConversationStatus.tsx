import type { VoiceConversationState } from "@/lib/voiceConversationSession";

type Props = {
  label: string | null;
  state: VoiceConversationState;
  visible?: boolean;
};

/** Calm voice-session status — one line, never alarmist. */
export function VoiceConversationStatus({ label, state, visible = true }: Props) {
  if (!visible || !label) return null;

  const isListening =
    state === "listening" || state === "speechDetected" || state === "waitingToResumeListening";

  return (
    <p
      data-testid="voice-conversation-status"
      aria-live="polite"
      style={{
        margin: 0,
        textAlign: "center",
        fontSize: "13px",
        letterSpacing: "0.06em",
        lineHeight: 1.5,
        color: isListening ? "rgba(167,139,250,0.72)" : "rgba(255,255,255,0.42)",
        maxWidth: "280px",
      }}
    >
      {label}
    </p>
  );
}
