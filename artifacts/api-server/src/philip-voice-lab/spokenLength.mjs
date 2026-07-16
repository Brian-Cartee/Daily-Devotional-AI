/**
 * Voice-oriented spoken-length discipline for Terra / Front Door replies.
 * Enforceable budget by estimated audible duration + words/chars — not
 * sentence count alone. Never invents canned prose; only trims surplus.
 */

/** Conversational pace band (~110–160 wpm). Default mid-band ~135 wpm. */
export const SPOKEN_TARGET_WPM_MIN = 110;
export const SPOKEN_TARGET_WPM_MAX = 160;
export const SPOKEN_TARGET_WPM = 135;

/** Ordinary Terra target: ~6–10s audible, normally 1–2 sentences. */
export const SPOKEN_TARGET_MAX_MS = 10000;
export const SPOKEN_SOFT_MAX_MS = 14000;
export const SPOKEN_TARGET_MIN_MS = 6000;
export const SPOKEN_TARGET_MAX_WORDS = 24;
export const SPOKEN_SOFT_MAX_WORDS = 32;
export const SPOKEN_TARGET_MAX_CHARS = 160;
export const SPOKEN_SOFT_MAX_CHARS = 240;
export const SPOKEN_TARGET_MAX_SENTENCES = 2;
export const SPOKEN_HARD_MAX_SENTENCES = 3;

/** Approx chars/sec at target WPM assuming ~5 chars/word incl. spaces. */
export const SPOKEN_CHARS_PER_SECOND = (SPOKEN_TARGET_WPM * 5) / 60; // ≈ 11.25

export function countSpokenWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function countSpokenSentences(text) {
  const parts = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length || (String(text || "").trim() ? 1 : 0);
}

export function estimateSpokenDurationMs(text, { wpm = SPOKEN_TARGET_WPM } = {}) {
  const words = countSpokenWords(text);
  if (!words) return 0;
  const rate = Math.max(SPOKEN_TARGET_WPM_MIN, Math.min(SPOKEN_TARGET_WPM_MAX, Number(wpm) || SPOKEN_TARGET_WPM));
  return Math.round((words / rate) * 60 * 1000);
}

/**
 * Observability for a spoken reply.
 * @returns {{
 *   words: number,
 *   characters: number,
 *   replyChars: number,
 *   sentenceCount: number,
 *   estimatedSpokenDurationMs: number,
 *   estimatedAudibleMs: number,
 *   withinTarget: boolean,
 *   overSoftMax: boolean,
 *   budget: object,
 *   warnings: string[],
 * }}
 */
export function measureSpokenLength(text) {
  const trimmed = String(text || "").trim();
  const characters = trimmed.length;
  const words = countSpokenWords(trimmed);
  const sentenceCount = countSpokenSentences(trimmed);
  const estimatedSpokenDurationMs = estimateSpokenDurationMs(trimmed);
  const warnings = [];
  if (sentenceCount > SPOKEN_TARGET_MAX_SENTENCES) {
    warnings.push("sentence_count_over_target");
  }
  if (words > SPOKEN_TARGET_MAX_WORDS) {
    warnings.push("word_count_over_target");
  }
  if (characters > SPOKEN_TARGET_MAX_CHARS) {
    warnings.push("char_count_over_target");
  }
  if (characters > SPOKEN_SOFT_MAX_CHARS) {
    warnings.push("char_count_over_soft_max");
  }
  if (words > SPOKEN_SOFT_MAX_WORDS) {
    warnings.push("word_count_over_soft_max");
  }
  if (estimatedSpokenDurationMs > SPOKEN_TARGET_MAX_MS) {
    warnings.push("estimated_duration_over_10s");
  }
  if (estimatedSpokenDurationMs > SPOKEN_SOFT_MAX_MS) {
    warnings.push("estimated_duration_over_soft_max");
  }
  const withinTarget =
    sentenceCount <= SPOKEN_TARGET_MAX_SENTENCES &&
    words <= SPOKEN_TARGET_MAX_WORDS &&
    characters <= SPOKEN_TARGET_MAX_CHARS &&
    estimatedSpokenDurationMs <= SPOKEN_TARGET_MAX_MS;
  const overSoftMax =
    words > SPOKEN_SOFT_MAX_WORDS ||
    characters > SPOKEN_SOFT_MAX_CHARS ||
    sentenceCount > SPOKEN_HARD_MAX_SENTENCES ||
    estimatedSpokenDurationMs > SPOKEN_SOFT_MAX_MS;
  return {
    words,
    characters,
    replyChars: characters,
    sentenceCount,
    estimatedSpokenDurationMs,
    estimatedAudibleMs: estimatedSpokenDurationMs,
    withinTarget,
    overSoftMax,
    budget: {
      targetMaxMs: SPOKEN_TARGET_MAX_MS,
      softMaxMs: SPOKEN_SOFT_MAX_MS,
      targetMaxWords: SPOKEN_TARGET_MAX_WORDS,
      softMaxWords: SPOKEN_SOFT_MAX_WORDS,
      targetMaxChars: SPOKEN_TARGET_MAX_CHARS,
      softMaxChars: SPOKEN_SOFT_MAX_CHARS,
      targetMaxSentences: SPOKEN_TARGET_MAX_SENTENCES,
      targetWpm: SPOKEN_TARGET_WPM,
    },
    warnings,
  };
}

