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

  // Allow daily entry screen from visit 2 onwards — week-one users need the warm
  // daily welcome just as much as established users. sacredFirstHome (visit 1) is
  // handled by BeginTodaysWalk; from visit 2 the HomeEntryScreen takes over daily.
  const eligibleForEntry = !inNativeApp && homeVisitAfterThreshold > 1;
  const eligibleForOtherLayers = !inNativeApp && !chapelWeekFocus && homeVisitAfterThreshold > 2;

  if (!eligibleForEntry && !eligibleForOtherLayers) return null;

  if (eligibleForOtherLayers && shouldShowWelcomeOverlay(!!forceIntro)) return "welcome";
  if (eligibleForEntry && shouldShowHomeEntry()) return "entry";
  if (eligibleForOtherLayers && shouldShowWalkthrough()) return "walkthrough";

  return null;
}
