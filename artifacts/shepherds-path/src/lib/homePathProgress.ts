import { hasVisitedCloset } from "@/lib/prayerCloset";
import { getDaysAway } from "@/lib/engagementCards";

const PATH_CARD_DISMISSED_KEY = "sp_your_path_card_dismissed";
const JOURNAL_PATH_KEY = "sp_path_journal_visited";

export type HomePathProgress = {
  devotional: boolean;
  quietOrTalk: boolean;
  journal: boolean;
};

export function markJournalPathVisited(): void {
  try {
    localStorage.setItem(JOURNAL_PATH_KEY, "1");
  } catch {
    /* noop */
  }
}

export function getPathProgress(devotionalVisitCount: number): HomePathProgress {
  let talk = false;
  let journal = false;
  try {
    talk = !!localStorage.getItem("sp_guidance_visited");
    journal = !!localStorage.getItem(JOURNAL_PATH_KEY);
  } catch {
    /* noop */
  }
  return {
    devotional: devotionalVisitCount > 0,
    quietOrTalk: hasVisitedCloset() || talk,
    journal,
  };
}

export function dismissYourPathCard(): void {
  try {
    localStorage.setItem(PATH_CARD_DISMISSED_KEY, "1");
  } catch {
    /* noop */
  }
}

/** Guided path for days 1–6 — one clear on-ramp before the card zoo */
export function shouldShowYourPathCard(
  daysWithApp: number,
  devotionalVisitCount: number,
): boolean {
  try {
    if (localStorage.getItem(PATH_CARD_DISMISSED_KEY)) return false;
  } catch {
    return false;
  }
  if (getDaysAway() >= 2) return false;
  if (daysWithApp > 6) return false;

  const progress = getPathProgress(devotionalVisitCount);
  if (progress.devotional && progress.quietOrTalk && progress.journal) return false;
  return true;
}
