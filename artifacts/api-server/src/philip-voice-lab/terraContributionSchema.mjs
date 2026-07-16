/**
 * Strict structured-output schema for Philip Arm C contribution engine.
 *
 * One Terra call returns a private plan + spokenResponse. Only spokenResponse
 * is eligible for TTS. Never request or store chain-of-thought.
 *
 * Validation is hand-rolled (no zod runtime import) so the lab candidate stays
 * dependency-light and deterministic under mocked tests.
 */

export const TERRA_CONTRIBUTION_ENGINE_VERSION = "philip-contribution-terra-structured-v1";

export const TERRA_CONTRIBUTION_MODEL_DEFAULT = "gpt-5.6-terra";

export const FAITH_POSTURES = Object.freeze(["implicit", "descriptive", "explicit"]);

export const REQUIRED_PROHIBITED_MOVES = Object.freeze([
  "generic praise",
  "paraphrase-only",
  "invented struggle",
  "schedule inventory",
  "unnecessary question",
]);

/** JSON Schema used with response_format.type = json_schema (strict). */
export const TERRA_CONTRIBUTION_JSON_SCHEMA = {
  name: "philip_contribution_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "recognition",
      "relationalMeaning",
      "warrantedContribution",
      "faithPosture",
      "questionNeeded",
      "prohibitedMoves",
      "spokenResponse",
    ],
    properties: {
      recognition: {
        type: "string",
        description: "What Brian actually communicated",
      },
      relationalMeaning: {
        type: "string",
        description: "The relevant relationship, commitment, hope, tension, or meaning",
      },
      warrantedContribution: {
        type: "string",
        description: "One new supported perspective, distinction, connection, or practical step",
      },
      faithPosture: {
        type: "string",
        enum: ["implicit", "descriptive", "explicit"],
        description: "Faith intensity matching what Brian opened",
      },
      questionNeeded: {
        type: "boolean",
        description: "True only when a question materially improves the exchange",
      },
      prohibitedMoves: {
        type: "array",
        items: { type: "string" },
        description: "Moves Philip must avoid this turn",
      },
      spokenResponse: {
        type: "string",
        description: "The concise response Philip will speak (TTS only)",
      },
    },
  },
};

export const PLANNING_LABEL_LEAK =
  /\b(recognition|relationalMeaning|warrantedContribution|faithPosture|questionNeeded|prohibitedMoves|CONTRIBUTION CONTRACT|INTERNAL — NEVER)\b/i;

/**
 * Validate a parsed Terra plan before speech.
 * @returns {{ ok: true, plan: object, warnings: string[], errors: string[] } | { ok: false, errors: string[], plan: object|null, warnings?: string[] }}
 */
export function validateTerraContributionPlan(raw) {
  const warnings = [];
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return { ok: false, errors: ["invalid_json"], plan: null, warnings };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, errors: ["root:invalid_type"], plan: null, warnings };
  }

  const errors = [];
  const plan = { ...parsed };

  for (const key of [
    "recognition",
    "relationalMeaning",
    "warrantedContribution",
    "spokenResponse",
  ]) {
    if (typeof plan[key] !== "string") {
      errors.push(`${key}:invalid_type`);
    } else if (!plan[key].trim()) {
      errors.push(`${key}_empty`);
    } else {
      plan[key] = plan[key].trim();
    }
  }

  if (!FAITH_POSTURES.includes(plan.faithPosture)) {
    errors.push("faithPosture:invalid_enum");
  }
  if (typeof plan.questionNeeded !== "boolean") {
    errors.push("questionNeeded:invalid_type");
  }
  if (!Array.isArray(plan.prohibitedMoves) || !plan.prohibitedMoves.every((m) => typeof m === "string")) {
    errors.push("prohibitedMoves:invalid_type");
  }

  // Reject unknown keys (strict schema parity).
  const allowed = new Set([
    "recognition",
    "relationalMeaning",
    "warrantedContribution",
    "faithPosture",
    "questionNeeded",
    "prohibitedMoves",
    "spokenResponse",
  ]);
  for (const key of Object.keys(parsed)) {
    if (!allowed.has(key)) errors.push(`${key}:unrecognized_keys`);
  }

  if (typeof plan.spokenResponse === "string" && PLANNING_LABEL_LEAK.test(plan.spokenResponse)) {
    errors.push("spokenResponse_leaks_plan_labels");
  }

  if (typeof plan.spokenResponse === "string" && typeof plan.recognition === "string") {
    const spoken = plan.spokenResponse;
    if (
      spoken.includes(plan.recognition) &&
      typeof plan.warrantedContribution === "string" &&
      spoken.includes(plan.warrantedContribution) &&
      spoken.length > 400
    ) {
      warnings.push("spokenResponse_may_dump_plan");
    }
  }

  if (Array.isArray(plan.prohibitedMoves)) {
    const moves = plan.prohibitedMoves.map((m) => String(m).toLowerCase());
    for (const required of REQUIRED_PROHIBITED_MOVES) {
      if (!moves.some((m) => m.includes(required.toLowerCase()) || required.toLowerCase().includes(m))) {
        warnings.push(`prohibitedMoves_missing:${required}`);
      }
    }
  }

  if (plan.questionNeeded === true && typeof plan.spokenResponse === "string" && !/\?/.test(plan.spokenResponse)) {
    warnings.push("questionNeeded_true_but_no_question_mark");
  }
  if (
    plan.questionNeeded === false &&
    typeof plan.spokenResponse === "string" &&
    /\?\s*$/.test(plan.spokenResponse)
  ) {
    warnings.push("questionNeeded_false_but_ends_with_question");
  }

  if (errors.length) {
    return { ok: false, errors, plan, warnings };
  }
  return { ok: true, plan, warnings, errors: [] };
}

/** Redacted observability fields — never include private plan text. */
export function terraPlanObservability(plan, validation) {
  return {
    contributionEngineVersion: TERRA_CONTRIBUTION_ENGINE_VERSION,
    schemaValid: Boolean(validation?.ok),
    schemaErrors: validation?.ok ? null : validation?.errors ?? null,
    schemaWarnings: validation?.warnings?.length ? validation.warnings : null,
    faithPosture: plan?.faithPosture ?? null,
    questionNeeded: typeof plan?.questionNeeded === "boolean" ? plan.questionNeeded : null,
    warrantedContributionPresent: Boolean(String(plan?.warrantedContribution || "").trim()),
    recognitionPresent: Boolean(String(plan?.recognition || "").trim()),
    relationalMeaningPresent: Boolean(String(plan?.relationalMeaning || "").trim()),
    privatePlanLogged: false,
  };
}
