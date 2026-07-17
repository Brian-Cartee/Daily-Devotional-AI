/**
 * G-lite semantic contribution engine.
 *
 * One gpt-5.6-terra call returns TurnUnderstanding + spokenResponse via strict
 * json_schema. Only spokenResponse reaches TTS. No serial understanding→render.
 *
 * Both ordinary- and rare-depth contracts use the same physical Terra model.
 * Phase 1 validates semantic judgment; it makes no faster-engine claim.
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
  TerraContributionError,
  configureTerraEngineHooks,
} from "./terraContributionEngine.mjs";
import { measureSpokenLength, softTrimSpokenResponse } from "./spokenLength.mjs";
import {
  GLITE_ORCHESTRATION_VERSION,
  ORDINARY_ENGINE_ID,
  ORDINARY_ENGINE_LABEL,
  RARE_DEPTH_ENGINE_LABEL,
  gliteSpeechBudget,
  buildInterruptionInput,
  selectContributionEngine,
  ENGINE_SELECTION_EVIDENCE,
} from "./gliteOrchestration.mjs";
import {
  TURN_UNDERSTANDING_JSON_SCHEMA,
  TURN_UNDERSTANDING_SCHEMA_VERSION,
  validateTurnUnderstanding,
  understandingObservability,
  detectProhibitedSpokenMoves,
} from "./turnUnderstandingSchema.mjs";

export {
  TerraContributionError,
  configureTerraEngineHooks,
  ORDINARY_ENGINE_LABEL,
  GLITE_ORCHESTRATION_VERSION,
  ENGINE_SELECTION_EVIDENCE,
};

export const ORDINARY_CONTRIBUTION_ENGINE_VERSION = ORDINARY_ENGINE_LABEL;

let deterministicModeAllowedFn = (hasInjected = false) => {
  if (hasInjected) return true;
  const raw = process.env.PHILIP_VOICE_LAB_ALLOW_DETERMINISTIC?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
};
let guidanceInstructionFn = () => "";

/** Local hook config (mirrors Terra) so guidanceBrain can inject. */
export function configureGliteEngineHooks(hooks = {}) {
  if (typeof hooks.deterministicModeAllowed === "function") {
    deterministicModeAllowedFn = hooks.deterministicModeAllowed;
  }
  if (typeof hooks.guidanceInstruction === "function") {
    guidanceInstructionFn = hooks.guidanceInstruction;
  }
  configureTerraEngineHooks(hooks);
}

export function ordinaryContributionModel() {
  return (
    process.env.PHILIP_VOICE_LAB_ORDINARY_MODEL?.trim() ||
    process.env.PHILIP_VOICE_LAB_TERRA_MODEL?.trim() ||
    process.env.PHILIP_VOICE_LAB_BRAIN_MODEL?.trim() ||
    ORDINARY_ENGINE_ID
  );
}

