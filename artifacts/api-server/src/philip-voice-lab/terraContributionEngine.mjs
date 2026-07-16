/**
 * Philip Arm C — Terra structured contribution engine (local candidate).
 *
 * Version: philip-contribution-terra-structured-v1
 *
 * One gpt-5.6-terra call returns private plan + spokenResponse via strict
 * structured output. Only spokenResponse reaches TTS. Schema failure and
 * provider failure throw — never silent GPT-4o or canned fallback.
 */
import {
  COMPACT_PHILIP_GENOME,
  PHILIP_VOICE_GENOME_VERSION,
  estimateGenomeTokens,
} from "./compactGenome.mjs";
import {
  buildContributionContractInstruction,
  evaluateContributionQuality,
  CONTRIBUTION_CONTRACT_VERSION,
} from "./contributionContract.mjs";
import {
  TERRA_CONTRIBUTION_ENGINE_VERSION,
  TERRA_CONTRIBUTION_MODEL_DEFAULT,
  TERRA_CONTRIBUTION_JSON_SCHEMA,
  REQUIRED_PROHIBITED_MOVES,
  validateTerraContributionPlan,
  terraPlanObservability,
} from "./terraContributionSchema.mjs";
import { measureSpokenLength, softTrimSpokenResponse } from "./spokenLength.mjs";

function countWordsLost(before, after) {
  const beforeWords = Number(before?.words || 0);
  const afterWords = Number(after?.words || 0);
  return beforeWords > 0 && afterWords > 0 && afterWords < beforeWords * 0.55;
}

/** Injected by guidanceBrain to avoid circular imports. */
let deterministicModeAllowedFn = (hasInjected = false) => {
  if (hasInjected) return true;
  const raw = process.env.PHILIP_VOICE_LAB_ALLOW_DETERMINISTIC?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
};
let guidanceInstructionFn = () => "";

/** @param {{ deterministicModeAllowed?: Function; guidanceInstruction?: Function }} hooks */
export function configureTerraEngineHooks(hooks = {}) {
  if (typeof hooks.deterministicModeAllowed === "function") {
    deterministicModeAllowedFn = hooks.deterministicModeAllowed;
  }
  if (typeof hooks.guidanceInstruction === "function") {
    guidanceInstructionFn = hooks.guidanceInstruction;
  }
}

export class TerraContributionError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {Record<string, unknown>} [details]
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TerraContributionError";
    this.code = code;
    this.details = details;
    this.noFallback = true;
    this.hardFailure = true;
  }
}

export function terraContributionModel() {
  return (
    process.env.PHILIP_VOICE_LAB_TERRA_MODEL?.trim() ||
    process.env.PHILIP_VOICE_LAB_BRAIN_MODEL?.trim() ||
    TERRA_CONTRIBUTION_MODEL_DEFAULT
  );
}

