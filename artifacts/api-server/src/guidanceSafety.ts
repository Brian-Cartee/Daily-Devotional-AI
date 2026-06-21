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
  "tired of being alive", "tired of living", "can't go on anymore",
  "nothing left to live for", "everyone would be better without me",
  "don't see the point of living",
  "wish i could disappear",
  "want to disappear forever",
  "people won't have to worry about me",
  "won't have to worry about me anymore",
  "family would be okay without me",
  "better off without me",
  "going to end it",
  "plan to end it",
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
  "hit me",
  "hits me",
  "beat me",
  "beats me",
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
  "breaking in",
  "broke into",
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
  if (matchesAny(lower, HIGH_RISK_PHRASES)) {
    return { level: "high_risk", response: buildHighRiskResponse(text) };
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
  push(parts.situation);
  push(parts.phase1UserReply);
  if (parts.messages) {
    for (const m of parts.messages) {
      if (m.role === "user") push(m.content);
    }
  }
  return merged;
}

export function shouldBlockLlm(result: SafetyScanResult): boolean {
  return result.level !== "safe" && result.level !== "concerning";
}

export function concerningSystemNote(result: SafetyScanResult): string {
  return result.level === "concerning" ? (result.systemNote ?? CONCERNING_SYSTEM_NOTE) : "";
}
