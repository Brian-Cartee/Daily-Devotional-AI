import { pickLandscapeHero } from "@/lib/landscapeHeroPool";

export function getGuidanceHeroImage(): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const base = pickLandscapeHero(`sp-guidance-hero:${day}`);
  return `${base}?v=guidance-hero-5&d=${day}`;
}

/** Ordered fallbacks when the primary guidance hero fails to load. */
export function getGuidanceHeroFallbacks(primary: string): string[] {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const bust = `v=guidance-hero-5&d=${day}`;
  const all = [
    primary,
    `/hero-guidance.jpg?${bust}`,
    `/hero-landing.webp?${bust}`,
    `/hero-devotional-2.webp?${bust}`,
    `/hero-devotional-3.webp?${bust}`,
  ];
  return [...new Set(all)];
}
