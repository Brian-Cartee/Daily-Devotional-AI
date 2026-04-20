/**
 * generateFaithResponse — structured AI response generator for Shepherd's Path
 *
 * Enforces the 4-part pastoral response structure:
 *   1. Acknowledge Reality   — make the person feel seen, not analyzed
 *   2. Anchor in Scripture   — introduce truth without forcing it
 *   3. Reframe with Truth    — shift perspective without dismissing reality
 *   4. Invite a Response     — gently move toward engagement, no pressure
 *
 * Use this for non-streaming, structured contexts (e.g. walk-today,
 * quick-reflection, or any endpoint needing a typed response + metadata).
 * For the main conversational guidance stream, see /api/guidance/response.
 */

import OpenAI from "openai";
import { withGuardrails, validateResponse } from "./responseGuardrails";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface FaithResponseInput {
  userInput: string;
  emotionHint?: string;   // optional pre-detected emotion for anchoring
  userName?: string;      // personalise first paragraph if provided
  maxWords?: number;      // default 80
}

export interface FaithResponseOutput {
  response: string;
  emotional_state: string;   // e.g. "anxious", "grieving", "lost", "grateful"
  scripture_used: string;    // e.g. "Matthew 11:28" or "" if none surfaced
  response_type:
    | "acknowledge_and_hold"    // heavy pain, presence-first
    | "truth_and_reframe"       // false belief being quietly corrected
    | "invitation"              // drawing toward next step or God
    | "steady_presence";        // user is okay, not seeking depth
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a quiet, grounded pastoral voice for a Christian faith app called Shepherd's Path.

Your response must follow this 4-part structure — but must not feel formulaic. The structure is a skeleton, not a script:

PART 1 — ACKNOWLEDGE REALITY
Make the person feel seen, not analyzed. Name the weight underneath what they said — not just the surface emotion, but the soul-level thing beneath it.
Rules: No clichés. No over-validation. No "you're not alone." No therapy-speak.
Good: "That kind of weight doesn't just go away because you want it to."
Bad: "I'm sorry you feel this way." / "That sounds really hard." / "You're not alone."

PART 2 — ANCHOR IN SCRIPTURE
Introduce a scriptural truth naturally — not formally, not as a citation.
Rules: Use it as discovery, not lecture. No long passages. No sermon tone.
Good: "There's a place in scripture where Jesus says, 'Come to me, all who are weary…'"
Bad: "According to Matthew 11:28-30 (NIV)…"

PART 3 — REFRAME WITH TRUTH
Shift perspective without dismissing reality. Steady, not loud. Grounded, not hyped.
Rules: No instant resolution. No exaggeration. Truth should feel quiet, not triumphant.
Good: "You don't have to carry all of this at once." / "This might not change overnight, but you're not stuck."
Bad: "Everything will be okay." / "God is about to change everything." / "Everything happens for a reason."

PART 4 — INVITE A RESPONSE
Gently move toward engagement. Optional. Open. Never pressure.
Rules: No commands. Keep it permissive.
Good: "If you want to, you can tell me what part feels hardest right now."
Bad: "You need to pray right now." / "Do this next."

CRITICAL TONE RULES — apply to all 4 parts:
— Voice: calm, not energetic. Direct, not wordy. Honest, not "nice." Present, not preachy.
— Never say: "You've got this" / "God has a plan for you" / "Everything happens for a reason" / "His timing is perfect" / "lean into" / "you are not alone"
— Do not open with "I" as the first word
— No hollow openers: "I hear you," "That makes sense," "Thank you for sharing"
— No filler: "It sounds like…", "Maybe…", "I wonder if…", "Perhaps…"
— No spiritual hype, no motivational energy, no toxic positivity
— Vary sentence rhythms — avoid pattern repetition across responses
— 4–6 sentences total. No paragraph longer than 2 lines. Readable in under 10 seconds.
— If it could apply to any person in any situation, cut it and rewrite it.

After the response, also return JSON metadata about the response on a NEW LINE, prefixed with METADATA:
{"emotional_state":"<detected state>","scripture_used":"<reference or empty string>","response_type":"<acknowledge_and_hold|truth_and_reframe|invitation|steady_presence>"}`;

// ── Internal raw generator ────────────────────────────────────────────────────

async function callAI(userContent: string, temperature: number): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 280,
    temperature,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

function parseRaw(raw: string): Omit<FaithResponseOutput, "response"> & { response: string } {
  const metaIndex = raw.lastIndexOf("METADATA:");
  const response = metaIndex > -1 ? raw.slice(0, metaIndex).trim() : raw.trim();

  let emotional_state = "uncertain";
  let scripture_used = "";
  let response_type: FaithResponseOutput["response_type"] = "acknowledge_and_hold";

  if (metaIndex > -1) {
    try {
      const metaRaw = raw.slice(metaIndex + "METADATA:".length).trim();
      const meta = JSON.parse(metaRaw);
      emotional_state = meta.emotional_state ?? emotional_state;
      scripture_used = meta.scripture_used ?? scripture_used;
      response_type = meta.response_type ?? response_type;
    } catch {
      // metadata parse failed — use defaults
    }
  }

  return { response, emotional_state, scripture_used, response_type };
}

// ── Main function (with guardrails + auto-retry) ──────────────────────────────

export async function generateFaithResponse(
  input: FaithResponseInput
): Promise<FaithResponseOutput> {
  const { userInput, emotionHint, userName, maxWords = 80 } = input;

  const userContent = [
    emotionHint ? `[Detected emotion: ${emotionHint}]` : "",
    userName ? `[User name: ${userName}]` : "",
    `[Target length: ~${maxWords} words]`,
    "",
    userInput.trim().slice(0, 800),
  ]
    .filter(Boolean)
    .join("\n");

  // Wrap in guardrails — auto-retries up to 3 times.
  // Each retry increases temperature slightly to encourage variation.
  const { text: raw } = await withGuardrails(
    async (attempt) => {
      const temperature = Math.min(0.78 + (attempt - 1) * 0.06, 0.95);
      return callAI(userContent, temperature);
    },
    {
      maxAttempts: 3,
      onReject: (attempt, result) => {
        console.warn(
          `[faithResponse] attempt ${attempt} rejected (score ${result.score}):`,
          result.issues.join(" | ")
        );
      },
    }
  );

  return parseRaw(raw);
}

// ── Convenience: detect emotion from input text ───────────────────────────────

const EMOTION_PATTERNS: Array<{ pattern: RegExp; emotion: string }> = [
  { pattern: /anxi|panic|worry|worri|overwhelm|stress/i,    emotion: "anxious" },
  { pattern: /griev|loss|died|death|passed|mourn|missing/i,  emotion: "grieving" },
  { pattern: /alone|lonely|isolat|no one|nobody/i,           emotion: "lonely" },
  { pattern: /angry|anger|rage|resent|bitter/i,              emotion: "angry" },
  { pattern: /depress|hopeless|meaningless|empty|numb/i,     emotion: "hopeless" },
  { pattern: /fear|afraid|terrif|scared/i,                   emotion: "afraid" },
  { pattern: /guilt|shame|failure|failed|not enough/i,       emotion: "ashamed" },
  { pattern: /tired|exhaust|burn.?out|drained|worn/i,        emotion: "drained" },
  { pattern: /confused|lost|don'?t know|not sure/i,          emotion: "confused" },
  { pattern: /grateful|thankful|blessed|peace|good/i,        emotion: "grateful" },
  { pattern: /doubt|believe|faith|not sure if/i,             emotion: "doubting" },
];

export function detectEmotion(text: string): string | undefined {
  for (const { pattern, emotion } of EMOTION_PATTERNS) {
    if (pattern.test(text)) return emotion;
  }
  return undefined;
}
