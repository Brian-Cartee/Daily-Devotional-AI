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

/**
 * Growth stack — never gate behind Pro (viral loop + trust).
 * Scripture cards, verse links, Calling, achievements, trivia scores, referrals, invite.
 */
export const GROWTH_ALWAYS_FREE = [
  "Share verse image cards (devotional, Calling, Bible, achievements)",
  "Share verse links with OG previews (/v/date)",
  "Referral & invite links",
] as const;

/** What free users actually get today */
export const FREE_FEATURES: FeatureLine[] = [
  {
    icon: Sun,
    text: `${AI_LIMIT_HONEYMOON_DISPLAY} AI responses/day first ${AI_HONEYMOON_DAYS} days, then ${AI_FREE_LIMIT}/day`,
  },
  { icon: BookOpen, text: "Full Bible reading (KJV, WEB, ASV)" },
  { icon: Sun, text: "Daily devotional — scripture, reflection & prayer" },
  { icon: Sparkles, text: "Share today's verse & image cards — always free" },
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
  { icon: Volume2, text: "Unlimited listen — 'Pray this' aloud, 'Hear this guidance', full chains, replays, listen-first" },
  { icon: Zap, text: "Unlimited AI — no daily cap" },
  { icon: History, text: "Full sacred archive — search & every saved devotional day" },
  { icon: Flame, text: "Streak protection — one grace day per month" },
  { icon: Mail, text: "Weekly Spiritual Weather email (Sunday, when Pro email is linked)" },
  { icon: BookMarked, text: "Unlimited AI sermon notes & recordings" },
  { icon: Heart, text: "Personal Prayer Portrait — a prayer crafted from what's on your heart" },
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

/**
 * Modal moments — 3 emotionally specific outcomes shown in the upgrade modal.
 * Short. Visceral. What Pro feels like in the moment you need it.
 */
export const PRO_MODAL_MOMENTS: { icon: LucideIcon; moment: string; what: string }[] = [
  {
    icon: Zap,
    moment: "You're mid-prayer and something breaks open.",
    what: "Pro never cuts you off. Every reflection, every question, every prayer goes as deep as it needs to.",
  },
  {
    icon: Volume2,
    moment: "You want to close your eyes and just listen.",
    what: "Pro unlocks 'Pray this' spoken aloud, 'Hear this guidance', and the full unbroken chain — verse, reflection, and prayer together. No limits.",
  },
  {
    icon: MapPin,
    moment: "You're carrying something heavy and don't know where to start.",
    what: "Talk It Through builds a guided journey from your situation — grief, anxiety, loneliness, doubt. Just for you, right now.",
  },
];

export const PRO_SCENARIOS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Zap,
    title: "You're mid-prayer. Don't stop.",
    body: "Free includes a generous daily allowance. But when something opens up in you, Pro removes every limit so that moment can go as far as God takes it.",
  },
  {
    icon: Volume2,
    title: "Close your eyes. Just listen.",
    body: "Unlimited audio means you can hear the verse, the encouragement, and the prayer as one unbroken experience — every day, without counting.",
  },
  {
    icon: MapPin,
    title: "Something heavy landed on you today.",
    body: "Talk It Through builds a 7-day guided journey shaped from your exact situation — grief, anxiety, loneliness, or doubt. Not generic. Yours.",
  },
  {
    icon: History,
    title: "That prayer from six months ago. Find it.",
    body: `Your whole walk is searchable — not just the last ${FREE_ARCHIVE_VISIBLE_DAYS} days. Every prayer, every reflection, every day God showed up. All of it.`,
  },
  {
    icon: Flame,
    title: "Life happened. Your streak didn't have to end.",
    body: "One grace day per month means missing a day doesn't erase what you've built. Your walk continues. Your streak continues.",
  },
];

export const PRO_EMAIL_FAQ_NOTE =
  "The weekly Spiritual Weather email sends on Sundays to your Pro billing email once you've subscribed or restored Pro on this device (that links your walk for personalization).";
