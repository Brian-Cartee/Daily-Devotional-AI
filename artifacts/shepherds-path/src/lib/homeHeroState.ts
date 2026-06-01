/** Home hero — returning vs new, Why panel gating */

import { getWelcomeVisitCount, isIntroFlowComplete } from "@/lib/introState";
import { getRelationshipAge } from "@/lib/relationship";
import { isNativeWebViewShell } from "@/lib/platform";

const WHY_DISMISSED_KEY = "sp_why_panel_dismissed";
const WHY_AUTO_SHOWN_KEY = "sp_why_panel_auto_shown";
const WHY_DISMISS_COUNT_KEY = "sp_why_panel_dismiss_count";
const WHY_AUTO_SHOW_COUNT_KEY = "sp_why_panel_auto_show_count";

/** Max automatic pop-ups; after this many closes, never auto-open again. */
export const WHY_PANEL_MAX_AUTO_SHOWS = 2;

function readCount(key: string): number {
  try {
    const n = parseInt(localStorage.getItem(key) || "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeCount(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(Math.max(0, value)));
  } catch {
    /* noop */
  }
}

function bumpCount(key: string): number {
  const next = readCount(key) + 1;
  writeCount(key, next);
  return next;
}

/** One-time migration from boolean flags to numeric caps. */
function migrateWhyPanelStorage(): void {
  try {
    if (localStorage.getItem(WHY_DISMISSED_KEY) === "1" && readCount(WHY_DISMISS_COUNT_KEY) < WHY_PANEL_MAX_AUTO_SHOWS) {
      writeCount(WHY_DISMISS_COUNT_KEY, WHY_PANEL_MAX_AUTO_SHOWS);
    }
    if (localStorage.getItem(WHY_AUTO_SHOWN_KEY) === "1" && readCount(WHY_AUTO_SHOW_COUNT_KEY) === 0) {
      writeCount(WHY_AUTO_SHOW_COUNT_KEY, 1);
    }
  } catch {
    /* noop */
  }
}

export function getWhyPanelDismissCount(): number {
  migrateWhyPanelStorage();
  return readCount(WHY_DISMISS_COUNT_KEY);
}

export function getWhyPanelAutoShowCount(): number {
  migrateWhyPanelStorage();
  return readCount(WHY_AUTO_SHOW_COUNT_KEY);
}

export function hasWhyPanelDismissed(): boolean {
  return getWhyPanelDismissCount() >= WHY_PANEL_MAX_AUTO_SHOWS;
}

export function markWhyPanelDismissed(): void {
  migrateWhyPanelStorage();
  bumpCount(WHY_DISMISS_COUNT_KEY);
  try {
    if (readCount(WHY_DISMISS_COUNT_KEY) >= WHY_PANEL_MAX_AUTO_SHOWS) {
      localStorage.setItem(WHY_DISMISSED_KEY, "1");
    }
  } catch {
    /* noop */
  }
}

export function hasWhyPanelAutoShown(): boolean {
  return getWhyPanelAutoShowCount() >= WHY_PANEL_MAX_AUTO_SHOWS;
}

export function markWhyPanelAutoShown(): void {
  migrateWhyPanelStorage();
  bumpCount(WHY_AUTO_SHOW_COUNT_KEY);
  try {
    if (readCount(WHY_AUTO_SHOW_COUNT_KEY) >= WHY_PANEL_MAX_AUTO_SHOWS) {
      localStorage.setItem(WHY_AUTO_SHOWN_KEY, "1");
    }
  } catch {
    /* noop */
  }
}

/** Auto-open “Why we built this” at most twice; stop after two dismissals. */
export function shouldAutoOpenWhyPanel(): boolean {
  migrateWhyPanelStorage();

  if (getWhyPanelDismissCount() >= WHY_PANEL_MAX_AUTO_SHOWS) return false;
  if (getWhyPanelAutoShowCount() >= WHY_PANEL_MAX_AUTO_SHOWS) return false;

  if (isNativeWebViewShell()) {
    return getWhyPanelAutoShowCount() < WHY_PANEL_MAX_AUTO_SHOWS;
  }

  const visits = getWelcomeVisitCount();
  return visits <= 2 && !isIntroFlowComplete() && getWhyPanelAutoShowCount() < WHY_PANEL_MAX_AUTO_SHOWS;
}

/** Day 2+ — verse before Talk It Through on home */
export function isReturningHomeHero(): boolean {
  return getRelationshipAge() >= 2 || getWelcomeVisitCount() >= 2 || isIntroFlowComplete();
}
