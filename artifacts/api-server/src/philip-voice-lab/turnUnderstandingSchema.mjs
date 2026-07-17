/**
 * TurnUnderstanding contract — G-lite Phase 1.
 *
 * Labels and concise user-grounded summaries only. No private reasoning prose,
 * no transcript dump, no invented personal facts. spokenResponse is the only
 * model text eligible for TTS. Understanding + spokenResponse in one call.
 */

import { measureSpokenLength } from "./spokenLength.mjs";
import {
  GLITE_ORCHESTRATION_VERSION,
  ORDINARY_ENGINE_LABEL,
  RARE_DEPTH_ENGINE_LABEL,
} from "./gliteOrchestration.mjs";

export const TURN_UNDERSTANDING_SCHEMA_VERSION = "philip-turn-understanding-v1";

export const FAITH_ROLES = Object.freeze([
  "none",
  "absent",
  "routine_only",
  "grounding_alongside_life",
  "central_question",
  "explicit_request",
]);

export const EMOTIONAL_WEIGHTS = Object.freeze(["light", "medium", "high"]);
export const RESPONSE_WORTHINESS = Object.freeze([
  "acknowledge",
  "contribute",
  "safety",
  "defer",
]);
export const RECOMMENDED_ENGINES = Object.freeze([
  "deterministic",
  "ordinary_structured",
  "rare_depth",
]);
export const SPOKEN_DEPTHS = Object.freeze(["ordinary", "weighty", "thin"]);
export const ENTITY_PROVENANCE = Object.freeze([
  "turn_local",
  "session_anchor",
  "user_stated",
]);

/** Strict JSON Schema for chat.completions response_format. */
export const TURN_UNDERSTANDING_JSON_SCHEMA = {
  name: "philip_turn_understanding",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "conversationalActs",
      "primaryBurden",
      "primaryMeaning",
      "secondaryThreads",
      "relationalEntities",
      "commitments",
      "restorativeElements",
      "faithRole",
      "emotionalWeight",
      "practicalRequest",
      "factualFreshnessRequired",
      "responseWorthiness",
      "recommendedResponseAct",
      "recommendedEngine",
      "questionNeeded",
      "spokenDepth",
      "confidence",
      "provenance",
      "spokenResponse",
    ],
    properties: {
      conversationalActs: {
        type: "array",
        items: { type: "string" },
        description: "Compact act labels (e.g. disclose_life_load, mention_faith_practice)",
      },
      primaryBurden: {
        type: "string",
        description: "Concise user-grounded primary burden label/summary",
      },
      primaryMeaning: {
        type: "string",
        description: "Concise meaning of the turn — not a transcript dump",
      },
      secondaryThreads: {
        type: "array",
        items: { type: "string" },
      },
      relationalEntities: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "provenance"],
          properties: {
            label: { type: "string" },
            role: { type: "string" },
            provenance: {
              type: "string",
              enum: ["turn_local", "session_anchor", "user_stated"],
            },
          },
        },
      },
      commitments: {
        type: "array",
        items: { type: "string" },
      },
      restorativeElements: {
        type: "array",
        items: { type: "string" },
      },
      faithRole: {
        type: "string",
        enum: [
          "none",
          "absent",
          "routine_only",
          "grounding_alongside_life",
          "central_question",
          "explicit_request",
        ],
      },
      emotionalWeight: {
        type: "string",
        enum: ["light", "medium", "high"],
      },
      practicalRequest: {
        type: "string",
        description: "Empty string when none; otherwise concise request label",
      },
      factualFreshnessRequired: { type: "boolean" },
      responseWorthiness: {
        type: "string",
        enum: ["acknowledge", "contribute", "safety", "defer"],
      },
      recommendedResponseAct: {
        type: "string",
        description: "e.g. one integrating observation",
      },
      recommendedEngine: {
        type: "string",
        enum: ["deterministic", "ordinary_structured", "rare_depth"],
      },
      questionNeeded: { type: "boolean" },
      spokenDepth: {
        type: "string",
        enum: ["ordinary", "weighty", "thin"],
      },
      confidence: {
        type: "number",
        description: "0–1 confidence in understanding + contribution",
      },
      provenance: {
        type: "object",
        additionalProperties: false,
        required: ["source"],
        properties: {
          source: {
            type: "string",
            description: "model_structured | fixture_mock | etc.",
          },
        },
      },
      spokenResponse: {
        type: "string",
        description:
          "Only text Philip will speak. Ordinary: ~18–30 words, usually 1 sentence or 2 short clauses, no default question.",
      },
    },
  },
};

