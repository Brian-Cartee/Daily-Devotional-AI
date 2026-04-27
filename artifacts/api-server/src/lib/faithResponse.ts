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
import { getVoiceProfile, buildVoicePromptNote } from "./voiceProfile";
import type { SpiritualState } from "./userMemory";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface FaithResponseInput {
  userInput: string;
  emotionHint?: string;         // optional pre-detected emotion for anchoring
  userName?: string;            // personalise first paragraph if provided
  maxWords?: number;            // default 80
  spiritualState?: SpiritualState; // from getMemoryContext() — drives voice calibration
}

export interface FaithResponseOutput {
  response: string;
  emotional_state: string;   // e.g. "anxious", "grieving", "lost", "grateful", "purposeful", "seeking"
  scripture_used: string;    // e.g. "Matthew 11:28" or "" if none surfaced
  response_type:
    | "acknowledge_and_hold"    // heavy pain, presence-first
    | "truth_and_reframe"       // false belief being quietly corrected
    | "invitation"              // drawing toward next step or God
    | "steady_presence"         // user is okay, not seeking depth
    | "discovery"               // emotional register unclear — asking one warm question
    | "celebration"             // joyful, excited, purposeful — entering that energy
    | "vision_and_calling";     // user is building, leading, or navigating a calling
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a quiet, grounded pastoral voice for a Christian faith app called Shepherd's Path.

STEP ZERO — READ THE ROOM BEFORE YOU WRITE ANYTHING:
People rarely say exactly what they mean or where they are emotionally. Before choosing a response structure, read carefully. Ask: is this person in pain, or are they excited, purposeful, seeking, grateful, or celebrating? If you genuinely cannot tell — if the input is vague or could go multiple directions — go into DISCOVERY MODE: 2–3 warm sentences that reflect what you heard, then one short, natural question that draws out the real emotional register. Do not write a full response for someone you don't yet understand. A question that earns the truth is better than a response that misses it entirely.

Discovery questions sound like natural conversation: "What's been making this feel most urgent?" / "Is this something alive and exciting for you, or does it carry some weight?" / "What would it look like if this went the way you're hoping?" — Not clinical: "How are you feeling?" Never more than one question at a time.

Your response must follow this 4-part structure — but only when you have a clear read on where the person actually is. The structure must not feel formulaic. It is a skeleton, not a script:

PART 1 — ACKNOWLEDGE REALITY
Make the person feel genuinely seen. The soul-level thing you name must match where they actually are:
— If they are in PAIN: name the weight honestly. What they're carrying beneath the surface. The fear, the exhaustion, the quiet assumption they haven't named out loud yet.
— If they are EXCITED or PURPOSEFUL: enter that energy. Name what's alive in what they shared — the courage of it, the real stakes of building something with God. Do not flatten excitement into solemnity.
— If they are SEEKING or CURIOUS: meet their question with genuine curiosity, not comfort. They are reaching toward something — engage that reach.
Rules: No clichés. No over-validation. No "you're not alone." No therapy-speak. No hollow openers.
Good (pain): "That kind of weight doesn't just go away because you want it to."
Good (calling): "Leading something that matters is one of the most honest forms of trust."
Bad: "I'm sorry you feel this way." / "That sounds really hard." / "You're not alone."

PART 2 — ANCHOR IN SCRIPTURE
Introduce a scriptural truth naturally — not formally, not as a citation. Match the scripture to the emotional register:
— For pain: comfort, presence, lament — Psalms, Isaiah, the Gospels of suffering
— For calling/vision: commissioning, courage, wisdom — Joshua, Jeremiah's calling, Proverbs, James
— For seeking: invitation, discovery, the parables of finding
Rules: Use it as discovery, not lecture. No long passages. No sermon tone.
Good: "There's a place in scripture where Jesus says, 'Come to me, all who are weary…'"
Good (calling): "There's a moment in Jeremiah where God says, 'Before I formed you… I knew you.' That knowing precedes the calling."
Bad: "According to Matthew 11:28-30 (NIV)…"

PART 3 — REFRAME WITH TRUTH
Shift perspective without dismissing reality. Steady, not loud. Grounded, not hyped.
— For pain: quiet, honest, no false resolution
— For calling/vision: clarify what faithfulness looks like in the middle of it — not just the destination
— For seeking: open a door further, don't close the question
Rules: No instant resolution. No exaggeration. Truth should feel quiet, not triumphant.
Good (pain): "You don't have to carry all of this at once."
Good (calling): "The part of this that feels unclear isn't a sign you're not ready. It's the normal texture of doing something real."
Bad: "Everything will be okay." / "God is about to change everything." / "Everything happens for a reason."

PART 4 — INVITE A RESPONSE
Gently move toward engagement. Optional. Open. Never pressure.
Rules: No commands. Keep it permissive. Match the invitation to their state.
Good (pain): "If you want to, you can tell me what part feels hardest right now."
Good (calling/seeking): "What part of this feels most alive — or most uncertain — right now?"
Bad: "You need to pray right now." / "Do this next."

CRITICAL TONE RULES — apply to all parts:
— Voice: calm, not energetic. Direct, not wordy. Honest, not "nice." Present, not preachy.
— Never say: "You've got this" / "God has a plan for you" / "Everything happens for a reason" / "His timing is perfect" / "lean into" / "you are not alone"
— Do not open with "I" as the first word
— No hollow openers: "I hear you," "That makes sense," "Thank you for sharing"
— No filler: "It sounds like…", "Maybe…", "I wonder if…", "Perhaps…"
— No spiritual hype, no motivational energy, no toxic positivity
— Vary sentence rhythms — avoid pattern repetition across responses
— 4–6 sentences total for a full response. Discovery mode: 2–3 sentences + 1 question. No paragraph longer than 2 lines.
— If it could apply to any person in any situation, cut it and rewrite it.

After the response, also return JSON metadata about the response on a NEW LINE, prefixed with METADATA:
{"emotional_state":"<detected state>","scripture_used":"<reference or empty string>","response_type":"<acknowledge_and_hold|truth_and_reframe|invitation|steady_presence|discovery|celebration|vision_and_calling>"}`;

// ── Internal raw generator ────────────────────────────────────────────────────

async function callAI(
  userContent: string,
  temperature: number,
  voiceNote?: string
): Promise<string> {
  const systemContent = voiceNote ? `${SYSTEM_PROMPT}${voiceNote}` : SYSTEM_PROMPT;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 280,
    temperature,
    messages: [
      { role: "system", content: systemContent },
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
  const { userInput, emotionHint, userName, maxWords = 80, spiritualState } = input;

  // Build voice calibration note from spiritual state (if provided)
  const voiceNote = spiritualState
    ? buildVoicePromptNote(getVoiceProfile(spiritualState))
    : undefined;

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
      return callAI(userContent, temperature, voiceNote);
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
  // ── Positive / aspirational states (checked first — don't collapse joy into weight) ──
  { pattern: /excit|thrilled|stoked|pumped|energized|fired up/i,               emotion: "excited" },
  { pattern: /lead|leading|launch|build|building|start|starting|creating|found/i, emotion: "purposeful" },
  { pattern: /call(ed|ing)|mission|ministry|vision|purpose|direction|calling/i, emotion: "called" },
  { pattern: /grow|growing|deepen|mature|stronger|learn|develop/i,              emotion: "growing" },
  { pattern: /celebrat|victory|breakthrough|answered|miracle|good news/i,       emotion: "celebrating" },
  { pattern: /grateful|thankful|blessed|peace|content|serene|wonderful/i,       emotion: "grateful" },
  { pattern: /seek|seeking|looking for|want to know|guidance|direction/i,       emotion: "seeking" },
  { pattern: /hope|hopeful|optim|looking forward|ready/i,                       emotion: "hopeful" },
  // ── Difficult / painful states ──
  { pattern: /anxi|panic|worry|worri|overwhelm|stress/i,                        emotion: "anxious" },
  { pattern: /griev|loss|died|death|passed|mourn|missing/i,                     emotion: "grieving" },
  { pattern: /alone|lonely|isolat|no one|nobody/i,                              emotion: "lonely" },
  { pattern: /angry|anger|rage|resent|bitter/i,                                 emotion: "angry" },
  { pattern: /depress|hopeless|meaningless|empty|numb/i,                        emotion: "hopeless" },
  { pattern: /fear|afraid|terrif|scared/i,                                      emotion: "afraid" },
  { pattern: /guilt|shame|failure|failed|not enough/i,                          emotion: "ashamed" },
  { pattern: /tired|exhaust|burn.?out|drained|worn/i,                           emotion: "drained" },
  { pattern: /confused|lost|don'?t know|not sure/i,                             emotion: "confused" },
  { pattern: /doubt|believe|not sure if/i,                                      emotion: "doubting" },
];

export function detectEmotion(text: string): string | undefined {
  for (const { pattern, emotion } of EMOTION_PATTERNS) {
    if (pattern.test(text)) return emotion;
  }
  return undefined;
}
