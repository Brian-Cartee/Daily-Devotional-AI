/**
 * Official OpenAI Realtime pricing anchors for gpt-realtime-2.1 (Phase 1 estimation only).
 * Source: https://platform.openai.com/docs/models/gpt-realtime-2.1
 *
 * Audio token density heuristics used by prior OpenAI cost notes and this repo's
 * realtime benchmark mocks (~1 input audio token / 100ms, ~1 output audio token / 50ms).
 * These are estimates, not measured provider latency or billing.
 */

export const GPT_REALTIME_21_PRICING = Object.freeze({
  model: "gpt-realtime-2.1",
  textInputPerMillionUsd: 4,
  textOutputPerMillionUsd: 24,
  audioInputPerMillionUsd: 32,
  audioOutputPerMillionUsd: 64,
  cachedTextInputPerMillionUsd: 0.4,
  cachedAudioInputPerMillionUsd: 0.4,
});

export const TOKEN_DENSITY = Object.freeze({
  inputAudioTokensPerMs: 1 / 100,
  outputAudioTokensPerMs: 1 / 50,
});

export function usdFromTokens(tokens, perMillionUsd) {
  return (Number(tokens) / 1_000_000) * Number(perMillionUsd);
}

/**
 * @param {object} usage
 * @param {number} [usage.textInputTokens]
 * @param {number} [usage.textOutputTokens]
 * @param {number} [usage.audioInputTokens]
 * @param {number} [usage.audioOutputTokens]
 * @param {number} [usage.cachedTextInputTokens]
 * @param {number} [usage.cachedAudioInputTokens]
 */
export function estimateSessionCostUsd(usage = {}, pricing = GPT_REALTIME_21_PRICING) {
  const textIn = Number(usage.textInputTokens || 0);
  const textOut = Number(usage.textOutputTokens || 0);
  const audioIn = Number(usage.audioInputTokens || 0);
  const audioOut = Number(usage.audioOutputTokens || 0);
  const cachedText = Number(usage.cachedTextInputTokens || 0);
  const cachedAudio = Number(usage.cachedAudioInputTokens || 0);

  const usd =
    usdFromTokens(textIn, pricing.textInputPerMillionUsd) +
    usdFromTokens(textOut, pricing.textOutputPerMillionUsd) +
    usdFromTokens(audioIn, pricing.audioInputPerMillionUsd) +
    usdFromTokens(audioOut, pricing.audioOutputPerMillionUsd) +
    usdFromTokens(cachedText, pricing.cachedTextInputPerMillionUsd) +
    usdFromTokens(cachedAudio, pricing.cachedAudioInputPerMillionUsd);

  return {
    model: pricing.model,
    usd: Number(usd.toFixed(6)),
    breakdown: {
      textInputTokens: textIn,
      textOutputTokens: textOut,
      audioInputTokens: audioIn,
      audioOutputTokens: audioOut,
      cachedTextInputTokens: cachedText,
      cachedAudioInputTokens: cachedAudio,
    },
  };
}

/**
 * Conservative conversation cost model for planning.
 * Assumes continuous duplex audio with moderate assistant talk ratio.
 */
export function estimateConversationCost({
  durationMinutes,
  userTalkRatio = 0.55,
  assistantTalkRatio = 0.35,
  textInputTokensPerMinute = 80,
  textOutputTokensPerMinute = 120,
  pricing = GPT_REALTIME_21_PRICING,
} = {}) {
  const minutes = Number(durationMinutes);
  const ms = minutes * 60_000;
  const audioInputTokens = Math.round(ms * userTalkRatio * TOKEN_DENSITY.inputAudioTokensPerMs);
  const audioOutputTokens = Math.round(ms * assistantTalkRatio * TOKEN_DENSITY.outputAudioTokensPerMs);
  const textInputTokens = Math.round(minutes * textInputTokensPerMinute);
  const textOutputTokens = Math.round(minutes * textOutputTokensPerMinute);

  const estimate = estimateSessionCostUsd(
    {
      textInputTokens,
      textOutputTokens,
      audioInputTokens,
      audioOutputTokens,
    },
    pricing,
  );

  return {
    durationMinutes: minutes,
    assumptions: {
      userTalkRatio,
      assistantTalkRatio,
      textInputTokensPerMinute,
      textOutputTokensPerMinute,
      tokenDensity: TOKEN_DENSITY,
      pricing,
    },
    ...estimate,
  };
}

export class BudgetGuard {
  constructor({ hardCapUsd = 0.75, warnAtUsd = 0.5 } = {}) {
    this.hardCapUsd = hardCapUsd;
    this.warnAtUsd = warnAtUsd;
    this.stopped = false;
    this.stopReason = null;
  }

  evaluate(estimatedUsd) {
    if (this.stopped) {
      return { allowed: false, warned: true, stopped: true, reason: this.stopReason };
    }
    if (estimatedUsd >= this.hardCapUsd) {
      this.stopped = true;
      this.stopReason = "hard_budget_cap";
      return { allowed: false, warned: true, stopped: true, reason: this.stopReason };
    }
    if (estimatedUsd >= this.warnAtUsd) {
      return { allowed: true, warned: true, stopped: false, reason: "budget_warn" };
    }
    return { allowed: true, warned: false, stopped: false, reason: null };
  }
}