export function buildGliteStructuredInstruction(ctx = {}) {
  const selection =
    ctx.engineSelection ||
    selectContributionEngine({
      transcript: ctx.rawTranscript || ctx.transcript,
      emotionalWeight: ctx.emotionalWeightHint,
      spokenDepth: ctx.spokenDepthHint,
      faithRole: ctx.faithRoleHint,
      intent: ctx.intent,
      responseWorthiness: "contribute",
      confidence: 1,
    });
  const budget = ctx.spokenBudget || gliteSpeechBudget(selection.spokenDepth);
  const maxWords = budget.maxWords ?? 30;
  const minWords = budget.minWords ?? 18;
  const targetSeconds = Array.isArray(budget.targetSeconds)
    ? `${budget.targetSeconds[0]}–${budget.targetSeconds[1]}`
    : "6–10";
  const maxSentences = budget.maxSentences ?? 2;
  const weighty = selection.spokenDepth === "weighty";
  const interrupt = buildInterruptionInput(ctx.interruptionInput || ctx.interruption || {});

  const lines = [
    "TURN UNDERSTANDING + SPOKEN CONTRIBUTION (INTERNAL — ONE CALL)",
    `Orchestration: ${GLITE_ORCHESTRATION_VERSION}. Schema: ${TURN_UNDERSTANDING_SCHEMA_VERSION}.`,
    `Engine: ${selection.engineLabel || ORDINARY_ENGINE_LABEL}.`,
    "Return one JSON object matching the schema. No chain-of-thought, scratchpads, or hidden reasoning fields.",
    "Fill understanding labels from Brian's words only — concise summaries, not a transcript dump.",
    "Do not invent personal facts, medical diagnoses, schedules, or current sports/news/weather/prices.",
    "spokenResponse is the ONLY text Philip will speak (TTS).",
    `Compose FOR SPEECH first: target ${minWords}–${maxWords} words; normally ${maxSentences} short sentence(s); about ${targetSeconds}s audible.`,
    "Exactly one warranted contribution. No literary ending, sermon cadence, generic praise, full paraphrase, clinical inventory, or stacked metaphors.",
    "questionNeeded defaults false — no intake interview unless understanding requires it.",
    "If multiple life threads or faith mixed with ordinary life: integrate — never select Scripture/Word as the sole subject.",
    "Caregiving is relational, not a task list. Gym/World Cup may be restorative, not obligation.",
    "Do not diagnose overwhelm unless Brian said it.",
  ];

  if (weighty) {
    lines.push(
      "WEIGHTY DEPTH: careful judgment; still max two short sentences; question only if questionNeeded is true.",
    );
  } else {
    lines.push("ORDINARY DEPTH: one integrating observation is enough.");
  }

  if (interrupt.previousResponseInterrupted) {
    lines.push(
      "INTERRUPTION CONTEXT: Brian began speaking before Philip finished. Do not resume abandoned prose. Do not repeat an acknowledgment he already interrupted. Do not answer an obsolete question. Treat the interruption as evidence the prior response may have missed, overrun, or lost relevance. Allow topic replacement. Preserve any pending fragment accumulation in state (do not clear it here).",
    );
    if (interrupt.previousResponseTopic) {
      lines.push(`Prior abandoned topic hint: ${interrupt.previousResponseTopic}`);
    }
    if (interrupt.likelyHeardRatio != null) {
      lines.push(`Likely heard ratio of prior audio: ${interrupt.likelyHeardRatio}`);
    }
  }

  if (ctx.factualFreshnessRequired) {
    lines.push(
      "FACTUAL BOUNDARY: current-changing facts are unavailable without a live tool — set factualFreshnessRequired true and keep spokenResponse as a brief limitation + invite user fact if appropriate; never fabricate live access.",
    );
  }

  if (ctx.preferStatement) {
    lines.push("Prefer a statement; set questionNeeded false unless genuinely unclear.");
  }

  lines.push(`recommendedEngine should be "${selection.recommendedEngine}" unless safety requires deterministic.`);
  lines.push(`spokenDepth should be "${selection.spokenDepth}".`);
  lines.push(`provenance.source must be "model_structured".`);

  return lines.join("\n");
}

