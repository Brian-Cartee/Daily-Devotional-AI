/**
 * Philip Spoken Interaction v1 — value router + factual capability boundary.
 *
 * Reserves Terra for turns where contribution is worth the delay.
 * Tiers 0–2 stay Front Door (deterministic / state-grounded).
 * Tier 3 may call Terra with a spoken budget.
 * Tier 4 preserves crisis / prayer / conduct contracts.
 *
 * No live retrieval in this package — current-fact questions get a brief
 * capability boundary instead of model-memory guesses.
 */

export const SPOKEN_TURN_TIER = Object.freeze({
  CONTROL: 0,
  SOCIAL: 1,
  FACTUAL_LIGHT: 2,
  SUBSTANTIVE: 3,
  SAFETY: 4,
});

export const RESPONSE_MODE = Object.freeze({
  FRONT_DOOR: "front_door",
  FACTUAL_BOUNDARY: "factual_boundary",
  TERRA: "terra",
  SAFETY: "safety_contract",
  /** G-lite Phase 1 — ordinary structured understanding+speech (Terra model). */
  GLITE_ORDINARY: "glite_ordinary",
  /** G-lite Phase 1 — rare weighty depth (same Terra model, weighty budget). */
  GLITE_RARE: "glite_rare_depth",
});

/** Spoken budgets by tier (words + approximate audible seconds @ ~135 wpm). */
export const SPOKEN_BUDGETS = Object.freeze({
  [SPOKEN_TURN_TIER.CONTROL]: { minWords: 2, maxWords: 8, targetSeconds: [1, 3], maxSentences: 1 },
  [SPOKEN_TURN_TIER.SOCIAL]: { minWords: 3, maxWords: 15, targetSeconds: [2, 6], maxSentences: 1 },
  [SPOKEN_TURN_TIER.FACTUAL_LIGHT]: { minWords: 8, maxWords: 22, targetSeconds: [3, 8], maxSentences: 1 },
  [SPOKEN_TURN_TIER.SUBSTANTIVE]: {
    ordinary: { minWords: 18, maxWords: 30, targetSeconds: [6, 10], maxSentences: 2 },
    weighty: { minWords: 25, maxWords: 40, targetSeconds: [8, 13], maxSentences: 2 },
  },
  [SPOKEN_TURN_TIER.SAFETY]: { minWords: 8, maxWords: 80, targetSeconds: [4, 25], maxSentences: 4, exempt: true },
});

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
 * Future tool interface only — no live retrieval in Voice Lab Spoken Interaction v1.
 * Implementors may later wire an approved live source without changing the Front Door contract.
 */
