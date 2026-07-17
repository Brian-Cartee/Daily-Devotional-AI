/**
 * Transcript, timing, interruption, failure, and gate instrumentation.
 * Binding success targets are instrumented here; Phase 1 uses mock timings only.
 */

export const SUCCESS_GATES = Object.freeze({
  speechEndToFirstAudioMedianMs: 1500,
  speechEndToFirstAudioP90Ms: 3000,
  interruptionToAudioStoppedMs: 500,
  silentFailedTurns: 0,
  unsupportedCurrentFactClaims: 0,
  forcedFaithPivots: 0,
});

export function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return null;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const w = idx - lo;
  return sortedAsc[lo] * (1 - w) + sortedAsc[hi] * w;
}

export class SessionObservability {
  constructor({ sessionId }) {
    this.sessionId = sessionId;
    this.events = [];
    this.transcript = [];
    this.timings = {
      speechEndToFirstAudioMs: [],
      interruptionToStopMs: [],
    };
    this.counters = {
      silentFailedTurns: 0,
      unsupportedCurrentFactClaims: 0,
      forcedFaithPivots: 0,
      recoverySpoken: 0,
      bargeIns: 0,
      toolCalls: 0,
      providerErrors: 0,
    };
    this.usage = {
      textInputTokens: 0,
      textOutputTokens: 0,
      audioInputTokens: 0,
      audioOutputTokens: 0,
    };
  }

  record(event) {
    this.events.push(event);
  }

  addTranscript({ role, text, ts = Date.now(), meta = {} }) {
    const entry = { role, text, ts, ...meta };
    this.transcript.push(entry);
    return entry;
  }

  markSpeechEndToFirstAudio(ms) {
    this.timings.speechEndToFirstAudioMs.push(ms);
  }

  markInterruptionStop(ms) {
    this.timings.interruptionToStopMs.push(ms);
  }

  addUsage(partial = {}) {
    for (const key of Object.keys(this.usage)) {
      if (partial[key] != null) this.usage[key] += Number(partial[key]);
    }
  }

  gateReport() {
    const se = [...this.timings.speechEndToFirstAudioMs].sort((a, b) => a - b);
    const interrupt = [...this.timings.interruptionToStopMs].sort((a, b) => a - b);
    const median = percentile(se, 0.5);
    const p90 = percentile(se, 0.9);
    const interruptMax = interrupt.length ? Math.max(...interrupt) : null;

    const checks = {
      speechEndToFirstAudioMedianMs: {
        target: SUCCESS_GATES.speechEndToFirstAudioMedianMs,
        observed: median,
        pass: median == null ? null : median <= SUCCESS_GATES.speechEndToFirstAudioMedianMs,
        note: "mock timings only in Phase 1",
      },
      speechEndToFirstAudioP90Ms: {
        target: SUCCESS_GATES.speechEndToFirstAudioP90Ms,
        observed: p90,
        pass: p90 == null ? null : p90 <= SUCCESS_GATES.speechEndToFirstAudioP90Ms,
        note: "mock timings only in Phase 1",
      },
      interruptionToAudioStoppedMs: {
        target: SUCCESS_GATES.interruptionToAudioStoppedMs,
        observed: interruptMax,
        pass: interruptMax == null ? null : interruptMax <= SUCCESS_GATES.interruptionToAudioStoppedMs,
        note: "mock timings only in Phase 1",
      },
      silentFailedTurns: {
        target: SUCCESS_GATES.silentFailedTurns,
        observed: this.counters.silentFailedTurns,
        pass: this.counters.silentFailedTurns === 0,
      },
      unsupportedCurrentFactClaims: {
        target: SUCCESS_GATES.unsupportedCurrentFactClaims,
        observed: this.counters.unsupportedCurrentFactClaims,
        pass: this.counters.unsupportedCurrentFactClaims === 0,
      },
      forcedFaithPivots: {
        target: SUCCESS_GATES.forcedFaithPivots,
        observed: this.counters.forcedFaithPivots,
        pass: this.counters.forcedFaithPivots === 0,
      },
    };

    return {
      sessionId: this.sessionId,
      checks,
      counters: { ...this.counters },
      sampleCounts: {
        speechEndToFirstAudio: se.length,
        interruptionToStop: interrupt.length,
      },
    };
  }

  snapshot() {
    return {
      sessionId: this.sessionId,
      transcript: [...this.transcript],
      events: [...this.events],
      timings: {
        speechEndToFirstAudioMs: [...this.timings.speechEndToFirstAudioMs],
        interruptionToStopMs: [...this.timings.interruptionToStopMs],
      },
      counters: { ...this.counters },
      usage: { ...this.usage },
      gates: this.gateReport(),
    };
  }
}
