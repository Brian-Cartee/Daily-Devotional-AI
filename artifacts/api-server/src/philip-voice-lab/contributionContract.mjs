/**
 * Contribution contract + local quality gate for substantive Philip turns.
 *
 * The genome alone did not reliably control GPT-4o: soft instructions competed with
 * default assistant priors (praise, schedule inventory, interview questions) and no
 * local validation checked response *function*. This module:
 *   1) injects a reusable internal planning contract (not spoken headings)
 *   2) evaluates reply quality with deterministic heuristics (no second model)
 *
 * Retry policy: regeneration is OFF by default. Enabling
 * PHILIP_VOICE_LAB_CONTRIBUTION_REGEN=1 allows one bounded same-call retry, which
 * roughly doubles guidance latency and token cost on failing turns.
 */

export const CONTRIBUTION_CONTRACT_VERSION = "philip-contribution-contract-v1";

export const CONTRIBUTION_TYPES = [
  "observation",
  "distinction",
  "perspective",
  "practical_possibility",
  "gentle_challenge",
  "appropriate_encouragement",
  "grounded_faith_shaped_insight",
  "simple_presence",
];

/** System addendum for deep generation — internal planning, not spoken labels. */
export function buildContributionContractInstruction(ctx = {}) {
  const lines = [
    "CONTRIBUTION CONTRACT (INTERNAL — NEVER SPEAK THESE HEADINGS)",
    "Before you speak, silently choose:",
    "1) MEANINGFUL DETAIL — which detail carries the most relational or personal weight?",
    "2) CONTEXT CONNECTION — what earlier detail, value, relationship, tension, or preference connects?",
    "3) CONTRIBUTION TYPE — exactly one of: observation | distinction | perspective | practical possibility | gentle challenge | appropriate encouragement | grounded faith-shaped insight | simple presence when advice would be intrusive.",
    "4) RESPONSE SHAPE — receive the meaningful detail; relate it to context when possible; contribute something genuinely new; ask a question only if it advances the exchange.",
    "Never voice those planning labels. Speak as Philip in one to three short spoken sentences.",
    "FAIL CONDITIONS — do not produce a reply that only paraphrases, inventories a schedule, applies generic praise, calls everything 'a lot', says that sounds exciting/wonderful/great, asks how they are managing, ends with an unnecessary question, or offers no new thought.",
  ];

  if (ctx.reciprocalAsk) {
    lines.push(
      "RECIPROCAL REQUIRED: They asked how you are / how about yourself. Answer first with honest Philip presence (here, attentive, glad to continue, noticing what is unfolding, ready to think with them). Do not invent a human day. Then engage their substance.",
    );
  }
  if (ctx.caregivingDetected || ctx.relationalDetailDetected) {
    const label = ctx.relationalHint || "the relationship they named";
    lines.push(
      `RELATIONAL WEIGHT: Treat ${label} as relationship and commitment — not a calendar line. Do not invent hardship, exhaustion, sacrifice, or admirability unless they said so. Use their emotional framing.`,
    );
  }
  if (ctx.descriptiveFaith) {
    lines.push(
      "DESCRIPTIVE FAITH: Receive routine/discipline/peace/grounding only when their words support it. Do not ask for a verse to keep talking, praise them for being spiritual, manufacture a lesson, or force prayer. A grounded observation may stand alone.",
    );
  }
  if (ctx.preferStatement) {
    lines.push("Do not end with a question this turn.");
  }
  if (ctx.priorRelationalHints?.length) {
    lines.push(
      "Earlier relational anchors in this conversation (use naturally if still relevant, do not inventory): " +
        ctx.priorRelationalHints.slice(0, 4).join("; ") +
        ".",
    );
  }
  return lines.join("\n");
}

