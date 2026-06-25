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

export type PhilipMove =
  | "plain_question"
  | "named_fact"
  | "tension"
  | "sit"
  | "reflect_back"
  | "skip";

export type AckRegister = "plain" | "literary" | null;

export interface ConversationState {
  core_issue: string;
  facts_learned: string[];
  areas_explored: string[];
  areas_unexplored: string[];
  questions_asked: string[];
  metaphors_used: string[];
  user_exact_words: string[];  // vivid phrases the user themselves used
  conversation_closing: boolean;
  last_move?: string;
  ack_register?: AckRegister;
  literary_cooldown_remaining?: number;
  moves_used?: string[];
  philip_openers_used?: string[];
}

const LITERARY_ACK_PATTERNS = [
  /\b\w+\s+became\s+\w+/i,
  /\bis its own kind of\b/i,
  /\bwhere\s+.+\s+used to\b/i,
  /\blives in the\b/i,
  /\bkind of violence\b/i,
  /\bkind of grief\b/i,
  /\bonly weapon\b/i,
  /\bdidn't know to save\b/i,
  /\bcarrying something\b/i,
  /\bhaven'?t fully named\b/i,
  /\bdoesn'?t let go\b/i,
  /\bworth sitting with\b/i,
  /\bsomething (you |they )?haven'?t\b/i,
  /\bbeneath (the |your )?words\b/i,
  /\bthe one that doesn'?t\b/i,
  /\bdoesn'?t just live in the mind\b/i,
  /\bsettles in the body\b/i,
  /\bdon'?t go away on their own\b/i,
  /\bquestions don'?t go away\b/i,
];

/** Cold-reading / mystical reframe — performs wisdom instead of listening. */
export function containsMysticalColdRead(text: string): boolean {
  return LITERARY_ACK_PATTERNS.some(p => p.test(text));
}

/** Detect whether Philip's last preamble was aphoristic vs grounded in facts. */
export function detectAckRegister(philipLastResponse: string): AckRegister {
  const text = philipLastResponse.trim();
  if (!text) return null;

  const qIndex = text.indexOf("?");
  const preamble = qIndex >= 0 ? text.slice(0, qIndex).trim() : text;
  if (!preamble) return "plain";

  if (LITERARY_ACK_PATTERNS.some(p => p.test(preamble))) return "literary";

  // Aphorism structure without naming a specific person, date, or object from the scene
  const hasProperNoun = /\b[A-Z][a-z]{2,}\b/.test(preamble);
  const hasNumber = /\b\d+\b/.test(preamble);
  const hasConcreteObject = /\b(coffee|morning|night|phone|bed|kitchen|hospital|church|work|home)\b/i.test(preamble);
  if (!hasProperNoun && !hasNumber && !hasConcreteObject && preamble.split(/\s+/).length >= 8) {
    return "literary";
  }

  return "plain";
}

