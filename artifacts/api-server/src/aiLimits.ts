/**
 * Single source of truth for free-tier AI daily limits.
 * Keep in sync with artifacts/shepherds-path/src/lib/aiLimits.ts
 */

export const AI_HONEYMOON_DAYS = 14;

/** Shown in pricing, FAQ, and counters */
export const AI_LIMIT_HONEYMOON_DISPLAY = 15;
export const AI_LIMIT_STANDARD_DISPLAY = 12;

/** Hidden grace above display — pastoral hard stop, not advertised */
export const AI_GRACE_BUFFER = 3;

export type AiLimitPhase = "honeymoon" | "standard";

export function getAiDailyLimits(daysWithApp: number): {
  displayLimit: number;
  hardLimit: number;
  phase: AiLimitPhase;
} {
  const displayLimit =
    daysWithApp <= AI_HONEYMOON_DAYS ? AI_LIMIT_HONEYMOON_DISPLAY : AI_LIMIT_STANDARD_DISPLAY;
  return {
    displayLimit,
    hardLimit: displayLimit + AI_GRACE_BUFFER,
    phase: daysWithApp <= AI_HONEYMOON_DAYS ? "honeymoon" : "standard",
  };
}