function stripTrailingQuestionSentence(parts) {
  if (parts.length < 2) return parts;
  const last = parts[parts.length - 1];
  if (/\?\s*$/.test(last)) return parts.slice(0, -1);
  return parts;
}

/** Prefer the principal contribution; drop short softeners and later secondary lines. */
function pickWarrantedSentences(parts, maxSentences) {
  if (parts.length <= maxSentences) return parts;
  const isSoft = (p) => {
    const w = p.split(/\s+/).filter(Boolean).length;
    if (
      w <= 8 &&
      /^(i'?m with you|i hear you|fair enough|fair point|good point|alright|got it|of course|absolutely|you'?re right)\b/i.test(
        p,
      )
    ) {
      return true;
    }
    return false;
  };
  const hard = parts.filter((p) => !isSoft(p));
  const pool = hard.length ? hard : parts;
  return pool.slice(0, maxSentences);
}

/**
 * Soft-trim ordinary Terra replies to the audible budget.
 * Removes secondary explanation, stacked metaphor, duplicate caution, and
 * unnecessary trailing questions first — does not invent replacement prose.
 * Preserves the warranted contribution sentence when reducing.
 */
export function softTrimSpokenResponse(
  text,
  {
    maxSentences = SPOKEN_TARGET_MAX_SENTENCES,
    maxWords = SPOKEN_SOFT_MAX_WORDS,
    maxChars = SPOKEN_SOFT_MAX_CHARS,
    maxMs = SPOKEN_SOFT_MAX_MS,
  } = {},
) {
  const original = String(text || "").trim();
  if (!original) {
    return {
      text: original,
      trimmed: false,
      trimApplied: false,
      before: measureSpokenLength(""),
      after: measureSpokenLength(""),
    };
  }
  const before = measureSpokenLength(original);
  let parts = original
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Enforce soft/hard ceilings. Over-target-but-under-soft stays advisory.
  const needsTrim =
    parts.length > maxSentences ||
    before.overSoftMax ||
    before.words > maxWords ||
    before.characters > maxChars ||
    before.estimatedSpokenDurationMs > maxMs;

  if (!needsTrim) {
    return {
      text: original,
      trimmed: false,
      trimApplied: false,
      before,
      after: before,
    };
  }

  parts = stripTrailingQuestionSentence(parts);
  if (parts.length > maxSentences) {
    parts = pickWarrantedSentences(parts, maxSentences);
  }
  let kept = parts.join(" ").trim();
  let after = measureSpokenLength(kept);
  if (
    after.words > maxWords ||
    after.estimatedSpokenDurationMs > maxMs ||
    after.characters > maxChars
  ) {
    parts = pickWarrantedSentences(parts, 1);
    kept = parts.join(" ").trim();
    after = measureSpokenLength(kept);
  }
  if (after.words > maxWords || after.estimatedSpokenDurationMs > maxMs) {
    const words = kept.split(/\s+/).filter(Boolean);
    const limit = Math.max(8, Math.min(maxWords, SPOKEN_TARGET_MAX_WORDS + 4));
    kept = words.slice(0, limit).join(" ").trim();
    // Avoid dangling conjunctions / em-dashes from mid-sentence cuts.
    kept = kept.replace(/[,:;–—\-]+\s*$/g, "").replace(/\b(and|or|but|with|to|for|of|the|a|an)\s*$/i, "").trim();
    if (kept && !/[.!?]$/.test(kept)) kept = `${kept}.`;
    after = measureSpokenLength(kept);
  }
  if (kept.length > maxChars) {
    const cut = kept.slice(0, maxChars);
    const boundary = cut.lastIndexOf(" ");
    kept = (boundary > 80 ? cut.slice(0, boundary) : cut).trim();
    if (!/[.!?]$/.test(kept)) kept = `${kept}.`;
    after = measureSpokenLength(kept);
  }

  return {
    text: kept,
    trimmed: kept !== original,
    trimApplied: kept !== original,
    before,
    after,
  };
}