const ALLOWED_KEYS = new Set(TURN_UNDERSTANDING_JSON_SCHEMA.schema.required);

const PLANNING_LEAK =
  /\b(primaryBurden|primaryMeaning|recommendedEngine|TurnUnderstanding|INTERNAL — NEVER|chain-of-thought)\b/i;

/**
 * @returns {{ ok: true, plan: object, warnings: string[], errors: string[] } | { ok: false, errors: string[], plan: object|null, warnings: string[] }}
 */
export function validateTurnUnderstanding(raw) {
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

  for (const key of Object.keys(parsed)) {
    if (!ALLOWED_KEYS.has(key)) errors.push(`${key}:unrecognized_keys`);
  }

  if (!Array.isArray(plan.conversationalActs) || !plan.conversationalActs.every((a) => typeof a === "string")) {
    errors.push("conversationalActs:invalid_type");
  }
  for (const key of ["primaryBurden", "primaryMeaning", "recommendedResponseAct", "spokenResponse"]) {
    if (typeof plan[key] !== "string") errors.push(`${key}:invalid_type`);
    else if (!String(plan[key]).trim() && key !== "practicalRequest") {
      if (key === "spokenResponse" || key === "primaryBurden" || key === "primaryMeaning") {
        errors.push(`${key}_empty`);
      }
    } else {
      plan[key] = String(plan[key]).trim();
    }
  }
  for (const key of ["secondaryThreads", "commitments", "restorativeElements"]) {
    if (!Array.isArray(plan[key]) || !plan[key].every((x) => typeof x === "string")) {
      errors.push(`${key}:invalid_type`);
    }
  }
  if (!Array.isArray(plan.relationalEntities)) {
    errors.push("relationalEntities:invalid_type");
  } else {
    plan.relationalEntities = plan.relationalEntities.map((e) => {
      if (typeof e === "string") {
        return { label: e, role: "", provenance: "user_stated" };
      }
      return {
        label: String(e?.label || "").trim(),
        role: String(e?.role || "").trim(),
        provenance: ENTITY_PROVENANCE.includes(e?.provenance) ? e.provenance : "user_stated",
      };
    });
    if (plan.relationalEntities.some((e) => !e.label)) {
      errors.push("relationalEntities:empty_label");
    }
  }

  if (!FAITH_ROLES.includes(plan.faithRole)) errors.push("faithRole:invalid_enum");
  if (!EMOTIONAL_WEIGHTS.includes(plan.emotionalWeight)) errors.push("emotionalWeight:invalid_enum");
  if (!RESPONSE_WORTHINESS.includes(plan.responseWorthiness)) {
    errors.push("responseWorthiness:invalid_enum");
  }
  if (!RECOMMENDED_ENGINES.includes(plan.recommendedEngine)) {
    errors.push("recommendedEngine:invalid_enum");
  }
  if (!SPOKEN_DEPTHS.includes(plan.spokenDepth)) errors.push("spokenDepth:invalid_enum");
  if (typeof plan.questionNeeded !== "boolean") errors.push("questionNeeded:invalid_type");
  if (typeof plan.factualFreshnessRequired !== "boolean") {
    errors.push("factualFreshnessRequired:invalid_type");
  }
  if (typeof plan.practicalRequest !== "string") {
    // coerce null → ""
    if (plan.practicalRequest == null) plan.practicalRequest = "";
    else errors.push("practicalRequest:invalid_type");
  } else {
    plan.practicalRequest = plan.practicalRequest.trim();
  }
  if (typeof plan.confidence !== "number" || plan.confidence < 0 || plan.confidence > 1) {
    errors.push("confidence:invalid_range");
  }
  if (!plan.provenance || typeof plan.provenance !== "object" || typeof plan.provenance.source !== "string") {
    errors.push("provenance:invalid");
  } else {
    plan.provenance = { source: String(plan.provenance.source).slice(0, 64) };
  }

  if (typeof plan.spokenResponse === "string" && PLANNING_LEAK.test(plan.spokenResponse)) {
    errors.push("spokenResponse_leaks_plan_labels");
  }

  if (typeof plan.spokenResponse === "string") {
    const len = measureSpokenLength(plan.spokenResponse);
    if (plan.spokenDepth === "ordinary" && len.words > 40) {
      warnings.push("spokenResponse_over_ordinary_soft_max");
    }
    if (plan.spokenDepth === "weighty" && len.words > 55) {
      warnings.push("spokenResponse_over_weighty_soft_max");
    }
    if (len.sentences > 3) warnings.push("spokenResponse_too_many_sentences");
  }

  if (plan.questionNeeded === false && typeof plan.spokenResponse === "string" && /\?\s*$/.test(plan.spokenResponse)) {
    warnings.push("questionNeeded_false_but_ends_with_question");
  }
  if (plan.questionNeeded === true && typeof plan.spokenResponse === "string" && !/\?/.test(plan.spokenResponse)) {
    warnings.push("questionNeeded_true_but_no_question_mark");
  }

  if (errors.length) return { ok: false, errors, plan, warnings };
  return { ok: true, plan, warnings, errors: [] };
}