/** System addendum specific to structured Arm C planning. */
export function buildTerraStructuredInstruction(ctx = {}) {
  const budget = ctx.spokenBudget || {};
  const maxWords = budget.maxWords ?? 30;
  const minWords = budget.minWords ?? 18;
  const targetSeconds = Array.isArray(budget.targetSeconds)
    ? `${budget.targetSeconds[0]}–${budget.targetSeconds[1]}`
    : "6–10";
  const maxSentences = budget.maxSentences ?? 2;
  const weighty = Boolean(budget.weighty);
  const lines = [
    "STRUCTURED CONTRIBUTION ENGINE (INTERNAL)",
    `Engine version: ${TERRA_CONTRIBUTION_ENGINE_VERSION}.`,
    "Produce one JSON object matching the schema. Do not include chain-of-thought, hidden scratchpads, or step-by-step reasoning fields.",
    "PRIVATE PLAN FIRST: select exactly one principal warrantedContribution before composing spokenResponse. Do not stack multiple contributions.",
    "recognition: what Brian actually communicated (concrete, not invented).",
    "relationalMeaning: the relevant relationship, commitment, hope, tension, or meaning — only if supported by his words or prior anchors.",
    "warrantedContribution: exactly one new supported perspective, distinction, connection, or practical step he did not already supply.",
    "faithPosture: implicit | descriptive | explicit — match the level Brian opened; never escalate descriptive faith into preaching, verse intake, spiritual praise, or a prayer offer.",
    "questionNeeded: true only when a question materially improves the exchange; otherwise false. Default false — no automatic follow-up interview.",
    `prohibitedMoves: include at least: ${REQUIRED_PROHIBITED_MOVES.join("; ")}.`,
    `SPOKEN BUDGET (compose for speech, do not write prose then trim): target ${minWords}–${maxWords} words` +
      `${weighty ? " (weighty relational)" : " (ordinary substantive)"}; normally ${maxSentences} short sentence(s); about ${targetSeconds} seconds audible.`,
    "spokenResponse: the only text Philip will speak. One principal contribution. Avoid mini-sermons, stacked metaphors, and restatement. Longer only for prayer, crisis, or when Brian explicitly asks for depth.",
    "Reciprocal how-are-you: answer with honest Philip presence first (here, attentive, glad to continue). Do not invent a human life.",
    "Caregiving/family: treat relationally; do not invent hardship unless Brian named it.",
    "Avoid praise, paraphrase-only, interviewing, invented burdens, schedule inventory, and therapy clichés.",
    "Never invent current sports results, brackets, news, weather, prices, or live schedules from memory.",
  ];
  if (ctx.reciprocalAsk) {
    lines.push("RECIPROCAL: Answer presence first, then engage substance.");
  }
  if (ctx.caregivingDetected || ctx.relationalDetailDetected) {
    lines.push(
      `RELATIONAL ANCHOR: ${ctx.relationalHint || "the relationship named"} — commitment, not calendar inventory.`,
    );
  }
  if (ctx.descriptiveFaith) {
    lines.push(
      ctx.weightyDescriptiveFaith
        ? "FAITH: weighty descriptive — connect practice to lived accompaniment; no verse ask, no forced prayer, no spiritual applause."
        : "FAITH: descriptive routine — grounded observation only; no verse ask, no prayer offer, no preaching.",
    );
  }
  if (ctx.preferStatement || ctx.lightOrdinaryTopic) {
    lines.push("Prefer a statement this turn; set questionNeeded false unless something is genuinely unclear.");
  }
  if (typeof ctx.spokenTurnTier === "number") {
    lines.push(`Spoken turn tier: ${ctx.spokenTurnTier} (Terra only when value-justified).`);
  }
  return lines.join("\n");
}

/**
 * Classify relational-anchor types for observability (no raw plan text).
 * @param {object} ctx
 */
export function relationalAnchorTypesFromCtx(ctx = {}) {
  const types = [];
  if (ctx.caregivingDetected) types.push("caregiving");
  if (ctx.relationalDetailDetected) types.push("relational_detail");
  if (ctx.descriptiveFaith) types.push("descriptive_faith");
  if (ctx.weightyDescriptiveFaith) types.push("weighty_descriptive_faith");
  if (ctx.reciprocalAsk) types.push("reciprocal");
  if (ctx.lightOrdinaryTopic) types.push("light_ordinary");
  if (ctx.priorRelationalHints?.length) types.push("prior_anchor");
  return types;
}

/**
 * Build messages for the Terra structured call.
 * @param {object} ctx
 */
export function buildTerraContributionMessages(ctx = {}) {
  const messages = [{ role: "system", content: COMPACT_PHILIP_GENOME }];
  messages.push({
    role: "system",
    content: `Genome version: ${PHILIP_VOICE_GENOME_VERSION}. Contribution contract: ${CONTRIBUTION_CONTRACT_VERSION}. Engine: ${TERRA_CONTRIBUTION_ENGINE_VERSION}. Approx genome tokens: ${estimateGenomeTokens()}.`,
  });
  messages.push({
    role: "system",
    content: buildContributionContractInstruction(ctx),
  });
  messages.push({
    role: "system",
    content: buildTerraStructuredInstruction(ctx),
  });
  const instruction = guidanceInstructionFn(ctx);
  if (instruction) messages.push({ role: "system", content: instruction });
  if (ctx.firstName) {
    messages.push({
      role: "system",
      content: `The person's first name is ${ctx.firstName}. Use it naturally and sparingly — not every turn.`,
    });
  }
  for (const turn of (ctx.history || []).slice(-12)) {
    messages.push({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: turn.content,
    });
  }
  messages.push({ role: "user", content: ctx.rawTranscript || ctx.transcript });
  return messages;
}

/**
 * Parse + validate provider content. Never returns a speakable text on failure.
 * @param {unknown} content
 */
export function parseAndValidateTerraContent(content) {
  let raw = content;
  if (typeof content === "object" && content && !Array.isArray(content)) {
    // Some SDKs return already-parsed message.parsed
    raw = content;
  } else if (typeof content !== "string") {
    raw = content == null ? "" : String(content);
  }
  const validation = validateTerraContributionPlan(raw);
  if (!validation.ok) {
    throw new TerraContributionError(
      "schema_invalid",
      `Terra contribution schema invalid: ${(validation.errors || []).join(",")}`,
      { schemaErrors: validation.errors, schemaWarnings: validation.warnings },
    );
  }
  return validation;
}

