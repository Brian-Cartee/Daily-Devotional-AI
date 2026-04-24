/**
 * Shepherd's Path — AI Response Guardrail System
 *
 * Validates AI-generated pastoral responses before delivery.
 * Catches clichés, preachy tone, over-spiritualization, therapy-speak,
 * structural gaps, and style violations.
 *
 * Usage:
 *   const result = validateResponse(text);
 *   if (!result.approved) { ...regenerate... }
 *
 * For auto-retry with regeneration, use withGuardrails(generatorFn).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  approved: boolean;
  score: number;        // 1–10; must be ≥ 8 to approve
  issues: string[];     // human-readable violation descriptions
  flags: string[];      // specific flagged phrases or patterns found in text
}

// ── Banned phrase banks ───────────────────────────────────────────────────────

const CLICHE_PATTERNS: Array<{ phrase: string; label: string }> = [
  { phrase: "you're not alone",           label: "Cliché: 'you're not alone'" },
  { phrase: "you are not alone",          label: "Cliché: 'you are not alone'" },
  { phrase: "everything will be okay",    label: "Cliché: 'everything will be okay'" },
  { phrase: "it'll all work out",         label: "Cliché: 'it'll all work out'" },
  { phrase: "it will all work out",       label: "Cliché: 'it will all work out'" },
  { phrase: "stay strong",               label: "Cliché: 'stay strong'" },
  { phrase: "you've got this",           label: "Cliché: 'you've got this'" },
  { phrase: "you got this",              label: "Cliché: 'you got this'" },
  { phrase: "this too shall pass",       label: "Cliché: 'this too shall pass'" },
  { phrase: "lean into",                 label: "Cliché: 'lean into'" },
  { phrase: "his timing is perfect",     label: "Cliché: 'his timing is perfect'" },
  { phrase: "god's plan",               label: "Cliché: 'god's plan'" },
  { phrase: "god has a plan",           label: "Cliché: 'god has a plan'" },
  { phrase: "let go and let god",        label: "Cliché: 'let go and let god'" },
  { phrase: "everything happens for a reason", label: "Cliché: 'everything happens for a reason'" },
];

const OVER_SPIRITUAL_PATTERNS: Array<{ phrase: string; label: string }> = [
  { phrase: "god is about to",           label: "Over-spiritual: 'god is about to'" },
  { phrase: "your breakthrough is coming", label: "Over-spiritual: 'your breakthrough is coming'" },
  { phrase: "a breakthrough is coming",  label: "Over-spiritual: 'a breakthrough is coming'" },
  { phrase: "this is your season",       label: "Over-spiritual: 'this is your season'" },
  { phrase: "god will fix everything",   label: "Over-spiritual: 'god will fix everything'" },
  { phrase: "god will make a way",       label: "Over-spiritual: 'god will make a way'" },
  { phrase: "miracles are on the way",   label: "Over-spiritual: 'miracles are on the way'" },
  { phrase: "favor is coming",           label: "Over-spiritual: 'favor is coming'" },
];

const PREACHY_PATTERNS: Array<{ phrase: string; label: string }> = [
  { phrase: "you need to",               label: "Preachy: 'you need to'" },
  { phrase: "you should",                label: "Preachy: 'you should'" },
  { phrase: "you must",                  label: "Preachy: 'you must'" },
  { phrase: "the bible says you",        label: "Preachy: 'the bible says you'" },
  { phrase: "scripture commands",        label: "Preachy: 'scripture commands'" },
  { phrase: "i want you to",             label: "Preachy: 'i want you to'" },
  { phrase: "what you need to do",       label: "Preachy: 'what you need to do'" },
  { phrase: "brothers and sisters",      label: "Preachy: 'brothers and sisters'" },
  { phrase: "let me tell you",           label: "Preachy: 'let me tell you'" },
];

const THERAPY_PATTERNS: Array<{ phrase: string; label: string }> = [
  { phrase: "i'm sorry you feel",        label: "Therapy-speak: 'i'm sorry you feel'" },
  { phrase: "i am sorry you feel",       label: "Therapy-speak: 'i am sorry you feel'" },
  { phrase: "that sounds really hard",   label: "Therapy-speak: 'that sounds really hard'" },
  { phrase: "your feelings are valid",   label: "Therapy-speak: 'your feelings are valid'" },
  { phrase: "it's okay to feel",         label: "Therapy-speak: 'it's okay to feel'" },
  { phrase: "you have every right to feel", label: "Therapy-speak: 'you have every right to feel'" },
  { phrase: "thank you for sharing",     label: "Therapy-speak: 'thank you for sharing'" },
  { phrase: "i hear you",                label: "Therapy-speak: 'i hear you'" },
  { phrase: "that makes sense",          label: "Therapy-speak: 'that makes sense'" },
];

const GENERIC_AI_PATTERNS: Array<{ phrase: string; label: string }> = [
  { phrase: "as an ai",                  label: "AI-speak: 'as an ai'" },
  { phrase: "it's important to note",    label: "AI-speak: 'it's important to note'" },
  { phrase: "it is important to note",   label: "AI-speak: 'it is important to note'" },
  { phrase: "in conclusion",             label: "AI-speak: 'in conclusion'" },
  { phrase: "to summarize",              label: "AI-speak: 'to summarize'" },
  { phrase: "furthermore",              label: "AI-speak: 'furthermore'" },
  { phrase: "additionally,",            label: "AI-speak: 'additionally'" },
  { phrase: "in summary",               label: "AI-speak: 'in summary'" },
];

const HYPE_PATTERNS: Array<{ phrase: string; label: string }> = [
  { phrase: "incredible",               label: "Hype: 'incredible'" },
  { phrase: "extraordinary",            label: "Hype: 'extraordinary'" },
  { phrase: "amazing faith",            label: "Hype: 'amazing faith'" },
  { phrase: "so powerful",              label: "Hype: 'so powerful'" },
  { phrase: "absolutely",              label: "Hype: 'absolutely'" },
  { phrase: "life-changing",           label: "Hype: 'life-changing'" },
  { phrase: "transform your life",     label: "Hype: 'transform your life'" },
];

const ALL_BANNED = [
  ...CLICHE_PATTERNS,
  ...OVER_SPIRITUAL_PATTERNS,
  ...PREACHY_PATTERNS,
  ...THERAPY_PATTERNS,
  ...GENERIC_AI_PATTERNS,
  ...HYPE_PATTERNS,
];

// ── Scripture detection ───────────────────────────────────────────────────────

const SCRIPTURE_SIGNALS = [
  /\b(psalm|proverbs|matthew|mark|luke|john|romans|corinthians|galatians|ephesians|philippians|colossians|hebrews|james|peter|genesis|isaiah|jeremiah|ezekiel|daniel)\b/i,
  /\bscripture\b/i,
  /\bjesus says\b/i,
  /\bjesus said\b/i,
  /\bpaul writes\b/i,
  /\bpaul said\b/i,
  /\bthe bible\b/i,
  /\bthere'?s a (line|place|verse|moment|word|passage|promise|reminder) in\b/i,
  /\b\d+:\d+\b/,                   // e.g. John 3:16
  /\b(god|jesus|paul|david) (says?|said|wrote?|speaks?|spoke)\b/i,
];

function hasScriptureReference(text: string): boolean {
  return SCRIPTURE_SIGNALS.some(pattern => pattern.test(text));
}

// ── Sentence + paragraph utilities ───────────────────────────────────────────

function countSentences(text: string): number {
  // Split on . ! ? — but ignore abbreviations like "e.g." and verse refs "3:16"
  const cleaned = text
    .replace(/\b(e\.g|i\.e|vs|etc|mr|ms|dr|st|rev|vol)\./gi, "$1<DOT>")
    .replace(/\d+\.\d+/g, "<VERSEREF>");
  const matches = cleaned.match(/[^.!?]+[.!?]+/g);
  return matches ? matches.length : 0;
}

function getParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
}

function countSentencesInParagraph(p: string): number {
  return countSentences(p);
}

// ── Tone / style heuristics ───────────────────────────────────────────────────

function isOverlyDramatic(text: string): boolean {
  const exclamations = (text.match(/!/g) ?? []).length;
  return exclamations > 1;
}

function soundsLikeSermon(text: string): boolean {
  const sermonMarkers = [
    /\bbeloved\b/i,
    /\bdearly\b/i,
    /\blet us\b/i,
    /\bwe must\b/i,
    /\bamen\b/i,
    /\bbrethren\b/i,
    /\bunto (you|us|him|them)\b/i,
  ];
  return sermonMarkers.some(r => r.test(text));
}

function opensWithI(text: string): boolean {
  return /^\s*I\b/.test(text);
}

function hasFillerSoftStart(text: string): boolean {
  return /^\s*(It sounds like|Maybe|I wonder if|Perhaps|It seems like)/i.test(text);
}

// ── Structure validation ──────────────────────────────────────────────────────

function hasAcknowledgment(text: string): boolean {
  // First paragraph should feel like acknowledgment — checks for weight language
  const firstParagraph = getParagraphs(text)[0] ?? text;
  const ackPatterns = [
    /\b(that kind of|that level of|that weight|that feeling|that pressure|that pain|that ache|that pull|that grief)\b/i,
    /\bcan (feel|sit|build|stack|settle|show up|make)\b/i,
    /\b(it'?s hard|it'?s difficult|it can be|it tends to|it does)\b/i,
    /\b(when you|when everything|when nothing|when someone)\b/i,
    /\b(tends to|has a way of|builds|settles|lingers|sticks)\b/i,
  ];
  return ackPatterns.some(p => p.test(firstParagraph));
}

function hasTruthReframe(text: string): boolean {
  const reframePatterns = [
    /\b(but|yet|however|still|even so)\b/i,
    /\bthat doesn'?t mean\b/i,
    /\bnot the same (as|thing)\b/i,
    /\byou (don'?t have to|are allowed to|can)\b/i,
    /\b(what changes|what matters|what'?s real)\b/i,
  ];
  return reframePatterns.some(p => p.test(text));
}

function hasGentleInvitation(text: string): boolean {
  const invitePatterns = [
    /\?/,                                        // a question at the end
    /\bif you (want|need|feel)\b/i,
    /\bwe can\b/i,
    /\byou'?re allowed to\b/i,
    /\byou don'?t have to\b/i,
    /\bwhat (feels|would|do you)\b/i,
    /\bwhenever you'?re ready\b/i,
  ];
  return invitePatterns.some(p => p.test(text));
}

// ── Core validator ────────────────────────────────────────────────────────────

export function validateResponse(responseText: string): ValidationResult {
  const issues: string[] = [];
  const flags: string[] = [];
  const lower = responseText.toLowerCase();
  let score = 10;

  // 1. Banned phrase scan
  for (const { phrase, label } of ALL_BANNED) {
    if (lower.includes(phrase)) {
      flags.push(`"${phrase}"`);
      issues.push(label);
      score -= 1.5;
    }
  }

  // 2. Opens with "I"
  if (opensWithI(responseText)) {
    issues.push("Opener: response opens with 'I'");
    score -= 1;
  }

  // 3. Filler soft-start
  if (hasFillerSoftStart(responseText)) {
    issues.push("Opener: begins with a filler hedge ('It sounds like', 'Maybe', etc.)");
    score -= 0.5;
  }

  // 4. Sentence count
  const sentenceCount = countSentences(responseText);
  if (sentenceCount > 6) {
    issues.push(`Length: ${sentenceCount} sentences (max 6)`);
    score -= (sentenceCount - 6) * 0.5;
  }

  // 5. Paragraph length
  const paragraphs = getParagraphs(responseText);
  for (const para of paragraphs) {
    const paraCount = countSentencesInParagraph(para);
    if (paraCount > 2) {
      issues.push(`Paragraph length: a paragraph has ${paraCount} sentences (max 2)`);
      score -= 0.5;
      break;
    }
  }

  // 6. Dramatic tone
  if (isOverlyDramatic(responseText)) {
    issues.push("Tone: multiple exclamation marks — overly dramatic");
    score -= 1;
  }

  // 7. Sermon markers
  if (soundsLikeSermon(responseText)) {
    issues.push("Tone: sermon language detected ('beloved', 'let us', 'amen', etc.)");
    score -= 1.5;
  }

  // 8. Structure: acknowledgment of reality
  if (!hasAcknowledgment(responseText)) {
    issues.push("Structure: no acknowledgment of the person's reality in the opening");
    score -= 1;
  }

  // 9. Structure: scripture reference
  if (!hasScriptureReference(responseText)) {
    issues.push("Structure: no scripture reference or natural anchor found");
    score -= 1;
  }

  // 10. Structure: truth reframe
  if (!hasTruthReframe(responseText)) {
    issues.push("Structure: no truth-based reframe detected");
    score -= 0.5;
  }

  // 11. Structure: gentle invitation (optional but scored)
  if (!hasGentleInvitation(responseText)) {
    issues.push("Structure: no gentle invitation or open question at the close");
    score -= 0.5;
  }

  // Clamp score
  const finalScore = Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  const approved = finalScore >= 8 && issues.length === 0;

  return {
    approved,
    score: finalScore,
    issues,
    flags,
  };
}

// ── Auto-retry wrapper ────────────────────────────────────────────────────────

export interface GuardrailOptions {
  maxAttempts?: number;          // default 3
  onReject?: (attempt: number, result: ValidationResult, text: string) => void;
}

/**
 * withGuardrails — wraps an async generator function and auto-retries
 * until the response passes validation or maxAttempts is reached.
 *
 * @param generatorFn   async function that returns the raw AI response string
 * @param options       retry config and optional rejection callback
 * @returns             the last generated text + final validation result
 */