/** Redacted observability — never include hidden CoT or full private prompts. */
export function understandingObservability(plan, validation) {
  const spoken = String(plan?.spokenResponse || "");
  const length = spoken ? measureSpokenLength(spoken) : null;
  return {
    turnUnderstandingSchemaVersion: TURN_UNDERSTANDING_SCHEMA_VERSION,
    orchestrationVersion: GLITE_ORCHESTRATION_VERSION,
    schemaValid: Boolean(validation?.ok),
    schemaErrors: validation?.ok ? null : validation?.errors ?? null,
    schemaWarnings: validation?.warnings?.length ? validation.warnings : null,
    conversationalActs: plan?.conversationalActs ?? null,
    primaryBurden: plan?.primaryBurden ? String(plan.primaryBurden).slice(0, 160) : null,
    primaryMeaning: plan?.primaryMeaning ? String(plan.primaryMeaning).slice(0, 200) : null,
    secondaryThreads: plan?.secondaryThreads ?? null,
    relationalEntities: (plan?.relationalEntities || []).map((e) => ({
      label: e.label,
      role: e.role || null,
      provenance: e.provenance,
    })),
    commitments: plan?.commitments ?? null,
    restorativeElements: plan?.restorativeElements ?? null,
    faithRole: plan?.faithRole ?? null,
    emotionalWeight: plan?.emotionalWeight ?? null,
    practicalRequest: plan?.practicalRequest || null,
    factualFreshnessRequired: Boolean(plan?.factualFreshnessRequired),
    responseWorthiness: plan?.responseWorthiness ?? null,
    recommendedResponseAct: plan?.recommendedResponseAct ?? null,
    recommendedEngine: plan?.recommendedEngine ?? null,
    questionNeeded: typeof plan?.questionNeeded === "boolean" ? plan.questionNeeded : null,
    spokenDepth: plan?.spokenDepth ?? null,
    confidence: typeof plan?.confidence === "number" ? plan.confidence : null,
    provenanceSource: plan?.provenance?.source ?? null,
    spokenResponseChars: spoken.length || null,
    spokenResponseWords: length?.words ?? null,
    spokenResponseSentences: length?.sentences ?? null,
    estimatedSpokenDurationMs: length?.estimatedAudibleMs ?? null,
    contributionEngineVersion:
      plan?.recommendedEngine === "rare_depth" ? RARE_DEPTH_ENGINE_LABEL : ORDINARY_ENGINE_LABEL,
    privatePlanLogged: false,
    hiddenChainOfThoughtLogged: false,
  };
}

/**
 * Detect prohibited spoken moves for multi-topic contribution quality.
 */
