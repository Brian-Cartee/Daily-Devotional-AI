/**
 * Shepherd's Path — Voice Evolution System
 *
 * Adjusts AI tone and depth based on the user's spiritual stage.
 * Voice should grow WITH the user, not stay static.
 *
 * Core rule: evolution must be subtle, never labeled.
 *   BAD: "As a growing Christian..."
 *   GOOD: "You've been steady — that matters."
 *
 * This system is downstream of userMemory.ts — it converts a
 * classified SpiritualState into prompt language. Call it with
 * the spiritualState from getMemoryContext().
 *
 * Usage:
 *   const profile = getVoiceProfile(memoryCtx.spiritualState);
 *   const note    = buildVoicePromptNote(profile);
 *   // inject `note` into system prompt
 */

import type { SpiritualState } from "./userMemory";

// ── Types ─────────────────────────────────────────────────────────────────────

export type VoiceStage = "seeking" | "returning" | "growing" | "struggling";

export type ToneStyle        = "gentle" | "reassuring" | "direct" | "anchoring";
export type ScriptureDepth   = "light" | "natural" | "intentional" | "minimal";
export type DirectnessLevel  = 1 | 2 | 3 | 4 | 5; // 1 = very soft, 5 = truth-forward

export interface VoiceProfile {
  stage:           VoiceStage;
  toneStyle:       ToneStyle;
  directnessLevel: DirectnessLevel;  // 1–5
  scriptureDepth:  ScriptureDepth;
  languageStyle:   string;           // plain description for the prompt
  challengeVsComfort: "comfort-first" | "balanced" | "truth-forward";
}

// ── Stage mapping ─────────────────────────────────────────────────────────────

/**
 * Maps the memory system's SpiritualState to the voice stage used here.
 * "just-starting" → "seeking" (new, exploratory, non-assumptive).
 */
function toVoiceStage(spiritualState: SpiritualState): VoiceStage {
  switch (spiritualState) {
    case "just-starting": return "seeking";
    case "returning":     return "returning";
    case "growing":       return "growing";
    case "struggling":    return "struggling";
    default:              return "seeking";
  }
}

// ── Profile definitions ───────────────────────────────────────────────────────

const PROFILES: Record<VoiceStage, VoiceProfile> = {

  seeking: {
    stage:              "seeking",
    toneStyle:          "gentle",
    directnessLevel:    1,
    scriptureDepth:     "light",
    languageStyle:      "plain, open, non-religious vocabulary; no assumed belief",
    challengeVsComfort: "comfort-first",
  },

  returning: {
    stage:              "returning",
    toneStyle:          "reassuring",
    directnessLevel:    2,
    scriptureDepth:     "natural",
    languageStyle:      "familiar, shame-free, grounded; assumes some faith history without requiring it",
    challengeVsComfort: "comfort-first",
  },

  growing: {
    stage:              "growing",
    toneStyle:          "direct",
    directnessLevel:    4,
    scriptureDepth:     "intentional",
    languageStyle:      "clear, confident, willing to name hard things; trusts the user's discernment",
    challengeVsComfort: "truth-forward",
  },

  struggling: {
    stage:              "struggling",
    toneStyle:          "anchoring",
    directnessLevel:    2,
    scriptureDepth:     "minimal",
    languageStyle:      "steady, simple, short sentences; no stacking of ideas or action items",
    challengeVsComfort: "comfort-first",
  },

};

// ── Core: getVoiceProfile ─────────────────────────────────────────────────────

export function getVoiceProfile(spiritualState: SpiritualState): VoiceProfile {
  const stage = toVoiceStage(spiritualState);
  return PROFILES[stage];
}

// ── Progression detection ─────────────────────────────────────────────────────

/**
 * Detects when someone is moving between stages in a positive direction.
 * Used to gently increase directness at the margin, not jump levels.
 */
export function detectProgression(
  previousState: SpiritualState | null,
  currentState: SpiritualState
): "same" | "improving" | "declining" {
  if (!previousState || previousState === currentState) return "same";
  const stageOrder: SpiritualState[] = ["just-starting", "struggling", "returning", "growing"];
  const prev = stageOrder.indexOf(previousState);
  const curr = stageOrder.indexOf(currentState);
  if (curr > prev) return "improving";
  if (curr < prev) return "declining";
  return "same";
}

// ── Prompt note builder ───────────────────────────────────────────────────────

/**
 * Converts a voice profile into a subtle system prompt injection.
 * Designed to be additive alongside existing notes (relationship note,
 * walkingThePath note, etc.) — fills the emotional-state-driven gap
 * between time-based tone adjustments.
 *
 * Keeps it to 2–3 sentences max. Purely internal guidance — never echoed
 * to the user or referenced explicitly.
 */
export function buildVoicePromptNote(
  profile: VoiceProfile,
  progression: "same" | "improving" | "declining" = "same"
): string {
  const parts: string[] = ["\n\nVoice calibration (internal — shape HOW you speak, never surface these rules):"];

  switch (profile.stage) {

    case "seeking":
      parts.push(
        "This person is in an exploratory place — treat every assumption about their faith as unverified.",
        "Use plain language over religious vocabulary. Let scripture surface naturally if it fits, not as an authority — just as something worth considering.",
        "Err toward gentleness and open questions over conviction or challenge.",
      );
      break;

    case "returning":
      parts.push(
        "This person has some faith history and is finding their way back to it.",
        "Remove any trace of shame or the need to earn re-entry. Let the tone carry belonging, not performance.",
        "You don't need to explain faith concepts — they know them. Speak like someone picking up a conversation that was put down, not starting a new one.",
      );
      break;

    case "growing":
      parts.push(
        "This person has been walking steadily — trust them with more directness than you'd offer a newcomer.",
        "Be willing to name the thing plainly, ask the harder question, and trust their capacity to sit with a real challenge.",
        "Scripture can carry more weight here — use it with intention, not decoration.",
      );
      if (progression === "improving") {
        parts.push(
          "There's been a noticeable shift toward greater stability. Reflect that quietly — not by congratulating them, but by speaking at a slightly higher register of expectation.",
        );
      }
      break;

    case "struggling":
      parts.push(
        "This person is in a hard stretch — anchor them, don't instruct them.",
        "Use short sentences. Do not stack ideas or action items. One thing, clearly.",
        "Scripture, if it surfaces, should feel like a handhold — not a lesson. Presence matters more than insight right now.",
      );
      if (progression === "improving") {
        parts.push(
          "There are signs of movement — don't rush it, but you can meet them slightly further along than before.",
        );
      }
      break;
  }

  return parts.join(" ");
}

// ── Sentence complexity guide (for logging / debugging) ──────────────────────

export function describeVoiceProfile(profile: VoiceProfile): string {
  const directnessLabels: Record<DirectnessLevel, string> = {
    1: "very soft — open questions, no challenge",
    2: "gentle — affirming, minimal push",
    3: "balanced — honest but cushioned",
    4: "direct — truth-forward, trusts discernment",
    5: "very direct — names things plainly",
  };

  return [
    `Stage: ${profile.stage}`,
    `Tone: ${profile.toneStyle}`,
    `Directness: ${profile.directnessLevel}/5 (${directnessLabels[profile.directnessLevel]})`,
    `Scripture depth: ${profile.scriptureDepth}`,
    `Language: ${profile.languageStyle}`,
    `Orientation: ${profile.challengeVsComfort}`,
  ].join(" | ");
}