/**
 * Assemble deepGenerate result. Only spokenResponse is `text`.
 * Gate is shadow-only — never vetoes a schema-valid plan.
 */
export function assembleTerraDeepResult({
  plan,
  validation,
  ctx,
  model,
  timing,
  providerRawOk = true,
}) {
  const allowLong =
    ctx?.intent === "prayer" ||
    ctx?.intent === "crisis" ||
    Boolean(ctx?.weightyDescriptiveFaith) ||
    Boolean(ctx?.weightyRelationalContext) ||
    Boolean(ctx?.caregivingDetected && ctx?.relationalDetailDetected) ||
    /\b(tell me more|go deeper|explain more|say more|more detail)\b/i.test(
      String(ctx?.rawTranscript || ctx?.transcript || ""),
    );
  let spokenExemptionReason = null;
  if (allowLong) {
    if (ctx?.intent === "prayer") spokenExemptionReason = "prayer_mode";
    else if (ctx?.intent === "crisis") spokenExemptionReason = "crisis_mode";
    else if (ctx?.weightyDescriptiveFaith) spokenExemptionReason = "weighty_descriptive_faith";
    else if (ctx?.weightyRelationalContext) spokenExemptionReason = "weighty_relational_context";
    else if (ctx?.caregivingDetected && ctx?.relationalDetailDetected) {
      spokenExemptionReason = "caregiving_relational";
    } else spokenExemptionReason = "requested_depth";
  }
  let spoken = String(plan.spokenResponse).trim();
  let spokenTrimmed = false;
  let spokenLengthBefore = measureSpokenLength(spoken);
  let spokenLength = spokenLengthBefore;
  const budget = ctx?.spokenBudget || {};
  const budgetMaxWords = Number(budget.maxWords) || null;
  const budgetMaxSentences = Number(budget.maxSentences) || null;
  const trimOpts = {};
  if (budgetMaxWords) {
    trimOpts.maxWords = Math.max(budgetMaxWords, 22);
    trimOpts.maxChars = Math.max(160, budgetMaxWords * 7);
  }
  if (budgetMaxSentences) trimOpts.maxSentences = budgetMaxSentences;
  if (!allowLong) {
    const trimmed = softTrimSpokenResponse(spoken, trimOpts);
    spoken = trimmed.text;
    spokenTrimmed = Boolean(trimmed.trimmed || trimmed.trimApplied);
    spokenLength = {
      ...(trimmed.after || measureSpokenLength(spoken)),
      exemptionReason: null,
      trimApplied: spokenTrimmed,
      before: trimmed.before || spokenLengthBefore,
      after: trimmed.after || measureSpokenLength(spoken),
      requestedWordBudget: budgetMaxWords,
      generatedWords: spokenLengthBefore.words,
      finalWords: (trimmed.after || measureSpokenLength(spoken)).words,
      estimatedAudibleMsBefore: spokenLengthBefore.estimatedAudibleMs,
      estimatedAudibleMsAfter: (trimmed.after || measureSpokenLength(spoken)).estimatedAudibleMs,
      trimReason: spokenTrimmed ? "spoken_budget_safeguard" : null,
      budgetException: null,
      meaningLostDuringTrim: spokenTrimmed && spokenLengthBefore.words > 8 && countWordsLost(spokenLengthBefore, trimmed.after),
    };
  } else {
    spokenLength = {
      ...spokenLengthBefore,
      exemptionReason: spokenExemptionReason,
      trimApplied: false,
      before: spokenLengthBefore,
      after: spokenLengthBefore,
      requestedWordBudget: budgetMaxWords,
      generatedWords: spokenLengthBefore.words,
      finalWords: spokenLengthBefore.words,
      estimatedAudibleMsBefore: spokenLengthBefore.estimatedAudibleMs,
      estimatedAudibleMsAfter: spokenLengthBefore.estimatedAudibleMs,
      trimReason: null,
      budgetException: spokenExemptionReason,
      meaningLostDuringTrim: false,
    };
  }
  const shadowGate = evaluateContributionQuality(spoken, ctx);
  const obs = terraPlanObservability(plan, validation);

  return {
    text: spoken,
    engine: model,
    contributionEngineVersion: TERRA_CONTRIBUTION_ENGINE_VERSION,
    genomeVersion: PHILIP_VOICE_GENOME_VERSION,
    // Shadow only — Front Door must not treat failure as a veto for Terra.
    contributionQuality: shadowGate,
    contributionQualityShadow: true,
    contributionRegenUsed: false,
    schemaValid: true,
    faithPosture: plan.faithPosture,
    questionNeeded: plan.questionNeeded,
    warrantedContributionPresent: obs.warrantedContributionPresent,
    relationalAnchorTypes: relationalAnchorTypesFromCtx(ctx),
    shadowGatePassed: shadowGate.passed,
    shadowGateFailReasons: shadowGate.failReasons || [],
    privatePlanLogged: false,
    spokenLength,
    spokenTrimmed,
    // Explicit: private fields are not attached for TTS / logging sinks.
    recognition: undefined,
    relationalMeaning: undefined,
    warrantedContribution: undefined,
    timing,
    metaExtras: {
      ...obs,
      providerRawOk,
      model,
      contributionEngineVersion: TERRA_CONTRIBUTION_ENGINE_VERSION,
      shadowGatePassed: shadowGate.passed,
      shadowGateFailReasons: shadowGate.failReasons || [],
      relationalAnchorTypes: relationalAnchorTypesFromCtx(ctx),
      spokenLength,
      spokenTrimmed,
    },
    noFallback: true,
  };
}

