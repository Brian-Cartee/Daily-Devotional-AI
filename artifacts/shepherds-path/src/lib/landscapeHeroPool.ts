/** Landscape heroes only — excludes the interior-room placeholder (hero-devotional / hero-devotional-still). */

export const LANDSCAPE_HERO_VARIANTS = [
  "/hero-guidance.jpg",
  "/hero-landing.webp",
  "/hero-devotional-2.webp",
  "/hero-devotional-3.webp",
] as const;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function pickLandscapeHero(seed: string): string {
  const idx = hashSeed(seed) % LANDSCAPE_HERO_VARIANTS.length;
  return LANDSCAPE_HERO_VARIANTS[idx]!;
}
