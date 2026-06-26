import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { fetchGuidanceTtsAudio, transcribeGuidanceAudioNative } from "./api";

export type PhilipVoiceSlot = "entry" | "p1" | "followup";

export type PhilipVoiceNativeEvent =
  | { type: "PHILIP_VOICE_BRIDGE_READY" }
  | { type: "PHILIP_VOICE_TTS_STARTED"; slot?: PhilipVoiceSlot }
  | { type: "PHILIP_VOICE_TTS_DONE"; slot?: PhilipVoiceSlot }
  | { type: "PHILIP_VOICE_RECORDING_STARTED"; slot: PhilipVoiceSlot }
  | { type: "PHILIP_VOICE_RECORDING_DONE"; slot: PhilipVoiceSlot }
  | { type: "PHILIP_VOICE_TRANSCRIPT_READY"; slot: PhilipVoiceSlot; transcript: string }
  | { type: "PHILIP_VOICE_ERROR"; code: string; message?: string; slot?: PhilipVoiceSlot };

type EmitFn = (event: PhilipVoiceNativeEvent) => void;

const DEFAULT_HANDOFF_MS = 400;
const DEFAULT_SILENCE_MS = 2200;
const DEFAULT_MIN_CHARS = 8;
const MAX_RECORD_MS = 120_000;
const SPEECH_DB = -42;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + step)) as number[]);
  }
  if (typeof globalThis.btoa === "function") return globalThis.btoa(binary);
  throw new Error("btoa_unavailable");
}

export class PhilipNativeVoiceController {
  private emit: EmitFn;
  private sound: Audio.Sound | null = null;
  private recording: Audio.Recording | null = null;
  private activeSlot: PhilipVoiceSlot | null = null;
  private sessionId = "";
  private isPro = false;
  private silenceMs = DEFAULT_SILENCE_MS;
  private minChars = DEFAULT_MIN_CHARS;
  private conversational = true;
  private speechDetected = false;
  private lastLoudAt = 0;
  private meteringTimer: ReturnType<typeof setInterval> | null = null;
  private maxRecordTimer: ReturnType<typeof setTimeout> | null = null;
  private handoffTimer: ReturnType<typeof setTimeout> | null = null;
  private bridgeReady = false;
  private busy = false;

  constructor(emit: EmitFn) {
    this.emit = emit;
  }

  isBridgeReady(): boolean {
    return this.bridgeReady;
  }

  async initBridge(): Promise<void> {
    try {
      // Do not request mic permission at app open — only when user enters Talk It Through voice.
      this.bridgeReady = true;
      this.emit({ type: "PHILIP_VOICE_BRIDGE_READY" });
    } catch (err) {
      this.emit({
        type: "PHILIP_VOICE_ERROR",
        code: "init_failed",
        message: String(err),
      });
    }
  }

