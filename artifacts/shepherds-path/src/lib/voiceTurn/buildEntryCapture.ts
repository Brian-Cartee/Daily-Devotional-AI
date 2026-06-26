import type { OpenCaptureParams } from "./createVoiceTurnController";
import { createConversationalVoiceListener } from "./conversationalCapture";

export type EntryCaptureDeps = {
  silenceMs: number;
  preAcquiredStream?: MediaStream;
  onTranscript: (final: string, interim: string) => void;
  onPhaseChange: (phase: import("@/lib/patientVoiceListen").VoiceListenUiPhase) => void;
  onMicLive: (live: boolean) => void;
  onRecorderReady: () => void;
  onListenEnd: () => void;
  onAutoSubmit: () => void;
  onInsufficientCapture: () => void;
};

export function buildEntryOpenCaptureParams(deps: EntryCaptureDeps): OpenCaptureParams {
  return {
    slot: "entry",
    buildListener: () =>
      createConversationalVoiceListener({
        silenceMs: deps.silenceMs,
        preAcquiredStream: deps.preAcquiredStream,
        spokenPatienceBridge: false,
        callbacks: {
          onTranscript: deps.onTranscript,
          onPhaseChange: deps.onPhaseChange,
          onMicLive: deps.onMicLive,
          onRecorderReady: deps.onRecorderReady,
          onListenEnd: deps.onListenEnd,
          onAutoSubmit: deps.onAutoSubmit,
          onInsufficientCapture: deps.onInsufficientCapture,
        },
      }),
  };
}
