/**
 * Conversation state tracking for Philip's multi-turn conversations.
 *
 * After each exchange, we generate a compact structured state object
 * and inject it into the next system prompt. This gives Philip an
 * explicit map of what has been heard, asked, and explored — so he
 * can move forward instead of recycling.
 */

// OpenAI client is passed in to avoid circular import issues with bundler module resolution
type OpenAIClient = {
  chat: {
    completions: {
      create(params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        max_tokens: number;
        temperature: number;
        response_format: { type: string };
      }): Promise<{ choices: Array<{ message: { content: string | null } }> }>;
    };
  };
};

export interface ConversationState {
  core_issue: string;
  facts_learned: string[];
  areas_explored: string[];
  areas_unexplored: string[];
  questions_asked: string[];
  metaphors_used: string[];
  user_exact_words: string[];  // vivid phrases the user themselves used
  conversation_closing: boolean;
}

const CLOSING_PHRASES = [
  "i'm done", "im done", "i'm out", "im out",
  "goodbye", "good bye", "bye", "goodnight", "good night",
  "i have to go", "i gotta go", "i need to go",
  "thanks", "thank you", "that's enough", "thats enough",
  "i think that's all", "i think thats all",
  "i'm leaving", "im leaving",
  "never mind", "nevermind", "forget it",
  "you're not listening", "youre not listening",
  "you keep saying the same thing",
  "i already told you",
  "you're repeating", "youre repeating",
];

export function detectConversationClosing(userMessage: string): boolean {
  const lower = userMessage.toLowerCase().trim();
  return CLOSING_PHRASES.some(phrase => lower.includes(phrase));
}

const STATE_SYSTEM = `You track conversation state for a pastoral AI. Given the full conversation so far, extract a JSON state object.

Be precise and minimal. This state is injected into the next AI prompt to prevent repetition.

CRITICAL — PRONOUNS: Track the exact name and pronouns the user uses for any person they mention. If they said "my husband John" — record "John (he/him)" in facts_learned. If they said "my wife Sarah" — record "Sarah (she/her)". If gender is unclear, record only the name. Never assume gender. Record exactly what the user said.

Return ONLY valid JSON, no markdown, no extra text.`;

export async function generateConversationState(
  openai: OpenAIClient,
  situation: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  existingState?: ConversationState,
): Promise<ConversationState> {
  const transcript = messages.map(m =>
    `${m.role === "user" ? "USER" : "PHILIP"}: ${m.content}`
  ).join("\n\n");

  const priorContext = existingState
    ? `\n\nPRIOR STATE (update this, don't start from scratch):\n${JSON.stringify(existingState, null, 2)}`
    : "";

  const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content ?? "";

  const prompt = `Original situation: "${situation}"

Conversation so far:
${transcript}
${priorContext}

Extract the current conversation state:
{
  "core_issue": "one phrase — the central pain or question",
  "facts_learned": ["specific facts the user revealed about themselves or their situation"],
  "areas_explored": ["topics Philip has already asked about or the user has already addressed"],
  "areas_unexplored": ["aspects of the situation Philip has NOT yet asked about — relationships, faith, sleep, loss, work, body, time, specific people, etc."],
  "questions_asked": ["the exact question Philip asked in each of his responses"],
  "metaphors_used": ["every metaphor or image Philip introduced — grayscale, the door, replaying it, fog, etc."],
  "user_exact_words": ["vivid or specific phrases the USER chose — not Philip's words, theirs"],
  "conversation_closing": false
}

For conversation_closing: set true if the most recent user message indicates they are ending the conversation (goodbye, I'm done, thanks, you're not listening, etc.).`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: STATE_SYSTEM },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as ConversationState;

    // Override closing detection with hard logic
    if (detectConversationClosing(lastUserMessage)) {
      parsed.conversation_closing = true;
    }

    return parsed;
  } catch {
    // Fallback: return minimal state derived from closing detection only
    return {
      core_issue: situation.slice(0, 80),
      facts_learned: [],
      areas_explored: [],
      areas_unexplored: [],
      questions_asked: [],
      metaphors_used: [],
      user_exact_words: [],
      conversation_closing: detectConversationClosing(lastUserMessage),
    };
  }
}

export function buildStatePromptBlock(state: ConversationState): string {
  if (state.conversation_closing) {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION MODE: CLOSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The person is leaving. Speak a brief benediction — 2 sentences, no question, no "?".
— Do NOT recap or summarize the conversation.
— Acknowledge what they brought without listing it back.
— Leave one small thing they can carry: a permission, a truth, a thread.
— Philip's closing register: "What you brought here today mattered." / "Go gently. This door stays open." / "You didn't sit with this alone."
— Never begin with "I." Never use "journey", "healing", "God bless you", "Take care."
— Under 35 words. Let them go with something real.`;
  }

  const metaphorsBan = state.metaphors_used.length > 0
    ? `\nBANNED METAPHORS (Philip already used these — use none of them again): ${state.metaphors_used.join(", ")}`
    : "";

  const questionsBan = state.questions_asked.length > 0
    ? `\nQUESTIONS ALREADY ASKED (do not repeat or rephrase any of these):\n${state.questions_asked.map((q, i) => `  [${i + 1}] ${q}`).join("\n")}`
    : "";

  const explored = state.areas_explored.length > 0
    ? `\nALREADY EXPLORED (do not revisit): ${state.areas_explored.join(", ")}`
    : "";

  const unexplored = state.areas_unexplored.length > 0
    ? `\nNOT YET EXPLORED (go here next): ${state.areas_unexplored.join(", ")}`
    : "";

  const userWords = state.user_exact_words.length > 0
    ? `\nUSER'S OWN WORDS (use these, not your own images): ${state.user_exact_words.join(", ")}`
    : "";

  const facts = state.facts_learned.length > 0
    ? `\nKNOWN FACTS: ${state.facts_learned.join("; ")}`
    : "";

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Core issue: ${state.core_issue}${facts}${explored}${unexplored}${questionsBan}${metaphorsBan}${userWords}

DEPTH BEFORE BREADTH: If the user just made a raw confession, disclosed something vulnerable, or asked Philip a direct question — go DEEPER into that before moving to new territory.
Otherwise: explore something from "NOT YET EXPLORED."
Your question must not be in "QUESTIONS ALREADY ASKED." Use none of the banned metaphors.`;
}
