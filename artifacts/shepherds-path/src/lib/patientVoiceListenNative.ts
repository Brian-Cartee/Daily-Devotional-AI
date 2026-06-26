import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";
import {
  postPhilipVoiceCommand,
  subscribePhilipVoiceEvents,
  type PhilipVoiceNativeEvent,
  type PhilipVoiceSlot,
} from "@/lib/philipVoiceBridge";
import type { PatientVoiceListener, VoiceListenUiPhase } from "@/lib/patientVoiceListen";

export type NativePhilipVoiceListenerOptions = {
  slot: PhilipVoiceSlot;
  silenceMs: number;
  minCharsForAutoSubmit?: number;
  conversational?: boolean;
  onTranscript: (final: string, interim: string) => void;
  onPhaseChange?: (phase: VoiceListenUiPhase) => void;
  onMicLive?: (live: boolean) => void;
  onRecorderReady?: () => void;
  onAutoSubmit?: () => void;
  onListenEnd?: () => void;
  onInsufficientCapture?: () => void;
};

export function createNativePhilipVoiceListener(
  opts: NativePhilipVoiceListenerOptions,
): PatientVoiceListener {
  let active = false;
  let finalizing = false;
  let destroyed = false;
  let preview = "";
  let recorded = false;
  let meaningful = false;
  let autoSubmitted = false;
  let unsub: (() => void) | null = null;

  const sessionId = getSessionId();
  const isPro = isProVerifiedLocally();

  const matchesSlot = (ev: PhilipVoiceNativeEvent) =>
    !("slot" in ev) || ev.slot === opts.slot;

  const handleEvent = (ev: PhilipVoiceNativeEvent) => {
    if (destroyed || !matchesSlot(ev)) return;

    if (ev.type === "PHILIP_VOICE_RECORDING_STARTED") {
      active = true;
      finalizing = false;
      recorded = true;
      opts.onMicLive?.(true);
      opts.onRecorderReady?.();
      opts.onPhaseChange?.("listening");
    }

    if (ev.type === "PHILIP_VOICE_TRANSCRIPT_READY") {
      finalizing = false;
      active = false;
      preview = ev.transcript.trim();
      if (preview) {
        meaningful = preview.length >= (opts.minCharsForAutoSubmit ?? 8);
        opts.onTranscript(preview, "");
      }
      opts.onMicLive?.(false);
      opts.onPhaseChange?.("ready");
      if (opts.conversational !== false && meaningful && !autoSubmitted) {
        autoSubmitted = true;
        opts.onAutoSubmit?.();
        return;
      }
      if (!meaningful) {
        opts.onInsufficientCapture?.();
      }
      opts.onListenEnd?.();
    }

    if (ev.type === "PHILIP_VOICE_ERROR") {
      if (ev.code === "insufficient_capture") {
        active = false;
        finalizing = false;
        opts.onMicLive?.(false);
        opts.onInsufficientCapture?.();
        return;
      }
      if (ev.code === "capture_empty" || ev.code === "transcribe_failed") {
        active = false;
        finalizing = false;
        opts.onMicLive?.(false);
        opts.onListenEnd?.();
      }
    }
  };

  const ensureSubscribed = () => {
    if (unsub) return;
    unsub = subscribePhilipVoiceEvents(handleEvent);
  };

  return {
    start() {
      if (destroyed) return;
      ensureSubscribed();
      active = true;
      preview = "";
      recorded = false;
      meaningful = false;
      autoSubmitted = false;
      opts.onPhaseChange?.("listening");
      postPhilipVoiceCommand({
        type: "PHILIP_VOICE_START_RECORDING",
        slot: opts.slot,
        sessionId,
        isPro,
        silenceMs: opts.silenceMs,
        minCharsForAutoSubmit: opts.minCharsForAutoSubmit ?? 8,
        conversational: opts.conversational !== false,
      });
    },
    stop() {
      if (destroyed) return preview;
      if (active) {
        finalizing = true;
        opts.onPhaseChange?.("thinking");
        postPhilipVoiceCommand({
          type: "PHILIP_VOICE_STOP_RECORDING",
          slot: opts.slot,
          sessionId,
          isPro,
        });
      }
      return preview;
    },
    hasRecordedAudio() {
      return recorded;
    },
    canAutoSubmit() {
      return meaningful || preview.trim().length >= (opts.minCharsForAutoSubmit ?? 8);
    },
    isRecorderReady() {
      return recorded && active;
    },
    recordingNeverStarted() {
      return !recorded && !active;
    },
    forceSubmit() {
      this.finishSpeaking();
    },
    finishSpeaking() {
      if (destroyed || !active) return;
      finalizing = true;
      opts.onPhaseChange?.("thinking");
      postPhilipVoiceCommand({
        type: "PHILIP_VOICE_STOP_RECORDING",
        slot: opts.slot,
        sessionId,
        isPro,
      });
    },
    getPreview() {
      return preview;
    },
    finalizeTranscript() {
      return Promise.resolve(preview.trim());
    },
    isActive() {
      return active && !destroyed;
    },
    isFinalizing() {
      return finalizing;
    },
    hadMeaningfulCapture() {
      return meaningful || preview.trim().length >= (opts.minCharsForAutoSubmit ?? 8);
    },
    destroy() {
      destroyed = true;
      active = false;
      finalizing = false;
      unsub?.();
      unsub = null;
      postPhilipVoiceCommand({ type: "PHILIP_VOICE_CANCEL", slot: opts.slot });
    },
  };
}