export function buildGliteContributionMessages(ctx = {}) {
  const messages = [{ role: "system", content: COMPACT_PHILIP_GENOME }];
  messages.push({
    role: "system",
    content: `Genome: ${PHILIP_VOICE_GENOME_VERSION}. Contract: ${CONTRIBUTION_CONTRACT_VERSION}. Orchestration: ${GLITE_ORCHESTRATION_VERSION}. Approx genome tokens: ${estimateGenomeTokens()}.`,
  });
  messages.push({
    role: "system",
    content: buildContributionContractInstruction(ctx),
  });
  messages.push({
    role: "system",
    content: buildGliteStructuredInstruction(ctx),
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

export function parseAndValidateGliteContent(content) {
  let raw = content;
  if (typeof content === "object" && content && !Array.isArray(content)) {
    raw = content;
  } else if (typeof content !== "string") {
    raw = content == null ? "" : String(content);
  }
  const validation = validateTurnUnderstanding(raw);
  if (!validation.ok) {
    throw new TerraContributionError(
      "schema_invalid",
      `TurnUnderstanding schema invalid: ${(validation.errors || []).join(",")}`,
      { schemaErrors: validation.errors, schemaWarnings: validation.warnings },
    );
  }
  return validation;
}

function countWordsLost(before, after) {
  const beforeWords = Number(before?.words || 0);
  const afterWords = Number(after?.words || 0);
  return beforeWords > 0 && afterWords > 0 && afterWords < beforeWords * 0.55;
}

export function assembleGliteDeepResult({
  plan,
  validation,
  ctx,
  model,
  timing,
  providerRawOk = true,
}) {
  const selection =
    ctx.engineSelection ||
    selectContributionEngine({
      ...plan,
      transcript: ctx.rawTranscript || ctx.transcript,
      intent: ctx.intent,
    });
  const budget = ctx.spokenBudget || gliteSpeechBudget(plan.spokenDepth || selection.spokenDepth);
  let spoken = String(plan.spokenResponse).trim();
  let spokenTrimmed = false;
  const spokenLengthBefore = measureSpokenLength(spoken);
  const trimOpts = {
    maxWords: Math.max(Number(budget.maxWords) || 30, 22),
    maxChars: Math.max(160, (Number(budget.maxWords) || 30) * 7),
    maxSentences: Number(budget.maxSentences) || 2,
  };
  const allowLong = plan.spokenDepth === "weighty" || selection.spokenDepth === "weighty";
  let spokenLength = spokenLengthBefore;
  if (!allowLong || spokenLengthBefore.words > (budget.maxWords || 40) + 12) {
    const trimmed = softTrimSpokenResponse(spoken, trimOpts);
    spoken = trimmed.text;
    spokenTrimmed = Boolean(trimmed.trimmed || trimmed.trimApplied);
    const after = trimmed.after || measureSpokenLength(spoken);
    spokenLength = {
      ...after,
      requestedWordBudget: budget.maxWords ?? null,
      generatedWords: spokenLengthBefore.words,
      finalWords: after.words,
      estimatedAudibleMsBefore: spokenLengthBefore.estimatedAudibleMs,
      estimatedAudibleMsAfter: after.estimatedAudibleMs,
      trimApplied: spokenTrimmed,
      trimReason: spokenTrimmed ? "spoken_budget_safeguard" : null,
      budgetException: allowLong ? "weighty_depth" : null,
      meaningLostDuringTrim:
        spokenTrimmed &&
        spokenLengthBefore.words > 8 &&
        countWordsLost(spokenLengthBefore, after),
      contributionRetained: !countWordsLost(spokenLengthBefore, after),
      budget,
    };
  } else {
    spokenLength = {
      ...spokenLengthBefore,
      requestedWordBudget: budget.maxWords ?? null,
      generatedWords: spokenLengthBefore.words,
      finalWords: spokenLengthBefore.words,
      estimatedAudibleMsBefore: spokenLengthBefore.estimatedAudibleMs,
      estimatedAudibleMsAfter: spokenLengthBefore.estimatedAudibleMs,
      trimApplied: false,
      trimReason: null,
      budgetException: allowLong ? "weighty_depth" : null,
      meaningLostDuringTrim: false,
      contributionRetained: true,
      budget,
    };
  }

  const shadowGate = evaluateContributionQuality(spoken, ctx);
  const prohibited = detectProhibitedSpokenMoves(spoken, plan);
  const obs = understandingObservability({ ...plan, spokenResponse: spoken }, validation);
  const engineLabel =
    plan.recommendedEngine === "rare_depth" || selection.engine === "rare_depth"
      ? RARE_DEPTH_ENGINE_LABEL
      : ORDINARY_ENGINE_LABEL;

  return {
    text: spoken,
    engine: model,
    contributionEngineVersion: engineLabel,
    understandingProducer: engineLabel,
    orchestrationVersion: GLITE_ORCHESTRATION_VERSION,
    orchestrationPath: "glite",
    selectedEngine: plan.recommendedEngine || selection.recommendedEngine,
    engineSelectionReason: selection.engineSelectionReason || selection.reason,
    genomeVersion: PHILIP_VOICE_GENOME_VERSION,
    contributionQuality: shadowGate,
    contributionQualityShadow: true,
    contributionRegenUsed: false,
    schemaValid: true,
    questionNeeded: plan.questionNeeded,
    faithRole: plan.faithRole,
    emotionalWeight: plan.emotionalWeight,
    responseWorthiness: plan.responseWorthiness,
    recommendedResponseAct: plan.recommendedResponseAct,
    spokenDepth: plan.spokenDepth,
    factualFreshnessRequired: plan.factualFreshnessRequired,
    warrantedContributionPresent: plan.responseWorthiness === "contribute",
    shadowGatePassed: shadowGate.passed,
    shadowGateFailReasons: shadowGate.failReasons || [],
    prohibitedMovesPassed: prohibited.passed,
    prohibitedMoveReasons: prohibited.reasons,
    privatePlanLogged: false,
    spokenLength,
    spokenTrimmed,
    turnUnderstanding: obs,
    interruptionInput: buildInterruptionInput(ctx.interruptionInput || ctx.interruption || {}),
    timing,
    metaExtras: {
      ...obs,
      providerRawOk,
      model,
      contributionEngineVersion: engineLabel,
      orchestrationVersion: GLITE_ORCHESTRATION_VERSION,
      orchestrationPath: "glite",
      understandingProducer: engineLabel,
      selectedEngine: plan.recommendedEngine || selection.recommendedEngine,
      engineSelectionReason: selection.engineSelectionReason || selection.reason,
      spokenLength,
      spokenTrimmed,
      shadowGatePassed: shadowGate.passed,
      shadowGateFailReasons: shadowGate.failReasons || [],
      prohibitedMovesPassed: prohibited.passed,
      prohibitedMoveReasons: prohibited.reasons,
    },
    noFallback: true,
  };
}

/**
 * Create G-lite deep generator (TurnUnderstanding + spokenResponse, one call).
 */
export function makeGliteContributionGenerator(opts = {}) {
  const model = opts.model || ordinaryContributionModel();
  const resolveClient = opts.resolveClient || getOpenAI;
  const completeOverride = opts.complete;

  return async function deepGenerate(ctx) {
    const client = completeOverride ? null : await resolveClient();
    if (!completeOverride && !client) {
      if (deterministicModeAllowedFn(false)) return null;
      throw new TerraContributionError(
        "not_ready",
        "G-lite ordinary contribution not ready: OPENAI_API_KEY is not configured.",
      );
    }

    const engineSelection =
      ctx.engineSelection ||
      selectContributionEngine({
        transcript: ctx.rawTranscript || ctx.transcript,
        intent: ctx.intent,
        emotionalWeight: ctx.emotionalWeightHint,
        spokenDepth: ctx.spokenBudget?.weighty ? "weighty" : ctx.spokenDepthHint,
        responseWorthiness: "contribute",
        confidence: 1,
      });
    const spokenBudget = ctx.spokenBudget || gliteSpeechBudget(engineSelection.spokenDepth);
    const enrichedCtx = {
      ...ctx,
      engineSelection,
      spokenBudget,
      interruptionInput: buildInterruptionInput(ctx.interruptionInput || ctx.interruption || {}),
    };

    const messages = buildGliteContributionMessages(enrichedCtx);
    const modelRequestStartAt = Date.now();
    let modelFirstTokenAt = null;
    let content;

    try {
      if (completeOverride) {
        content = await completeOverride({ model, messages, ctx: enrichedCtx });
        modelFirstTokenAt = Date.now();
      } else {
        const completion = await client.chat.completions.create({
          model,
          messages,
          max_completion_tokens: 700,
          reasoning_effort: "low",
          response_format: {
            type: "json_schema",
            json_schema: TURN_UNDERSTANDING_JSON_SCHEMA,
          },
        });
        modelFirstTokenAt = Date.now();
        const msg = completion.choices?.[0]?.message;
        content = msg?.parsed ?? msg?.content ?? "";
        if (!content) {
          throw new TerraContributionError("empty_provider_content", "G-lite returned empty content");
        }
      }
    } catch (err) {
      if (err instanceof TerraContributionError) throw err;
      console.error("[philip-glite-contribution] provider failure:", err?.message || err);
      throw new TerraContributionError(
        "provider_failure",
        `G-lite contribution provider failure: ${String(err?.message || err).slice(0, 200)}`,
        { causeName: err?.name || null },
      );
    }

    const validation = parseAndValidateGliteContent(content);
    const modelCompletionAt = Date.now();
    return assembleGliteDeepResult({
      plan: validation.plan,
      validation,
      ctx: enrichedCtx,
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
    throw new TerraContributionError(
      "client_init_failed",
      `Failed to init OpenAI client: ${String(err?.message || err).slice(0, 160)}`,
    );
  }
}
