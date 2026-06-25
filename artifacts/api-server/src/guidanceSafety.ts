/**
 * Talk It Through — server-side safety classification (never import client-side).
 * Phrase lists are a first layer; CONCERNING adds a prompt note without blocking the LLM.
 */

export type SafetyLevel =
  | "safe"
  | "concerning"
  | "high_risk"
  | "emergency_medical"
  | "emergency_violence"
  | "emergency_abuse"
  | "emergency_threat";

export interface SafetyScanResult {
  level: SafetyLevel;
  /** Fixed response when level is not safe/concerning */
  response?: string;
  /** Appended to system prompt when level is concerning */
  systemNote?: string;
}

export const SAFETY_HEADER = "X-Guidance-Safety";

const HIGH_RISK_PHRASES = [
  "suicidal", "want to die", "kill myself", "end my life",
  "don't want to live", "wish i was dead", "ending it all",
  "not worth living", "hurt myself", "self-harm", "cut myself",
  "harm myself", "no reason to live", "better off dead",
  "want to kill myself", "thinking about suicide",
  "don't want to be here anymore", "i want to disappear forever",
  "tired of being alive", "tired of living",
  "nothing left to live for", "everyone would be better without me",
  "don't see the point of living",
  "wish i could disappear",
  "want to disappear forever",
  "people won't have to worry about me",
  "won't have to worry about me anymore",
  "family would be okay without me",
  "better off without me",
  "going to end it all",
  "plan to end it all",
  "made a plan to die",
  "tonight is the night",
  "not going to be here tomorrow",
  "say goodbye to everyone",
];

const IMMINENT_PHRASES = [
  "tonight is the night",
  "right now",
  "going to do it",
  "have a plan to",
  "made a plan",
  "took pills",
  "took a bottle",
  "overdose",
  "overdosed",
];

const CONCERNING_PHRASES = [
  "i'm done",
  "im done",
  "i can't do this anymore",
  "can't do this anymore",
  "can't go on anymore",
  "there's no point",
  "theres no point",
  "no point anymore",
  "i'm tired of fighting",
  "tired of fighting",
  "i don't see a future",
  "don't see a future",
  "what's the point",
  "whats the point",
  "don't want to keep going",
  "can't keep going",
  "want the pain to stop",
  "make it stop",
  "can't breathe",
  "chest is exploding",
  "having a panic attack",
  "panic attack",
];

/** Burnout/exhaustion — not suicidal crisis. Lighter pastoral note, no hotline dump. */
const EXHAUSTION_PHRASES = [
  "can't do this anymore",
  "i can't do this anymore",
  "i'm done",
  "im done",
  "can't keep going",
  "don't want to keep going",
  "i'm tired of fighting",
  "tired of fighting",
];

/** Hints at serious unsaid thoughts — not explicit SI. One quiet safety line, no hotline dump. */
const AMBIGUOUS_RISK_PHRASES = [
  "dark places",
  "dark place",
  "dark thoughts",
  "goes to dark",
  "go to dark",
  "going to dark",
  "wouldn't say out loud",
  "wouldnt say out loud",
  "won't say out loud",
  "wont say out loud",
  "can't say out loud",
  "cant say out loud",
  "don't say out loud",
  "dont say out loud",
  "never say out loud",
  "stuff i wouldn't",
  "things i wouldn't tell",
  "things i won't tell",
  "scared of what i might",
  "afraid of what i might",
  "thoughts i shouldn't",
  "dark headspace",
  "in a dark headspace",
];

export const EXHAUSTION_SYSTEM_NOTE = `

SAFETY CHECK (internal — do not quote this block):
The person sounds burned out or overwhelmed — not necessarily suicidal. Do NOT paste 988, crisis hotlines, or emergency resources unless they explicitly mention not wanting to live, self-harm, or suicide.
Acknowledge the weight of exhaustion in one brief line, then ask one specific pastoral question. Never invent how many days they've visited or "come back here."`;

