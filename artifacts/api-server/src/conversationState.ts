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
  | "guarded_ack"
  | "reciprocal_answer"
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

  if (
    beforeQ.length >= 12
    && /\b(i|my|me)\b/i.test(beforeQ)
    && /\b(pray|scripture|friend|psalm|Jesus|God|church|pastor|years)\b/i.test(beforeQ)
    && !/^(what|who|how|when|where|is there)\b/i.test(beforeQ)
  ) {
    return "reciprocal_answer";
  }

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

const RECIPROCAL_EXCLUSION_PATTERNS = [
  /\bwhat do you think i\b/i,
  /\bdo you think i should\b/i,
  /\bhow do you think i\b/i,
  /\bwhat would you (tell|advise|say to) me\b/i,
  /\bare you saying i\b/i,
  /\bso you('re| are) saying\b/i,
  /\bwhat should i\b/i,
];

const RECIPROCAL_TO_PHILIP_PATTERNS = [
  /\bwho do you (talk|turn|go|pray|confess|tell)\b/i,
  /\bwho (listens to|is there for|leans on) you\b/i,
  /\bwhat about you\b/i,
  /\bhow about you\b/i,
  /\b(and |but )?you\?\s*$/i,
  /\bwhen you('re| are) the one (they|people|everyone)\b/i,
  /\bwhen you('re| are) the (pastor|leader|guide|one they)\b/i,
  /\bwhat do you do when you('re| are)\b/i,
  /\bwhere do you go when\b/i,
  /\bwhat('s| is) it like for you\b/i,
  /\btell me about (you|yourself)\b/i,
  /\bare you (real|an ai|a bot|actually listening)\b/i,
  /\bdo you (ever|actually|really) (pray|doubt|struggle|get tired|feel)\b/i,
  /\bhow do you (handle|carry|deal with|hold|manage)\b/i,
];

function lastClauseAsksPhilip(text: string): boolean {
  const parts = text.split("?");
  if (parts.length < 2) return false;
  const beforeFinalQ = parts[parts.length - 2].trim();
  const lastClause = beforeFinalQ.split(/[.!]\s+/).pop()?.trim() ?? beforeFinalQ;
  if (!/\b(you|your|yourself)\b/i.test(lastClause)) return false;
  if (/\b(i|my|me|myself)\b/i.test(lastClause) && !/\b(you|your)\b/i.test(lastClause.slice(-40))) {
    return false;
  }
  return (
    /^(who|what|how|when|where|why|do|does|did|are|is|can|have|will|would)\b/i.test(lastClause)
    || /\b(for|about) you\b/i.test(lastClause)
  );
}

/** User asked Philip a direct question about himself — needs a brief answer, not a dodge. */
export function detectReciprocalQuestion(userMessage: string): boolean {
  const text = userMessage.trim();
  if (!text.includes("?")) return false;
  if (RECIPROCAL_EXCLUSION_PATTERNS.some(p => p.test(text))) return false;
  if (RECIPROCAL_TO_PHILIP_PATTERNS.some(p => p.test(text))) return true;
  return lastClauseAsksPhilip(text);
}

export function conversationHadReciprocalAnswer(
  philipMessages: Array<{ content: string }>,
): boolean {
  return philipMessages.some(m => inferLastMove(m.content) === "reciprocal_answer");
}

/** True when Philip ignored a reciprocal question and only asked about the user. */
export function isReciprocalDodge(response: string): boolean {
  const t = response.trim();
  if (!t) return true;
  const beforeQ = t.includes("?") ? t.slice(0, t.indexOf("?")).trim() : t;
  if (beforeQ.split(/\s+/).length < 6) return true;
  if (/^(what|who|how|when|where|is there|do you|does)\b/i.test(t) && !/\b(i |my |me )\b/i.test(beforeQ)) {
    return true;
  }
  return false;
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
  /\bworth sitting with for a moment\b/i,
];

export function isBannedQuestion(question: string): boolean {
  return BANNED_QUESTION_PATTERNS.some(p => p.test(question));
}

const INVENTED_SESSION_HISTORY_PATTERNS = [
  /\bkept\s+coming\s+back\b/i,
  /\bcome\s+back\s+here\b/i,
  /\bdays?\s+you('ve| have)\s+(come|been|kept|returned)\b/i,
  /\b(you('ve| have)|you)\s+(kept\s+)?coming\s+back\b/i,
  /\bback\s+again\s+(today|tonight|here)\b/i,
  /\bthis\s+is\s+(your\s+)?(second|third|fourth|fifth)\s+(time|visit)\b/i,
  /\bvisited\s+(here\s+)?(three|four|five|\d+)\s+times?\b/i,
];

const DAY_COUNT_WORDS = new Set([
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty",
]);

const WORD_TO_DIGIT: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7",
  eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", thirteen: "13",
  fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18",
  nineteen: "19", twenty: "20", thirty: "30", forty: "40", fifty: "50",
};

function durationMentionedInUserText(claim: string, userBlob: string): boolean {
  const lower = claim.toLowerCase();
  if (userBlob.includes(lower)) return true;
  const m = lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|\d+)\s+(days?|weeks?|months?|years?)\b/i);
  if (!m) return false;
  const token = m[1].toLowerCase();
  const unit = m[2].toLowerCase();
  if (userBlob.includes(`${token} ${unit}`)) return true;
  if (userBlob.includes(`${token}-${unit}`)) return true;
  const asDigit = WORD_TO_DIGIT[token] ?? (/^\d+$/.test(token) ? token : null);
  if (asDigit && (userBlob.includes(`${asDigit} ${unit}`) || userBlob.includes(`${asDigit}-${unit}`))) return true;
  return false;
}

/** Philip cites a time span the user never mentioned ("six months", "40 years"). */
export function inventsDuration(philipText: string, userMessages: string[]): boolean {
  const t = philipText.trim();
  if (!t) return false;
  const userBlob = userMessages.join(" ").toLowerCase();
  const claims = t.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|\d+)\s+(days?|weeks?|months?|years?)\b/gi);
  if (!claims?.length) return false;
  return claims.some((claim) => !durationMentionedInUserText(claim, userBlob));
}

/** Philip claims visit/session history the user never offered. */
export function inventsSessionHistory(
  philipText: string,
  userMessages: string[],
  exchangeNum = 0,
): boolean {
  const t = philipText.trim();
  if (!t) return false;
  const userBlob = userMessages.join(" ").toLowerCase();

  for (const pattern of INVENTED_SESSION_HISTORY_PATTERNS) {
    if (!pattern.test(t)) continue;
    if (pattern.test(userBlob)) continue;
    return true;
  }

  const dayClaim = t.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+days?\b/i);
  if (dayClaim && exchangeNum <= 6) {
    const token = dayClaim[1].toLowerCase();
    if (durationMentionedInUserText(dayClaim[0], userBlob)) return false;
    if (DAY_COUNT_WORDS.has(token) && userBlob.includes(`${token} days`)) return false;
    if (/^\d+$/.test(token) && userBlob.includes(`${token} day`)) return false;
    return true;
  }

  return inventsDuration(t, userMessages);
}

/** Full response names a person-role the user never mentioned. */
export function responseInventsRelationship(
  philipText: string,
  userMessages: string[],
  factsLearned: string[] = [],
): boolean {
  return questionInventsRelationship(philipText, userMessages, factsLearned);
}

/** Any fabricated timeline or relationship in Philip's text. */
export function inventsUnsupportedDetail(
  philipText: string,
  userMessages: string[],
  factsLearned: string[] = [],
  exchangeNum = 0,
): boolean {
  return inventsSessionHistory(philipText, userMessages, exchangeNum)
    || inventsDuration(philipText, userMessages)
    || responseInventsRelationship(philipText, userMessages, factsLearned);
}

/** Relationship roles Philip must not invent if the user never named them. */
const INVENTABLE_RELATIONSHIP_TERMS = [
  "wife", "husband", "spouse", "partner", "girlfriend", "boyfriend",
  "mom", "mother", "dad", "father", "son", "daughter", "brother", "sister",
  "pastor", "boss", "coworker", "therapist", "counselor",
];

/** True when a question names a person-role the user never mentioned. */
export function questionInventsRelationship(
  question: string,
  userMessages: string[],
  factsLearned: string[] = [],
): boolean {
  const context = [...userMessages, ...factsLearned].join(" ").toLowerCase();
  const q = question.toLowerCase();
  for (const term of INVENTABLE_RELATIONSHIP_TERMS) {
    const re = new RegExp(`\\b${term}\\b`, "i");
    if (re.test(q) && !re.test(context)) return true;
  }
  return false;
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

export function reusesBannedMetaphor(philipText: string, metaphorsUsed: string[]): boolean {
  const lower = philipText.toLowerCase();
  return metaphorsUsed.some(m => {
    const fragment = m.toLowerCase().slice(0, Math.min(16, m.length));
    return fragment.length > 6 && lower.includes(fragment);
  });
}

/** True when a generated response should be replaced with a bare question. */
export function shouldFallbackToPlainQuestion(
  philipText: string,
  userText: string,
  priorOpeners: string[],
  metaphorsUsed: string[] = [],
  exchangeNum = 0,
  allUserMessages: string[] = [],
): boolean {
  const userContext = allUserMessages.length > 0 ? allUserMessages : [userText];
  return (
    isPureEcho(philipText, userText, 0.65)
    || opensWithQuotedEcho(philipText)
    || recyclesPhilipOpener(philipText, priorOpeners)
    || reusesBannedMetaphor(philipText, metaphorsUsed)
    || containsMysticalColdRead(philipText)
    || relabelsUserFeeling(philipText)
    || inventsUnsupportedDetail(philipText, userContext, [], exchangeNum)
  );
}

/** Philip reframing their feeling — "That's not X talking. That's Y." */
export function relabelsUserFeeling(philipText: string): boolean {
  const t = philipText.trim();
  if (!t) return false;
  if (/that['']s not .+\b(talking|saying)\b/i.test(t)) return true;
  if (/that['']s not .+\.\s*that['']s\b/i.test(t)) return true;
  return false;
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
  formulaStreak = 0,
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

  // tension relabels easily — cap once echo or formula streak builds
  if (echoStreak >= 1 || formulaStreak >= 2 || exchangeNum >= 3) {
    pool = pool.filter(m => m !== "tension");
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
    const pool = filterMovePool(candidates, lastMove, exchangeNum, movesUsed, echoStreak, hasNewDetail, formulaStreak);
    return pool[exchangeNum % pool.length];
  };

  // Guarded/skeptical users — earn trust with plain questions; break interrogation with guarded_ack
  if (isGuardedUser) {
    if (formulaStreak >= 3) {
      return pick(["guarded_ack", "guarded_ack", "sit"]);
    }
    if (formulaStreak >= 2 || echoStreak >= 1 || ackRegister === "literary" || literaryCooldownRemaining > 0) {
      return pick(["plain_question", "guarded_ack", "skip"]);
    }
    return pick(["plain_question", "plain_question", "plain_question", "skip", "guarded_ack"]);
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

  // Mid conversation (5+) — break echo/formula loops early
  if (exchangeNum >= 5 && (echoStreak >= 1 || formulaStreak >= 2)) {
    return pick(["plain_question", "plain_question", "skip", "sit"]);
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

/** After this many user turns, Philip may proactively send the person off. */
export const SESSION_SEND_OFF_THRESHOLD = 8;

const SESSION_SEND_OFF_MARKERS = [
  /\bthis door stays open\b/i,
  /\benough for (today|now|tonight)\b/i,
  /\bleave it here for today\b/i,
  /\bwe can leave it here\b/i,
  /\bpick it up again when you're ready\b/i,
  /\bsomething (real|honest) happened\b/i,
  /\bnamed more than you came\b/i,
  /\bgo gently\b/i,
  /\bset it down (here |tonight|for now)?\b/i,
  /\bthat's enough for (today|now|tonight)\b/i,
  /\bdon't have to go deeper\b/i,
  /\brest in what you already named\b/i,
];

export function isSessionSendOffLine(text: string): boolean {
  return SESSION_SEND_OFF_MARKERS.some((p) => p.test(text));
}

export function conversationHadSessionSendOff(
  philipMessages: Array<{ content: string }>,
): boolean {
  return philipMessages.some((m) => isSessionSendOffLine(m.content));
}

/** After send-off, Philip must not ask another question. Returns violation message or null. */
export function findPostSendOffViolation(philipResponses: string[]): string | null {
  let sendOffIdx = -1;
  for (let i = 0; i < philipResponses.length; i++) {
    if (isSessionSendOffLine(philipResponses[i] ?? "")) {
      sendOffIdx = i;
      break;
    }
  }
  if (sendOffIdx < 0) return null;
  for (let j = sendOffIdx + 1; j < philipResponses.length; j++) {
    const reply = philipResponses[j] ?? "";
    if (reply.includes("?")) {
      return `Exchange ${j + 1} asked a question after send-off at exchange ${sendOffIdx + 1}`;
    }
  }
  return null;
}

/** Strip accidental questions from send-off lines. */
export function sanitizeSendOffText(text: string): string {
  if (!text.trim()) return text;
  return text.replace(/\?+/g, ".").replace(/\s+/g, " ").trim();
}

const STOCK_SEND_OFF_SNIPPETS = [
  "this door stays open",
  "go gently",
  "enough for tonight",
  "enough for today",
  "enough for now",
  "when you're ready",
];

const SEND_OFF_ALTERNATES = [
  "You named enough for one day. Put it down — it will still be here.",
  "What you brought is real. You don't have to carry all of it tonight.",
  "Something honest happened in this room. That's enough for now.",
  "Rest in what you already named. It's still here when you return.",
  "You don't have to go deeper right now. Come back when you want to.",
];

/** Avoid recycling the same stock send-off Philip already used this session. */
export function finalizeSendOffText(text: string, priorPhilipTexts: string[]): string {
  let result = sanitizeSendOffText(text);
  const prior = priorPhilipTexts.map((t) => t.toLowerCase()).join("\n");
  const resultLower = result.toLowerCase();

  const repeatsStock = STOCK_SEND_OFF_SNIPPETS.some(
    (snippet) => resultLower.includes(snippet) && prior.includes(snippet),
  );
  if (!repeatsStock) return result;

  for (let i = 0; i < SEND_OFF_ALTERNATES.length; i++) {
    const alt = SEND_OFF_ALTERNATES[i];
    const altLower = alt.toLowerCase();
    const altRepeats = STOCK_SEND_OFF_SNIPPETS.some(
      (snippet) => altLower.includes(snippet) && prior.includes(snippet),
    );
    if (!altRepeats) return alt;
  }
  return SEND_OFF_ALTERNATES[priorPhilipTexts.length % SEND_OFF_ALTERNATES.length];
}

/** Brief closure after session send-off — no question, no reopening. */
export function buildPostSendOffResponse(exchangeNum: number, priorPhilipTexts: string[] = []): string {
  const lines = [
    "I'm still here if you want one more sentence — but you don't have to go deeper tonight.",
    "You don't have to go deeper right now. What you named is still yours.",
    "Rest in what you already named. It's still here when you want it.",
  ];
  const base = lines[exchangeNum % lines.length];
  return finalizeSendOffText(base, priorPhilipTexts);
}

/** User pushed back after send-off — reopen without dismissing again. */
export function buildSendOffPushbackResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (/\balone\b/.test(lower)) {
    return "You're right — I moved too fast. I'm still here. What's still sitting with you tonight?";
  }
  if (/\bnot done\b|\bstill stuck\b|\bmore to (say|share)\b/.test(lower)) {
    return "You're right — I closed the door too soon. What part is still heavy?";
  }
  return "Fair — I moved too fast. What still needs to be said?";
}

/** User rejects Philip's send-off — wants to keep talking. */
const SEND_OFF_PUSHBACK_PATTERNS = [
  /\bi'?m not done\b/i,
  /\bnot (done|ready|finished) (yet|talking|here)?\b/i,
  /\bdon'?t (dismiss|send me off|close|shut me|end this)\b/i,
  /\bstill (stuck|need to talk|have more|processing)\b/i,
  /\bdon'?t want to be alone\b/i,
  /\bnot asking you to fix\b/i,
  /\bfeels like (the )?silence\b/i,
  /\b(pick it up|come back) when you return\b/i,
  /\bwasn'?t ready to stop\b/i,
  /\bhave more to (say|share|tell)\b/i,
  /\bdon'?t (want to )?stop yet\b/i,
  /\byou (just )?sent me (away|off)\b/i,
  /\btoo soon to (stop|end|close)\b/i,
  /\bi'?m still in (it|this)\b/i,
];

export function detectsSendOffPushback(userMessage: string): boolean {
  const text = userMessage.trim();
  if (!text) return false;
  return SEND_OFF_PUSHBACK_PATTERNS.some((p) => p.test(text));
}

/** Long conversation — offer a sending line instead of another question (once). */
export function shouldOfferSessionSendOff(
  exchangeNum: number,
  philipMessages: Array<{ content: string }>,
  userMessage: string,
): boolean {
  if (exchangeNum < SESSION_SEND_OFF_THRESHOLD) return false;
  if (detectConversationClosing(userMessage)) return false;
  if (detectsSendOffPushback(userMessage)) return false;
  return !conversationHadSessionSendOff(philipMessages);
}

export function buildSessionSendOffPromptBlock(): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION MODE: SESSION SEND-OFF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You have walked with them through several exchanges. Send them — do not ask another question.
Two short sentences. No "?". Not a recap. Permission to stop for today with the door left open.
Philip's register: "You named more than you came in carrying. We can leave it here for today — this door stays open."
Never begin with "I." Never use "journey", "healing", "God bless you", "Take care."
Under 40 words.`;
}

const REPETITION_PUSHBACK_PATTERNS = [
  /\byou (already )?said that\b/i,
  /\bsaid that already\b/i,
  /\bi already said\b/i,
  /\byou keep (asking|circling|coming back|repeating)\b/i,
  /\b(asked|asking) (me )?(that|this|the same) (twice|again|before|already)\b/i,
  /\b(same|those) (thing|words|question|line)\b/i,
  /\bnot (really )?(hearing|listening)\b/i,
  /\byou('re| are) (not )?(hearing|listening|tracking)\b/i,
  /\byou just did it again\b/i,
  /\bcircling (back|the same)\b/i,
  /\b(looping|going in circles)\b/i,
  /\byou skipped\b/i,
  /\bnew coat of paint\b/i,
  /\bstarting to wonder if anyone\b/i,
  /\bjust a script\b/i,
  /\brepeating yourself\b/i,
  /\bsaid (that|this) (part )?already\b/i,
  /\bkind of asked\b/i,
  /\basked me that\b/i,
  /\byou('re| are) circling\b/i,
  /\bdon'?t know what you want me to say\b/i,
];

/** User caught Philip repeating or not tracking — needs acknowledgment + fresh pivot. */
export function detectRepetitionPushback(userMessage: string): boolean {
  const text = userMessage.trim();
  if (!text) return false;
  return REPETITION_PUSHBACK_PATTERNS.some(p => p.test(text));
}

/** Jaccard-style overlap between two questions (0–1). */
export function questionSimilarity(q1: string, q2: string): number {
  const w1 = new Set(normalizeWords(q1));
  const w2 = new Set(normalizeWords(q2));
  if (w1.size === 0 || w2.size === 0) return 0;
  let match = 0;
  for (const w of w1) if (w2.has(w)) match++;
  return match / Math.max(w1.size, w2.size);
}

export function recyclesPriorQuestion(question: string, asked: string[]): boolean {
  const q = question.trim();
  if (!q) return true;
  return asked.some(prior => questionSimilarity(q, prior) >= 0.55);
}

/** True when a question revisits a prior-session explored area. */
export function questionOverlapsExploredArea(
  question: string,
  exploredAreas: string[],
  threshold = 0.5,
): boolean {
  if (!question?.trim() || exploredAreas.length === 0) return false;
  const qLower = question.toLowerCase();
  return exploredAreas.some((area) => {
    const areaLower = area.toLowerCase().trim();
    if (!areaLower) return false;
    if (questionSimilarity(question, area) >= threshold) return true;
    if (qLower.includes(areaLower) || areaLower.includes(qLower.slice(0, Math.min(36, qLower.length)))) {
      return true;
    }
    const areaWords = normalizeWords(area).filter((w) => w.length > 4);
    if (areaWords.length === 0) return false;
    const qWords = new Set(normalizeWords(question));
    const matches = areaWords.filter((w) => qWords.has(w)).length;
    if (matches >= 2) return true;
    return areaWords.length === 1 && matches === 1 && areaWords[0].length > 6;
  });
}

/** User explicitly returned to a prior-session thread — allow revisiting. */
export function userReopenedExploredArea(
  userMessage: string,
  exploredAreas: string[],
): boolean {
  const uLower = userMessage.toLowerCase();
  return exploredAreas.some((area) => {
    const areaWords = normalizeWords(area).filter((w) => w.length > 4);
    if (areaWords.length >= 2) {
      const hits = areaWords.filter((w) => uLower.includes(w)).length;
      return hits >= Math.min(2, areaWords.length);
    }
    const fragment = area.toLowerCase().trim().slice(0, 14);
    return fragment.length > 5 && uLower.includes(fragment);
  });
}

export function shouldRejectPriorExploredQuestion(
  question: string,
  exploredAreas: string[],
  lastUserMessage: string,
): boolean {
  if (exploredAreas.length === 0) return false;
  if (userReopenedExploredArea(lastUserMessage, exploredAreas)) return false;
  return questionOverlapsExploredArea(question, exploredAreas);
}

export function pickFreshTerritoryQuestion(
  state: ConversationState | null,
  priorExplored: string[],
): string {
  const unexplored = (state?.areas_unexplored ?? []).filter((area) =>
    !priorExplored.some((e) => questionSimilarity(area, e) >= 0.5),
  );
  if (unexplored.length > 0) {
    return `What haven't you said yet about ${unexplored[0].toLowerCase()}?`;
  }
  return "What's one part of this you haven't put into words yet?";
}

/** "Whose coat is it?" when user already said it's her husband's coat. */
export function isAbsurdRecoveryQuestion(question: string, state: ConversationState): boolean {
  if (/\bwhose\b/i.test(question)) {
    const nounMatch = question.match(/\bwhose\s+(\w+)/i);
    if (nounMatch) {
      const item = nounMatch[1].toLowerCase();
      const context = [
        ...state.facts_learned,
        ...state.user_exact_words,
      ].join(" ").toLowerCase();
      if (context.includes(item) && /\b(husband|wife|his|her|dad|mom|father|mother|son|daughter)\b/.test(context)) {
        return true;
      }
    }
  }
  if (state.metaphors_used.some(m => {
    const fragment = m.toLowerCase().slice(0, Math.min(14, m.length));
    return fragment.length > 5 && question.toLowerCase().includes(fragment);
  })) {
    return true;
  }
  return false;
}

export function isPoorRecoveryQuestion(question: string, state: ConversationState): boolean {
  if (!question?.trim()) return true;
  if (isBannedQuestion(question)) return true;
  if (containsMysticalColdRead(question)) return true;
  if (recyclesPriorQuestion(question, state.questions_asked)) return true;
  return isAbsurdRecoveryQuestion(question, state);
}

export function pickRepetitionAcknowledgment(exchangeNum: number): string {
  const acks = [
    "You're right — I circled back.",
    "Fair — I kept coming back to the same thing.",
    "I hear you — I wasn't tracking.",
  ];
  return acks[exchangeNum % acks.length];
}

function extractPushbackSubject(userMessage: string): string | null {
  const coatMatch = userMessage.match(/\b(the )?(\w+),?\s+yeah\b/i);
  if (coatMatch) return coatMatch[2];
  const aboutMatch = userMessage.match(/\babout (the )?(\w+)\b/i);
  if (aboutMatch) return aboutMatch[2];
  const saidMatch = userMessage.match(/\bsaid that already[.\s—-]*(?:the )?(\w+)/i);
  if (saidMatch) return saidMatch[1];
  return null;
}

export function buildRepetitionRecoveryAddendum(
  state: ConversationState | null,
  userMessage: string,
): string {
  const explored = state?.areas_explored?.join(", ") ?? "";
  const recentQuestions = state?.questions_asked?.slice(-5).map(q => `  - ${q}`).join("\n") ?? "";
  const metaphors = state?.metaphors_used?.join(", ") ?? "";
  const subject = extractPushbackSubject(userMessage);
  const subjectBan = subject ? `\nDo NOT ask about "${subject}" — they said they already covered it.` : "";

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REPETITION PUSHBACK — USER CAUGHT PHILIP LOOPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user just said Philip repeated himself or wasn't tracking.
Ask ONE plain question on fresh territory from NOT YET EXPLORED.
NEVER revisit: ${explored || "(see explored list above)"}
NEVER re-ask or rephrase these recent questions:
${recentQuestions || "  (none)"}
NEVER reuse these images: ${metaphors || "(none)"}
Do NOT ask "whose X is it" about something they already identified.${subjectBan}
User message: "${userMessage.slice(0, 220)}"`;
}

export function pickRecoveryFallbackQuestion(state: ConversationState): string {
  const unexplored = state.areas_unexplored.filter(a => a.trim());
  if (unexplored.length > 0) {
    return `What haven't you said yet about ${unexplored[0].toLowerCase()}?`;
  }
  const freshWords = state.user_exact_words.filter(w => w.split(/\s+/).length >= 2);
  if (freshWords.length > 0) {
    const anchor = freshWords[freshWords.length - 1];
    return `Say more about ${anchor}?`;
  }
  return "What part of this feels hardest to put into words?";
}

const STATE_SYSTEM = `You track conversation state for a pastoral AI. Given the full conversation so far, extract a JSON state object.

Be precise and minimal. This state is injected into the next AI prompt to prevent repetition.

CRITICAL — PRONOUNS: Track the exact name and pronouns the user uses for any person they mention. If they said "my husband John" — record "John (he/him)" in facts_learned. If they said "my wife Sarah" — record "Sarah (she/her)". If gender is unclear, record only the name. Never assume gender. Record exactly what the user said.

PHILIP MOVE TRACKING: From Philip's most recent response, extract:
  - last_move: one of plain_question, named_fact, tension, sit, reflect_back, guarded_ack, reciprocal_answer, skip — the structural move he used
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
  "last_move": "plain_question | named_fact | tension | sit | reflect_back | guarded_ack | reciprocal_answer | skip — from Philip's last response",
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
