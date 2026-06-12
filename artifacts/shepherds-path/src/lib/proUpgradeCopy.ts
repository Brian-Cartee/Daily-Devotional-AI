/**
 * Pastoral Pro / AI-limit copy — invitation, not quota exhaustion.
 * Keep aligned across UpgradeModal, listen limits, and pause screens.
 */

import { getAiDailyLimits } from "@/lib/aiLimits";
import { getRelationshipAge } from "@/lib/relationship";

export const UPGRADE_MODAL_BADGE_DEFAULT = "Go deeper — from $3.75/mo";

export const UPGRADE_MODAL_TITLE_DEFAULT = "You've found your rhythm here.";

export const UPGRADE_MODAL_SUBTITLE_DEFAULT =
  "Scripture and prayer stay free — always. Pro removes limits so you can go as deep as you need, whenever you need it.";

export const UPGRADE_MODAL_CTA_DEFAULT = "Continue deeper →";

export const UPGRADE_MODAL_FOOTER_LINE =
  "Shepherd's Path is built by one person with a mission. Pro keeps the lights on. Thank you.";

export const UPGRADE_TOAST_ACTIVATED_TITLE = "Pro is active";
export const UPGRADE_TOAST_ACTIVATED_BODY = "Thank you — go gently with what's unlocked.";

export function upgradeModalResetLine(): string {
  const { displayLimit, phase } = getAiDailyLimits(getRelationshipAge());
  const pace =
    phase === "honeymoon"
      ? `${displayLimit} guided responses per day during your first two weeks`
      : `${displayLimit} guided responses per day`;
  return `Your free ${pace} return after midnight.`;
}

export const LISTEN_LIMIT_COPY_PASTORAL = {
  devotional:
    "Today's full listen is complete. Pro lets you hear devotionals and longer sessions without counting — Scripture reading stays free.",
  guidance:
    "Hearing the full guidance flow — verse, reflection, and prayer together — is part of Pro. You can still read everything free.",
  snippet: "Today's listen pace is full. Pro includes more audio when you want it.",
  verse: "This passage is long for one listen. Try a shorter section, or read at your pace.",
  text_too_long: "We'll read the first part aloud. The full passage is still here to read.",
  listen_daily_cap: "Today's listen pace is full. Pro adds more audio — optional.",
  pro_required: "Full audio for this section is part of Pro. Reading is always free.",
  session_required: "Please refresh and try listen again.",
} as const;

export const UPGRADE_LISTEN_TITLES = {
  devotional: "Hear today's Word without limits",
  guidance: "Hear this guidance in one flow",
  archive: "Your full sacred archive",
} as const;
