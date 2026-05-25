/**
 * Single source of truth for Free vs Pro marketing copy.
 * Keep aligned with what is actually shipped — see PRIORITY #6 trust audit.
 */
import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  BookOpen,
  Compass,
  FileText,
  Flame,
  Gift,
  Heart,
  History,
  Mail,
  MapPin,
  ScrollText,
  Sparkles,
  Sun,
  Volume2,
  Zap,
} from "lucide-react";
import {
  AI_FREE_LIMIT,
  AI_HONEYMOON_DAYS,
  AI_LIMIT_HONEYMOON_DISPLAY,
} from "@/lib/aiLimits";
import { FREE_ARCHIVE_VISIBLE_DAYS } from "@/lib/journalArchive";
import { REFERRAL_DAYS_PER_FRIEND, REFERRAL_WELCOME_DAYS } from "@/lib/referralConfig";

export type FeatureLine = { icon: LucideIcon; text: string };

/** What free users actually get today */
export const FREE_FEATURES: FeatureLine[] = [
  {
    icon: Sun,
    text: `${AI_LIMIT_HONEYMOON_DISPLAY} AI responses/day first ${AI_HONEYMOON_DAYS} days, then ${AI_FREE_LIMIT}/day`,
  },
  { icon: BookOpen, text: "Full Bible reading (KJV, WEB, ASV)" },
  { icon: Sun, text: "Daily devotional — scripture, reflection & prayer" },
  { icon: Volume2, text: "One full devotional listen/day + today's verse anytime" },
  { icon: Compass, text: "Core Bible journeys & reading plans" },
  {
    icon: ScrollText,
    text: `Prayer journal — last ${FREE_ARCHIVE_VISIBLE_DAYS} days visible`,
  },
  { icon: Flame, text: "Daily streak tracking" },
  { icon: BookMarked, text: "1 AI sermon recording per month" },
];

/** Only what Pro adds — do not repeat free baseline items here */
export const PRO_FEATURES: FeatureLine[] = [
  { icon: Volume2, text: "Unlimited listen — devotional, Guidance chains, replays, listen-first" },
  { icon: Zap, text: "Unlimited AI — no daily cap" },
  { icon: History, text: "Full sacred archive — search & every saved devotional day" },
  { icon: Flame, text: "Streak protection — one grace day per month" },
  { icon: Mail, text: "Weekly Spiritual Weather email (Sunday, when Pro email is linked)" },
  { icon: BookMarked, text: "Unlimited AI sermon notes & recordings" },
  { icon: Heart, text: "Personal Prayer Portrait" },
  { icon: FileText, text: "Print / save full journal (browser PDF)" },
  { icon: Sparkles, text: "Deeper in-app Spiritual Weather + season letter" },
  { icon: MapPin, text: "7-day Guided Pathways — grief, anxiety, loneliness, doubt & more" },
  { icon: Compass, text: "Custom journey shaped from your situation (Talk It Through)" },
  {
    icon: Gift,
    text: `Invite friends — they get ${REFERRAL_WELCOME_DAYS} days Pro; you earn ${REFERRAL_DAYS_PER_FRIEND} bonus days each`,
  },
];

export const PRO_FEATURE_BULLETS = PRO_FEATURES.map((f) => f.text);

export const PRO_SCENARIOS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Zap,
    title: "Never cut off mid-reflection",
    body: "Free includes a generous daily AI allowance. Pro removes the cap so every question, prayer, and reflection can go as deep as you need.",
  },
  {
    icon: History,
    title: "Your whole walk, remembered",
    body: `Search every prayer and reflection you've saved — not just the last ${FREE_ARCHIVE_VISIBLE_DAYS} days. Revisit devotional days when life was heavy or hopeful.`,
  },
  {
    icon: Flame,
    title: "Streak protection built in",
    body: "Miss one day of life, not your whole walk. Pro gives you one grace day each month so your streak can continue when life gets in the way once.",
  },
];

export const PRO_EMAIL_FAQ_NOTE =
  "The weekly Spiritual Weather email sends on Sundays to your Pro billing email once you've subscribed or restored Pro on this device (that links your walk for personalization).";
