import { rmsInt16 } from "./audioUtil.mjs";

/**
 * Conservative barge-in detector — used only while Philip is speaking.
 * Does not replace normal UtteranceCollector.
 */
export class InterruptionMonitor {
  /**
   * @param {ReturnType<import('./interruptionConfig.mjs').interruptConfigFromEnv>} config
   */
  constructor(config) {
    this.config = config;
    this.armedAt = 0;
    this.candidateStartedAt = 0;
    this.inCandidate = false;
    this.chunks = [];
    this.interruptAccepted = false;
    this.lastEnergy = 0;
    this.peakCandidateEnergy = 0;
  }

  arm(startedAt) {
    this.armedAt = startedAt;
    this.resetCandidate();
    this.interruptAccepted = false;
  }

  resetCandidate() {
    this.inCandidate = false;
    this.candidateStartedAt = 0;
    this.chunks = [];
    this.peakCandidateEnergy = 0;
  }

  /**
   * @param {Int16Array} samples
   * @returns {{
   *   phase: string;
   *   energy?: number;
   *   durationMs?: number;
   *   utterance?: Buffer;
   *   reason?: string;
   * } | null}
   */
  push(samples) {
    if (this.interruptAccepted || !samples?.length) return null;

    const now = Date.now();
    if (now - this.armedAt < this.config.protectionWindowMs) {
      return { phase: "protected", energy: rmsInt16(samples) };
    }

    const energy = rmsInt16(samples);
    this.lastEnergy = energy;
    const threshold = this.config.baseEnergyThreshold * this.config.energyMultiplier;
    const speech = energy >= threshold;

    if (!speech) {
      if (this.inCandidate) {
        const durationMs = now - this.candidateStartedAt;
        this.resetCandidate();
        return { phase: "candidate_rejected", reason: "energy_dropped", durationMs, energy };
      }
      return { phase: "below_threshold", energy, threshold: Math.round(threshold) };
    }

    if (!this.inCandidate) {
      this.inCandidate = true;
      this.candidateStartedAt = now;
      this.chunks = [];
      this.peakCandidateEnergy = energy;
      return { phase: "candidate_start", energy };
    }

    this.peakCandidateEnergy = Math.max(this.peakCandidateEnergy, energy);
    const frameBuf = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
    this.chunks.push(frameBuf);

    const durationMs = now - this.candidateStartedAt;
    if (durationMs < this.config.sustainedSpeechMs) {
      return { phase: "candidate", durationMs, energy };
    }

    const utterance = Buffer.concat(this.chunks);
    if (utterance.length < this.config.minUtteranceBytes) {
      this.resetCandidate();
      return { phase: "candidate_rejected", reason: "too_short", durationMs, energy };
    }

    this.interruptAccepted = true;
    return {
      phase: "accepted",
      utterance,
      durationMs,
      energy,
      peakEnergy: this.peakCandidateEnergy,
    };
  }
}
