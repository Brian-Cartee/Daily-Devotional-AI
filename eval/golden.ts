/**
 * Golden gate set — fixed regression for deploy gates.
 * Smoke 5 + feature lanes 4 + presence 2 + category anchors 7 = 18.
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
  "continuity-turn3-01",
] as const;

export const PRESENCE_SCENARIO_IDS = [
  "presence-almost-01",
  "presence-early-scripture-01",
  "presence-confession-01",
  "presence-guarded-01",
] as const;

/** Presence scenarios included in the golden deploy gate. */
export const GOLDEN_PRESENCE_IDS = [
  "presence-almost-01",
  "presence-confession-01",
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
  ...GOLDEN_PRESENCE_IDS,
  ...GOLDEN_ANCHOR_IDS,
] as const;

/** Spot-check gate — 3 worst scenarios from recent evals (~$3-5 vs ~$65 full gate). */
export const SPOT_GATE_IDS = [
  "presence-almost-01",
  "sendoff-01",
  "presence-confession-01",
] as const;

/** Spot gate: 2 of 3 must pass during iteration (full gate stays 80%). */
export const SPOT_GATE_MIN_PASS_RATE = 67;

export const GATE_MIN_PASS_RATE = 80;

/** Session Mind telemetry gate — exchange 3+ should read from warm cache. */
export const MIND_CONTINUITY_SCENARIO_ID = "continuity-turn3-01";
export const MIND_GATE_MIN_EXCHANGE = 3;
export const MIND_GATE_MIN_VERSION = 2;
