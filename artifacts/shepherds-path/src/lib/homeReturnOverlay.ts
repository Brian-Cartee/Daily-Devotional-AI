/** At most one return overlay per home visit (splash, welcome, entry, walkthrough). */

import { shouldShowHomeEntry } from "@/components/HomeEntryScreen";
import { shouldShowWalkthrough } from "@/components/GuidedWalkthrough";
import { shouldShowSplash, shouldShowWelcomeOverlay } from "@/lib/introState";

export type HomeReturnOverlay = "splash" | "welcome" | "entry" | "walkthrough" | null;

export function pickHomeReturnOverlay(options: {
  blockHomeOverlays: boolean;
  inNativeApp: boolean;
  homeVisitAfterThreshold: number;
  chapelWeekFocus: boolean;
  forceIntro?: boolean;
}): HomeReturnOverlay {
  const { blockHomeOverlays, inNativeApp, homeVisitAfterThreshold, chapelWeekFocus, forceIntro } =
    options;

  if (blockHomeOverlays) return null;

  if (forceIntro && !inNativeApp) return "welcome";

  if (shouldShowSplash()) return "splash";

  const eligibleForReturnLayers =
    !inNativeApp && !chapelWeekFocus && homeVisitAfterThreshold > 2;

  if (!eligibleForReturnLayers) return null;

  if (shouldShowWelcomeOverlay(!!forceIntro)) return "welcome";
  if (shouldShowHomeEntry()) return "entry";
  if (shouldShowWalkthrough()) return "walkthrough";

  return null;
}
