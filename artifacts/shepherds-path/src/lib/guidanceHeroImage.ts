/** Guidance hero backgrounds — separate from Take a Moment / daily-art. */

const GUIDANCE_HERO_VARIANTS = [
  "/hero-devotional-still.webp",
  "/hero-devotional-3.webp",
  "/hero-devotional-2.webp",
] as const;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getGuidanceHeroImage(): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const idx = hashSeed(`sp-guidance-hero:${day}`) % GUIDANCE_HERO_VARIANTS.length;
  const base = GUIDANCE_HERO_VARIANTS[idx]!;
  return `${base}?v=guidance-hero-4&d=${day}`;
}
