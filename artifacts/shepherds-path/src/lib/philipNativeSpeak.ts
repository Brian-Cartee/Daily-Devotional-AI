import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";
import {
  isNativePhilipVoiceBridgeAvailable,
  postPhilipVoiceCommand,
  subscribePhilipVoiceEvents,
  type PhilipVoiceNativeEvent,
  type PhilipVoiceSlot,
} from "@/lib/philipVoiceBridge";
import {
  VOICE_MIC_HANDOFF_FOLLOWUP_MS,
  VOICE_MIC_HANDOFF_PHASE1_MS,
} from "@/lib/shepherdVoice";

type NativeSpeakOpts = {
  slot?: PhilipVoiceSlot;
  isPro?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onFail?: () => void;
};

type NativeHandoffOpts = NativeSpeakOpts & {
  onSpeakingEnd?: () => void;
  onHandoff: () => void;
  handoffDelayMs?: number;
  silenceMs?: number;
  minCharsForAutoSubmit?: number;
  autoRecordAfter?: boolean;
};

function watchNativeTts(
  slot: PhilipVoiceSlot | undefined,
  opts: NativeSpeakOpts & { onDone: () => void },
): () => void {
  let cancelled = false;
  let started = false;
  const unsub = subscribePhilipVoiceEvents((ev: PhilipVoiceNativeEvent) => {
    if (cancelled) return;
    if (slot && "slot" in ev && ev.slot && ev.slot !== slot) return;
    if (ev.type === "PHILIP_VOICE_TTS_STARTED" && !started) {
      started = true;
      opts.onStart?.();
    }
    if (ev.type === "PHILIP_VOICE_TTS_DONE") {
      opts.onEnd?.();
      opts.onDone();
      unsub();
    }
    if (ev.type === "PHILIP_VOICE_ERROR" && (ev.code === "tts_failed" || ev.code === "mic_denied")) {
      opts.onFail?.();
      opts.onDone();
      unsub();
    }
  });
  return () => {
    cancelled = true;
    unsub();
    postPhilipVoiceCommand({ type: "PHILIP_VOICE_CANCEL", slot });
  };
}

export function speakPhilipNativeStream(text: string, opts: NativeSpeakOpts = {}): () => void {
  if (!isNativePhilipVoiceBridgeAvailable()) return () => {};
  const slot = opts.slot ?? "entry";
  postPhilipVoiceCommand({
    type: "PHILIP_VOICE_PLAY_TTS",
    text,
    slot,
    sessionId: getSessionId(),
    isPro: opts.isPro ?? isProVerifiedLocally(),
  });
  return watchNativeTts(slot, { ...opts, onDone: () => {} });
}

export function speakPhilipNativeStreamWithMicHandoff(
  text: string,
  opts: NativeHandoffOpts,
): () => void {
  if (!isNativePhilipVoiceBridgeAvailable()) return () => {};
  const slot = opts.slot ?? "entry";
  let handoffScheduled = false;
  const handoffDelay = opts.handoffDelayMs ?? VOICE_MIC_HANDOFF_PHASE1_MS;
  const scheduleHandoff = () => {
    if (handoffScheduled) return;
    handoffScheduled = true;
    window.setTimeout(opts.onHandoff, handoffDelay);
  };

  postPhilipVoiceCommand({
    type: "PHILIP_VOICE_PLAY_TTS",
    text,
    slot,
    sessionId: getSessionId(),
    isPro: opts.isPro ?? isProVerifiedLocally(),
    autoRecordAfter: opts.autoRecordAfter === true,
    handoffDelayMs: handoffDelay,
    silenceMs: opts.silenceMs,
    minCharsForAutoSubmit: opts.minCharsForAutoSubmit,
  });

  const cancelWatch = watchNativeTts(slot, {
    ...opts,
    onDone: () => {
      opts.onSpeakingEnd?.();
      if (!opts.autoRecordAfter) scheduleHandoff();
    },
  });

  return cancelWatch;
}

export function getPhilipNativeHandoffDelay(slot: PhilipVoiceSlot): number {
  if (slot === "followup") return VOICE_MIC_HANDOFF_FOLLOWUP_MS;
  return VOICE_MIC_HANDOFF_PHASE1_MS;
}
