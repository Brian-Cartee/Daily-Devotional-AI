/**
 * Contribution contract + local quality gate for substantive Philip turns.
 *
 * v1.1 — Functional evaluation: catch soft praise/paraphrase/interview that
 * renamed user content without a new proposition (ddd033a1 false negatives).
 * Regeneration remains OFF by default.
 */

export const CONTRIBUTION_CONTRACT_VERSION = "philip-contribution-contract-v1.1";

export const CONTRIBUTION_TYPES = [
  "observation",
  "connection",
  "distinction",
  "perspective",
  "practical_possibility",
  "gentle_challenge",
  "grounded_encouragement",
  "faith_shaped_insight",
  "quiet_presence",
];

/** System addendum for deep generation — internal planning, not spoken labels. */
export function buildContributionContractInstruction(ctx = {}) {
  const lines = [
    "CONTRIBUTION CONTRACT (INTERNAL — NEVER SPEAK THESE HEADINGS)",
    "Silently identify: (1) central human meaning, (2) important relationship or value, (3) relevant earlier context, (4) one contribution worth making, (5) whether a question is actually necessary.",
    "Then speak one to three short spoken sentences. Never voice planning labels.",
    "You must make one modest but real contribution that introduces a proposition the person did not already supply — not restatement, praise, emotional labeling, or an interview question.",
    "Permitted contribution functions (choose one): observation | connection | distinction | perspective | practical possibility | gentle challenge | grounded encouragement | faith-shaped insight | quiet presence when more interpretation would intrude.",
    "FAIL if you only: paraphrase; invent schedule inventory; apply generic enthusiasm or appraisal ('exciting', 'amazing', 'really special', 'it's great that'); offer generic relational sentiment without insight; ask how they manage or friends/family tradition questions that merely invite more disclosure; rename what they said in warmer words.",
    "Ordinary light topics (a match, a small plan) may take one light specific observation or quiet presence — never default excitement or intake.",
  ];

  if (ctx.reciprocalAsk) {
    lines.push(
      "RECIPROCAL REQUIRED: They asked how you are / how about yourself. Answer first with honest Philip presence (here, attentive, glad to continue, noticing what is unfolding, ready to think with them). Do not invent a human day. Then engage their substance.",
    );
  }
  if (ctx.caregivingDetected || ctx.relationalDetailDetected || ctx.weightyRelationalContext) {
    const label = ctx.relationalHint || "the relationship they named";
    lines.push(
      `RELATIONAL WEIGHT: Treat ${label} as relationship and commitment — not a calendar line. Do not invent hardship, exhaustion, sacrifice, or admirability unless they said so. Use their emotional framing.`,
    );
  }
  if (ctx.descriptiveFaith && ctx.weightyDescriptiveFaith) {
    lines.push(
      "WEIGHTY DESCRIPTIVE FAITH: Their faith practice is tied to caregiving, recovery, answered prayer, or sustained uncertainty. Contribute a grounded insight that connects the practice to that lived accompaniment — not a generic 'morning rhythm' line, not praise of religious performance, not a verse ask, not forced prayer, not a sermon.",
    );
  } else if (ctx.descriptiveFaith) {
    lines.push(
      "DESCRIPTIVE FAITH: Receive routine/discipline/peace/grounding only when their words support it. Do not ask for a verse, praise spirituality, manufacture a lesson, or force prayer. A grounded observation may stand alone.",
    );
  }
  if (ctx.preferStatement || ctx.lightOrdinaryTopic) {
    lines.push("Do not end with a question this turn unless it resolves something they already left unclear.");
  }
  if (ctx.lightOrdinaryTopic) {
    lines.push(
      "LIGHT ORDINARY TOPIC: Prefer one specific light observation or quiet presence. Do not ask whether they watch with friends/family or about personal traditions.",
    );
  }
  if (ctx.priorRelationalHints?.length) {
    lines.push(
      "Earlier relational anchors (use only if genuinely relevant; do not force illness callbacks into unrelated topics): " +
        ctx.priorRelationalHints.slice(0, 5).join("; ") +
        ".",
    );
  }
  return lines.join("\n");
}

