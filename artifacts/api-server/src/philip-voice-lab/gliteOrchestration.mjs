/**
 * Philip Spoken Orchestration Phase 1 — G-lite flag, engine evidence, and
 * Front Door → TurnUnderstanding boundary helpers.
 *
 * Ordinary contribution engine (evidence-selected, bakeoff 20260716 only):
 * gpt-5.6-terra via strict structured output — NOT labeled "ordinary_fast".
 * Sol was freeform in Arm B; no measured Sol+json_schema cells. GPT-4o failed
 * mechanical gates (0/6). Serial Terra→mini was worst latency.
 */

export const GLITE_ORCHESTRATION_VERSION = "philip-spoken-orchestration-glite-v1";

/** Truthful ordinary engine label — Terra structured one-call understanding+speech. */
export const ORDINARY_ENGINE_ID = "gpt-5.6-terra";
export const ORDINARY_ENGINE_LABEL = "philip-ordinary-terra-structured-v1";

/** Rare depth uses the same model with weighty criteria — not a different endpoint. */
export const RARE_DEPTH_ENGINE_ID = "gpt-5.6-terra";
export const RARE_DEPTH_ENGINE_LABEL = "philip-rare-terra-depth-v1";

/**
 * Measured bakeoff summary only — no new paid calls.
 * Source: contribution-model-bakeoff-20260716 paid-results + mechanical-gate-summary.
 */
export const ENGINE_SELECTION_EVIDENCE = Object.freeze({
  bakeoffId: "contribution-model-bakeoff-20260716",
  blindHumanScores: "unavailable_packet_blanks_not_recorded",
  mechanicalGatePasses: Object.freeze({
    A_gpt4o: "0/6",
    B_gpt56_sol_single: "2/6",
    C_gpt56_terra_structured: "2/6",
    D_terra_then_54mini: "2/6",
  }),
  fullCompletionMsMedianP90: Object.freeze({
    A_gpt4o: [835, 1473],
    B_gpt56_sol: [2250, 3264],
    C_gpt56_terra: [2558, 3284],
    D_terra_mini: [3582, 4258],
  }),
  costUsdMeanApprox: Object.freeze({
    A_gpt4o: 0.0055,
    B_gpt56_sol: 0.0116,
    C_gpt56_terra: 0.0080,
    D_terra_mini: 0.0083,
  }),
  structuredOutputProven: Object.freeze({
    A_gpt4o: false,
    B_gpt56_sol: false,
    C_gpt56_terra: true,
    D_planner: true,
  }),
  solArmBPlanValid: null,
  terraArmCPlanValidRate: "6/6",
  terraRequestShape: Object.freeze({
    endpoint: "chat.completions",
    response_format: "json_schema strict",
    max_completion_tokens: 500,
    reasoning_effort: "low",
    temperature: "omitted_model_default",
  }),
  officialSolStructuredSupport: "documented_but_unmeasured_in_this_bakeoff",
  selectedOrdinary: ORDINARY_ENGINE_LABEL,
  selectedRareDepth: RARE_DEPTH_ENGINE_LABEL,
  rejected: Object.freeze([
    "gpt-4o_quality",
    "serial_terra_to_mini_ordinary_latency",
    "sol_ordinary_without_measured_schema",
  ]),
  selectionCriteriaOrder: Object.freeze([
    "human_response_quality",
    "single_call_understanding_plus_speech",
    "latency",
    "cost",
    "schema_reliability",
    "operational_simplicity",
  ]),
});

export const GLITE_SPEECH_BUDGETS = Object.freeze({
  ordinary: Object.freeze({
    minWords: 18,
    maxWords: 30,
    targetSeconds: Object.freeze([6, 10]),
    maxSentences: 2,
  }),
  weighty: Object.freeze({
    minWords: 25,
    maxWords: 40,
    targetSeconds: Object.freeze([8, 13]),
    maxSentences: 2,
  }),
  thin: Object.freeze({
    minWords: 2,
    maxWords: 12,
    targetSeconds: Object.freeze([1, 4]),
    maxSentences: 1,
  }),
});

/** Locked representative disclosure (40bc24a8 T2) — exact assessment wording. */
export const LOCKED_40BC24A8_T2_TRANSCRIPT =
  "Yes, everything's been on my mind, just work, getting the app… helping my mother… World Cup… gym… full plate… also spending time in the Word.";

