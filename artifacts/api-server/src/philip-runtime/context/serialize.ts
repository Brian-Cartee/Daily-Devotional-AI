import type { TurnContextPackage, TurnContextSectionKey } from "./turnContextPackage";
import { orderedSectionKeys, TCP_BUDGET_CHARS } from "./turnContextPackage";

const SECTION_LABELS: Record<TurnContextSectionKey, string> = {
  sessionMind: "SESSION UNDERSTANDING",
  person: "PERSON",
  heart: "HEART CHECK",
  journey: "JOURNEY",
  situational: "SITUATION",
  relationship: "RELATIONSHIP",
  relationshipProfile: "RELATIONSHIP PROFILE",
  priorSession: "PRIOR SESSION",
  journalMemory: "KNOWN FROM PAST",
  journalEcho: "RECENT JOURNAL THEMES",
  savedVerses: "SAVED VERSES",
  walkingThePath: "FORMATION",
  patterns: "PATTERNS",
  voice: "VOICE",
  safety: "SAFETY",
};

const TCP_PREAMBLE = `Structured context for this turn. Session understanding is authoritative. Use memory softly — never quote journal entries verbatim. Do not invent history the user did not share.`;

export interface SerializeTurnContextResult {
  text: string;
  charCount: number;
  sectionsIncluded: TurnContextSectionKey[];
  sectionsDropped: TurnContextSectionKey[];
  budgetChars: number;
}

function truncateSection(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return `${content.slice(0, maxChars - 1)}…`;
}

export function serializeTurnContextPackage(pkg: TurnContextPackage): SerializeTurnContextResult {
  const budgetChars = TCP_BUDGET_CHARS[pkg.turnKind];
  const keys = orderedSectionKeys(pkg);
  const sectionsIncluded: TurnContextSectionKey[] = [];
  const sectionsDropped: TurnContextSectionKey[] = [];

  const header = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "TURN CONTEXT",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    TCP_PREAMBLE,
  ].join("\n");

  let body = "";
  let remaining = budgetChars;

  for (const key of keys) {
    const content = pkg.sections[key]?.trim() ?? "";
    if (!content) continue;

    const label = SECTION_LABELS[key];
    const block = `\n\n[${label}]\n${content}`;
    if (block.length > remaining) {
      if (remaining > 120) {
        const trimmed = truncateSection(content, remaining - label.length - 8);
        body += `\n\n[${label}]\n${trimmed}`;
        sectionsIncluded.push(key);
      } else {
        sectionsDropped.push(key);
      }
      remaining = 0;
      break;
    }

    body += block;
    remaining -= block.length;
    sectionsIncluded.push(key);
  }

  const droppedKeys = keys.filter(k => !sectionsIncluded.includes(k) && !sectionsDropped.includes(k));
  sectionsDropped.push(...droppedKeys);

  const text = body ? `${header}${body}` : "";
  return {
    text,
    charCount: text.length,
    sectionsIncluded,
    sectionsDropped,
    budgetChars,
  };
}

/** Legacy inline concatenation — used when PHILIP_TCP=0. */
export function serializeLegacyDynamicNotes(notes: string[]): string {
  return notes.filter(n => n?.trim()).join("");
}
