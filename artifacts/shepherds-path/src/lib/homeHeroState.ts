/** Home hero — returning vs new, Why panel gating */

import { getWelcomeVisitCount, isIntroFlowComplete } from "@/lib/introState";
import { getRelationshipAge } from "@/lib/relationship";

const WHY_DISMISSED_KEY = "sp_why_panel_dismissed";
const WHY_AUTO_SHOWN_KEY = "sp_why_panel_auto_shown";

export function hasWhyPanelDismissed(): boolean {
  try {
    return localStorage.getItem(WHY_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWhyPanelDismissed(): void {
  try {
    localStorage.setItem(WHY_DISMISSED_KEY, "1");
  } catch {
    /* noop */
  }
}

export function hasWhyPanelAutoShown(): boolean {
  try {
    return localStorage.getItem(WHY_AUTO_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWhyPanelAutoShown(): void {
  try {
    localStorage.setItem(WHY_AUTO_SHOWN_KEY, "1");
  } catch {
    /* noop */
  }
}

/** Open Why panel once after first real home landing */
export function shouldAutoOpenWhyPanel(): boolean {
  if (hasWhyPanelDismissed() || hasWhyPanelAutoShown()) return false;
  const visits = getWelcomeVisitCount();
  return visits <= 2 || !isIntroFlowComplete();
}

/** Day 2+ — verse before Talk It Through on home */
export function isReturningHomeHero(): boolean {
  return getRelationshipAge() >= 2 || getWelcomeVisitCount() >= 2 || isIntroFlowComplete();
}
