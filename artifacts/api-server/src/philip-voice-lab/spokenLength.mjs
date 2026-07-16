/**
 * Voice-oriented spoken-length discipline for Terra / Front Door replies.
 * Advisory measurements + optional soft trim. Never logs private plan text.
 */

/** ~2.5 words/sec conversational pace → 8–10s ≈ 20–25 words. */
export const SPOKEN_TARGET_MAX_CHARS = 160;
export const SPOKEN_SOFT_MAX_CHARS = 280;
export const SPOKEN_TARGET_MAX_SENTENCES = 2;
export const SPOKEN_HARD_MAX_SENTENCES = 3;
/** Approximate audible seconds from character count (incl. pauses). */
export const SPOKEN_CHARS_PER_SECOND = 16;

export function countSpokenSentences(text) {
  const parts = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length || (String(text || "").trim() ? 1 : 0);
}

export function estimateSpokenDurationMs(text) {
  const chars = String(text || "").trim().length;
  if (!chars) return 0;
  return Math.round((chars / SPOKEN_CHARS_PER_SECOND) * 1000);
}

/**
 * Observability for a spoken reply. Advisory — does not veto.
 * @returns {{
 *   replyChars: number,
 *   sentenceCount: number,
 *   estimatedSpokenDurationMs: number,
 *   withinTarget: boolean,
 *   overSoftMax: boolean,
 *   warnings: string[],
 * }}
 */
export function measureSpokenLength(text) {
  const trimmed = String(text || "").trim();
  const replyChars = trimmed.length;
  const sentenceCount = countSpokenSentences(trimmed);
  const estimatedSpokenDurationMs = estimateSpokenDurationMs(trimmed);
  const warnings = [];
  if (sentenceCount > SPOKEN_TARGET_MAX_SENTENCES) {
    warnings.push("sentence_count_over_target");
  }
  if (replyChars > SPOKEN_TARGET_MAX_CHARS) {
    warnings.push("char_count_over_target");
  }
  if (replyChars > SPOKEN_SOFT_MAX_CHARS) {
    warnings.push("char_count_over_soft_max");
  }
  if (estimatedSpokenDurationMs > 10000) {
    warnings.push("estimated_duration_over_10s");
  }
  return {
    replyChars,
    sentenceCount,
    estimatedSpokenDurationMs,
    withinTarget:
      sentenceCount <= SPOKEN_TARGET_MAX_SENTENCES && replyChars <= SPOKEN_TARGET_MAX_CHARS,
    overSoftMax: replyChars > SPOKEN_SOFT_MAX_CHARS || sentenceCount > SPOKEN_HARD_MAX_SENTENCES,
    warnings,
  };
}

/**
 * Soft-trim to the first N sentences when over soft max.
 * Keeps substance; does not invent canned text.
 */
export function softTrimSpokenResponse(text, { maxSentences = SPOKEN_TARGET_MAX_SENTENCES } = {}) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return { text: trimmed, trimmed: false };
  const parts = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  // Advisory target is 1–2 sentences / ~160 chars. Only hard-trim when clearly over:
  // more than maxSentences, or beyond soft max chars.
  const needsSentenceTrim = parts.length > maxSentences;
  const needsCharTrim = trimmed.length > SPOKEN_SOFT_MAX_CHARS;
  if (!needsSentenceTrim && !needsCharTrim) {
    return { text: trimmed, trimmed: false };
  }
  let kept = parts.slice(0, maxSentences).join(" ").trim();
  if (kept.length > SPOKEN_SOFT_MAX_CHARS) {
    const cut = kept.slice(0, SPOKEN_SOFT_MAX_CHARS);
    const boundary = cut.lastIndexOf(" ");
    kept = (boundary > 80 ? cut.slice(0, boundary) : cut).trim();
    if (!/[.!?]$/.test(kept)) kept = `${kept}.`;
  }
  return { text: kept, trimmed: kept !== trimmed };
}
