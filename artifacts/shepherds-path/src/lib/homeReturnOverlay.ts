/** At most one return overlay per home visit (splash, welcome, entry, walkthrough). */

import { shouldShowHomeEntry } from "@/components/HomeEntryScreen";
import { shouldShowWalkthrough } from "@/components/GuidedWalkthrough";
import { shouldShowSplash, shouldShowWelcomeOverlay, isReturningHome } from "@/lib/introState";

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

  // Never show an overlay when navigating back within the same session (e.g. tapping
  // the Home button from inside the app). markReturningHome() sets this flag — if it's
  // set, the user is navigating internally, not doing a cold launch.
  // For native WebView: visibilitychange handles this — don't block on mount.
  if (!inNativeApp && isReturningHome()) return null;

  // sacredFirstHome (first-ever home visit post-onboarding) blocks everything —
  // BeginTodaysWalk handles that moment. homeVisitAfterThreshold === 1 is that visit.
  // inNativeApp alone does NOT block the daily entry screen — native users need it too.
  const isSacredFirstHome = blockHomeOverlays && !inNativeApp;
  if (isSacredFirstHome) return null;

  if (forceIntro && !inNativeApp) return "welcome";

  if (!inNativeApp && shouldShowSplash()) return "splash";

  // Daily entry screen eligible from visit 2 onwards, including native app shell.
  // homeVisitAfterThreshold > 1 naturally guards the first home visit.
  const eligibleForEntry = homeVisitAfterThreshold > 1;
  const eligibleForOtherLayers = !inNativeApp && !chapelWeekFocus && homeVisitAfterThreshold > 2;

  if (!eligibleForEntry && !eligibleForOtherLayers) return null;

  if (eligibleForOtherLayers && shouldShowWelcomeOverlay(!!forceIntro)) return "welcome";
  if (eligibleForEntry && shouldShowHomeEntry(inNativeApp)) return "entry";
  if (eligibleForOtherLayers && shouldShowWalkthrough()) return "walkthrough";

  return null;
}