export const AMBIGUOUS_RISK_SYSTEM_NOTE = `

SAFETY CHECK (internal — do not quote this block):
The person hinted at serious dark or unsaid thoughts without stating explicit self-harm or suicide.
Include ONE brief line naming what you heard and asking if they are safe right now.
Example: "You said some of this goes to places you don't say out loud — are you safe right now?"
Do NOT paste 988, crisis hotlines, or emergency resources unless they explicitly mention not wanting to live, self-harm, or a plan.
One line of care, then continue with one specific pastoral question. No lecture.`;

/** User is treating Philip as their only safe person — point outward once, no hotline dump. */
const DEPENDENCY_PHRASES = [
  "you're the only one",
  "youre the only one",
  "you are the only one",
  "only one i can tell",
  "only person i can tell",
  "only person i can talk",
  "only one i can talk",
  "only one who listens",
  "only one who understands",
  "only safe person",
  "only place i can",
  "only here i can",
  "only here that",
  "nobody else to talk",
  "no one else to talk",
  "nobody to talk to",
  "no one to talk to",
  "don't have anyone",
  "dont have anyone",
  "do not have anyone",
  "you're all i have",
  "youre all i have",
  "only one that",
  "nowhere else to go",
  "nobody else knows",
  "no one else knows",
  "only person who",
  "honestly the only",
  "only one i talk to",
  "lonely and you're",
  "lonely and you are",
];

const DEPENDENCY_EXCLUSION_PATTERNS = [
  /\bnot the only\b/i,
  /\byou're not the only\b/i,
  /\byou are not the only\b/i,
  /\bnot your only\b/i,
];

export const DEPENDENCY_SYSTEM_NOTE = `

DEPENDENCY CHECK (internal — do not quote this block):
The person signaled Philip may be their only safe outlet. Name that gently in ONE line, then point outward — to God and to one real person. Not a hotline dump. Not "as an AI." Not guilt.
Example: "This is too much for one room — is there one person, or one place before God, you could bring part of this?"
Then continue with one pastoral question. Once per conversation.`;

const MEDICAL_EMERGENCY_PHRASES = [
  "took a bottle of pills",
  "took pills",
  "swallowed pills",
  "overdosed",
  "overdose",
  "poisoned myself",
  "cut deep",
  "bleeding badly",
  "won't stop bleeding",
  "need an ambulance",
];

const VIOLENCE_EMERGENCY_PHRASES = [
  "he hit me",
  "she hit me",
  "they hit me",
  "he hits me",
  "she hits me",
  "he beat me",
  "she beat me",
  "he beats me",
  "she beats me",
  "afraid to go home",
  "scared to go home",
  "he says he'll kill",
  "she says she'll kill",
  "threatens to kill",
  "strangled me",
  "choked me",
  "locked me in",
  "won't let me leave",
];

const ABUSE_EMERGENCY_PHRASES = [
  "touching me",
  "molest",
  "molested",
  "sexually abus",
  "raped me",
  "raping me",
  "stepfather keeps",
  "stepdad keeps",
  "uncle keeps",
  "inappropriate touch",
  "abusing me",
  "abused me",
];

const THREAT_EMERGENCY_PHRASES = [
  "someone is coming after me",
  "coming after me",
  "has a gun",
  "have a gun",
  "going to shoot",
  "threatened to shoot",
  "they're outside",
  "they're breaking in",
  "someone is breaking in",
  "broke into my home",
  "broke into my house",
  "broke into my apartment",
  "broke into my car",
];

export const CRISIS_RESPONSE = `What you just shared — that matters. And so do you.

Please reach out right now to someone whose whole purpose is to be with you in this:

• Call or text 988 — Suicide & Crisis Lifeline (US, 24/7, free)
• Text HOME to 741741 — Crisis Text Line
• If you may hurt yourself or someone else right now, call 911
• Outside the US — findahelpline.com connects you to local help

You don't have to carry this alone. The people at 988 have sat with others in exactly this darkness — they are not there to judge, only to help.

God has not lost sight of you, even in this moment. Your life holds weight and meaning that extends beyond what you can feel right now. Please reach out.

I'm here when you're ready to keep walking.`;

