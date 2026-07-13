/**
 * Audio helpers for Philip Voice Lab agent — PCM/WAV, MP3 decode, VAD, publish pacing.
 */
import { spawn } from "node:child_process";

const DEFAULT_SAMPLE_RATE = Number(process.env.PHILIP_VOICE_LAB_SAMPLE_RATE || 48000);

function delay(ms) {
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
    this.maxUtteranceMs = opts.maxUtteranceMs ?? 28000;
    this.energyThreshold = opts.energyThreshold ?? 450;
    this.chunks = [];
    this.inSpeech = false;
    this.speechStartedAt = 0;
    this.lastSpeechAt = 0;
    this.paused = false;
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

  /**
   * @param {Int16Array} samples
   * @returns {{ utterance: Buffer | null; vadReason?: string } | null}
   */
  push(samples) {
    if (this.paused || !samples?.length) return null;

    const energy = rmsInt16(samples);
    const now = Date.now();
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
        return { utterance: this.flush(), vadReason: "vad_max_utterance" };
      }
      return null;
    }

    if (!this.inSpeech) return null;

    this.chunks.push(frameBuf);
    if (now - this.lastSpeechAt < this.silenceMs) return null;

    const speechMs = this.lastSpeechAt - this.speechStartedAt;
    if (speechMs < this.minSpeechMs) {
      this.reset();
      return { utterance: null, vadReason: "vad_speech_too_short" };
    }
    return { utterance: this.flush(), vadReason: "vad_silence" };
  }

  flush() {
    const pcm = this.chunks.length ? Buffer.concat(this.chunks) : null;
    this.reset();
    return pcm;
  }
}

export async function publishPcmToSource(
  pcmBuffer,
  source,
  sampleRate = DEFAULT_SAMPLE_RATE,
  audioFrameFactory,
) {
  const createAudioFrame = audioFrameFactory || (async (chunk) => {
    const { AudioFrame } = await import("@livekit/rtc-node");
    return new AudioFrame(chunk, sampleRate, 1, chunk.length);
  });
  if (typeof source.clearQueue === "function") {
    source.clearQueue();
  }

  const playbackPublishStartAt = Date.now();
  const int16 = new Int16Array(
    pcmBuffer.buffer,
    pcmBuffer.byteOffset,
    pcmBuffer.byteLength / 2,
  );
  const samplesPerFrame = Math.max(1, Math.floor(sampleRate / 100));
  let chain = Promise.resolve();
  for (let offset = 0; offset < int16.length; offset += samplesPerFrame) {
    const end = Math.min(offset + samplesPerFrame, int16.length);
    const chunk = int16.subarray(offset, end);
    const frame = await createAudioFrame(chunk);
    chain = chain
      .then(() => source.captureFrame(frame))
      .then(() => delay(10))
      .catch((err) => {
        throw err;
      });
  }
  await chain;
  const playbackPublishEndAt = Date.now();
  return {
    playbackPublishStartAt,
    playbackPublishEndAt,
    playbackPublishDurationMs: playbackPublishEndAt - playbackPublishStartAt,
    pcmDurationMs: Math.round((int16.length / sampleRate) * 1000),
  };
}

export async function publishMp3ToSource(
  mp3Buffer,
  source,
  sampleRate = DEFAULT_SAMPLE_RATE,
  audioFrameFactory,
) {
  const decodeStartAt = Date.now();
  const pcm = await mp3ToPcm16(mp3Buffer, sampleRate);
  const decodeEndAt = Date.now();
  const publish = await publishPcmToSource(pcm, source, sampleRate, audioFrameFactory);
  return {
    ...publish,
    mp3Bytes: mp3Buffer.length,
    pcmBytes: pcm.length,
    decodeMs: decodeEndAt - decodeStartAt,
  };
}

export { DEFAULT_SAMPLE_RATE, rmsInt16 };
