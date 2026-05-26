/** Rotating bundled hero for the devotional page — never reuses Take a Moment / daily-art. */

const DEVOTIONAL_HERO_VARIANTS = [
  "/hero-devotional.webp",
  "/hero-devotional-2.webp",
  "/hero-devotional-3.webp",
  "/hero-devotional-still.webp",
] as const;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Stable per-day hero for Today's Word when verse-specific art is not ready yet. */
export function getDevotionalHeroImage(verseDate?: string): string {
  const day =
    verseDate ||
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const idx = hashSeed(`sp-devotional-hero:${day}`) % DEVOTIONAL_HERO_VARIANTS.length;
  return DEVOTIONAL_HERO_VARIANTS[idx]!;
}
