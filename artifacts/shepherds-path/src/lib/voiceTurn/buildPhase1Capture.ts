import type { OpenCaptureParams } from "./createVoiceTurnController";
import { createConversationalVoiceListener } from "./conversationalCapture";
import type { VoiceCaptureSlot } from "./types";

export type Phase1CaptureDeps = {
  silenceMs: number;
  onTranscript: (final: string, interim: string) => void;
  onPhaseChange: (phase: import("@/lib/patientVoiceListen").VoiceListenUiPhase) => void;
  onMicLive: (live: boolean) => void;
  onRecorderReady: () => void;
  onListenEnd: () => void;
  onAutoSubmit: () => void;
  onInsufficientCapture: () => void;
  onTakeYourTime: () => void;
};

export function buildPhase1OpenCaptureParams(deps: Phase1CaptureDeps): OpenCaptureParams {
  return {
    slot: "p1",
    buildListener: () =>
      createConversationalVoiceListener({
        slot: "p1" as VoiceCaptureSlot,
        silenceMs: deps.silenceMs,
        spokenPatienceBridge: true,
        callbacks: {
          onTranscript: deps.onTranscript,
          onPhaseChange: deps.onPhaseChange,
          onMicLive: deps.onMicLive,
          onRecorderReady: deps.onRecorderReady,
          onListenEnd: deps.onListenEnd,
          onAutoSubmit: deps.onAutoSubmit,
          onInsufficientCapture: deps.onInsufficientCapture,
          onTakeYourTime: deps.onTakeYourTime,
        },
      }),
  };
}
