/**
 * Factual-currentness tool interface.
 * Models must not invent live scores, brackets, or breaking news.
 */

export const FACTUAL_CURRENTNESS_TOOL = Object.freeze({
  type: "function",
  name: "factual_currentness",
  description:
    "Look up or admit limits for current-changing facts (sports scores, brackets, live news). Never fabricate.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      query: { type: "string" },
      domain: {
        type: "string",
        enum: ["sports", "news", "other"],
      },
    },
    required: ["query", "domain"],
  },
});

/**
 * Phase 1 mock: no live lookup. Always returns an honest unsupported boundary.
 */
export function handleFactualCurrentness({ query, domain }) {
  return {
    supported: false,
    domain: domain || "other",
    query: String(query || ""),
    spokenBoundary:
      "I don't have a live feed for that right now, so I won't invent a score or result. What about it matters to you?",
    reason: "phase1_mock_no_live_feed",
  };
}

export function looksLikeCurrentFactQuestion(text) {
  const t = String(text || "").toLowerCase();
  if (!t.trim()) return false;
  const currentCue =
    /\b(who won|what's the score|what is the score|did .+ win|world cup|finals?|bracket|live score|breaking news|election results?)\b/i.test(
      t,
    );
  return currentCue;
}