const GENERIC_PRAISE_BODY =
  /\b(that sounds (exciting|wonderful|great|amazing)|it'?s (great|wonderful|amazing) that|you'?re doing (an )?amazing|must be (quite )?(rewarding|exciting)|it'?s wonderful how|sounds like (quite )?a full schedule)\b/i;

const SCHEDULE_INVENTORY =
  /\b(balancing|full schedule|busy schedule|juggling|managing all (of )?that|keeping up with .{0,40}amidst|everything else (on )?your (plate|schedule))\b/i;

const MANAGING_QUESTION =
  /\bhow('?s| is| has)? (it |that )?(been )?(managing|handling|juggling|balancing)\b/i;

const MANUFACTURED_STRUGGLE =
  /\b(must be (so )?(exhaust\w*|overwhelm\w*|drain\w*|burden\w*)|sounds (so )?(exhaust\w*|overwhelm\w*|drain\w*)|that'?s (a lot|so much) to (carry|handle|juggle))\b/i;

const FORCED_FAITH_PROBE =
  /\b(what verse|which (passage|scripture)|anything from your (scripture|prayer).{0,40}\bstaying with you|want (me )?to pray|shall we pray)\b/i;

const UNNECESSARY_MANAGING_OR_INTAKE_Q =
  /\b(how('?s| is) (it|that) (going|been)|what('?s| is) that (been )?like|want to (say|share) more|tell me more)\s*\??\s*$/i;

/**
 * Deterministic quality evaluation — no paid model.
 * @returns {{
 *   contributionPresent: boolean,
 *   meaningfulDetailSelected: boolean,
 *   contextConnectionPresent: boolean,
 *   reciprocalAnswered: boolean|null,
 *   caregivingTreatedRelationally: boolean|null,
 *   genericPraiseRisk: boolean,
 *   scheduleInventoryRisk: boolean,
 *   unnecessaryQuestionRisk: boolean,
 *   paraphraseOnlyRisk: boolean,
 *   unsupportedStruggleRisk: boolean,
 *   forcedFaithRisk: boolean,
 *   passed: boolean,
 *   failReasons: string[],
 *   contributionTypeGuess: string|null,
 *   meaningfulDetailGuess: string|null,
 * }}
 */
export function evaluateContributionQuality(replyText, ctx = {}) {
  const text = String(replyText || "").trim();
  const user = String(ctx.transcript || ctx.rawTranscript || "").trim();
  const failReasons = [];

  const genericPraiseRisk =
    GENERIC_PRAISE_BODY.test(text) ||
    /^(that'?s (wonderful|beautiful|great|fantastic)|it'?s great that|that sounds exciting)\b/i.test(text);
  const scheduleInventoryRisk = SCHEDULE_INVENTORY.test(text);
  const unnecessaryQuestionRisk =
    MANAGING_QUESTION.test(text) ||
    (Boolean(ctx.preferStatement) && /\?\s*$/.test(text)) ||
    (ctx.descriptiveFaith && FORCED_FAITH_PROBE.test(text)) ||
    (ctx.substantiveOrdinary && UNNECESSARY_MANAGING_OR_INTAKE_Q.test(text) && scheduleInventoryRisk);
  const unsupportedStruggleRisk =
    MANUFACTURED_STRUGGLE.test(text) &&
    !/\b(exhaust|overwhelm|drain|tired|hard|struggl|wearing|worn|burden)\b/i.test(user);
  const forcedFaithRisk = Boolean(ctx.descriptiveFaith) && FORCED_FAITH_PROBE.test(text);

  const paraphraseOnlyRisk = isLikelyParaphraseOnly(text, user);
  const contributionPresent = !paraphraseOnlyRisk && text.length >= 24 && !scheduleInventoryRisk;
  const meaningfulDetailSelected = selectsMeaningfulDetail(text, ctx);
  const contextConnectionPresent =
    Boolean(ctx.priorRelationalHints?.length) &&
    ctx.priorRelationalHints.some((h) => mentionOverlap(text, h));

  let reciprocalAnswered = null;
  if (ctx.reciprocalAsk) {
    reciprocalAnswered =
      /\b(i'?m here|i am here|i'?m with you|glad (we'?re|to be) (talking|here)|paying attention|ready to (think|listen|talk)|what i'?m noticing)\b/i.test(
        text,
      ) && !/\b(i'?ve been busy|my day|i went to|i worked out|i slept)\b/i.test(text);
    if (!reciprocalAnswered) failReasons.push("reciprocal_unanswered");
  }

  let caregivingTreatedRelationally = null;
  if (ctx.caregivingDetected || ctx.relationalDetailDetected) {
    const relationalLex =
      /\bmom\b|\bmother\b|\bdad\b|\bfather\b|\bparent\b|\bwife\b|\bhusband\b|\bspouse\b|\bkids?\b|\bchild\b|\bson\b|\bdaughter\b|\bfriend\b|\bcare\w*|\brelationship\b|\bcommitment\b|\bshowing up\b|\bsteadiness\b/i.test(
        text,
      );
    caregivingTreatedRelationally = relationalLex && !scheduleInventoryRisk;
    if (!caregivingTreatedRelationally) failReasons.push("caregiving_not_relational");
  }

  if (genericPraiseRisk) failReasons.push("generic_praise");
  if (scheduleInventoryRisk) failReasons.push("schedule_inventory");
  if (unnecessaryQuestionRisk) failReasons.push("unnecessary_question");
  if (paraphraseOnlyRisk) failReasons.push("paraphrase_only");
  if (unsupportedStruggleRisk) failReasons.push("unsupported_struggle");
  if (forcedFaithRisk) failReasons.push("forced_faith");
  if (!contributionPresent && ctx.requireContribution !== false) failReasons.push("no_contribution");

  const contributionTypeGuess = guessContributionType(text, ctx);
  const meaningfulDetailGuess = ctx.relationalHint || pickUserCue(user) || null;

  const passed = failReasons.length === 0;

  return {
    contributionPresent,
    meaningfulDetailSelected,
    contextConnectionPresent: contextConnectionPresent || Boolean(ctx.turnLocalContextOk),
    reciprocalAnswered,
    caregivingTreatedRelationally,
    genericPraiseRisk,
    scheduleInventoryRisk,
    unnecessaryQuestionRisk,
    paraphraseOnlyRisk,
    unsupportedStruggleRisk,
    forcedFaithRisk,
    passed,
    failReasons,
    contributionTypeGuess,
    meaningfulDetailGuess,
    contractVersion: CONTRIBUTION_CONTRACT_VERSION,
  };
}

function mentionOverlap(text, hint) {
  const h = String(hint || "").toLowerCase();
  const t = String(text || "").toLowerCase();
  if (!h || !t) return false;
  const keys = h.match(/\b(mom|mother|dad|father|wife|husband|kids?|friend|scripture|prayer|world cup|app|job)\b/g);
  if (!keys) return t.includes(h.slice(0, 24));
  return keys.some((k) => t.includes(k));
}

function selectsMeaningfulDetail(text, ctx) {
  if (ctx.relationalHint && mentionOverlap(text, ctx.relationalHint)) return true;
  if (ctx.caregivingDetected && /\b(mom|mother|dad|father|parent|care)\b/i.test(text)) return true;
  if (ctx.descriptiveFaith && /\b(scripture|prayer|peace|ground|dedicat|resonat)\b/i.test(text)) {
    return true;
  }
  return /\b(mom|mother|dad|father|friend|scripture|prayer|peace|app|job|match|cup)\b/i.test(text);
}

function isLikelyParaphraseOnly(reply, user) {
  const r = String(reply || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  const u = String(user || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  if (!r || !u) return false;
  if (/sounds like (you|it'|a )/.test(r) && !/\b(but|yet|still|rather|instead|worth|means|says)\b/.test(r)) {
    return true;
  }
  const uWords = new Set(u.split(/\s+/).filter((w) => w.length > 4));
  const rWords = r.split(/\s+/).filter((w) => w.length > 4);
  if (uWords.size < 4 || rWords.length < 6) return false;
  const overlap = rWords.filter((w) => uWords.has(w)).length;
  const ratio = overlap / rWords.length;
  // High lexical echo with soft formula openers → paraphrase risk
  return ratio >= 0.55 && /^(it sounds|you('?ve| have) got|balancing|you('?re| are) navigating)/.test(r);
}

function guessContributionType(text, ctx) {
  const t = String(text || "");
  if (/\b(avoidance|rather than|may be|instead of)\b/i.test(t)) return "gentle_challenge";
  if (ctx.descriptiveFaith && /\b(peace|ground|rhythm|order|foundation)\b/i.test(t)) {
    return "grounded_faith_shaped_insight";
  }
  if (/\b(i'?m here|with you|glad we'?re talking)\b/i.test(t) && t.split(/[.!?]/).length <= 2) {
    return "simple_presence";
  }
  if (/\b(different|rather than|not the same|beside|alongside)\b/i.test(t)) return "distinction";
  if (/\b(could|might|one move|today)\b/i.test(t)) return "practical_possibility";
  if (/\b(i believe|what i'?m noticing|perspective)\b/i.test(t)) return "perspective";
  return "observation";
}

function pickUserCue(user) {
  const t = String(user || "");
  if (/\bmom|mother\b/i.test(t)) return "mother / caregiving";
  if (/\bdad|father\b/i.test(t)) return "father / caregiving";
  if (/\bscripture|prayer\b/i.test(t)) return "scripture / prayer practice";
  if (/\bworld cup\b/i.test(t)) return "World Cup";
  return null;
}

/** Whether live LLM path should attempt one bounded regeneration. Default: false (log only). */
export function contributionRegenEnabled() {
  const raw = process.env.PHILIP_VOICE_LAB_CONTRIBUTION_REGEN?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function buildContributionRegenNudge(quality) {
  const reasons = (quality?.failReasons || []).join(", ") || "weak contribution";
  return (
    "Your previous draft failed Philip's contribution contract (" +
    reasons +
    "). Rewrite once: receive the most relationally meaningful detail, contribute one new thought, " +
    "avoid praise/schedule inventory/managing questions, answer any reciprocal how-are-you with presence only. " +
    "No planning headings. One to three short spoken sentences."
  );
}