export const FACTUAL_GROUNDING_TOOL_INTERFACE = Object.freeze({
  version: "philip-factual-grounding-v0",
  status: "unavailable_in_voice_lab",
  kinds: Object.freeze([
    "sports_bracket_or_result",
    "news_or_public_event",
    "weather",
    "prices",
    "live_schedule",
  ]),
  /**
   * @typedef {{ kind: string, query: string }} FactualGroundingRequest
   * @typedef {{ ok: boolean, grounded: boolean, summary?: string, asOf?: string }} FactualGroundingResult
   * Future: async function retrieveFactualGrounding(req: FactualGroundingRequest): Promise<FactualGroundingResult>
   */
  retrieve: null,
});
export function detectFactualFreshness(rawText) {
  const t = norm(rawText);
  if (!t) return { required: false, kind: null, timelessStrategy: false };

  // Timeless strategy / opinion about play style — not a live bracket ask.
  const timelessStrategy =
    /\b(how (should|do|does)|what makes|in general|generally speaking)\b/.test(t) &&
    /\b(win|defend|attack|strategy|tactics|formation)\b/.test(t) &&
    !/\b(who (will|won|is|are)|current|tonight|today|this year|bracket|final|semifinal)\b/.test(t);

  if (timelessStrategy) {
    return { required: false, kind: null, timelessStrategy: true };
  }

  // Relational watching / schedule-of-life mentions are not current-fact asks.
  if (
    /\b(watching|watched|with my (mom|mother|dad|father)|taking care|working out|doctor'?s? appointments?|busy)\b/.test(
      t,
    ) &&
    !/\b(who (will|won|is going to)|who'?s (in|going to)|who do you (think|believe|predict)|predict|pick the winner|what'?s the (score|result))\b/.test(
      t,
    )
  ) {
    return { required: false, kind: null, timelessStrategy: false };
  }

  const winnerAsk =
    /\b(who (will|won|wins|is going to)|who'?s (going to )?(win|in the final)|who do you (think|believe|predict) will|who .{0,24}\b(will|won|wins)\b.{0,12}\b(win|winner)?\b|predict|your (pick|opinion) (on|about) who)\b/.test(
      t,
    ) ||
    (/\b(bracket|standings|score|result)\b/.test(t) &&
      /\b(what|who|current|latest|today|tonight)\b/.test(t));

  const sportsLive =
    winnerAsk &&
    /\b(world cup|match|game|tournament|championship|france|argentina|spain|team|cup|semifinal|quarterfinal|final)\b/.test(
      t,
    );

  const sportsFinalAsk =
    /\b(final|finals|bracket|semifinal|quarterfinal)\b/.test(t) &&
    /\b(who (will|won|wins)|who'?s (in|winning)|winner|predict|pick|what'?s the (score|result)|current score)\b/.test(
      t,
    ) &&
    /\b(world cup|match|game|tournament|championship|cup)\b/.test(t);

  const newsLive =
    /\b(breaking|headline|just (announced|happened)|what'?s (the )?news)\b/.test(t) ||
    (/\b(who (is|won|will)|current|tonight|today|this week)\b/.test(t) &&
      /\b(election|president|prime minister|congress|parliament)\b/.test(t));

  const weather = /\b(weather|forecast|temperature|rain(ing)?|snow(ing)?)\b/.test(t) &&
    /\b(today|tonight|tomorrow|this (week|weekend)|right now|currently)\b/.test(t);

  const prices =
    /\b(price|cost|stock|bitcoin|crypto)\b/.test(t) &&
    /\b(now|today|current|right now|latest)\b/.test(t);

  const schedule =
    /\b(kickoff|tip[- ]?off|what time (is|does)|when does (it|the) (start|air))\b/.test(t) &&
    /\b(tonight|today|tomorrow|this (week|weekend)|live)\b/.test(t);

  if (sportsLive || sportsFinalAsk) {
    return { required: true, kind: "sports_bracket_or_result", timelessStrategy: false };
  }
  if (newsLive) return { required: true, kind: "news_or_public_event", timelessStrategy: false };
  if (weather) return { required: true, kind: "weather", timelessStrategy: false };
  if (prices) return { required: true, kind: "prices", timelessStrategy: false };
  if (schedule) return { required: true, kind: "live_schedule", timelessStrategy: false };

  // Generic "who will win X" with tournament language.
  if (
    /\b(who (will|won)|who do you (think|believe|predict)|predict|your (pick|opinion) (on|about) who)\b/.test(t) &&
    /\b(win|winner|final)\b/.test(t)
  ) {
    return { required: true, kind: "sports_bracket_or_result", timelessStrategy: false };
  }

  return { required: false, kind: null, timelessStrategy: false };
}

/**
 * Session continuity / availability — not a human calendar, not Terra.
 */
export function detectSessionContinuityAsk(rawText) {
  const t = norm(rawText);
  if (!t) return false;
  if (
    /\b(availability|available|reconvene|reconnect|continue (this|our conversation)|pick (this|it) up|talk (to you )?(later|tonight|this evening)|speak(ing)? (to you )?later|be (here|around) (when|later)|come back later|when i (come|get) back)\b/.test(
      t,
    )
  ) {
    // Leave-taking dominant closings are handled as closing; still continuity.
    return true;
  }
  if (/\b(can|could|will) (we|you) (talk|speak|connect|continue|reconvene)\b.{0,40}\b(later|tonight|this evening|tomorrow)\b/.test(t)) {
    return true;
  }
  if (/\bdo you have (any )?availability\b/.test(t)) return true;
  return false;
}

/**
 * User correcting a prior assistant factual claim.
 */
export function detectFactualCorrection(rawText, state = null) {
  const t = norm(rawText);
  if (!t) return false;
  if (wordCount(t) > 28) return false;
  if (!/\b(already (lost|won|out)|actually|no[,.]|wrong|incorrect|france|argentina|spain|bracket|final)\b/.test(t)) {
    return false;
  }
  const last = (state?.history || [])
    .filter((h) => h.role === "assistant")
    .slice(-1)[0];
  const prev = String(last?.content || "");
  if (!prev) return /\b(already (lost|won|out)|you('?re| are) wrong)\b/.test(t);
  // Correction following a sports/fact claim.
  if (/\b(france|argentina|spain|bracket|final|win|safest pick)\b/i.test(prev) && /\b(already|lost|final|play)\b/.test(t)) {
    return true;
  }
  return /\b(you('?re| are) (right|wrong)|already (lost|won)|behind)\b/.test(t) && wordCount(t) <= 20;
}

/**
 * Compose brief factual capability boundary (no live tool in this package).
 */
export function composeFactualCapabilityBoundary(freshness, { inviteUserFact = true } = {}) {
  const kind = freshness?.kind || "current_fact";
  if (kind === "sports_bracket_or_result") {
    return inviteUserFact
      ? "I'm not connected to the live bracket, so I don't want to guess. Who's in it now?"
      : "I'm not connected to the live bracket, so I don't want to guess.";
  }
  if (kind === "weather") {
    return "I don't have a live weather feed here, so I won't guess the forecast.";
  }
  if (kind === "prices") {
    return "I don't have live prices here, so I won't invent a number.";
  }
  if (kind === "live_schedule") {
    return "I don't have the live schedule here, so I don't want to guess the time.";
  }
  return inviteUserFact
    ? "I don't have a live source for that here, so I won't guess. What are you seeing?"
    : "I don't have a live source for that here, so I won't guess.";
}

export function composeFactualCorrectionAck() {
  return "You're right — thanks for catching that.";
}

/**
 * Session continuity: Philip has no human calendar.
 */
export function composeSessionContinuityResponse(rawText, { closingDominant = false } = {}) {
  if (closingDominant) {
    return "I'd like that. I'll be here whenever you're ready.";
  }
  const t = norm(rawText);
  if (/\bavailability|available|reconvene|tonight|this evening\b/.test(t)) {
    return "I don't keep a personal calendar, but I'll be here whenever you come back.";
  }
  return "I'll be here when you return — we can pick it up then.";
}

/**
 * Thin-ack continuity: preserve prior relational thread without interviewing.
 */
export function composeContinuityAcknowledgment(state = null) {
  const anchors = state?.relationalAnchors || [];
  const parent = anchors.find((a) =>
    /parent|caregiv|mom|mother|dad|father/i.test(`${a.kind || ""} ${a.label || ""} ${a.relationship || ""}`),
  );
  if (parent) {
    const variants = [
      "I'm with you on that — especially with her in the picture.",
      "Understood. That care for her still sits underneath this.",
      "I'm with you there.",
    ];
    return variants[(state?.turnCount || 0) % variants.length];
  }
  const lastUser = [...(state?.history || [])].reverse().find((h) => h.role === "user");
  const blob = String(lastUser?.content || "");
  if (/\b(world cup|match|workout|work)\b/i.test(blob) && wordCount(blob) >= 8) {
    return "I'm with you on that.";
  }
  const variants = ["I'm with you.", "Alright — I'm still with you.", "Understood."];
  return variants[(state?.turnCount || 0) % variants.length];
}

/**
 * Resolve spoken budget object for a tier / weight.
 */
export function spokenBudgetForTier(tier, { weighty = false } = {}) {
  if (tier === SPOKEN_TURN_TIER.SUBSTANTIVE) {
    return weighty ? SPOKEN_BUDGETS[3].weighty : SPOKEN_BUDGETS[3].ordinary;
  }
  return SPOKEN_BUDGETS[tier] || SPOKEN_BUDGETS[1];
}

/**
 * Classify a completed turn into exactly one spoken tier.
 *
 * @param {object} opts
 * @param {string} opts.transcript
 * @param {object|null} opts.state
 * @param {string|null} opts.intent - Front Door intent if already known
 * @param {boolean} opts.routeDeepCandidate - whether substance gate would allow Terra
 * @param {boolean} opts.isCrisis
 * @param {boolean} opts.isPrayer
 * @param {boolean} opts.isConduct
 * @param {boolean} opts.isClosing
 * @param {boolean} opts.isConversationControl
 * @param {boolean} opts.isThinAck
 * @param {boolean} opts.isLowSubstance
 * @param {boolean} opts.isGreeting
 * @param {boolean} opts.isIncomplete
 * @param {boolean} opts.weightyRelational
 * @param {boolean} opts.weightyDescriptiveFaith
 * @param {boolean} opts.gliteEnabled
 * @param {boolean} opts.requiresTurnUnderstanding
 * @param {boolean} opts.gliteRareDepth
 */
export function classifySpokenTurnTier(opts = {}) {
  const transcript = String(opts.transcript || "");
  const freshness = detectFactualFreshness(transcript);
  const sessionContinuity = detectSessionContinuityAsk(transcript);
  const factualCorrection = detectFactualCorrection(transcript, opts.state);

  const signals = [];
  let tier = SPOKEN_TURN_TIER.SOCIAL;
  let reason = "social_default";
  let terraValueJustified = false;
  let responseMode = RESPONSE_MODE.FRONT_DOOR;
  let factualGroundingAvailable = false; // no live tool in this package
  let orchestrationPath = opts.gliteEnabled ? "glite" : "legacy_spoken_v1";
  let selectedEngine = null;
  let engineSelectionReason = null;

  if (opts.isCrisis || opts.isPrayer || opts.isConduct) {
    tier = SPOKEN_TURN_TIER.SAFETY;
    reason = opts.isCrisis ? "crisis_protocol" : opts.isPrayer ? "prayer_contract" : "conduct_boundary";
    responseMode = RESPONSE_MODE.SAFETY;
    signals.push(reason);
  } else if (opts.isConversationControl || opts.isIncomplete) {
    tier = SPOKEN_TURN_TIER.CONTROL;
    reason = opts.isIncomplete ? "incomplete_fragment_hold" : "conversation_control";
    signals.push(reason);
  } else if (opts.isClosing) {
    tier = SPOKEN_TURN_TIER.SOCIAL;
    reason = "closing_or_farewell";
    signals.push("closing");
  } else if (factualCorrection) {
    tier = SPOKEN_TURN_TIER.FACTUAL_LIGHT;
    reason = "factual_correction_repair";
    responseMode = RESPONSE_MODE.FRONT_DOOR;
    signals.push("factual_correction");
  } else if (freshness.required) {
    tier = SPOKEN_TURN_TIER.FACTUAL_LIGHT;
    reason = `factual_freshness:${freshness.kind}`;
    responseMode = RESPONSE_MODE.FACTUAL_BOUNDARY;
    signals.push("factual_freshness_required", freshness.kind);
  } else if (sessionContinuity) {
    // Availability / reconvene / "be here later" — Front Door only, even if
    // practical_help intent would otherwise deep-route.
    const inlineSubstance =
      /\b(my mom|my mother|prayer|scripture|i'?m (struggling|scared|grieving|exhausted)|taking care of)\b/i.test(
        transcript,
      );
    if (!inlineSubstance) {
      tier = SPOKEN_TURN_TIER.SOCIAL;
      reason = "session_continuity_ask";
      signals.push("session_continuity");
    } else {
      tier = SPOKEN_TURN_TIER.SUBSTANTIVE;
      reason = "session_continuity_with_inline_substance";
      terraValueJustified = true;
      responseMode = RESPONSE_MODE.TERRA;
      signals.push("terra_value_justified", "session_continuity_with_substance");
    }
  } else if (opts.isGreeting) {
    tier = SPOKEN_TURN_TIER.SOCIAL;
    reason = "greeting";
    signals.push("greeting");
  } else if (opts.isThinAck || opts.isLowSubstance) {
    tier = SPOKEN_TURN_TIER.SOCIAL;
    reason = opts.isThinAck ? "thin_acknowledgment" : "low_substance_deferral";
    signals.push(reason);
  } else if (opts.gliteEnabled && opts.requiresTurnUnderstanding) {
    // Hard Front Door boundary: multi-topic / faith+life → TurnUnderstanding.
    tier = SPOKEN_TURN_TIER.SUBSTANTIVE;
    reason = "glite_turn_understanding";
    terraValueJustified = true;
    if (opts.gliteRareDepth) {
      responseMode = RESPONSE_MODE.GLITE_RARE;
      selectedEngine = "rare_depth";
      engineSelectionReason = "rare_terra_depth_criteria";
      signals.push("glite_rare_depth", reason);
    } else {
      responseMode = RESPONSE_MODE.GLITE_ORDINARY;
      selectedEngine = "ordinary_structured";
      engineSelectionReason = "ordinary_contribution_criteria";
      signals.push("glite_ordinary", reason);
    }
  } else if (opts.routeDeepCandidate || opts.weightyRelational || opts.weightyDescriptiveFaith) {
    tier = SPOKEN_TURN_TIER.SUBSTANTIVE;
    reason = opts.weightyDescriptiveFaith
      ? "weighty_descriptive_faith"
      : opts.weightyRelational
        ? "weighty_relational"
        : "substantive_ordinary";
    terraValueJustified = true;
    if (opts.gliteEnabled) {
      responseMode = opts.gliteRareDepth ? RESPONSE_MODE.GLITE_RARE : RESPONSE_MODE.GLITE_ORDINARY;
      selectedEngine = opts.gliteRareDepth ? "rare_depth" : "ordinary_structured";
      engineSelectionReason = opts.gliteRareDepth
        ? "rare_terra_depth_criteria"
        : "ordinary_contribution_criteria";
      signals.push("glite_substantive", reason);
    } else {
      responseMode = RESPONSE_MODE.TERRA;
      signals.push("terra_value_justified", reason);
    }
  } else if (freshness.timelessStrategy) {
    tier = SPOKEN_TURN_TIER.FACTUAL_LIGHT;
    reason = "timeless_strategy_question";
    responseMode = RESPONSE_MODE.FRONT_DOOR;
    signals.push("timeless_strategy");
  } else {
    tier = SPOKEN_TURN_TIER.SOCIAL;
    reason = "ordinary_social_or_light";
  }

  // Mixed farewell + light future agenda (518acebf T8): prefer closing continuity.
  if (
    tier === SPOKEN_TURN_TIER.SUBSTANTIVE &&
    /\b(look forward to speaking|talk (to you )?later|speak(ing)? (to you )?later|no problem)\b/i.test(
      transcript,
    ) &&
    /\b(pick up|world cup|later|different)\b/i.test(transcript) &&
    wordCount(transcript) <= 45
  ) {
    tier = SPOKEN_TURN_TIER.SOCIAL;
    reason = "farewell_with_light_agenda";
    terraValueJustified = false;
    responseMode = RESPONSE_MODE.FRONT_DOOR;
    signals.push("closing_continuity");
  }

  const weighty = Boolean(opts.weightyRelational || opts.weightyDescriptiveFaith);
  const budget = spokenBudgetForTier(tier, { weighty });

  return {
    spokenTurnTier: tier,
    spokenTurnTierReason: reason,
    terraValueJustified,
    terraValueSignals: signals,
    factualFreshnessRequired: Boolean(freshness.required),
    factualFreshnessKind: freshness.kind,
    factualGroundingAvailable,
    factualCorrection,
    sessionContinuityAsk: sessionContinuity,
    timelessStrategy: Boolean(freshness.timelessStrategy),
    responseMode,
    orchestrationPath,
    selectedEngine,
    engineSelectionReason,
    spokenBudget: {
      ...budget,
      weighty:
        (weighty || Boolean(opts.gliteRareDepth)) &&
        tier === SPOKEN_TURN_TIER.SUBSTANTIVE,
      tier,
    },
  };
}

/**
 * Compact observability blob for turn JSONL (no secrets / no private plan).
 */
export function serializeSpokenTurnDecision(decision) {
  if (!decision) return null;
  return {
    spokenTurnTier: decision.spokenTurnTier,
    spokenTurnTierReason: decision.spokenTurnTierReason,
    terraValueJustified: Boolean(decision.terraValueJustified),
    terraValueSignals: decision.terraValueSignals || [],
    factualFreshnessRequired: Boolean(decision.factualFreshnessRequired),
    factualFreshnessKind: decision.factualFreshnessKind || null,
    factualGroundingAvailable: Boolean(decision.factualGroundingAvailable),
    responseMode: decision.responseMode || null,
    spokenBudget: decision.spokenBudget
      ? {
          maxWords: decision.spokenBudget.maxWords ?? null,
          minWords: decision.spokenBudget.minWords ?? null,
          targetSeconds: decision.spokenBudget.targetSeconds ?? null,
          maxSentences: decision.spokenBudget.maxSentences ?? null,
          weighty: Boolean(decision.spokenBudget.weighty),
          exempt: Boolean(decision.spokenBudget.exempt),
        }
      : null,
    orchestrationPath: decision.orchestrationPath ?? null,
    selectedEngine: decision.selectedEngine ?? null,
    engineSelectionReason: decision.engineSelectionReason ?? null,
  };
}
