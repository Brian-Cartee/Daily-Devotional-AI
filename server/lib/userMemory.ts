/**
 * Shepherd's Path — User Memory System
 *
 * Tracks emotional patterns and spiritual state over time so AI responses
 * feel personally known — not analytically tracked.
 *
 * Core principle: memory should feel like being known, not being monitored.
 *
 * Architecture:
 *   - Patterns stored in `user_memory` table (sessionId-keyed)
 *   - Reads existing journal entries for topic recency context
 *   - Decay: emotion counts lose weight after 7+ days of silence
 *   - Natural language hints surface in AI prompts without feeling clinical
 */

import { storage } from "../storage";
import type { EmotionPattern } from "@shared/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SpiritualState = "just-starting" | "returning" | "growing" | "struggling";
export type EngagementLevel = "new" | "occasional" | "regular" | "deep";

export interface MemoryContext {
  dominantEmotion:   string | null;   // highest-frequency emotion, decay-adjusted
  recentTrend:       string | null;   // pattern shift: "escalating" | "stabilizing" | "varied"
  spiritualState:    SpiritualState;
  engagementLevel:   EngagementLevel;
  recentEmotions:    string[];        // last 5 detected, most recent first
  naturalLanguageHint: string | null; // subtle recognition phrase for AI prompt injection
}

export interface UpdateMemoryInput {
  emotionKey:   string;       // detected emotion (from detectEmotion or explicit)
  daysWithApp:  number;       // for engagement + spiritual classification
  journalCount: number;       // total visible journal entries
  wasGap?:      boolean;      // if true, user had been away (for "returning" state)
}

// ── Emotion decay ─────────────────────────────────────────────────────────────

const DECAY_HALF_LIFE_DAYS = 7;  // pattern halves every 7 days of inactivity

function applyDecay(patterns: Record<string, EmotionPattern>): Record<string, EmotionPattern> {
  const now = Date.now();
  const result: Record<string, EmotionPattern> = {};

  for (const [emotion, pattern] of Object.entries(patterns)) {
    const daysSince = (now - new Date(pattern.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.pow(0.5, daysSince / DECAY_HALF_LIFE_DAYS);
    const decayedCount = pattern.count * decayFactor;

    // Drop emotions that have decayed below 0.25 (practically invisible)
    if (decayedCount >= 0.25) {
      result[emotion] = { count: decayedCount, lastSeen: pattern.lastSeen };
    }
  }

  return result;
}

function dominantEmotion(patterns: Record<string, EmotionPattern>): string | null {
  const decayed = applyDecay(patterns);
  const entries = Object.entries(decayed);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1].count - a[1].count);
  return entries[0][0];
}

// ── Spiritual state classification ────────────────────────────────────────────

function classifySpiritualState(
  daysWithApp: number,
  journalCount: number,
  patterns: Record<string, EmotionPattern>,
  wasGap: boolean
): SpiritualState {
  if (wasGap && daysWithApp > 7) return "returning";

  const decayed = applyDecay(patterns);
  const heavyEmotions = ["doubt", "depression", "shame", "guilt", "crisis-of-faith", "hopelessness"];
  const heavyScore = heavyEmotions.reduce((sum, e) => sum + (decayed[e]?.count ?? 0), 0);

  if (heavyScore >= 2) return "struggling";
  if (daysWithApp <= 3 && journalCount <= 2) return "just-starting";
  if (daysWithApp >= 14 && journalCount >= 5) return "growing";
  return "just-starting";
}

// ── Engagement level ──────────────────────────────────────────────────────────

function classifyEngagement(daysWithApp: number, journalCount: number): EngagementLevel {
  if (daysWithApp >= 30 && journalCount >= 15) return "deep";
  if (daysWithApp >= 14 || journalCount >= 8)  return "regular";
  if (daysWithApp >= 4  || journalCount >= 3)  return "occasional";
  return "new";
}

// ── Recent trend ──────────────────────────────────────────────────────────────

function recentTrend(recentEmotions: string[]): string | null {
  if (recentEmotions.length < 3) return null;

  const heavy = new Set(["anxiety", "fear", "depression", "grief", "shame", "guilt", "doubt", "hopelessness"]);
  const last3 = recentEmotions.slice(0, 3);
  const heavyCount = last3.filter(e => heavy.has(e)).length;

  if (heavyCount === 3) return "escalating";
  if (heavyCount === 0) return "stabilizing";
  return "varied";
}

// ── Natural language hint generator ──────────────────────────────────────────

