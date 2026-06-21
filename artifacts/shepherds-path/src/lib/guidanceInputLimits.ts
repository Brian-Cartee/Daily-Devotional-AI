/** Matches /api/guidance/* server validation. */
export const GUIDANCE_INPUT_MAX = 2000;
/** Minimum meaningful share for typed fallback. */
export const GUIDANCE_INPUT_MIN = 8;

export function clampGuidanceInput(text: string): string {
  return text.trim().slice(0, GUIDANCE_INPUT_MAX);
}

export function isGuidanceInputValid(text: string): boolean {
  const t = text.trim();
  return t.length >= GUIDANCE_INPUT_MIN && t.length <= GUIDANCE_INPUT_MAX;
}
