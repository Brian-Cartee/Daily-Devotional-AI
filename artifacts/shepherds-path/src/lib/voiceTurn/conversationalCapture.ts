import {
  createPatientVoiceListener,
  type PatientVoiceListener,
  type VoiceListenUiPhase,
} from "@/lib/patientVoiceListen";

export type ConversationalCaptureCallbacks = {
  onTranscript: (final: string, interim: string) => void;
  onPhaseChange: (phase: VoiceListenUiPhase) => void;
  onMicLive: (live: boolean) => void;
  onRecorderReady: () => void;
  onListenEnd: () => void;
  onAutoSubmit: () => void;
  onInsufficientCapture: () => void;
  onTakeYourTime?: () => void;
};

export type ConversationalCaptureOptions = {
  silenceMs: number;
  preAcquiredStream?: MediaStream;
  /** Entry uses false; phase 1 may use spoken patience bridge. */
  spokenPatienceBridge?: boolean;
  callbacks: ConversationalCaptureCallbacks;
};

/** Shared conversational mic listener for all VoiceTurnController capture slots. */
export function createConversationalVoiceListener(
  opts: ConversationalCaptureOptions,
): PatientVoiceListener | null {
  const { callbacks, silenceMs, preAcquiredStream, spokenPatienceBridge } = opts;
  return createPatientVoiceListener({
    conversational: true,
    spokenPatienceBridge: spokenPatienceBridge ?? false,
    autoSubmitSilenceMs: silenceMs,
    preAcquiredStream,
    onTranscript: callbacks.onTranscript,
    onPhaseChange: callbacks.onPhaseChange,
    onMicLive: callbacks.onMicLive,
    onRecorderReady: callbacks.onRecorderReady,
    onListenEnd: callbacks.onListenEnd,
    onAutoSubmit: callbacks.onAutoSubmit,
    onInsufficientCapture: callbacks.onInsufficientCapture,
    onTakeYourTime: callbacks.onTakeYourTime,
  });
}