export function detectProhibitedSpokenMoves(spokenResponse, understanding = {}) {
  const spoken = String(spokenResponse || "");
  const t = spoken.toLowerCase();
  const reasons = [];

  if (
    /\b(keeping (the )?word|scripture and prayer|morning anchors|no small discipline)\b/i.test(spoken) &&
    !/\b(mom|mother|care|work|app|plate|gym|world cup)\b/i.test(spoken)
  ) {
    reasons.push("descriptive_faith_template_capture");
  }
  if (/\b(i'?m proud of you|you'?re (so )?(amazing|incredible|doing great)|what a blessing you are)\b/i.test(spoken)) {
    reasons.push("generic_praise");
  }
  if (understanding.questionNeeded === false && /\?\s*$/.test(spoken.trim())) {
    reasons.push("unnecessary_question");
  }
  if (
    /\b(work).{0,40}(mom|mother).{0,40}(world cup|gym).{0,40}(word|scripture)\b/i.test(spoken) ||
    (spoken.split(/,/).length >= 5 && /\b(work|mom|gym|cup|word)\b/i.test(spoken))
  ) {
    reasons.push("full_topic_recitation");
  }
  if (/\b(overwhelm|overwhelmed|burn(ed)? out|breaking down)\b/i.test(spoken) &&
      !/\b(overwhelm|overwhelmed|burn)\b/i.test(String(understanding.primaryBurden || "") + String(understanding.primaryMeaning || ""))) {
    // Only flag if user didn't state it — caller should pass user transcript too when available
    reasons.push("diagnose_overwhelm_risk");
  }
  if (/\b(let us (pray|remember)|the lord (says|wants)|sermon|brother[, ])\b/i.test(spoken)) {
    reasons.push("preach_cadence");
  }
  const metaphorHits = (spoken.match(/\b(like a|as if|anchor|storm|wilderness|valley)\b/gi) || []).length;
  if (metaphorHits >= 3) reasons.push("stacked_metaphor");
  if (/\b(schedule|calendar|block (out )?time|tuesday at)\b/i.test(t) && /\b(then|after that|next)\b/i.test(t)) {
    reasons.push("scheduling_fiction_risk");
  }
  if (/\b(task|checklist|inventory|items on your list)\b/i.test(t) && /\b(mom|mother|care)\b/i.test(t)) {
    reasons.push("caregiving_as_task_inventory");
  }

  return { passed: reasons.length === 0, reasons, spokenLength: measureSpokenLength(spoken) };
}

/**
 * Multi-topic set quality: require ≥5/5 style checks for locked fixtures.
 */
export function scoreMultiTopicContributionQuality({ understanding, spokenResponse, userTranscript }) {
  const u = understanding || {};
  const spoken = spokenResponse || u.spokenResponse || "";
  const checks = {
    correctPrimaryMeaning: Boolean(
      String(u.primaryMeaning || "").trim() &&
        !/only .{0,20}(word|scripture)/i.test(u.primaryMeaning || ""),
    ),
    noFaithTemplateCapture: !detectProhibitedSpokenMoves(spoken, u).reasons.includes(
      "descriptive_faith_template_capture",
    ),
    caregivingRelational: (u.relationalEntities || []).some((e) =>
      /mom|mother|care/i.test(typeof e === "string" ? e : e.label || ""),
    ),
    restorationDistinguished: (u.restorativeElements || []).length > 0,
    noGenericPraise: !detectProhibitedSpokenMoves(spoken, u).reasons.includes("generic_praise"),
    noUnnecessaryQuestion: u.questionNeeded === false && !/\?\s*$/.test(String(spoken).trim()),
    oneWarrantedContribution: u.responseWorthiness === "contribute",
    speechBudgetSatisfied: (() => {
      const len = measureSpokenLength(spoken);
      const max = u.spokenDepth === "weighty" ? 40 : 30;
      const min = u.spokenDepth === "weighty" ? 12 : 10;
      return len.words >= min && len.words <= max + 8;
    })(),
  };
  // Overwhelm diagnosis only if user didn't say it
  const userSaidOverwhelm = /\b(overwhelm|too much|can't keep up)\b/i.test(String(userTranscript || ""));
  if (!userSaidOverwhelm && detectProhibitedSpokenMoves(spoken, u).reasons.includes("diagnose_overwhelm_risk")) {
    checks.noUnsupportedOverwhelm = false;
  } else {
    checks.noUnsupportedOverwhelm = true;
  }

  const keys = Object.keys(checks);
  const passedCount = keys.filter((k) => checks[k]).length;
  return {
    checks,
    passedCount,
    total: keys.length,
    passed: passedCount === keys.length,
  };
}