function buildNaturalLanguageHint(ctx: Omit<MemoryContext, "naturalLanguageHint">): string | null {
  const { dominantEmotion: dominant, spiritualState, engagementLevel, recentEmotions, recentTrend: trend } = ctx;

  // Returning user — always surfaces first
  if (spiritualState === "returning") {
    return "Coming back isn't always easy — but it matters that you did.";
  }

  // Repeated heavy emotion (dominant emotion seen 3+ times, decay-adjusted)
  if (dominant && recentEmotions.slice(0, 5).filter(e => e === dominant).length >= 2) {
    const emotionPhrases: Record<string, string> = {
      anxiety:       "This seems to come up for you more than once.",
      loneliness:    "You've carried this particular weight before.",
      doubt:         "You've been sitting with this question for a while.",
      fear:          "This isn't the first time this has surfaced.",
      grief:         "Grief doesn't follow a schedule — and yours hasn't either.",
      shame:         "You've been here before. You know the way through.",
      guilt:         "You've been holding this longer than you probably should.",
      depression:    "This season has been going on for a while.",
      discouragement:"You've kept showing up even when it's been hard.",
    };
    const phrase = emotionPhrases[dominant];
    if (phrase) return phrase;
  }

  // Growing / consistent user
  if (engagementLevel === "deep" || (engagementLevel === "regular" && spiritualState === "growing")) {
    return "You've been consistent — that's not nothing.";
  }

  // Stabilizing trend
  if (trend === "stabilizing" && engagementLevel !== "new") {
    return "Something seems steadier than it was.";
  }

  // Struggling but still here
  if (spiritualState === "struggling") {
    return "You're still here. That counts for something.";
  }

  // New user — no hint needed; don't try to recognize patterns that don't exist yet
  return null;
}

// ── Core: updateMemory ────────────────────────────────────────────────────────

export async function updateMemory(
  sessionId: string,
  input: UpdateMemoryInput
): Promise<void> {
  const { emotionKey, daysWithApp, journalCount, wasGap = false } = input;
  const now = new Date().toISOString();

  const existing = await storage.getUserMemory(sessionId);
  const rawPatterns: Record<string, EmotionPattern> = (existing?.emotionalPatterns as Record<string, EmotionPattern>) ?? {};

  // Apply decay to existing patterns before updating
  const decayed = applyDecay(rawPatterns);

  // Increment the new emotion (or create it)
  const current = decayed[emotionKey] ?? { count: 0, lastSeen: now };
  decayed[emotionKey] = { count: current.count + 1, lastSeen: now };

  // Update recent emotions list (last 10, most recent first, no consecutive duplicates)
  const prevRecent: string[] = (existing?.recentEmotions as string[]) ?? [];
  const recentEmotions = [emotionKey, ...prevRecent.filter(e => e !== emotionKey)].slice(0, 10);

  const spiritualState = classifySpiritualState(daysWithApp, journalCount, decayed, wasGap);
  const engagementLevel = classifyEngagement(daysWithApp, journalCount);

  await storage.upsertUserMemory(sessionId, {
    emotionalPatterns: decayed,
    spiritualState,
    engagementLevel,
    recentEmotions,
  });
}

// ── Core: getMemoryContext ────────────────────────────────────────────────────

export async function getMemoryContext(sessionId: string): Promise<MemoryContext> {
  const row = await storage.getUserMemory(sessionId);

  if (!row) {
    return {
      dominantEmotion:     null,
      recentTrend:         null,
      spiritualState:      "just-starting",
      engagementLevel:     "new",
      recentEmotions:      [],
      naturalLanguageHint: null,
    };
  }

  const patterns = (row.emotionalPatterns as Record<string, EmotionPattern>) ?? {};
  const recentEmotions = (row.recentEmotions as string[]) ?? [];

  const base: Omit<MemoryContext, "naturalLanguageHint"> = {
    dominantEmotion:  dominantEmotion(patterns),
    recentTrend:      recentTrend(recentEmotions),
    spiritualState:   (row.spiritualState as SpiritualState) ?? "just-starting",
    engagementLevel:  (row.engagementLevel as EngagementLevel) ?? "new",
    recentEmotions:   recentEmotions.slice(0, 5),
  };

  return {
    ...base,
    naturalLanguageHint: buildNaturalLanguageHint(base),
  };
}

// ── Prompt injection helper ───────────────────────────────────────────────────

/**
 * Formats memory context into a subtle AI prompt note.
 * Never reveals data structure — only the natural language hint.
 * Returns empty string if nothing meaningful to surface.
 */
export function buildMemoryPromptNote(ctx: MemoryContext): string {
  const parts: string[] = [];

  if (ctx.naturalLanguageHint) {
    parts.push(
      `\n\nPattern recognition (use subtly, never directly quote or explain — just let it inform tone):`,
      `"${ctx.naturalLanguageHint}"`,
    );
  }

  if (ctx.spiritualState === "struggling") {
    parts.push(`This person is in a harder stretch right now. Presence over insight.`);
  }

  if (ctx.spiritualState === "growing" && ctx.engagementLevel !== "new") {
    parts.push(`This person has been consistent. You can trust them with a slightly deeper angle.`);
  }

  return parts.length > 0 ? parts.join(" ") : "";
}