/**
 * Create the Arm C deep generator (strict structured Terra).
 * @param {{ model?: string; resolveClient?: Function; complete?: Function }} [opts]
 */
export function makeTerraDeepGenerator(opts = {}) {
  const model = opts.model || terraContributionModel();
  const resolveClient = opts.resolveClient || getOpenAI;
  const completeOverride = opts.complete;

  return async function deepGenerate(ctx) {
    const client = completeOverride ? null : await resolveClient();
    if (!completeOverride && !client) {
      if (deterministicModeAllowedFn(false)) {
        // Diagnostics-only path: Front Door reflective composer may run for non-live.
        return null;
      }
      throw new TerraContributionError(
        "not_ready",
        "Candidate Terra contribution not ready: OPENAI_API_KEY is not configured. " +
          "The live Philip candidate will not serve canned deterministic conversation or GPT-4o fallback.",
      );
    }

    const messages = buildTerraContributionMessages(ctx);
    const modelRequestStartAt = Date.now();
    let modelFirstTokenAt = null;
    let content;

    try {
      if (completeOverride) {
        content = await completeOverride({ model, messages, ctx });
        modelFirstTokenAt = Date.now();
      } else {
        const completion = await client.chat.completions.create({
          model,
          messages,
          // Match proven Arm C bakeoff request for gpt-5.6-terra:
          // no temperature (model default only); max_completion_tokens; reasoning_effort low.
          max_completion_tokens: 500,
          reasoning_effort: "low",
          response_format: {
            type: "json_schema",
            json_schema: TERRA_CONTRIBUTION_JSON_SCHEMA,
          },
        });
        modelFirstTokenAt = Date.now();
        const msg = completion.choices?.[0]?.message;
        // Prefer parsed object when SDK provides it; else content string.
        content = msg?.parsed ?? msg?.content ?? "";
        if (!content) {
          throw new TerraContributionError("empty_provider_content", "Terra returned empty content");
        }
      }
    } catch (err) {
      if (err instanceof TerraContributionError) throw err;
      console.error("[philip-terra-contribution] provider failure:", err?.message || err);
      throw new TerraContributionError(
        "provider_failure",
        `Terra contribution provider failure: ${String(err?.message || err).slice(0, 200)}`,
        { causeName: err?.name || null },
      );
    }

    let validation;
    try {
      validation = parseAndValidateTerraContent(content);
    } catch (err) {
      if (err instanceof TerraContributionError) throw err;
      throw new TerraContributionError("schema_invalid", String(err?.message || err));
    }

    const modelCompletionAt = Date.now();
    return assembleTerraDeepResult({
      plan: validation.plan,
      validation,
      ctx,
      model,
      timing: {
        modelRequestStartAt,
        modelFirstTokenAt,
        modelCompletionAt,
        timeToFirstTokenMs:
          modelFirstTokenAt != null ? Math.max(0, modelFirstTokenAt - modelRequestStartAt) : null,
        generationLatencyMs: Math.max(0, modelCompletionAt - modelRequestStartAt),
      },
    });
  };
}

let cachedClient = null;
let cachedClientKey = null;

async function getOpenAI() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  if (cachedClient && cachedClientKey === key) return cachedClient;
  try {
    const mod = await import("openai");
    const OpenAI = mod.default || mod.OpenAI;
    cachedClient = new OpenAI({ apiKey: key });
    cachedClientKey = key;
    return cachedClient;
  } catch (err) {
    console.error("[philip-terra-contribution] failed to init OpenAI client:", err);
    return null;
  }
}

export {
  TERRA_CONTRIBUTION_ENGINE_VERSION,
  TERRA_CONTRIBUTION_MODEL_DEFAULT,
  validateTerraContributionPlan,
  terraPlanObservability,
};
