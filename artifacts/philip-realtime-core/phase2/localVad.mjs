/**
 * Local-only speech energy / silence detector.
 * No network. No recording. Browser or Node (with injected analyser samples).
 */

export const LOCAL_VAD_DEFAULTS = Object.freeze({
  speechRmsThreshold: 0.02,
  silenceRmsThreshold: 0.01,
  silenceDurationMs: 1500,
  pollIntervalMs: 50,
});

export function rmsFromTimeDomain(samples) {
  if (!samples || !samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const normalized =
      samples instanceof Uint8Array
        ? (samples[i] - 128) / 128
        : Number(samples[i]);
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / samples.length);
}

export function createLocalSpeechSilenceDetector(options = {}) {
  const cfg = { ...LOCAL_VAD_DEFAULTS, ...options };
  let speaking = false;
  let silenceStartedAt = null;
  let lastRms = 0;
  const listeners = {
    speech: new Set(),
    silence: new Set(),
    level: new Set(),
  };

  function emit(kind, detail) {
    for (const fn of listeners[kind]) fn(detail);
  }

  return {
    config: cfg,
    get speaking() {
      return speaking;
    },
    get lastRms() {
      return lastRms;
    },
    on(kind, fn) {
      listeners[kind].add(fn);
      return () => listeners[kind].delete(fn);
    },
    /**
     * Feed one analyser frame. Returns the resulting state transition, if any.
     */
    ingestTimeDomain(samples, nowMs = Date.now()) {
      const rms = rmsFromTimeDomain(samples);
      lastRms = rms;
      emit("level", { rms, atMs: nowMs, speaking });

      if (rms >= cfg.speechRmsThreshold) {
        silenceStartedAt = null;
        if (!speaking) {
          speaking = true;
          emit("speech", { rms, atMs: nowMs });
          return "speech";
        }
        return null;
      }

      if (speaking) {
        if (rms <= cfg.silenceRmsThreshold) {
          if (silenceStartedAt == null) silenceStartedAt = nowMs;
          const quietFor = nowMs - silenceStartedAt;
          if (quietFor >= cfg.silenceDurationMs) {
            speaking = false;
            silenceStartedAt = null;
            emit("silence", { rms, atMs: nowMs, quietForMs: quietFor });
            return "silence";
          }
        } else {
          silenceStartedAt = null;
        }
      }
      return null;
    },
    reset() {
      speaking = false;
      silenceStartedAt = null;
      lastRms = 0;
    },
  };
}

export function createElapsedTimer(nowFn = () => Date.now()) {
  let startedAt = null;
  let stoppedAt = null;
  return {
    start() {
      startedAt = nowFn();
      stoppedAt = null;
    },
    stop() {
      if (startedAt != null && stoppedAt == null) stoppedAt = nowFn();
    },
    elapsedMs() {
      if (startedAt == null) return 0;
      const end = stoppedAt == null ? nowFn() : stoppedAt;
      return Math.max(0, end - startedAt);
    },
    get running() {
      return startedAt != null && stoppedAt == null;
    },
  };
}

export const ATTEMPT3_PAID_LIMITS = Object.freeze({
  model: "gpt-realtime-2.1",
  maxDurationMs: 115_000,
  absoluteSpendUsd: 5,
  attemptOrdinal: 3,
  maxAttempts: 3,
});
