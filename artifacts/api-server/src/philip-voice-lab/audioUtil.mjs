/**
 * Audio helpers for Philip Voice Lab agent — PCM/WAV, MP3 decode, VAD, publish pacing.
 */
import { spawn } from "node:child_process";

const DEFAULT_SAMPLE_RATE = Number(process.env.PHILIP_VOICE_LAB_SAMPLE_RATE || 48000);

export function envInt(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** VAD tuning for Voice Lab — override via env without code changes. */
export function vadConfigFromEnv() {
  return {
    sampleRate: DEFAULT_SAMPLE_RATE,
    // 1400ms end-of-speech window: gives natural reflective pauses room to breathe
    // before the turn closes. Override with PHILIP_VOICE_LAB_VAD_SILENCE_MS.
    silenceMs: envInt("PHILIP_VOICE_LAB_VAD_SILENCE_MS", 1400),
    minSpeechMs: envInt("PHILIP_VOICE_LAB_VAD_MIN_SPEECH_MS", 380),
    // When awaiting a constrained yes/no (e.g. pending prayer offer), allow brief
    // voiced answers through. ~100ms is enough for "yes"/"no" at conversational
    // pace while still rejecting click/room-noise blips under ~80–100ms.
    // Floor remains enforced by energy + this minimum together.
    shortAnswerMinSpeechMs: envInt("PHILIP_VOICE_LAB_VAD_SHORT_ANSWER_MIN_SPEECH_MS", 100),
    maxUtteranceMs: envInt("PHILIP_VOICE_LAB_VAD_MAX_MS", 45000),
    energyThreshold: envInt("PHILIP_VOICE_LAB_VAD_ENERGY", 450),
  };
}

export function pcmDurationMs(pcmBuffer, sampleRate = DEFAULT_SAMPLE_RATE) {
  const samples = Math.floor(pcmBuffer.byteLength / 2);
  if (!samples || !sampleRate) return 0;
  return Math.round((samples / sampleRate) * 1000);
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rmsInt16(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sum += v * v;
  }
  return Math.sqrt(sum / samples.length);
}

export function pcmToWav(pcmBuffer, sampleRate = DEFAULT_SAMPLE_RATE, channels = 1) {
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

export function mp3ToPcm16(mp3Buffer, sampleRate = DEFAULT_SAMPLE_RATE) {
  return new Promise((resolve, reject) => {
    const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";
    const chunks = [];
    let errText = "";
    const proc = spawn(
      ffmpegBin,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-f",
        "s16le",
        "-acodec",
        "pcm_s16le",
        "-ac",
        "1",
        "-ar",
        String(sampleRate),
        "pipe:1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    proc.stdout.on("data", (c) => chunks.push(c));
    proc.stderr.on("data", (c) => {
      errText += c.toString();
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(errText.trim() || `ffmpeg exited ${code}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
    proc.stdin.end(mp3Buffer);
  });
}

/**
 * Simple energy VAD — collects one utterance, then returns PCM buffer or null.
 */
export class UtteranceCollector {
  constructor(opts = {}) {
    this.sampleRate = opts.sampleRate ?? DEFAULT_SAMPLE_RATE;
    this.silenceMs = opts.silenceMs ?? 1400;
    this.minSpeechMs = opts.minSpeechMs ?? 450;
    this.shortAnswerMinSpeechMs = opts.shortAnswerMinSpeechMs ?? 100;
    this.maxUtteranceMs = opts.maxUtteranceMs ?? 28000;
    this.energyThreshold = opts.energyThreshold ?? 450;
    this.awaitingShortAnswer = false;
    /** Optional injectable clock for deterministic tests (ms since epoch). */
    this.nowFn = typeof opts.nowFn === "function" ? opts.nowFn : () => Date.now();
    this.chunks = [];
    this.inSpeech = false;
    this.speechStartedAt = 0;
    this.lastSpeechAt = 0;
    this.paused = false;
    this.lastShortAnswerGate = false;
  }

  /**
   * When true, use shortAnswerMinSpeechMs so contextual yes/no can reach STT.
   * @param {boolean} flag
   */
  setAwaitingShortAnswer(flag) {
    this.awaitingShortAnswer = Boolean(flag);
  }

  pause() {
    this.paused = true;
    this.reset();
  }

  resume() {
    this.paused = false;
  }

  reset() {
    this.chunks = [];
    this.inSpeech = false;
    this.speechStartedAt = 0;
    this.lastSpeechAt = 0;
  }

  effectiveMinSpeechMs() {
    return this.awaitingShortAnswer ? this.shortAnswerMinSpeechMs : this.minSpeechMs;
  }

  /**
   * @param {Int16Array} samples
   * @returns {{ utterance: Buffer | null; vadReason?: string; shortAnswerGate?: boolean; speechMs?: number; speechEndAt?: number } | null}
   */
  push(samples) {
    if (this.paused || !samples?.length) return null;

    const energy = rmsInt16(samples);
    const now = this.nowFn();
    const frameBuf = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
    const speech = energy >= this.energyThreshold;

    if (speech) {
      if (!this.inSpeech) {
        this.inSpeech = true;
        this.speechStartedAt = now;
        this.chunks = [];
      }
      this.lastSpeechAt = now;
      this.chunks.push(frameBuf);
      if (now - this.speechStartedAt >= this.maxUtteranceMs) {
        const speechMs = now - this.speechStartedAt;
        return {
          utterance: this.flush(),
          vadReason: "vad_max_utterance",
          shortAnswerGate: this.awaitingShortAnswer,
          speechMs,
          speechEndAt: now,
        };
      }
      return null;
    }

    if (!this.inSpeech) return null;

    this.chunks.push(frameBuf);
    if (now - this.lastSpeechAt < this.silenceMs) return null;

    const speechMs = this.lastSpeechAt - this.speechStartedAt;
    const minMs = this.effectiveMinSpeechMs();
    const shortAnswerGate = this.awaitingShortAnswer;
    if (speechMs < minMs) {
      this.reset();
      this.lastShortAnswerGate = shortAnswerGate;
      return {
        utterance: null,
        vadReason: "vad_speech_too_short",
        shortAnswerGate,
        speechMs,
        speechEndAt: this.lastSpeechAt || now,
      };
    }
    this.lastShortAnswerGate = shortAnswerGate;
    return {
      utterance: this.flush(),
      vadReason: "vad_silence",
      shortAnswerGate,
      speechMs,
      speechEndAt: this.lastSpeechAt || now,
    };
  }

  flush() {
    const pcm = this.chunks.length ? Buffer.concat(this.chunks) : null;
    this.reset();
    return pcm;
  }
}

/**
 * Lazily construct a LiveKit AudioFrame. The RTC native binding is only pulled
 * in when a real playback happens; tests inject `audioFrameFactory` so the
 * simulated turn never needs @livekit/rtc-node installed.
 * @param {((chunk: Int16Array) => unknown | Promise<unknown>) | undefined} audioFrameFactory
 * @param {number} sampleRate
 */
function resolveAudioFrameFactory(audioFrameFactory, sampleRate) {
  if (audioFrameFactory) return audioFrameFactory;
  return async (chunk) => {
    const { AudioFrame } = await import("@livekit/rtc-node");
    return new AudioFrame(chunk, sampleRate, 1, chunk.length);
  };
}

/**
 * @param {Buffer} pcmBuffer
 * @param {import('@livekit/rtc-node').AudioSource} source
 * @param {number} [sampleRate]
 * @param {{ waitForPlayout?: boolean; tailWaitMs?: number; audioFrameFactory?: (chunk: Int16Array) => unknown }} [opts]
 */
export async function publishPcmToSource(pcmBuffer, source, sampleRate = DEFAULT_SAMPLE_RATE, opts = {}) {
  const playbackPublishStartAt = Date.now();
  const sampleCount = Math.floor(pcmBuffer.byteLength / 2);
  const pcmDurationMsValue = pcmDurationMs(pcmBuffer, sampleRate);
  if (!sampleCount) {
    return {
      playbackPublishStartAt,
      playbackPublishEndAt: playbackPublishStartAt,
      playbackPublishDurationMs: 0,
      pcmDurationMs: 0,
      playoutWaitMs: 0,
      earlyMic: false,
    };
  }

  const createAudioFrame = resolveAudioFrameFactory(opts.audioFrameFactory, sampleRate);

  // Copy into a dedicated Int16Array — avoids Node Buffer view quirks LiveKit warns about.
  const int16 = new Int16Array(sampleCount);
  int16.set(new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, sampleCount));

  const samplesPerFrame = Math.max(1, Math.floor(sampleRate / 100));
  for (let offset = 0; offset < int16.length; offset += samplesPerFrame) {
    const end = Math.min(offset + samplesPerFrame, int16.length);
    const chunk = int16.subarray(offset, end);
    const frame = await createAudioFrame(chunk);
    await source.captureFrame(frame);
  }

  const waitForPlayout = opts.waitForPlayout !== false;
  const tailWaitMs = Math.max(0, opts.tailWaitMs ?? 0);
  let playoutWaitMs = 0;
  if (waitForPlayout && typeof source.waitForPlayout === "function") {
    const playoutStart = Date.now();
    await source.waitForPlayout();
    playoutWaitMs = Date.now() - playoutStart;
  } else if (tailWaitMs > 0) {
    await delay(tailWaitMs);
    playoutWaitMs = tailWaitMs;
  }

  const playbackPublishEndAt = Date.now();
  return {
    playbackPublishStartAt,
    playbackPublishEndAt,
    playbackPublishDurationMs: playbackPublishEndAt - playbackPublishStartAt,
    pcmDurationMs: pcmDurationMsValue,
    playoutWaitMs,
    earlyMic: !waitForPlayout,
  };
}

export function playbackOptsFromEnv(_pcmDurationMsValue) {
  const raw = process.env.PHILIP_VOICE_LAB_EARLY_MIC?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") {
    return { waitForPlayout: true, tailWaitMs: 0 };
  }
  // Queue all frames, brief settle, then resume mic — Philip may still be speaking (barge-in).
  const tailWaitMs = envInt("PHILIP_VOICE_LAB_EARLY_MIC_SETTLE_MS", 600);
  return { waitForPlayout: false, tailWaitMs };
}

export async function publishMp3ToSource(mp3Buffer, source, sampleRate = DEFAULT_SAMPLE_RATE, publishOpts) {
  const decodeStartAt = Date.now();
  const pcm = await mp3ToPcm16(mp3Buffer, sampleRate);
  const decodeEndAt = Date.now();
  const opts = publishOpts ?? playbackOptsFromEnv(pcmDurationMs(pcm, sampleRate));
  const publish = await publishPcmToSource(pcm, source, sampleRate, opts);
  return {
    ...publish,
    mp3Bytes: mp3Buffer.length,
    pcmBytes: pcm.length,
    decodeMs: decodeEndAt - decodeStartAt,
  };
}

/**
 * Same audio delivery as publishMp3ToSource, but returns as soon as decode +
 * duration are known. The real-time frame-publish loop continues in the
 * background. Callers that need full-playback confirmation should await the
 * returned `framePublished` promise; callers that just need to release the
 * mic quickly should not.
 * @param {Buffer} mp3Buffer
 * @param {import('@livekit/rtc-node').AudioSource} source
 * @param {number} [sampleRate]
 * @param {(chunk: Int16Array) => unknown} [audioFrameFactory]
 */
export async function publishMp3ToSourceDetached(mp3Buffer, source, sampleRate = DEFAULT_SAMPLE_RATE, audioFrameFactory) {
  const decodeStartAt = Date.now();
  const pcm = await mp3ToPcm16(mp3Buffer, sampleRate);
  const decodeMs = Date.now() - decodeStartAt;
  const pcmDurationMsValue = pcmDurationMs(pcm, sampleRate);

  const framePublished = publishPcmToSource(pcm, source, sampleRate, {
    waitForPlayout: false,
    tailWaitMs: 0,
    audioFrameFactory,
  }).catch((err) => {
    console.error("[philip-voice-lab] background frame publish failed:", err);
    return null;
  });

  return { decodeMs, pcmDurationMs: pcmDurationMsValue, framePublished };
}

export { DEFAULT_SAMPLE_RATE, rmsInt16 };
