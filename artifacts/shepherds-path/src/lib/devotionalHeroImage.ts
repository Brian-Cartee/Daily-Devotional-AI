import { pickLandscapeHero } from "@/lib/landscapeHeroPool";

/** Stable per-day hero for Today's Word when verse-specific art is not ready yet. */
export function getDevotionalHeroImage(verseDate?: string): string {
  const day =
    verseDate ||
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  return pickLandscapeHero(`sp-devotional-hero:${day}`);
}
