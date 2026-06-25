/**
 * Golden 15 — fixed regression set for deploy gates.
 * Smoke 5 + feature lanes 3 + category anchors 7.
 */

export const SMOKE_CORE_IDS = [
  "grief-01",
  "short-02",
  "guard-01",
  "doubt-01",
  "wall-01",
] as const;

export const FEATURE_SCENARIO_IDS = [
  "dependency-01",
  "sendoff-01",
  "continuity-01",
] as const;

/** One anchor per major lane not covered by smoke/feature set. */
export const GOLDEN_ANCHOR_IDS = [
  "grief-02",
  "anxiety-01",
  "anger-01",
  "lonely-01",
  "marriage-01",
  "depression-01",
  "parent-01",
] as const;

export const GOLDEN_15_IDS = [
  ...SMOKE_CORE_IDS,
  ...FEATURE_SCENARIO_IDS,
  ...GOLDEN_ANCHOR_IDS,
] as const;

export const GATE_MIN_PASS_RATE = 80;
