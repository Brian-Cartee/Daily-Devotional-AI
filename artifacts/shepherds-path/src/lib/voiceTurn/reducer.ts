import type {
  VoiceTurnEvent,
  VoiceTurnInvariantViolation,
  VoiceTurnState,
} from "./types";
import { INITIAL_VOICE_TURN_STATE } from "./types";

function bumpEpoch(state: VoiceTurnState): VoiceTurnState {
  return { ...state, epoch: state.epoch + 1 };
}

export function voiceTurnReducer(
  state: VoiceTurnState,
  event: VoiceTurnEvent,
): VoiceTurnState {
  switch (event.type) {
    case "CONVO":
      return { ...state, phase: event.phase };

    case "SPEAK_BEGIN":
      return bumpEpoch({
        ...state,
        audioMode: "speaking",
        captureSlot: null,
        micLive: false,
        micArming: false,
        recorderReady: false,
        lastError: null,
      });

    case "SPEAK_END":
      return { ...state, audioMode: state.audioMode === "speaking" ? "idle" : state.audioMode };

    case "RELEASE_BEGIN":
      return bumpEpoch({
        ...state,
        audioMode: "releasing",
        micLive: false,
        micArming: false,
        recorderReady: false,
      });

    case "RELEASE_END":
      return {
        ...state,
        audioMode: state.audioMode === "releasing" ? "idle" : state.audioMode,
      };

    case "MIC_ARM":
      return bumpEpoch({
        ...state,
        audioMode: "arming_mic",
        captureSlot: event.slot,
        micArming: true,
        micLive: false,
        recorderReady: false,
        lastError: null,
      });

    case "MIC_LIVE":
      if (state.captureSlot && state.captureSlot !== event.slot) {
        return state;
      }
      return {
        ...state,
        audioMode: "capturing",
        captureSlot: event.slot,
        micLive: true,
        micArming: false,
      };

    case "RECORDER_READY":
      if (!state.micLive) return state;
      return { ...state, recorderReady: true };

    case "MIC_STOP":
      return {
        ...state,
        audioMode: "idle",
        captureSlot: null,
        micLive: false,
        micArming: false,
        recorderReady: false,
      };

    case "CAPTURE_FINALIZE_BEGIN":
      return { ...state, audioMode: "finalizing", micLive: false, micArming: false };

    case "CAPTURE_FINALIZE_END":
      return {
        ...state,
        audioMode: "idle",
        captureSlot: null,
        micLive: false,
        micArming: false,
        recorderReady: false,
      };

    case "CAPTURE_INSUFFICIENT":
      return {
        ...state,
        audioMode: "idle",
        micLive: false,
        micArming: false,
        recorderReady: false,
        lastError: "insufficient_capture",
      };

    case "CAPTURE_RETRY":
      return {
        ...state,
        captureRetryCount: state.captureRetryCount + 1,
        lastError: null,
      };

    case "RESET":
      return { ...INITIAL_VOICE_TURN_STATE, epoch: state.epoch + 1 };

    case "ERROR":
      return { ...state, lastError: event.message };

    default:
      return state;
  }
}

/** Dev/test assertions — returns violations instead of throwing. */
export function checkVoiceTurnInvariants(state: VoiceTurnState): VoiceTurnInvariantViolation[] {
  const violations: VoiceTurnInvariantViolation[] = [];

  if (state.micLive && state.micArming) {
    violations.push({ code: "mic_live_and_arming", detail: "mic cannot be live and arming" });
  }
  if (state.micLive && state.audioMode !== "capturing") {
    violations.push({
      code: "mic_live_wrong_mode",
      detail: `micLive but audioMode=${state.audioMode}`,
    });
  }
  if (state.micArming && state.audioMode !== "arming_mic") {
    violations.push({
      code: "mic_arming_wrong_mode",
      detail: `micArming but audioMode=${state.audioMode}`,
    });
  }
  if (state.recorderReady && !state.micLive) {
    violations.push({
      code: "recorder_ready_without_live",
      detail: "recorderReady without micLive",
    });
  }
  if (state.audioMode === "speaking" && state.micLive) {
    violations.push({ code: "speak_and_capture", detail: "cannot speak and capture" });
  }
  if (state.audioMode === "capturing" && !state.captureSlot) {
    violations.push({ code: "capturing_without_slot", detail: "capturing without slot" });
  }

  return violations;
}

export function resolveVoiceOrbMode(state: VoiceTurnState, opts: {
  philipHandsFreeVoice: boolean;
  speaking: boolean;
  showThresholdOverlay: boolean;
}): VoiceOrbMode | null {
  if (!opts.philipHandsFreeVoice) return null;

  const listening =
    state.micLive
    || state.micArming
    || state.audioMode === "arming_mic"
    || state.audioMode === "capturing";

  if (opts.showThresholdOverlay) {
    if (opts.speaking) return "speak";
    if (listening) return "listen";
    return "idle";
  }

  if (opts.speaking) return "speak";
  if (listening) return "listen";
  return "idle";
}

export function maxCaptureRetries(slot: "entry" | "p1" | "followup"): number {
  if (slot === "entry") return 2;
  return 1;
}

export function canRetryCapture(state: VoiceTurnState, slot: "entry" | "p1" | "followup"): boolean {
  return state.captureRetryCount < maxCaptureRetries(slot);
}
