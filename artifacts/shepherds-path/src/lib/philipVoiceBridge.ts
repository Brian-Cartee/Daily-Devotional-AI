/**
 * Native voice bridge contract — mic capture and playback owned by the Expo shell.
 * WebView MediaRecorder ping-pong is disabled in the store app until this is live.
 */
import { isNativeWebViewShell } from "@/lib/platform";

export type PhilipVoiceSlot = "entry" | "p1" | "followup";

/** Web → Native */
export type PhilipVoiceWebCommand =
  | { type: "PHILIP_VOICE_START_GREETING" }
  | {
      type: "PHILIP_VOICE_PLAY_TTS";
      text: string;
      slot?: PhilipVoiceSlot;
      sessionId?: string;
      isPro?: boolean;
      autoRecordAfter?: boolean;
      handoffDelayMs?: number;
      silenceMs?: number;
      minCharsForAutoSubmit?: number;
    }
  | {
      type: "PHILIP_VOICE_START_RECORDING";
      slot: PhilipVoiceSlot;
      sessionId?: string;
      isPro?: boolean;
      silenceMs?: number;
      minCharsForAutoSubmit?: number;
      conversational?: boolean;
    }
  | { type: "PHILIP_VOICE_STOP_RECORDING"; slot: PhilipVoiceSlot; sessionId?: string; isPro?: boolean }
  | { type: "PHILIP_VOICE_CANCEL"; slot?: PhilipVoiceSlot };

/** Native → Web */
export type PhilipVoiceNativeEvent =
  | { type: "PHILIP_VOICE_BRIDGE_READY" }
  | { type: "PHILIP_VOICE_GREETING_DONE" }
  | { type: "PHILIP_VOICE_TTS_STARTED"; slot?: PhilipVoiceSlot }
  | { type: "PHILIP_VOICE_TTS_DONE"; slot?: PhilipVoiceSlot }
  | { type: "PHILIP_VOICE_RECORDING_STARTED"; slot: PhilipVoiceSlot }
  | { type: "PHILIP_VOICE_RECORDING_DONE"; slot: PhilipVoiceSlot }
  | { type: "PHILIP_VOICE_TRANSCRIPT_READY"; slot: PhilipVoiceSlot; transcript: string }
  | { type: "PHILIP_VOICE_ERROR"; code: string; message?: string; slot?: PhilipVoiceSlot };

type WindowWithPhilipVoice = Window & {
  ReactNativeWebView?: { postMessage: (s: string) => void };
  __SP_PHILIP_NATIVE_VOICE__?: boolean;
  __spPhilipVoiceOnEvent?: (event: PhilipVoiceNativeEvent) => void;
  __spPhilipVoiceQueue?: PhilipVoiceNativeEvent[];
};

function drainPhilipVoiceQueue(handler: (event: PhilipVoiceNativeEvent) => void): void {
  const win = window as WindowWithPhilipVoice;
  const queued = win.__spPhilipVoiceQueue;
  if (!queued?.length) return;
  win.__spPhilipVoiceQueue = [];
  for (const event of queued) handler(event);
}

export function isNativePhilipVoiceBridgeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as WindowWithPhilipVoice;
  if (win.__SP_PHILIP_NATIVE_VOICE__ === true) return true;
  if (typeof document !== "undefined") {
    return document.documentElement.dataset.spPhilipNativeVoice === "1";
  }
  return false;
}

/** Hands-free / native-capture voice — on when native bridge is ready. */
export function usePhilipNativeVoicePath(): boolean {
  return isNativePhilipVoiceBridgeAvailable();
}

/** WebView getUserMedia capture — avoid in the iOS app shell (unreliable after TTS). */
export function usePhilipWebVoiceCapture(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeWebViewShell() && !isNativePhilipVoiceBridgeAvailable()) return false;
  return window.isSecureContext && (
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    || (!!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined")
  );
}

export function postPhilipVoiceCommand(command: PhilipVoiceWebCommand): boolean {
  if (!isNativeWebViewShell()) return false;
  try {
    (window as WindowWithPhilipVoice).ReactNativeWebView?.postMessage(JSON.stringify(command));
    return true;
  } catch {
    return false;
  }
}

export function subscribePhilipVoiceEvents(
  handler: (event: PhilipVoiceNativeEvent) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const win = window as WindowWithPhilipVoice;
  const prior = win.__spPhilipVoiceOnEvent;
  win.__spPhilipVoiceOnEvent = (event) => {
    prior?.(event);
    handler(event);
  };
  drainPhilipVoiceQueue(handler);
  return () => {
    if (win.__spPhilipVoiceOnEvent === handler) {
      win.__spPhilipVoiceOnEvent = prior;
    }
  };
}

export function dispatchPhilipVoiceNativeEvent(event: PhilipVoiceNativeEvent): void {
  try {
    (window as WindowWithPhilipVoice).__spPhilipVoiceOnEvent?.(event);
  } catch {
    /* noop */
  }
}