  private async ensureMicPermission(): Promise<boolean> {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      return granted;
    } catch {
      return false;
    }
  }

  async handleCommand(raw: Record<string, unknown>): Promise<void> {
    const type = String(raw.type || "");
    this.sessionId = String(raw.sessionId || "");
    this.isPro = raw.isPro === true;
    const slot = (raw.slot as PhilipVoiceSlot) || "entry";

    try {
      switch (type) {
        case "PHILIP_VOICE_CANCEL":
          await this.cancelAll();
          break;
        case "PHILIP_VOICE_PLAY_TTS":
          await this.playTts(String(raw.text || ""), {
            slot,
            handoffDelayMs: Number(raw.handoffDelayMs) || DEFAULT_HANDOFF_MS,
            autoRecordAfter: raw.autoRecordAfter === true,
            silenceMs: Number(raw.silenceMs) || DEFAULT_SILENCE_MS,
            minChars: Number(raw.minCharsForAutoSubmit) || DEFAULT_MIN_CHARS,
          });
          break;
        case "PHILIP_VOICE_START_RECORDING":
          await this.startRecording(slot, {
            silenceMs: Number(raw.silenceMs) || DEFAULT_SILENCE_MS,
            minChars: Number(raw.minCharsForAutoSubmit) || DEFAULT_MIN_CHARS,
            conversational: raw.conversational !== false,
          });
          break;
        case "PHILIP_VOICE_STOP_RECORDING":
          await this.stopRecordingAndTranscribe(slot, true);
          break;
        default:
          break;
      }
    } catch (err) {
      this.emit({
        type: "PHILIP_VOICE_ERROR",
        code: "command_failed",
        message: String(err),
        slot,
      });
    }
  }

  private clearTimers() {
    if (this.meteringTimer) {
      clearInterval(this.meteringTimer);
      this.meteringTimer = null;
    }
    if (this.maxRecordTimer) {
      clearTimeout(this.maxRecordTimer);
      this.maxRecordTimer = null;
    }
    if (this.handoffTimer) {
      clearTimeout(this.handoffTimer);
      this.handoffTimer = null;
    }
  }

  private async setPlaybackMode() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }

  private async setRecordMode() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }

  private async stopSound() {
    if (!this.sound) return;
    try {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
    } catch {
      /* noop */
    }
    this.sound = null;
  }

  async cancelAll() {
    this.clearTimers();
    await this.stopSound();
    await this.stopRecordingInternal(false);
    this.busy = false;
  }

  private async playTts(
    text: string,
    opts: {
      slot: PhilipVoiceSlot;
      handoffDelayMs: number;
      autoRecordAfter: boolean;
      silenceMs: number;
      minChars: number;
    },
  ) {
    const trimmed = text.trim();
    if (!trimmed) {
      this.emit({ type: "PHILIP_VOICE_TTS_DONE", slot: opts.slot });
      return;
    }
    await this.cancelAll();
    this.busy = true;
    try {
      const base64 = await fetchGuidanceTtsAudio(trimmed, this.sessionId, this.isPro);
      const uri = `data:audio/mpeg;base64,${base64}`;
      await this.setPlaybackMode();
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
      this.sound = sound;
      this.emit({ type: "PHILIP_VOICE_TTS_STARTED", slot: opts.slot });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || !status.didJustFinish) return;
        void this.onTtsFinished(opts);
      });
    } catch (err) {
      this.busy = false;
      this.emit({
        type: "PHILIP_VOICE_ERROR",
        code: "tts_failed",
        message: String(err),
        slot: opts.slot,
      });
      this.emit({ type: "PHILIP_VOICE_TTS_DONE", slot: opts.slot });
    }
  }

  private async onTtsFinished(opts: {
    slot: PhilipVoiceSlot;
    handoffDelayMs: number;
    autoRecordAfter: boolean;
    silenceMs: number;
    minChars: number;
  }) {
    await this.stopSound();
    this.emit({ type: "PHILIP_VOICE_TTS_DONE", slot: opts.slot });
    if (opts.autoRecordAfter) {
      this.handoffTimer = setTimeout(() => {
        void this.startRecording(opts.slot, {
          silenceMs: opts.silenceMs,
          minChars: opts.minChars,
          conversational: true,
        });
      }, opts.handoffDelayMs);
      return;
    }
    this.busy = false;
  }

  private async startRecording(
    slot: PhilipVoiceSlot,
    opts: { silenceMs: number; minChars: number; conversational: boolean },
  ) {
    if (this.recording) {
      await this.stopRecordingInternal(false);
    }
    await this.stopSound();
    this.silenceMs = opts.silenceMs;
    this.minChars = opts.minChars;
    this.conversational = opts.conversational;
    this.speechDetected = false;
    this.lastLoudAt = Date.now();
    this.activeSlot = slot;
    this.busy = true;

    const granted = await this.ensureMicPermission();
    if (!granted) {
      this.busy = false;
      this.emit({
        type: "PHILIP_VOICE_ERROR",
        code: "mic_denied",
        message: "Microphone permission is required for Talk It Through voice.",
        slot,
      });
      return;
    }

    await this.setRecordMode();
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
      android: {
        extension: ".m4a",
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
      },
      ios: {
        extension: ".m4a",
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.MEDIUM,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
    });
    rec.setProgressUpdateInterval(120);
    rec.setOnRecordingStatusUpdate((status) => {
      if (!status.isRecording || status.metering == null) return;
      if (status.metering > SPEECH_DB) {
        this.speechDetected = true;
        this.lastLoudAt = Date.now();
      }
    });
    await rec.startAsync();
    this.recording = rec;
    this.emit({ type: "PHILIP_VOICE_RECORDING_STARTED", slot });

    this.meteringTimer = setInterval(() => {
      if (!this.recording || !this.conversational || !this.speechDetected) return;
      if (Date.now() - this.lastLoudAt >= this.silenceMs) {
        void this.stopRecordingAndTranscribe(slot, false);
      }
    }, 150);

    this.maxRecordTimer = setTimeout(() => {
      void this.stopRecordingAndTranscribe(slot, false);
    }, MAX_RECORD_MS);
  }

  private async stopRecordingInternal(emitDone: boolean) {
    this.clearTimers();
    const rec = this.recording;
    const slot = this.activeSlot;
    this.recording = null;
    this.activeSlot = null;
    if (!rec) return null;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (emitDone && slot) this.emit({ type: "PHILIP_VOICE_RECORDING_DONE", slot });
      return uri;
    } catch {
      if (emitDone && slot) this.emit({ type: "PHILIP_VOICE_RECORDING_DONE", slot });
      return null;
    }
  }

  private async stopRecordingAndTranscribe(slot: PhilipVoiceSlot, manual: boolean) {
    if (!this.recording && !manual) {
      this.busy = false;
      return;
    }
    if (this.recording && this.activeSlot && this.activeSlot !== slot) return;

    const uri = await this.stopRecordingInternal(true);
    await this.setPlaybackMode();

    if (!uri) {
      this.busy = false;
      this.emit({
        type: "PHILIP_VOICE_ERROR",
        code: "capture_empty",
        message: "No audio captured.",
        slot,
      });
      this.emit({ type: "PHILIP_VOICE_TRANSCRIPT_READY", slot, transcript: "" });
      return;
    }

    try {
      const transcript = (await transcribeGuidanceAudioNative(uri, this.sessionId, this.isPro)).trim();
      if (transcript.length < this.minChars) {
        this.emit({
          type: "PHILIP_VOICE_ERROR",
          code: "insufficient_capture",
          message: "Philip didn't catch enough to continue.",
          slot,
        });
      }
      this.emit({ type: "PHILIP_VOICE_TRANSCRIPT_READY", slot, transcript });
    } catch (err) {
      this.emit({
        type: "PHILIP_VOICE_ERROR",
        code: "transcribe_failed",
        message: String(err),
        slot,
      });
      this.emit({ type: "PHILIP_VOICE_TRANSCRIPT_READY", slot, transcript: "" });
    } finally {
      this.busy = false;
    }
  }
}

export function createPhilipNativeVoiceController(emit: EmitFn): PhilipNativeVoiceController {
  return new PhilipNativeVoiceController(emit);
}
