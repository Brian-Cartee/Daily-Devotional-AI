import type { PatientVoiceListener } from "@/lib/patientVoiceListen";
import { interruptPhilipAudioSession, releasePhilipAudioSession } from "@/lib/philipAudioSession";
import { createVoiceEpochGuard } from "./asyncGuard";
import { voiceTurnDiag, voiceTurnDiagInvariants } from "./diagnostics";
import { voiceTurnReducer } from "./reducer";
import type { VoiceCaptureSlot, VoiceTurnEvent, VoiceTurnState } from "./types";
import { INITIAL_VOICE_TURN_STATE } from "./types";

export type OpenCaptureParams = {
  slot: VoiceCaptureSlot;
  /** Build listener after audio session is released. Return null if capture cannot start. */
  buildListener: () => PatientVoiceListener | null;
  /** Called after listener.start() succeeds. */
  onStarted?: (listener: PatientVoiceListener) => void;
};

export type VoiceTurnController = {
  getState: () => VoiceTurnState;
  dispatch: (event: VoiceTurnEvent) => void;
  syncConvoPhase: (phase: VoiceTurnState["phase"]) => void;
  interruptSpeak: () => void;
  openCapture: (params: OpenCaptureParams) => Promise<number>;
  manualDone: () => void;
  destroyCapture: () => void;
  getListener: () => PatientVoiceListener | null;
  getActiveSlot: () => VoiceCaptureSlot | null;
  isEpochCurrent: (epoch: number) => boolean;
};

export function createVoiceTurnController(): VoiceTurnController {
  let state: VoiceTurnState = { ...INITIAL_VOICE_TURN_STATE };
  let listener: PatientVoiceListener | null = null;
  let activeSlot: VoiceCaptureSlot | null = null;
  const epochGuard = createVoiceEpochGuard();

  const apply = (event: VoiceTurnEvent) => {
    state = voiceTurnReducer(state, event);
    voiceTurnDiag("dispatch", event);
    voiceTurnDiagInvariants(state);
  };

  const destroyCapture = () => {
    listener?.destroy();
    listener = null;
    activeSlot = null;
    apply({ type: "MIC_STOP" });
  };

  return {
    getState: () => state,
    dispatch: apply,
    syncConvoPhase: (phase) => apply({ type: "CONVO", phase }),
    interruptSpeak: () => {
      voiceTurnDiag("interrupt_speak");
      interruptPhilipAudioSession();
    },
    isEpochCurrent: (epoch) => !epochGuard.isStale(epoch),
    destroyCapture,
    getListener: () => listener,
    getActiveSlot: () => activeSlot,

    async openCapture(params) {
      const epoch = epochGuard.bump();
      activeSlot = params.slot;

      destroyCapture();
      interruptPhilipAudioSession();
      apply({ type: "RELEASE_BEGIN" });
      apply({ type: "MIC_ARM", slot: params.slot });

      await releasePhilipAudioSession();
      if (epochGuard.isStale(epoch)) {
        voiceTurnDiag("open_capture_stale", `slot=${params.slot} after_release`);
        return epoch;
      }
      apply({ type: "RELEASE_END" });

      const instance = params.buildListener();
      if (!instance) {
        apply({ type: "ERROR", message: "listener_create_failed" });
        apply({ type: "MIC_STOP" });
        activeSlot = null;
        return epoch;
      }

      listener = instance;
      listener.start();
      apply({ type: "MIC_LIVE", slot: params.slot });
      params.onStarted?.(instance);
      voiceTurnDiag("capture_started", `slot=${params.slot}`);
      return epoch;
    },

    manualDone() {
      voiceTurnDiag("manual_done", `slot=${activeSlot ?? "-"}`);
      if (!listener) return;
      if (listener.isActive()) {
        listener.finishSpeaking();
        return;
      }
      listener.forceSubmit();
    },
  };
}