export async function withGuardrails(
  generatorFn: (attempt: number) => Promise<string>,
  options: GuardrailOptions = {}
): Promise<{ text: string; validation: ValidationResult; attempts: number }> {
  const maxAttempts = options.maxAttempts ?? 3;
  let lastText = "";
  let lastValidation: ValidationResult = {
    approved: false,
    score: 0,
    issues: ["Not yet generated"],
    flags: [],
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastText = await generatorFn(attempt);
    lastValidation = validateResponse(lastText);

    if (lastValidation.approved) {
      return { text: lastText, validation: lastValidation, attempts: attempt };
    }

    if (options.onReject) {
      options.onReject(attempt, lastValidation, lastText);
    }

    if (attempt === maxAttempts) break;
  }

  // Return best available after exhausting attempts (prefer highest score)
  return { text: lastText, validation: lastValidation, attempts: maxAttempts };
}

// ── Scoring breakdown (debug / logging) ──────────────────────────────────────

export function explainScore(result: ValidationResult): string {
  const lines = [
    `Score: ${result.score}/10 — ${result.approved ? "APPROVED ✓" : "REJECTED ✗"}`,
  ];
  if (result.issues.length > 0) {
    lines.push("Issues:");
    result.issues.forEach(i => lines.push(`  • ${i}`));
  }
  if (result.flags.length > 0) {
    lines.push(`Flagged phrases: ${result.flags.join(", ")}`);
  }
  return lines.join("\n");
}
