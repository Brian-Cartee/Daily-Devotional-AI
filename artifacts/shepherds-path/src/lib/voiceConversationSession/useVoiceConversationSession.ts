import { useCallback, useMemo, useReducer, useRef } from "react";
import { voiceConversationReducer } from "./reducer";
import type { VoiceConversationSessionState, VoiceFallbackMode } from "./types";
import { INITIAL_VOICE_CONVERSATION_STATE } from "./types";
import { voiceConversationStatusLabel } from "./uiCopy";

export type VoiceConversationSessionApi = {
  state: VoiceConversationSessionState;
  statusLabel: string | null;
  turnId: number;
  sessionEpoch: number;
  isActive: boolean;
  startSession: (fallbackMode?: VoiceFallbackMode) => void;
  endSession: () => void;
  reset: () => void;
  bumpTurn: () => number;
  isCurrentTurn: (turnId: number) => boolean;
  isCurrentSession: (sessionEpoch: number) => boolean;
  onRequestMic: () => void;
  onListening: () => void;
  onSpeechDetected: () => void;
  onTranscribing: () => void;
  onThinking: () => void;
  onSpeaking: () => void;
  onWaitingToResume: () => void;
  onError: (message?: string) => void;
  setFallbackMode: (mode: VoiceFallbackMode) => void;
};

export function useVoiceConversationSession(): VoiceConversationSessionApi {
  const [state, dispatch] = useReducer(voiceConversationReducer, INITIAL_VOICE_CONVERSATION_STATE);
  const turnRef = useRef(state.turnId);
  const epochRef = useRef(state.sessionEpoch);
  turnRef.current = state.turnId;
  epochRef.current = state.sessionEpoch;

  const dispatchEvent = useCallback((event: Parameters<typeof voiceConversationReducer>[1]) => {
    dispatch(event);
  }, []);

  const bumpTurn = useCallback(() => {
    const next = turnRef.current + 1;
    dispatchEvent({ type: "BUMP_TURN" });
    return next;
  }, [dispatchEvent]);

  const startSession = useCallback(
    (fallbackMode?: VoiceFallbackMode) => {
      dispatchEvent({ type: "START_SESSION", fallbackMode });
    },
    [dispatchEvent],
  );

  const statusLabel = useMemo(
    () => voiceConversationStatusLabel(state.state, state.fallbackMode),
    [state.state, state.fallbackMode],
  );

  return {
    state,
    statusLabel,
    turnId: state.turnId,
    sessionEpoch: state.sessionEpoch,
    isActive: state.active,
    startSession,
    endSession: useCallback(() => dispatchEvent({ type: "END_SESSION" }), [dispatchEvent]),
    reset: useCallback(() => dispatchEvent({ type: "RESET" }), [dispatchEvent]),
    bumpTurn,
    isCurrentTurn: useCallback((turnId: number) => turnRef.current === turnId, []),
    isCurrentSession: useCallback((epoch: number) => epochRef.current === epoch, []),
    onRequestMic: useCallback(() => dispatchEvent({ type: "REQUEST_MIC" }), [dispatchEvent]),
    onListening: useCallback(() => dispatchEvent({ type: "LISTENING" }), [dispatchEvent]),
    onSpeechDetected: useCallback(() => dispatchEvent({ type: "SPEECH_DETECTED" }), [dispatchEvent]),
    onTranscribing: useCallback(() => dispatchEvent({ type: "TRANSCRIBING" }), [dispatchEvent]),
    onThinking: useCallback(() => dispatchEvent({ type: "THINKING" }), [dispatchEvent]),
    onSpeaking: useCallback(() => dispatchEvent({ type: "SPEAKING" }), [dispatchEvent]),
    onWaitingToResume: useCallback(() => dispatchEvent({ type: "WAITING_TO_RESUME" }), [dispatchEvent]),
    onError: useCallback(
      (message?: string) => dispatchEvent({ type: "ERROR", message }),
      [dispatchEvent],
    ),
    setFallbackMode: useCallback(
      (mode: VoiceFallbackMode) => dispatchEvent({ type: "FALLBACK", mode }),
      [dispatchEvent],
    ),
  };
}
