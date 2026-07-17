/**
 * Streaming bidirectional audio interface (provider-neutral).
 * Phase 1 is mock PCM framing only — no microphone or network.
 */

export const DEFAULT_AUDIO_FORMAT = Object.freeze({
  encoding: "pcm16",
  sampleRateHz: 24000,
  channels: 1,
});

export class DuplexAudioInterface {
  constructor({ format = DEFAULT_AUDIO_FORMAT, onOutboundChunk, onPlaybackState } = {}) {
    this.format = format;
    this.onOutboundChunk = onOutboundChunk || (() => {});
    this.onPlaybackState = onPlaybackState || (() => {});
    this.inboundBuffer = [];
    this.outboundChunks = [];
    this.playing = false;
    this.cancelled = false;
    this.firstAudibleAt = null;
    this.lastStopAt = null;
  }

  /** User / client audio toward the provider. */
  pushOutboundPcm(base64Chunk, ts = Date.now()) {
    const frame = { direction: "outbound", base64: base64Chunk, ts, bytesApprox: approxBytes(base64Chunk) };
    this.outboundChunks.push(frame);
    this.onOutboundChunk(frame);
    return frame;
  }

  /** Assistant audio from the provider. */
  pushInboundPcm(base64Chunk, ts = Date.now()) {
    if (this.cancelled) return null;
    const frame = { direction: "inbound", base64: base64Chunk, ts, bytesApprox: approxBytes(base64Chunk) };
    this.inboundBuffer.push(frame);
    if (!this.playing) {
      this.playing = true;
      this.firstAudibleAt = this.firstAudibleAt ?? ts;
      this.onPlaybackState({ playing: true, firstAudibleAt: this.firstAudibleAt, ts });
    }
    return frame;
  }

  markPlaybackComplete(ts = Date.now()) {
    if (!this.playing) return;
    this.playing = false;
    this.lastStopAt = ts;
    this.onPlaybackState({ playing: false, lastStopAt: ts, ts });
  }

  /** Barge-in / cancel: stop assistant audio immediately. */
  cancelPlayback(ts = Date.now()) {
    const wasPlaying = this.playing;
    this.cancelled = true;
    this.playing = false;
    this.inboundBuffer = [];
    this.lastStopAt = ts;
    this.onPlaybackState({ playing: false, cancelled: true, lastStopAt: ts, ts });
    return { wasPlaying, stoppedAt: ts };
  }

  resumeAcceptingInbound() {
    this.cancelled = false;
  }

  snapshot() {
    return {
      format: this.format,
      playing: this.playing,
      cancelled: this.cancelled,
      outboundChunkCount: this.outboundChunks.length,
      inboundChunkCount: this.inboundBuffer.length,
      firstAudibleAt: this.firstAudibleAt,
      lastStopAt: this.lastStopAt,
    };
  }
}

function approxBytes(base64) {
  if (!base64) return 0;
  return Math.floor((String(base64).length * 3) / 4);
}

/** Deterministic tiny PCM-looking mock payload. */
export function mockPcmChunk(label = "chunk") {
  return Buffer.from(`pcm16:${label}`).toString("base64");
}