const MEDICAL_EMERGENCY_RESPONSE = `What you shared sounds like a medical emergency.

Please call 911 or go to your nearest emergency room right now. If you are in the US, you can also call or text 988.

You deserve immediate help from people who can be with you in person.`;

const VIOLENCE_EMERGENCY_RESPONSE = `What you shared matters — and your safety comes first.

If you are in immediate danger, call 911 now.

• National Domestic Violence Hotline: call or text 988, or chat at thehotline.org
• US: 1-800-799-7233 (24/7)
• Outside the US — findahelpline.com

You do not have to face this alone. Please reach out to someone who can help you stay safe tonight.`;

const ABUSE_EMERGENCY_RESPONSE = `What you shared is serious — and you deserve protection and support.

If you or someone else is in immediate danger, call 911 now.

• Childhelp National Child Abuse Hotline (US): 1-800-422-4453
• Crisis Text Line: text HOME to 741741
• Outside the US — findahelpline.com

You are not to blame. Please reach out to someone trained to help keep you safe.`;

const THREAT_EMERGENCY_RESPONSE = `If you are in immediate danger, call 911 now.

You deserve help from people who can respond in person. If you can, move to a safer place and contact emergency services.

Outside the US — findahelpline.com connects you to local help.`;

export const CONCERNING_SYSTEM_NOTE = `

SAFETY CHECK (internal — do not quote this block):
The person may be in significant distress. Before any reflective question, include one brief line acknowledging the weight of what they shared and that if any part of this is about not wanting to be here or hurting themselves, 988 (call/text) and HOME to 741741 are there anytime. Do not diagnose. If they describe severe panic ("can't breathe", chest pain), do not ask a pastoral question — encourage immediate medical care or 911 if symptoms are acute. Keep total response under 100 words.`;

const LEVEL_PRIORITY: Record<SafetyLevel, number> = {
  safe: 0,
  concerning: 1,
  high_risk: 2,
  emergency_violence: 3,
  emergency_abuse: 3,
  emergency_threat: 4,
  emergency_medical: 5,
};

function matchesAny(lower: string, phrases: string[]): boolean {
  return phrases.some((p) => lower.includes(p));
}

/** "I'm not gonna hurt myself" must not trigger high_risk on the substring "hurt myself". */
function isNegatedRiskPhrase(lower: string, phrase: string): boolean {
  const idx = lower.indexOf(phrase);
  if (idx < 0) return false;
  const window = lower.slice(Math.max(0, idx - 35), idx);
  return /\b(not|no|never|isn't|isnt|aren't|arent|won't|wont|wouldn't|wouldnt|don't|dont|didn't|didnt|not gonna|not going to|without)\b/.test(window);
}

function matchesHighRisk(lower: string, phrase: string): boolean {
  if (!lower.includes(phrase)) return false;
  return !isNegatedRiskPhrase(lower, phrase);
}

function matchesHighRiskAny(lower: string, phrases: string[]): boolean {
  return phrases.some((p) => matchesHighRisk(lower, p));
}

function isExhaustionOnly(lower: string): boolean {
  const hasExhaustion = matchesAny(lower, EXHAUSTION_PHRASES);
  if (!hasExhaustion) return false;
  return !matchesHighRiskAny(lower, HIGH_RISK_PHRASES);
}

function matchesAmbiguousRisk(lower: string): boolean {
  if (matchesHighRiskAny(lower, HIGH_RISK_PHRASES)) return false;
  return AMBIGUOUS_RISK_PHRASES.some((p) => {
    if (!lower.includes(p)) return false;
    return !isNegatedRiskPhrase(lower, p);
  });
}

