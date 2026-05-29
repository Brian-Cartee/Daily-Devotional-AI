import {
  getDaysAway,
  isReturnCardDismissedToday,
  shouldShowFirstStepsCard,
} from "@/lib/engagementCards";
import { getReturnPhase } from "@/lib/returnFlow";
import { getRelationshipAge } from "@/lib/relationship";
import { isLateNight } from "@/lib/nightMode";

const NOTIF_NUDGE_KEY = "sp_notif_nudge_dismissed";
const MILESTONE_DAYS = [30, 60, 100] as const;

export type HomeEngagementSlot =
  | "returning"
  | "first-steps"
  | "milestone"
  | "notif"
  | "return-phase"
  | "talk-link"
  | null;

export function wouldShowReturningUserCard(): boolean {
  if (getDaysAway() < 2) return false;
  return !isReturnCardDismissedToday();
}

export function wouldShowWalkMilestoneCard(daysWithApp: number): boolean {
  const milestoneDay = [...MILESTONE_DAYS].reverse().find((m) => daysWithApp >= m);
  if (!milestoneDay) return false;
  try {
    if (localStorage.getItem(`sp_walk_milestone_${milestoneDay}`)) return false;
  } catch {
    return false;
  }
  const daysSince = daysWithApp - milestoneDay;
  return daysSince <= 3;
}

export function wouldShowNotificationNudgeCard(): boolean {
  try {
    if (localStorage.getItem(NOTIF_NUDGE_KEY)) return false;
  } catch {
    return false;
  }
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission !== "granted";
}

export function wouldShowTheReturnCard(): boolean {
  if (isLateNight()) return false;
  const phase = getReturnPhase(getRelationshipAge());
  return phase.phase !== "morning" && phase.phase !== "latenight";
}

export function wouldShowHomeHeartLink(): boolean {
  try {
    if (localStorage.getItem("sp_guidance_visited")) return false;
    if (getRelationshipAge() >= 3) return false;
  } catch {
    return false;
  }
  return true;
}

/** At most one secondary engagement card on home (plus situational late-night banner) */
export function pickHomeEngagementSlot(daysWithApp: number): HomeEngagementSlot {
  if (isLateNight()) return null;
  if (wouldShowReturningUserCard()) return "returning";
  if (shouldShowFirstStepsCard(daysWithApp)) return "first-steps";
  if (wouldShowWalkMilestoneCard(daysWithApp)) return "milestone";
  /* Reminders: ⋯ menu only — keeps home calm */
  if (wouldShowTheReturnCard()) return "return-phase";
  if (wouldShowHomeHeartLink()) return "talk-link";
  return null;
}

export function hasActiveHomeEngagementSlot(daysWithApp: number): boolean {
  return pickHomeEngagementSlot(daysWithApp) !== null;
}
