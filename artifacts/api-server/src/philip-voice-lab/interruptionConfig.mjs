/** Tunable barge-in thresholds — override via env. */

function envInt(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function envFloat(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {{ energyThreshold: number }} vadConfig
 */
export function interruptConfigFromEnv(vadConfig) {
  return {
    baseEnergyThreshold: vadConfig.energyThreshold,
    protectionWindowMs: envInt("PHILIP_VOICE_LAB_INTERRUPT_PROTECT_MS", 800),
    sustainedSpeechMs: envInt("PHILIP_VOICE_LAB_INTERRUPT_SUSTAIN_MS", 550),
    energyMultiplier: envFloat("PHILIP_VOICE_LAB_INTERRUPT_ENERGY_MULT", 1.75),
    minUtteranceBytes: envInt("PHILIP_VOICE_LAB_INTERRUPT_MIN_BYTES", 3200),
  };
}

export function isAsyncPlaybackEnabled() {
  const raw = process.env.PHILIP_VOICE_LAB_ASYNC_PLAYBACK?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return true;
}
