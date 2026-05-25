/**
 * Mirror of artifacts/api-server/src/aiLimits.ts — keep numbers identical.
 */

export const AI_HONEYMOON_DAYS = 14;
export const AI_LIMIT_HONEYMOON_DISPLAY = 15;
export const AI_LIMIT_STANDARD_DISPLAY = 12;
export const AI_GRACE_BUFFER = 3;

/** Default for pricing copy when relationship age unknown */
export const AI_FREE_LIMIT = AI_LIMIT_STANDARD_DISPLAY;

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