/** Infer move type from Philip's last response when state extraction misses it. */
export function inferLastMove(philipLastResponse: string): string | undefined {
  const text = philipLastResponse.trim();
  if (!text) return undefined;

  if (!text.includes("?")) return "sit";

  const qIndex = text.indexOf("?");
  const beforeQ = text.slice(0, qIndex).trim();
  const wordCount = text.split(/\s+/).length;

  if (!beforeQ || beforeQ.length < 4) return wordCount <= 12 ? "skip" : "plain_question";
  if (wordCount <= 10) return "skip";

  const qStarts = /^\s*[^.!?]*\?/.test(text);
  if (qStarts && beforeQ.length < 20) return "named_fact";

  // Short preamble mirroring their phrase before the question
  if (/^["'""]/.test(beforeQ)) return "reflect_back";
  if (beforeQ.split(/\s+/).length <= 5 && !/\b(weeks?|months?|years?|used to|every|morning|night)\b/i.test(beforeQ)) {
    return "reflect_back";
  }

  return "named_fact";
}

const PASSIVE_SI_PATTERNS = [
  /\beasier not to wake up\b/i,
  /\bjust not waking up\b/i,
  /\bdon'?t want to wake up\b/i,
  /\bwish i (didn'?t|wouldn'?t) wake\b/i,
  /\bhope i don'?t wake\b/i,
  /\bwouldn'?t mind (not )?waking up\b/i,
  /\bdon'?t care if i wake\b/i,
  /\bnot sure i want to wake\b/i,
  /\beasier if i (didn'?t|never) wake\b/i,
];

/** Passive suicidal ideation — sit with them; do not run quote-then-ask. */
export function detectPassiveSuicidalIdeation(text: string): boolean {
  return PASSIVE_SI_PATTERNS.some(p => p.test(text));
}

/** Build move history from Philip's prior responses. */
export function getMovesUsed(philipMessages: Array<{ content: string }>): string[] {
  return philipMessages.map(m => inferLastMove(m.content) ?? "named_fact");
}

/** True when the latest user message adds a proper noun, number, or fresh detail. */
export function userMessageHasFreshDetail(
  lastUserMsg: string,
  priorUserMsgs: string[],
): boolean {
  const prior = priorUserMsgs.join(" ").toLowerCase();
  const nouns = lastUserMsg.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  if (nouns.some(n => !prior.includes(n.toLowerCase()))) return true;
  const nums = lastUserMsg.match(/\b\d+\b/g) ?? [];
  if (nums.some(n => !prior.includes(n))) return true;
  const freshWords = lastUserMsg
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 5 && !prior.includes(w));
  return freshWords.length >= 2;
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/** Word overlap between Philip's preamble and the user's last message (0–1). */
export function echoOverlapRatio(philipText: string, userText: string): number {
  const qIdx = philipText.indexOf("?");
  const preamble = (qIdx >= 0 ? philipText.slice(0, qIdx) : philipText).trim();
  const pWords = new Set(normalizeWords(preamble));
  const uWords = normalizeWords(userText);
  if (uWords.length === 0 || pWords.size === 0) return 0;
  let match = 0;
  for (const w of uWords) if (pWords.has(w)) match++;
  return match / Math.min(uWords.length, pWords.size);
}

/** True when Philip mostly mirrors the user without adding observation. */
export function isPureEcho(philipText: string, userText: string, threshold = 0.65): boolean {
  if (!philipText.trim() || !userText.trim()) return false;

  if (echoOverlapRatio(philipText, userText) >= threshold) return true;

  const preamble = philipText.split("?")[0].trim().toLowerCase();
  const userWords = normalizeWords(userText);
  for (let len = Math.min(7, userWords.length); len >= 4; len--) {
    for (let i = 0; i <= userWords.length - len; i++) {
      const chunk = userWords.slice(i, i + len).join(" ");
      if (preamble.includes(chunk)) return true;
    }
  }

  // Preamble is nearly identical to a sentence in the user message
  const userSentences = userText.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 12);
  for (const sentence of userSentences) {
    if (preamble.length > 10 && sentence.includes(preamble.slice(0, Math.min(40, preamble.length)))) return true;
    if (sentence.length > 10 && preamble.includes(sentence.slice(0, Math.min(40, sentence.length)))) return true;
  }

  return false;
}

export function opensWithQuotedEcho(philipText: string): boolean {
  const beforeQ = philipText.split("?")[0].trim();
  return /^["'"“][^"']{8,}["'"”]/.test(beforeQ);
}

/** First-sentence openers Philip has already used — ban recycling. */
export function extractPhilipOpeners(philipMessages: Array<{ content: string }>): string[] {
  return philipMessages.map(m => {
    const q = m.content.indexOf("?");
    const body = (q >= 0 ? m.content.slice(0, q) : m.content).trim();
    const first = body.split(/[.!]\s+/)[0]?.trim() ?? body;
    return first.slice(0, 90);
  }).filter(s => s.length > 4);
}

export function getEchoStreak(
  philipMessages: Array<{ content: string }>,
  userMessages: Array<{ content: string }>,
): number {
  let streak = 0;
  const n = Math.min(philipMessages.length, userMessages.length);
  for (let i = n - 1; i >= 0; i--) {
    if (isPureEcho(philipMessages[i].content, userMessages[i].content, 0.55)) streak++;
    else break;
  }
  return streak;
}

const BANNED_QUESTION_PATTERNS = [
  /what (did|does|was) .+ feel like/i,
  /how did .+ feel\b/i,
  /what was that like for you/i,
  /isn'?t it\b/i,
  /that'?s the part that cuts deepest/i,
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(months?|weeks?|days?)\s+(since|ago)\b/i,
  /\b(since|ago)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b(come|came)\s+back\s+here\b/i,
  /\bdays?\s+you('ve| have)\s+(come|been|kept)\b/i,
  /worth sitting with\b/i,
];

export function isBannedQuestion(question: string): boolean {
  return BANNED_QUESTION_PATTERNS.some(p => p.test(question));
}

/** True if Philip recycled an opener he already used this conversation. */
export function recyclesPhilipOpener(
  philipText: string,
  priorOpeners: string[],
): boolean {
  const current = extractPhilipOpeners([{ content: philipText }])[0]?.toLowerCase() ?? "";
  if (!current) return false;
  return priorOpeners.some(o => {
    const prior = o.toLowerCase();
    return prior === current || prior.includes(current.slice(0, 20)) || current.includes(prior.slice(0, 20));
  });
}

/** True when a generated response should be replaced with a bare question. */
export function shouldFallbackToPlainQuestion(
  philipText: string,
  userText: string,
  priorOpeners: string[],
): boolean {
  return (
    isPureEcho(philipText, userText, 0.65)
    || opensWithQuotedEcho(philipText)
    || recyclesPhilipOpener(philipText, priorOpeners)
    || containsMysticalColdRead(philipText)
  );
}

/** How many turns remain in literary-ack cooldown (2 turns after an aphoristic preamble). */
export function getLiteraryCooldownRemaining(
  philipMessages: Array<{ content: string }>,
): number {
  if (philipMessages.length === 0) return 0;
  const last = detectAckRegister(philipMessages[philipMessages.length - 1].content);
  if (last === "literary") return 2;
  if (philipMessages.length >= 2) {
    const prev = detectAckRegister(philipMessages[philipMessages.length - 2].content);
    if (prev === "literary") return 1;
  }
  return 0;
}

export function getFormulaStreak(
  philipMessages: Array<{ content: string }>,
): number {
  let streak = 0;
  for (let i = philipMessages.length - 1; i >= 0; i--) {
    if (philipMessages[i].content.includes("?")) streak++;
    else break;
  }
  return streak;
}

export interface SelectPhilipMoveInput {
  lastMove?: string;
  ackRegister?: AckRegister;
  literaryCooldownRemaining?: number;
  formulaStreak: number;
  isLament: boolean;
  exchangeNum: number;
  lastWasSit: boolean;
  movesUsed?: string[];
  hasNewDetail?: boolean;
  forceSit?: boolean;
  echoStreak?: number;
  isGuardedUser?: boolean;
}

function filterMovePool(
  candidates: PhilipMove[],
  lastMove: string | undefined,
  exchangeNum: number,
  movesUsed: string[],
  echoStreak: number,
  hasNewDetail: boolean,
): PhilipMove[] {
  let pool = candidates.filter(m => m !== lastMove);
  if (pool.length === 0) pool = [...candidates];

  const reflectCount = movesUsed.filter(m => m === "reflect_back").length;
  const reflectInLast3 = movesUsed.slice(-3).includes("reflect_back");
  const namedFactCount = movesUsed.filter(m => m === "named_fact").length;

  if (reflectCount >= 1 || reflectInLast3 || exchangeNum >= 3) {
    pool = pool.filter(m => m !== "reflect_back");
  }

  // named_fact echoes easily — only when fresh detail and no recent echo
  if (echoStreak >= 1 || namedFactCount >= 2 || (exchangeNum >= 2 && !hasNewDetail)) {
    pool = pool.filter(m => m !== "named_fact");
  }

  if (echoStreak >= 2) {
    pool = pool.filter(m => m !== "reflect_back" && m !== "named_fact" && m !== "tension");
  }

  if (pool.length === 0) return ["plain_question", "sit"];
  return pool;
}

/** Deterministic move selection — no random rolls. */
export function selectPhilipMove(input: SelectPhilipMoveInput): PhilipMove {
  const {
    lastMove,
    ackRegister,
    literaryCooldownRemaining = 0,
    formulaStreak,
    isLament,
    exchangeNum,
    lastWasSit,
    movesUsed = [],
    hasNewDetail = false,
    forceSit = false,
    echoStreak = 0,
    isGuardedUser = false,
  } = input;

  if (forceSit) return "sit";

  const pick = (candidates: PhilipMove[]): PhilipMove => {
    const pool = filterMovePool(candidates, lastMove, exchangeNum, movesUsed, echoStreak, hasNewDetail);
    return pool[exchangeNum % pool.length];
  };

  // Guarded/skeptical users — earn trust with plain questions, not performance
  if (isGuardedUser) {
    if (formulaStreak >= 2 || echoStreak >= 1 || ackRegister === "literary" || literaryCooldownRemaining > 0) {
      return pick(["plain_question", "plain_question", "skip"]);
    }
    return pick(["plain_question", "plain_question", "plain_question", "plain_question", "skip"]);
  }

  // Echo streak → bare questions only
  if (echoStreak >= 2) {
    return pick(["plain_question", "plain_question", "skip"]);
  }
  if (echoStreak >= 1) {
    return pick(["plain_question", "plain_question", "sit", "skip"]);
  }

  // After reflect_back → plain or sit only
  if (lastMove === "reflect_back" || lastMove === "named_fact") {
    return pick(["plain_question", "sit", "skip"]);
  }

  // Literary ack or active cooldown → plain or sit only (2-turn cooldown)
  if (ackRegister === "literary" || literaryCooldownRemaining > 0) {
    return pick(["plain_question", "sit"]);
  }

  // Formula streak → break with sit or bare question
  if (formulaStreak >= 3) {
    return pick(["sit", "plain_question"]);
  }

  // Lament → sit unless we just sat
  if (isLament && !lastWasSit) {
    return pick(["sit", "plain_question"]);
  }

  // Deep conversation — plain_question dominates (~80%)
  if (exchangeNum >= 7) {
    return pick(["plain_question", "plain_question", "plain_question", "skip", "sit"]);
  }

  // Mid conversation — plain_question base unless fresh detail warrants named_fact
  if (exchangeNum >= 3) {
    if (!hasNewDetail) {
      return pick(["plain_question", "plain_question", "plain_question", "plain_question", "skip", "sit"]);
    }
    return pick(["plain_question", "plain_question", "plain_question", "skip", "sit"]);
  }

  // Early follow-ups — plain_question default; at most one reflect_back early
  if (exchangeNum >= 2) {
    const reflectAllowed = movesUsed.filter(m => m === "reflect_back").length === 0 && echoStreak === 0;
    return pick(
      reflectAllowed
        ? ["plain_question", "plain_question", "named_fact"]
        : ["plain_question", "plain_question", "skip"],
    );
  }

  if (exchangeNum >= 1) {
    return pick(["plain_question", "plain_question", "named_fact"]);
  }

  return pick(["plain_question", "named_fact"]);
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

PHILIP MOVE TRACKING: From Philip's most recent response, extract:
- last_move: one of plain_question, named_fact, tension, sit, reflect_back, skip — the structural move he used
- ack_register: "literary" if his preamble used aphoristic reframe ("X became Y", "X is its own kind of Y", "X where Y used to be", universal grief poetry without a specific fact) — otherwise "plain". If his response was question-only with no preamble, use "plain".

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
  "conversation_closing": false,
  "last_move": "plain_question | named_fact | tension | sit | reflect_back | skip — from Philip's last response",
  "ack_register": "plain | literary | null — was Philip's last preamble aphoristic or grounded?"
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

    const philipMessages = messages.filter(m => m.role === "assistant");
    const lastPhilip = philipMessages[philipMessages.length - 1]?.content ?? "";

    if (lastPhilip) {
      const detectedRegister = detectAckRegister(lastPhilip);
      parsed.ack_register = detectedRegister ?? parsed.ack_register ?? "plain";
      parsed.last_move = parsed.last_move || inferLastMove(lastPhilip);
      const lastUserBeforePhilip = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
      if (lastUserBeforePhilip && isPureEcho(lastPhilip, lastUserBeforePhilip, 0.55)) {
        parsed.last_move = "reflect_back";
      }
    }

    parsed.literary_cooldown_remaining = getLiteraryCooldownRemaining(philipMessages);
    parsed.moves_used = getMovesUsed(philipMessages);
    parsed.philip_openers_used = extractPhilipOpeners(philipMessages);

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

  const openersBan = state.philip_openers_used && state.philip_openers_used.length > 0
    ? `\nBANNED OPENERS (Philip already said these — do not repeat, rephrase, or parrot back):\n${state.philip_openers_used.map((o, i) => `  [${i + 1}] ${o}`).join("\n")}`
    : "";

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Core issue: ${state.core_issue}${facts}${explored}${unexplored}${questionsBan}${metaphorsBan}${userWords}${openersBan}

NEVER open by quoting the user's last sentence back verbatim. Add something new or ask the question alone.
NEVER reference how many days they've visited, "coming back here," or prior sessions — you only know this single conversation.

DEPTH BEFORE BREADTH: If the user just made a raw confession, disclosed something vulnerable, or asked Philip a direct question — go DEEPER into that before moving to new territory.
Otherwise: explore something from "NOT YET EXPLORED."
Your question must not be in "QUESTIONS ALREADY ASKED." Use none of the banned metaphors or openers.`;
}