/** User hinted at dark/unsaid thoughts without explicit self-harm language. */
export function detectAmbiguousRisk(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return false;
  return matchesAmbiguousRisk(lower);
}

export function conversationHadAmbiguousRiskCheck(
  philipMessages: Array<{ content: string }>,
): boolean {
  return philipMessages.some(m =>
    /\b(are you safe|safe right now|safe tonight|okay tonight)\b/i.test(m.content),
  );
}

export function needsAmbiguousRiskAck(
  userMessage: string,
  philipMessages: Array<{ content: string }>,
): boolean {
  if (!detectAmbiguousRisk(userMessage)) return false;
  return !conversationHadAmbiguousRiskCheck(philipMessages);
}

export function prependAmbiguousRiskAck(response: string, exchangeNum: number): string {
  const acks = [
    "You said some of this goes to places you don't say out loud — are you safe right now?",
    "Some of what you're carrying sounds heavier than exhaustion — are you okay tonight?",
  ];
  const ack = acks[exchangeNum % acks.length];
  const trimmed = response.trim();
  if (!trimmed) return ack;
  return `${ack} ${trimmed}`;
}

/** Prepend a one-line safety check when user hints at dark/unsaid thoughts. */
export function enforceAmbiguousRiskCheck(
  response: string,
  userMessage: string,
  philipMessages: Array<{ content: string }>,
  exchangeNum: number,
): string {
  if (!needsAmbiguousRiskAck(userMessage, philipMessages)) return response;
  if (/\b(are you safe|safe right now|safe tonight|okay tonight)\b/i.test(response)) return response;
  return prependAmbiguousRiskAck(response, exchangeNum);
}

function matchesPhilipDependence(lower: string): boolean {
  if (DEPENDENCY_EXCLUSION_PATTERNS.some((p) => p.test(lower))) return false;
  return DEPENDENCY_PHRASES.some((p) => lower.includes(p));
}

/** User signaled Philip is their only safe outlet — dependency on Philip forming. */
export function detectPhilipDependence(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return false;
  return matchesPhilipDependence(lower);
}