/** Supporting applause phrases — support functional checks; not sufficient alone. */
const APPLAUSE_PHRASES =
  /\b(sounds? (like )?(an? )?(exciting|wonderful|great|amazing|special)|that sounds exciting|really special|it'?s (great|amazing|wonderful)( (that|how|to))?\b|it is (great|amazing|wonderful)|quite a full schedule|meaningful way to start|must be (quite )?rewarding|spark new interests|layer of connection and joy|enjoy each other'?s company)\b/i;

const GENERIC_RELATIONAL_SENTIMENT =
  /\b(sounds? really special|really special|great to share those moments|add a layer of connection|connection and joy|enjoy each other'?s company in a new way|bring people together and spark)\b/i;

const SCHEDULE_INVENTORY =
  /\b(balancing|full schedule|busy schedule|juggling|managing all (of )?that|keeping up with .{0,40}amidst|everything else (on )?your (plate|schedule))\b/i;

const MANAGING_QUESTION =
  /\bhow('?s| is| has)? (it |that )?(been )?(managing|handling|juggling|balancing)\b/i;

const INTERVIEW_INTAKE_QUESTION =
  /\b(do you (often|usually|normally) (watch|do|go|share)|is it more of a (personal )?tradition|with friends or family|tell me more|what('?s| is) that (been )?like|want to (say|share) more)\b/i;

const MANUFACTURED_STRUGGLE =
  /\b(must be (so )?(exhaust\w*|overwhelm\w*|drain\w*|burden\w*)|sounds (so )?(exhaust\w*|overwhelm\w*|drain\w*)|that'?s (a lot|so much) to (carry|handle|juggle))\b/i;

const FORCED_FAITH_PROBE =
  /\b(what verse|which (passage|scripture)|anything from your (scripture|prayer).{0,40}\bstaying with you|want (me )?to pray|shall we pray)\b/i;

const APPRAISAL_ONLY_OPENERS =
  /^(sounds? like|it'?s (amazing|great|wonderful|special)|that'?s (wonderful|beautiful|great|fantastic|special)|spending .+ sounds)\b/i;

const NEW_PROPOSITION_CUES =
  /\b(because|became|becomes|not merely|not just|not a problem|rather than|instead|means that|what (i'?m|i am) noticing|worth noticing|underneath|beside|alongside|through|carried|accompanied|made .+ (newly |more )?valuable|ordinary .+ (became|become)|practice .{0,40}(through|alongside|during)|answered|sustain|steadiness|quiet order)\b/i;

/**
 * Deterministic quality evaluation — no paid model.
 */
export function evaluateContributionQuality(replyText, ctx = {}) {
  const text = String(replyText || "").trim();
  const user = String(ctx.transcript || ctx.rawTranscript || "").trim();
  const failReasons = [];
  const requireContribution = ctx.requireContribution !== false;

  const applauseRisk = APPLAUSE_PHRASES.test(text);
  const appraisalOnlyRisk =
    APPRAISAL_ONLY_OPENERS.test(text) ||
    (applauseRisk && !NEW_PROPOSITION_CUES.test(text));
  const genericRelationalSentimentRisk = GENERIC_RELATIONAL_SENTIMENT.test(text);
  const genericPraiseRisk =
    applauseRisk ||
    /^(that'?s (wonderful|beautiful|great|fantastic)|it'?s great that|that sounds exciting|it'?s amazing)\b/i.test(
      text,
    );
  const scheduleInventoryRisk = SCHEDULE_INVENTORY.test(text);
  const interviewQuestionRisk =
    INTERVIEW_INTAKE_QUESTION.test(text) ||
    (MANAGING_QUESTION.test(text) && /\?\s*$/.test(text));
  const unnecessaryQuestionRisk =
    interviewQuestionRisk ||
    MANAGING_QUESTION.test(text) ||
    (Boolean(ctx.preferStatement || ctx.lightOrdinaryTopic) && /\?\s*$/.test(text)) ||
    (ctx.descriptiveFaith && FORCED_FAITH_PROBE.test(text)) ||
    (ctx.substantiveOrdinary && interviewQuestionRisk);
  const unsupportedStruggleRisk =
    MANUFACTURED_STRUGGLE.test(text) &&
    !/\b(exhaust|overwhelm|drain|tired|hard|struggl|wearing|worn|burden)\b/i.test(user);
  const forcedFaithRisk = Boolean(ctx.descriptiveFaith) && FORCED_FAITH_PROBE.test(text);

  const paraphraseOnlyRisk =
    isLikelyParaphraseOnly(text, user) || isEmotionalLabelWithoutInsight(text, user);
  const newPropositionDetected = detectNewProposition(text, user, ctx);
  const meaningfulDetailSelected = selectsMeaningfulDetail(text, ctx);
  const contextConnectionPresent =
    (Boolean(ctx.priorRelationalHints?.length) &&
      ctx.priorRelationalHints.some((h) => mentionOverlap(text, h))) ||
    Boolean(ctx.turnLocalContextOk);

  // Function assessment after structural signals.
  let contributionFunction = guessContributionType(text, ctx);
  const contributionPresent =
    newPropositionDetected &&
    !paraphraseOnlyRisk &&
    !scheduleInventoryRisk &&
    !appraisalOnlyRisk &&
    text.length >= 20;

  if (!contributionPresent && requireContribution) {
    if (appraisalOnlyRisk || genericPraiseRisk) failReasons.push("appraisal_only");
    else if (paraphraseOnlyRisk) failReasons.push("paraphrase_only");
    else failReasons.push("no_new_proposition");
  }
  if (genericPraiseRisk) failReasons.push("generic_praise");
  if (genericRelationalSentimentRisk) failReasons.push("generic_relational_sentiment");
  if (scheduleInventoryRisk) failReasons.push("schedule_inventory");
  if (unnecessaryQuestionRisk) failReasons.push("unnecessary_question");
  if (interviewQuestionRisk) failReasons.push("interview_question");
  if (paraphraseOnlyRisk && !failReasons.includes("paraphrase_only")) {
    failReasons.push("paraphrase_only");
  }
  if (unsupportedStruggleRisk) failReasons.push("unsupported_struggle");
  if (forcedFaithRisk) failReasons.push("forced_faith");
  if (
    requireContribution &&
    meaningfulDetailSelected &&
    !newPropositionDetected &&
    !failReasons.includes("no_new_proposition")
  ) {
    failReasons.push("detail_without_insight");
  }
  if (requireContribution && isGenericReusable(text) && !newPropositionDetected) {
    failReasons.push("generic_reusable");
  }

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
      /\bmom\b|\bmother\b|\bdad\b|\bfather\b|\bparent\b|\bwife\b|\bhusband\b|\bspouse\b|\bkids?\b|\bchild\b|\bson\b|\bdaughter\b|\bfriend\b|\bcare\w*|\brelationship\b|\bcommitment\b|\bshowing up\b|\bsteadiness\b|\brecover\w*|\baccompan\w*/i.test(
        text,
      );
    caregivingTreatedRelationally =
      relationalLex && !scheduleInventoryRisk && !genericRelationalSentimentRisk;
    if (!caregivingTreatedRelationally) failReasons.push("caregiving_not_relational");
  }

  // De-dupe fail reasons
  const uniqueFails = [...new Set(failReasons)];
  const passed = uniqueFails.length === 0;
  if (!contributionPresent) contributionFunction = contributionFunction || "none";

  return {
    passed,
    failReasons: uniqueFails,
    failureReasons: uniqueFails,
    contributionPresent,
    contributionFunction,
    newPropositionDetected,
    appraisalOnlyRisk,
    genericRelationalSentimentRisk,
    interviewQuestionRisk,
    paraphraseOnlyRisk,
    meaningfulDetailSelected,
    contextConnectionPresent: contextConnectionPresent || Boolean(ctx.turnLocalContextOk),
    reciprocalAnswered,
    caregivingTreatedRelationally,
    genericPraiseRisk,
    scheduleInventoryRisk,
    unnecessaryQuestionRisk,
    unsupportedStruggleRisk,
    forcedFaithRisk,
    contributionTypeGuess: contributionFunction,
    meaningfulDetailGuess:
      (ctx.relationalHint && ctx.relationalAnchorProvenance?.hintPresent
        ? ctx.relationalHint
        : null) ||
      pickUserCue(user) ||
      null,
    contractVersion: CONTRIBUTION_CONTRACT_VERSION,
  };
}

function detectNewProposition(text, user, ctx) {
  if (!text) return false;
  if (NEW_PROPOSITION_CUES.test(text)) return true;
  // Quiet presence + reciprocal answer can be valid without a heavy proposition.
  if (
    ctx.reciprocalAsk &&
    /\b(i'?m here|glad we'?re talking|paying attention)\b/i.test(text) &&
    !/\?\s*$/.test(text)
  ) {
    return true;
  }
  // Light ordinary: brief specific observation without appraisal/intake.
  if (
    ctx.lightOrdinaryTopic &&
    text.length >= 20 &&
    text.length <= 220 &&
    !APPLAUSE_PHRASES.test(text) &&
    !INTERVIEW_INTAKE_QUESTION.test(text) &&
    !/\?\s*$/.test(text)
  ) {
    return !isLikelyParaphraseOnly(text, user);
  }
  // Must not merely emotionally label.
  if (isEmotionalLabelWithoutInsight(text, user)) return false;
  // Distinctive connective words that aren't just warm synonyms.
  if (
    /\b(recovery|leukemia|answered|caregiving|step[- ]by[- ]step|host country|ordinary|shared time|accompan)\b/i.test(
      text,
    ) &&
    !GENERIC_RELATIONAL_SENTIMENT.test(text) &&
    text.split(/\s+/).length >= 12
  ) {
    // Still need insight beyond naming — require connective framing.
    return NEW_PROPOSITION_CUES.test(text) || /\b(because|through|made|became|not merely)\b/i.test(text);
  }
  return false;
}

function isEmotionalLabelWithoutInsight(reply, user) {
  const r = String(reply || "").toLowerCase();
  if (!r) return false;
  if (GENERIC_RELATIONAL_SENTIMENT.test(r)) return true;
  if (
    /\b(sounds? (really )?(special|exciting|wonderful)|great to share|amazing how|layer of connection)\b/i.test(r) &&
    !NEW_PROPOSITION_CUES.test(r)
  ) {
    return true;
  }
  // Soft summary of user's nouns without a because/means edge.
  const u = String(user || "").toLowerCase();
  if (/\b(?:mom|mother)\b/.test(u) && /\b(?:mom|mother)\b/.test(r) && !NEW_PROPOSITION_CUES.test(r)) {
    if (/\b(special|great|amazing|wonderful|joy|company)\b/i.test(r)) return true;
  }
  return false;
}

function isGenericReusable(text) {
  const t = String(text || "").toLowerCase();
  return (
    /\b(bring people together|spark new interests|enjoy each other'?s company|layer of connection|personal tradition|friends or family)\b/i.test(
      t,
    ) || /\bsounds like an exciting match\b/i.test(t)
  );
}

function mentionOverlap(text, hint) {
  const h = String(hint || "").toLowerCase();
  const t = String(text || "").toLowerCase();
  if (!h || !t) return false;
  const keys = h.match(
    /\b(mom|mother|dad|father|wife|husband|kids?|friend|scripture|prayer|world cup|app|job|recover|illness|caregiv)\b/g,
  );
  if (!keys) return t.includes(h.slice(0, 24));
  return keys.some((k) => t.includes(k));
}

function selectsMeaningfulDetail(text, ctx) {
  if (ctx.relationalHint && mentionOverlap(text, ctx.relationalHint)) return true;
  if (ctx.caregivingDetected && /\b(?:mom|mother|dad|father|parent|care|recover)\b/i.test(text)) {
    return true;
  }
  if (ctx.descriptiveFaith && /\b(scripture|prayer|peace|ground|dedicat|resonat|answered)\b/i.test(text)) {
    return true;
  }
  return /\b(?:mom|mother|dad|father|friend|scripture|prayer|peace|app|job|match|cup|argentina|england)\b/i.test(
    text,
  );
}

function isLikelyParaphraseOnly(reply, user) {
  const r = String(reply || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  const u = String(user || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  if (!r || !u) return false;
  if (/sounds like (you|it'|a |an )/.test(r) && !NEW_PROPOSITION_CUES.test(r)) return true;
  const uWords = new Set(u.split(/\s+/).filter((w) => w.length > 4));
  const rWords = r.split(/\s+/).filter((w) => w.length > 4);
  if (uWords.size < 4 || rWords.length < 6) return false;
  const overlap = rWords.filter((w) => uWords.has(w)).length;
  const ratio = overlap / rWords.length;
  return ratio >= 0.55 && /^(it sounds|you('?ve| have) got|balancing|you('?re| are) navigating|spending that time)/.test(r);
}

function guessContributionType(text, ctx) {
  const t = String(text || "");
  if (/\b(avoidance|rather than|may be|instead of)\b/i.test(t)) return "gentle_challenge";
  if (
    (ctx.descriptiveFaith || ctx.weightyDescriptiveFaith) &&
    /\b(peace|answered|accompan|through|care|recover|sustain)\b/i.test(t)
  ) {
    return "faith_shaped_insight";
  }
  if (/\b(i'?m here|with you|glad we'?re talking)\b/i.test(t) && t.split(/[.!?]/).length <= 2) {
    return "quiet_presence";
  }
  if (/\b(different|rather than|not the same|beside|alongside|not merely)\b/i.test(t)) {
    return "distinction";
  }
  if (/\b(because|became|connection|through)\b/i.test(t)) return "connection";
  if (/\b(could|might|one move|today)\b/i.test(t)) return "practical_possibility";
  if (/\b(i believe|what i'?m noticing|perspective)\b/i.test(t)) return "perspective";
  return "observation";
}

function pickUserCue(user) {
  const t = String(user || "");
  if (/\b(?:mom|mother)\b/i.test(t)) return "mother / caregiving";
  if (/\b(?:dad|father)\b/i.test(t)) return "father / caregiving";
  if (/\bscripture|prayer\b/i.test(t)) return "scripture / prayer practice";
  if (/\bworld cup\b/i.test(t)) return "World Cup";
  return null;
}

/** Whether live LLM path should attempt one bounded regeneration. Default: false. */
export function contributionRegenEnabled() {
  const raw = process.env.PHILIP_VOICE_LAB_CONTRIBUTION_REGEN?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function buildContributionRegenNudge(quality) {
  const reasons = (quality?.failReasons || quality?.failureReasons || []).join(", ") || "weak contribution";
  return (
    "Your previous draft failed Philip's contribution contract (" +
    reasons +
    "). Rewrite once: name the central human meaning, add one new proposition (not praise or paraphrase), " +
    "avoid excitement/appraisal and interview questions, answer any reciprocal how-are-you with presence only. " +
    "No planning headings. One to three short spoken sentences."
  );
}

/** True when a sports/light entertainment turn should stay light. */
export function isLightOrdinaryTopic(rawText) {
  const t = String(rawText || "").toLowerCase();
  if (!t) return false;
  if (/\b(leukemia|cancer|grief|funeral|died|dying|hospital|caregiv|answered .{0,12}prayer)\b/i.test(t)) {
    return false;
  }
  const light =
    /\b(world cup|match|game|argentina|england|soccer|football|entertaining|won against)\b/i.test(t);
  const relationalHeavy = /\b(mom|mother|dad|father).{0,40}\b(recover|leukemia|cancer|ill)\b/i.test(t);
  return light && !relationalHeavy && t.split(/\s+/).length <= 40;
}
