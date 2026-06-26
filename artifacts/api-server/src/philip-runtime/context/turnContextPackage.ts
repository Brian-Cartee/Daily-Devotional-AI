export type TurnKind = "first_response" | "two_phase" | "follow_up";

/** Structured turn understanding + retrieval — no identity kernel, no move templates. */
export interface TurnContextPackage {
  turnKind: TurnKind;
  sections: Partial<Record<TurnContextSectionKey, string>>;
}

export type TurnContextSectionKey =
  | "sessionMind"
  | "person"
  | "heart"
  | "journey"
  | "relationship"
  | "relationshipProfile"
  | "priorSession"
  | "journalMemory"
  | "journalEcho"
  | "savedVerses"
  | "walkingThePath"
  | "situational"
  | "voice"
  | "patterns"
  | "safety";

export interface TurnContextSections {
  nameNote?: string;
  heartNote?: string;
  journeyNote?: string;
  relationshipNote?: string;
  relationshipProfileNote?: string;
  guidanceContinuityNote?: string;
  memoryNote?: string;
  journalEchoNote?: string;
  memoryVerseNote?: string;
  walkingThePathNote?: string;
  modeNote?: string;
  lateNightNote?: string;
  acutePainNote?: string;
  deepConversationNote?: string;
  userPatternNote?: string;
  voiceNote?: string;
  guidanceSafetyNote?: string;
  conversationStateBlock?: string;
}

const SECTION_ORDER: TurnContextSectionKey[] = [
  "sessionMind",
  "person",
  "heart",
  "journey",
  "situational",
  "relationship",
  "relationshipProfile",
  "priorSession",
  "journalMemory",
  "journalEcho",
  "savedVerses",
  "walkingThePath",
  "patterns",
  "voice",
  "safety",
];

/** Follow-up turns prioritize session mind over memory retrieval. */
const FOLLOW_UP_OMIT: TurnContextSectionKey[] = [
  "priorSession",
  "journalMemory",
  "journalEcho",
  "savedVerses",
  "walkingThePath",
];

export function isTurnContextPackageEnabled(): boolean {
  return process.env.PHILIP_TCP !== "0";
}

function stripNote(text: string | undefined): string {
  if (!text?.trim()) return "";
  return text.replace(/^\n+/, "").trim();
}

function mergeSituational(sections: TurnContextSections): string {
  const parts = [
    stripNote(sections.modeNote),
    stripNote(sections.lateNightNote),
    stripNote(sections.acutePainNote),
    stripNote(sections.deepConversationNote),
  ].filter(Boolean);
  return parts.join("\n\n");
}

export function buildTurnContextPackage(
  turnKind: TurnKind,
  raw: TurnContextSections,
): TurnContextPackage {
  const sections: Partial<Record<TurnContextSectionKey, string>> = {};

  const sessionMind = stripNote(raw.conversationStateBlock);
  if (sessionMind) sections.sessionMind = sessionMind;

  const person = stripNote(raw.nameNote);
  if (person) sections.person = person;

  const heart = stripNote(raw.heartNote);
  if (heart) sections.heart = heart;

  const journey = stripNote(raw.journeyNote);
  if (journey) sections.journey = journey;

  const relationship = stripNote(raw.relationshipNote);
  if (relationship) sections.relationship = relationship;

  const relationshipProfile = stripNote(raw.relationshipProfileNote);
  if (relationshipProfile) sections.relationshipProfile = relationshipProfile;

  const priorSession = stripNote(raw.guidanceContinuityNote);
  if (priorSession) sections.priorSession = priorSession;

  const journalMemory = stripNote(raw.memoryNote);
  if (journalMemory) sections.journalMemory = journalMemory;

  const journalEcho = stripNote(raw.journalEchoNote);
  if (journalEcho) sections.journalEcho = journalEcho;

  const savedVerses = stripNote(raw.memoryVerseNote);
  if (savedVerses) sections.savedVerses = savedVerses;

  const walkingThePath = stripNote(raw.walkingThePathNote);
  if (walkingThePath) sections.walkingThePath = walkingThePath;

  const situational = mergeSituational(raw);
  if (situational) sections.situational = situational;

  const patterns = stripNote(raw.userPatternNote);
  if (patterns) sections.patterns = patterns;

  const voice = stripNote(raw.voiceNote);
  if (voice) sections.voice = voice;

  const safety = stripNote(raw.guidanceSafetyNote);
  if (safety) sections.safety = safety;

  if (turnKind === "follow_up") {
    for (const key of FOLLOW_UP_OMIT) {
      delete sections[key];
    }
  }

  return { turnKind, sections };
}

export function orderedSectionKeys(pkg: TurnContextPackage): TurnContextSectionKey[] {
  return SECTION_ORDER.filter(key => pkg.sections[key]?.trim());
}

export const TCP_BUDGET_CHARS: Record<TurnKind, number> = {
  first_response: 5200,
  two_phase: 5200,
  follow_up: 3600,
};