export function conversationHadDependencyRedirect(
  philipMessages: Array<{ content: string }>,
): boolean {
  return philipMessages.some((m) =>
    /\b(too much for one room|too important for one room|isn't enough for|wasn't meant to live only here|one person before God|can't be the only place)\b/i.test(m.content),
  );
}

export function needsDependencyRedirect(
  userMessage: string,
  philipMessages: Array<{ content: string }>,
  allUserMessages: string[] = [],
): boolean {
  if (conversationHadDependencyRedirect(philipMessages)) return false;
  const corpus = allUserMessages.length > 0 ? allUserMessages : [userMessage];
  return corpus.some((m) => detectPhilipDependence(m));
}

export function prependDependencyRedirect(response: string, exchangeNum: number): string {
  const lines = [
    "This is too much for one room — is there one person, or one place before God, you could bring part of this?",
    "What you're carrying wasn't meant to live only here — who else might hear even a piece of it?",
    "Philip isn't enough for weight like this — is there someone in your life, or before God, you could trust with any of it?",
  ];
  const line = lines[exchangeNum % lines.length];
  const trimmed = response.trim();
  if (!trimmed) return line;
  return `${line} ${trimmed}`;
}

/** Prepend a one-line outward redirect when dependence on Philip is forming. */
export function enforceDependencyRedirect(
  response: string,
  userMessage: string,
  philipMessages: Array<{ content: string }>,
  exchangeNum: number,
  allUserMessages: string[] = [],
): string {
  if (!needsDependencyRedirect(userMessage, philipMessages, allUserMessages)) return response;
  if (/\b(are you safe|safe right now|safe tonight|okay tonight)\b/i.test(response)) return response;
  if (/\b(too much for one room|too important for one room|isn't enough for|wasn't meant to live only here|one person before God|can't be the only place)\b/i.test(response)) {
    return response;
  }
  return prependDependencyRedirect(response, exchangeNum);
}

function buildHighRiskResponse(text: string): string {
  const lower = text.toLowerCase();
  if (matchesAny(lower, IMMINENT_PHRASES)) {
    return CRISIS_RESPONSE;
  }
  return CRISIS_RESPONSE;
}

function classifySingleText(text: string): SafetyScanResult {
  const lower = text.toLowerCase().trim();
  if (!lower) return { level: "safe" };

  if (matchesAny(lower, MEDICAL_EMERGENCY_PHRASES)) {
    return { level: "emergency_medical", response: MEDICAL_EMERGENCY_RESPONSE };
  }
  if (matchesAny(lower, THREAT_EMERGENCY_PHRASES)) {
    return { level: "emergency_threat", response: THREAT_EMERGENCY_RESPONSE };
  }
  if (matchesAny(lower, ABUSE_EMERGENCY_PHRASES)) {
    return { level: "emergency_abuse", response: ABUSE_EMERGENCY_RESPONSE };
  }
  if (matchesAny(lower, VIOLENCE_EMERGENCY_PHRASES)) {
    return { level: "emergency_violence", response: VIOLENCE_EMERGENCY_RESPONSE };
  }
  if (matchesHighRiskAny(lower, HIGH_RISK_PHRASES)) {
    return { level: "high_risk", response: buildHighRiskResponse(text) };
  }
  if (matchesAmbiguousRisk(lower)) {
    return { level: "concerning", systemNote: AMBIGUOUS_RISK_SYSTEM_NOTE };
  }
  if (isExhaustionOnly(lower)) {
    return { level: "concerning", systemNote: EXHAUSTION_SYSTEM_NOTE };
  }
  if (matchesAny(lower, CONCERNING_PHRASES)) {
    return { level: "concerning", systemNote: CONCERNING_SYSTEM_NOTE };
  }
  return { level: "safe" };
}

export function mergeSafetyResults(a: SafetyScanResult, b: SafetyScanResult): SafetyScanResult {
  if (LEVEL_PRIORITY[b.level] > LEVEL_PRIORITY[a.level]) return b;
  if (LEVEL_PRIORITY[b.level] < LEVEL_PRIORITY[a.level]) return a;
  if (a.systemNote && !b.systemNote) return a;
  if (b.systemNote && !a.systemNote) return b;
  return a;
}

/** Scan one user-authored string. */
export function scanUserText(text: string): SafetyScanResult {
  return classifySingleText(text);
}

/** Backward-compatible boolean — true when LLM must be bypassed. */
export function detectCrisis(text: string): boolean {
  const result = scanUserText(text);
  return result.level !== "safe" && result.level !== "concerning";
}

/** True for any elevated signal including concerning (for analytics). */
export function detectCrisisSignal(text: string): boolean {
  const result = scanUserText(text);
  return result.level !== "safe";
}

export function scanGuidanceTexts(parts: {
  situation?: string;
  phase1UserReply?: string;
  messages?: Array<{ role: string; content: string }>;
}): SafetyScanResult {
  let merged: SafetyScanResult = { level: "safe" };
  const push = (t?: string) => {
    if (!t?.trim()) return;
    merged = mergeSafetyResults(merged, scanUserText(t));
  };

  // Multi-turn: only scan the latest user message for safety level.
  // Re-scanning the opening situation every turn re-triggers concerning/crisis notes
  // on phrases like "can't do this anymore" long after they've been contextualized.
  if (parts.messages && parts.messages.length > 0) {
    const lastUserMsg = [...parts.messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) push(lastUserMsg.content);
  } else {
    push(parts.situation);
    push(parts.phase1UserReply);
  }

  return merged;
}

export function shouldBlockLlm(result: SafetyScanResult): boolean {
  return result.level !== "safe" && result.level !== "concerning";
}

export function concerningSystemNote(result: SafetyScanResult): string {
  return result.level === "concerning" ? (result.systemNote ?? CONCERNING_SYSTEM_NOTE) : "";
}