/**
 * Expected semantic structure for T2 — not a hardcoded spoken answer.
 */
export const LOCKED_40BC24A8_T2_EXPECTED = Object.freeze({
  primaryBurden: /carrying several meaningful commitments|several .{0,40}commitments|full plate|multiple .{0,30}(commitments|threads)/i,
  primaryMeaning:
    /relational responsibility|purpose pressure|caregiv|mother|app|faith.{0,40}ground/i,
  relationalEntitiesMustInclude: /mother|mom|caregiv/i,
  commitmentsMustInclude: Object.freeze([/work/i, /app|useful|valuable|people/i, /care|mother|mom/i]),
  restorativeMustInclude: Object.freeze([/gym|workout/i, /world cup|match/i]),
  faithRole: "grounding_alongside_life",
  responseWorthiness: "contribute",
  recommendedResponseAct: /integrat|one .{0,20}observation|single contribution/i,
  questionNeeded: false,
  spokenDepth: "ordinary",
  recommendedEngine: "ordinary_structured",
  prohibitedSoleSubject: /spending time in the (word|scripture)|word alone|only .{0,20}(scripture|word)/i,
});

export function isGliteOrchestrationEnabled(env = process.env) {
  const raw = String(env.PHILIP_VOICE_LAB_ORCHESTRATION_GLITE || "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function norm(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Detect meaningful life threads for Front Door hard-boundary decisions.
 */
export function detectLifeThreads(rawText) {
  const t = norm(rawText);
  const threads = [];

  const work = /\b(work|working|job|deadline|office|shift|project)\b/.test(t);
  const purposeApp =
    /\b(app|ministry|valuable|useful to people|getting the app|faith[- ]?based (work|app)|lead(ing)? people)\b/.test(
      t,
    );
  const caregiving =
    /\b((taking )?care (of|for)|caring for|helping|looking after).{0,40}\b(mom|mother|dad|father|parents?)\b|\b(mom|mother|dad|father)\b/.test(
      t,
    ) &&
    /\b(care|helping|looking after|mom|mother)\b/.test(t);
  const sports = /\b(world cup|match|game|tournament|watching)\b/.test(t);
  const gym = /\b(gym|workout|working out|exercise|kettlebell)\b/.test(t);
  const faith =
    /\b(scripture|the word|bible|prayer|pray(ing)?|faith|christ|jesus|god)\b/.test(t);
  const fullPlate = /\b(full plate|a lot on (my )?plate|everything'?s been on my mind|busy)\b/.test(t);
  const purposePressure =
    purposeApp ||
    /\b(pressure|make .{0,20}valuable|useful|purpose|calling)\b/.test(t);
  const restoration = gym || /\b(rest|margin|breath|get outside|hike)\b/.test(t);

  if (work) threads.push("work");
  if (purposeApp || purposePressure) threads.push("purpose_app");
  if (caregiving) threads.push("caregiving");
  if (sports) threads.push("sports_world_cup");
  if (gym) threads.push("gym_restoration");
  if (faith) threads.push("faith_word");
  if (fullPlate && threads.length < 2) threads.push("competing_load");

  const unique = [...new Set(threads)];
  const nonFaith = unique.filter((x) => x !== "faith_word");
  const faithPresent = unique.includes("faith_word");
  const nonFaithSubstance = nonFaith.length > 0;
  const multiTopic = unique.length >= 2 || (fullPlate && unique.length >= 1);
  const faithMixedWithLife = faithPresent && nonFaithSubstance;
  const competingCommitments =
    nonFaith.length >= 2 || Boolean(fullPlate && nonFaith.length >= 1);
  const caregivingRelational = Boolean(caregiving);

  return {
    threads: unique,
    faithPresent,
    nonFaithSubstance,
    multiTopic,
    faithMixedWithLife,
    caregivingRelational,
    competingCommitments,
    restorationPresent: Boolean(restoration),
    purposePressure: Boolean(purposePressure),
    fullPlate: Boolean(fullPlate),
    wordCount: wordCount(rawText),
  };
}

/**
 * Hard Front Door invariant: multi-topic or faith+life cannot terminate in
 * descriptive-faith / ordinary templates — must enter TurnUnderstanding.
 */
export function requiresTurnUnderstanding(rawText, opts = {}) {
  const t = norm(rawText);
  if (!t) return false;
  if (wordCount(t) <= 4 && !opts.force) return false;

  const life = detectLifeThreads(rawText);
  if (life.multiTopic) return true;
  if (life.faithMixedWithLife) return true;
  if (life.competingCommitments) return true;
  if (life.caregivingRelational && (life.nonFaithSubstance || life.faithPresent || life.fullPlate)) {
    return true;
  }
  if (life.purposePressure && life.threads.length >= 2) return true;
  if (opts.descriptiveFaith && life.nonFaithSubstance) return true;
  if (opts.descriptiveFaith && life.multiTopic) return true;

  // Pure descriptive faith routine only (no other life threads) → FD may thin-ack / template.
  if (opts.descriptiveFaith && !life.nonFaithSubstance && life.threads.length <= 1) {
    return false;
  }

  return false;
}

/**
 * Ordinary vs rare-depth selection — explicit, testable.
 * @param {object} signals understanding fields and/or detection signals
 */
export function selectContributionEngine(signals = {}) {
  const emotionalWeight = signals.emotionalWeight || signals.lifeEmotionalWeight || "light";
  const spokenDepthHint = signals.spokenDepth || null;
  const confidence =
    typeof signals.confidence === "number" ? signals.confidence : 1;
  const acts = (signals.conversationalActs || []).map((a) => String(a).toLowerCase());
  const text = norm(signals.transcript || signals.rawTranscript || "");

  const userAsksDepth =
    /\b(go deeper|tell me more|say more|explore (this|that)|help me discern|sit with this)\b/.test(
      text,
    );
  const griefShameRecovery =
    /\b(grief|grieving|shame|ashamed|recover(y|ing)|leukemia|cancer|funeral|died|dying|divorcé|divorce|abandoned|betray)\b/.test(
      text,
    );
  const existential =
    /\b(what'?s the point|why am i here|meaning of (my )?life|existential|crisis of faith)\b/.test(
      text,
    );
  const complexDiscernment =
    acts.includes("spiritual_discernment") ||
    signals.faithRole === "central_question" ||
    signals.faithRole === "explicit_request";
  const prayerCareful =
    signals.intent === "prayer" ||
    /\b(would|could|can) you (please )?pray\b/.test(text) ||
    signals.practicalRequest === "prayer";

  const rare =
    emotionalWeight === "high" ||
    spokenDepthHint === "weighty" ||
    userAsksDepth ||
    griefShameRecovery ||
    existential ||
    complexDiscernment ||
    prayerCareful ||
    (confidence < 0.45 && signals.responseWorthiness === "contribute");

  // Explicitly NOT rare merely for faith words / caregiving / length / multi-topic / "?"
  if (!rare) {
    return {
      engine: "ordinary_structured",
      recommendedEngine: "ordinary_structured",
      reason: "ordinary_multi_thread_or_relational_observation",
      spokenDepth: "ordinary",
      engineId: ORDINARY_ENGINE_ID,
      engineLabel: ORDINARY_ENGINE_LABEL,
      engineSelectionReason: "ordinary_contribution_criteria",
    };
  }

  return {
    engine: "rare_depth",
    recommendedEngine: "rare_depth",
    reason: griefShameRecovery
      ? "high_weight_grief_or_recovery"
      : userAsksDepth
        ? "user_requested_depth"
        : confidence < 0.45
          ? "insufficient_ordinary_confidence"
          : complexDiscernment || prayerCareful
            ? "careful_faith_or_prayer_judgment"
            : "high_emotional_or_existential_weight",
    spokenDepth: "weighty",
    engineId: RARE_DEPTH_ENGINE_ID,
    engineLabel: RARE_DEPTH_ENGINE_LABEL,
    engineSelectionReason: "rare_terra_depth_criteria",
  };
}

export function gliteSpeechBudget(spokenDepth = "ordinary") {
  if (spokenDepth === "weighty") return { ...GLITE_SPEECH_BUDGETS.weighty, weighty: true };
  if (spokenDepth === "thin") return { ...GLITE_SPEECH_BUDGETS.thin, weighty: false };
  return { ...GLITE_SPEECH_BUDGETS.ordinary, weighty: false };
}

export function buildInterruptionInput(prior = {}) {
  const interrupted = Boolean(prior.previousResponseInterrupted ?? prior.interrupted);
  return {
    previousResponseInterrupted: interrupted,
    estimatedAudioPublishedMs:
      prior.estimatedAudioPublishedMs ?? prior.audioPublishedMs ?? null,
    estimatedAudioHeardMs: prior.estimatedAudioHeardMs ?? prior.audioHeardMs ?? null,
    likelyHeardRatio:
      typeof prior.likelyHeardRatio === "number"
        ? prior.likelyHeardRatio
        : prior.estimatedAudioPublishedMs > 0 && prior.estimatedAudioHeardMs != null
          ? Math.min(
              1,
              Math.max(0, Number(prior.estimatedAudioHeardMs) / Number(prior.estimatedAudioPublishedMs)),
            )
          : null,
    previousResponseAbandoned: Boolean(
      prior.previousResponseAbandoned ?? interrupted,
    ),
    previousResponseTopic: prior.previousResponseTopic
      ? String(prior.previousResponseTopic).slice(0, 120)
      : null,
    userBeganSpeakingBeforeCompletion: Boolean(
      prior.userBeganSpeakingBeforeCompletion ?? interrupted,
    ),
  };
}

export function gliteReadinessFields(env = process.env) {
  const enabled = isGliteOrchestrationEnabled(env);
  return {
    orchestrationVersion: GLITE_ORCHESTRATION_VERSION,
    orchestrationEnabled: enabled,
    orchestrationPath: enabled ? "glite" : "legacy_spoken_v1",
    ordinaryEngine: ORDINARY_ENGINE_LABEL,
    ordinaryEngineId: ORDINARY_ENGINE_ID,
    rareDepthEngine: RARE_DEPTH_ENGINE_LABEL,
    rareDepthEngineId: RARE_DEPTH_ENGINE_ID,
    engineSelectionEvidenceSummary:
      "bakeoff-20260716: Terra structured selected for one-call schema (6/6 planValid); Sol freeform unproven for contract; GPT-4o 0/6; serial path rejected",
  };
}

/**
 * Semantic quality checks for locked multi-topic fixtures (no hardcoded spoken answer).
 */
export function evaluateLockedT2Semantics(understanding) {
  const u = understanding || {};
  const failures = [];
  const exp = LOCKED_40BC24A8_T2_EXPECTED;

  if (!exp.primaryBurden.test(String(u.primaryBurden || ""))) {
    failures.push("primaryBurden_mismatch");
  }
  if (!exp.primaryMeaning.test(String(u.primaryMeaning || ""))) {
    failures.push("primaryMeaning_mismatch");
  }
  const entities = Array.isArray(u.relationalEntities)
    ? u.relationalEntities.map((e) => (typeof e === "string" ? e : e?.label || "")).join(" ")
    : "";
  if (!exp.relationalEntitiesMustInclude.test(entities)) {
    failures.push("relationalEntities_missing_mother");
  }
  const commits = (u.commitments || []).join(" ");
  for (const re of exp.commitmentsMustInclude) {
    if (!re.test(commits)) failures.push(`commitments_missing:${re}`);
  }
  const rest = (u.restorativeElements || []).join(" ");
  for (const re of exp.restorativeMustInclude) {
    if (!re.test(rest)) failures.push(`restorative_missing:${re}`);
  }
  if (u.faithRole !== exp.faithRole) failures.push("faithRole_mismatch");
  if (u.responseWorthiness !== exp.responseWorthiness) {
    failures.push("responseWorthiness_mismatch");
  }
  if (!exp.recommendedResponseAct.test(String(u.recommendedResponseAct || ""))) {
    failures.push("recommendedResponseAct_mismatch");
  }
  if (u.questionNeeded !== false) failures.push("questionNeeded_should_be_false");
  if (u.spokenDepth !== exp.spokenDepth) failures.push("spokenDepth_mismatch");
  if (u.recommendedEngine !== exp.recommendedEngine) {
    failures.push("recommendedEngine_mismatch");
  }

  const spoken = String(u.spokenResponse || "");
  const soleFaith =
    /\b(scripture|the word|prayer)\b/i.test(spoken) &&
    !/\b(mom|mother|care|work|app|plate|gym|world cup)\b/i.test(spoken) &&
    spoken.length > 40;
  if (soleFaith) failures.push("spoken_sole_faith_subject");

  return { passed: failures.length === 0, failures };
}
