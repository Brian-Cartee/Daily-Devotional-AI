/** Intentional delays for sacred presence flows (Sigh Room, Scripture That Waits). */

export type PauseKind = "breath" | "listening" | "scripture_search" | "stillness";

export const PAUSE_MS: Record<PauseKind, { min: number; max: number }> = {
  breath: { min: 3000, max: 5000 },
  listening: { min: 4000, max: 6000 },
  scripture_search: { min: 6000, max: 15000 },
  stillness: { min: 8000, max: 90000 },
};

export function scriptureSearchDelayMs(charCount: number): number {
  const raw = 6000 + charCount * 35;
  return Math.min(PAUSE_MS.scripture_search.max, Math.max(PAUSE_MS.scripture_search.min, raw));
}

export function listeningDelayMs(): number {
  return PAUSE_MS.listening.min + Math.floor(Math.random() * (PAUSE_MS.listening.max - PAUSE_MS.listening.min));
}

export function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
