/**
 * Story-moment achievement cards use portrait-cropped photography (3:4, 960×1280).
 * Landscape heroes are cropped for the modal aspect ratio so focal points
 * (road, god-rays, sunrise, peak) stay substantive — not clipped at the edges.
 *
 * Regenerate: scripts/generate-achievement-moment-images.sh
 */

/** Dark cinematic veil — lets photography carry the moment */
export const ACHIEVEMENT_CINEMATIC_OVERLAY =
  "linear-gradient(to bottom, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 42%, rgba(9,3,30,0.88) 100%)";

/** First step — lift the road/light, deepen the copy zone */
export const ACHIEVEMENT_FIRST_STEP_OVERLAY =
  "linear-gradient(to bottom, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.08) 36%, rgba(20,10,4,0.78) 62%, rgba(10,5,2,0.98) 100%)";

/** Thirty days — separate snowy peaks from white type */
export const ACHIEVEMENT_STREAK_30_OVERLAY =
  "linear-gradient(to bottom, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.06) 32%, rgba(9,3,30,0.74) 56%, rgba(5,2,18,0.97) 100%)";

export const STORY_MOMENT_ACHIEVEMENT_IDS = [
  "devotional_first",
  "streak_3",
  "streak_7",
  "streak_30",
] as const;

export type StoryMomentAchievementId = (typeof STORY_MOMENT_ACHIEVEMENT_IDS)[number];

export function isStoryMomentAchievement(id: string): id is StoryMomentAchievementId {
  return (STORY_MOMENT_ACHIEVEMENT_IDS as readonly string[]).includes(id);
}

/** Portrait-optimized (3:4) — pre-cropped from landscape heroes */
export const ACHIEVEMENT_MOMENT_PHOTOS: Record<StoryMomentAchievementId, string> = {
  devotional_first: "/achievement-moment-first.jpg",
  streak_3: "/achievement-moment-day3.jpg",
  streak_7: "/achievement-moment-day7.jpg",
  streak_30: "/achievement-moment-day30.jpg",
};

export const ACHIEVEMENT_MOMENT_OVERLAYS: Record<StoryMomentAchievementId, string> = {
  devotional_first: ACHIEVEMENT_FIRST_STEP_OVERLAY,
  streak_3: ACHIEVEMENT_CINEMATIC_OVERLAY,
  streak_7: ACHIEVEMENT_CINEMATIC_OVERLAY,
  streak_30: ACHIEVEMENT_STREAK_30_OVERLAY,
};

/** Pre-cropped assets — keep centered */
export const ACHIEVEMENT_MOMENT_OBJECT_POSITION: Record<StoryMomentAchievementId, string> = {
  devotional_first: "center center",
  streak_3: "center center",
  streak_7: "center center",
  streak_30: "center center",
};
