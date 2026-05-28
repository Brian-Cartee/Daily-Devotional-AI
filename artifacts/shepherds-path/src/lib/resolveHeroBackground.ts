import { loadDailyArtImage } from "@/lib/dailyArtImageLoad";
import { preloadImage } from "@/lib/preloadImage";
import { getDevotionalHeroImage } from "@/lib/devotionalHeroImage";
import { getGuidanceHeroImage } from "@/lib/guidanceHeroImage";

/** Verse art → today's daily-art → bundled landscape (never the interior-room placeholder). */
export async function resolveDevotionalHeroBackground(
  verseDate: string | undefined,
  verseArtUrl: string | null | undefined,
): Promise<string> {
  if (verseArtUrl) {
    const ok = await preloadImage(verseArtUrl, 12_000);
    if (ok) return verseArtUrl;
  }

  const daily = await loadDailyArtImage(null, { allowBundledPlaceholder: true });
  if (daily) return daily;

  return getDevotionalHeroImage(verseDate);
}

/** Same priority as devotional: verse art → daily stock art → landscape bundled heroes. */
export async function resolveGuidanceHeroBackground(
  verseDate?: string,
  verseArtUrl?: string | null,
): Promise<string> {
  if (verseArtUrl) {
    const ok = await preloadImage(verseArtUrl, 12_000);
    if (ok) return verseArtUrl;
  }

  const daily = await loadDailyArtImage(null, { allowBundledPlaceholder: false });
  if (daily) return daily;

  const bundled = getGuidanceHeroImage();
  const ok = await preloadImage(bundled, 12_000);
  if (ok) return bundled;

  return getDevotionalHeroImage(verseDate);
}
