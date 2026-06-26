import type { GuidanceContinuityRecord } from "../../lib/guidanceMemory";
import type { MemoryContext } from "../../lib/userMemory";
import { buildMemoryPromptNote } from "../../lib/userMemory";
import {
  buildGuidanceContinuityPrompt,
  sanitizeCarryForwardForSpeech,
} from "../../lib/guidanceMemory";
import {
  buildRelationshipProfileCompactNote,
  buildRelationshipProfileTcpNote,
  profileHasSignal,
  type RelationshipProfile,
} from "../mind/relationshipProfile";
import { inferSessionMindStage } from "../mind/sessionMind";
import type { SessionMind, SessionMindStage } from "../mind/types";
import type { TurnKind } from "../context/turnContextPackage";
import {
  isMemoryOrchestratorEnabled,
  resolveEffectivePolicy,
  VERSE_RELEVANCE_THRESHOLD,
  type MemorySourceKey,
  type RetrievalMode,
} from "./policies";

export interface StructuredVerse {
  reference: string;
  text: string;
}

export interface MemoryRawInput {
  turnKind: TurnKind;
  situation: string;
  coreIssue?: string;
  cachedSessionMind?: SessionMind | null;
  conversationClosing?: boolean;
  exchangeNum: number;
  journalContext: string;
  journalThemes: string[];
  journalEcho: string;
  journalEchoThemes: string[];
  savedVerses: string;
  savedVerseList: StructuredVerse[];
  priorSession: GuidanceContinuityRecord | null;
  relationshipProfile: RelationshipProfile | null;
  walkingThePathEligible: boolean;
  walkingThePathNote: string;
  userMemCtx: MemoryContext;
  fullNotes: {
    memoryNote: string;
    journalEchoNote: string;
    memoryVerseNote: string;
    guidanceContinuityNote: string;
    relationshipProfileNote: string;
    walkingThePathNote: string;
    userPatternNote: string;
  };
}

export interface MemoryOrchestrationResult {
  memoryNote: string;
  journalEchoNote: string;
  memoryVerseNote: string;
  guidanceContinuityNote: string;
  relationshipProfileNote: string;
  walkingThePathNote: string;
  userPatternNote: string;
  policyStage: SessionMindStage;
  sectionsIncluded: MemorySourceKey[];
  retrievalCharCount: number;
}

export function resolveMindStageForRetrieval(input: {
  cachedSessionMind?: SessionMind | null;
  conversationClosing?: boolean;
  exchangeNum: number;
}): SessionMindStage {
  if (input.cachedSessionMind?.stage) return input.cachedSessionMind.stage;
  return inferSessionMindStage(
    input.exchangeNum,
    input.conversationClosing ?? false,
  );
}

export function scoreVerseRelevance(verse: StructuredVerse, cues: string[]): number {
  const cueText = cues.join(" ").toLowerCase();
  if (!cueText.trim()) return 0;

  const verseWords = `${verse.reference} ${verse.text}`
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 4);
  const unique = [...new Set(verseWords)];
  if (unique.length === 0) return 0;

  let hits = 0;
  for (const word of unique) {
    if (cueText.includes(word)) hits++;
  }

  return Math.min(1, hits / 4);
}

function buildThemesNote(kind: "journal" | "echo", themes: string[]): string {
  if (themes.length === 0) return "";
  const label = kind === "journal" ? "journal" : "recent journal";
  return `\n\n${kind === "journal" ? "Background" : "Recent"} themes from their ${label} (labels only — never quote entries, never say "you wrote"):\n${themes.join("\n")}`;
}

function buildPriorSessionCarryForwardNote(record: GuidanceContinuityRecord): string {
  const weight = record.memory.carryForward?.trim()
    || record.memory.summary?.trim();
  if (!weight) return "";
  const cf = record.memory.carryForward
    ? sanitizeCarryForwardForSpeech(record.memory.carryForward)
    : undefined;
  const line = cf || "They were carrying something heavy before.";
  return `\n\nPrior Talk it Through — soft carry-forward only (never assume unchanged, never quote):\n${line}`;
}

function buildPriorSessionExploredNote(record: GuidanceContinuityRecord): string {
  const explored = record.memory.explored?.filter(Boolean) ?? [];
  if (explored.length === 0) return "";
  return `\n\nPrior session ground already walked (do not re-ask unless they reopen):\n${explored.map((e) => `  - ${e}`).join("\n")}`;
}

function buildConditionalVersesNote(
  verses: StructuredVerse[],
  cues: string[],
  fullNote: string,
): string {
  const relevant = verses.filter(
    (v) => scoreVerseRelevance(v, cues) >= VERSE_RELEVANCE_THRESHOLD,
  );
  if (relevant.length === 0) return "";
  if (relevant.length === verses.length && fullNote.trim()) return fullNote;

  const lines = relevant
    .map((v) => `${v.reference} — "${v.text.slice(0, 100)}"`)
    .join("\n");
  return `\n\nSaved scripture that may fit what they are carrying now (surface only if the connection is real):\n${lines}\n\nNever force a verse. One natural mention at most.`;
}

function buildCompactPatternsNote(ctx: MemoryContext): string {
  const parts: string[] = [];
  if (ctx.spiritualState === "struggling") {
    parts.push("They are in a harder stretch — presence over insight.");
  } else if (ctx.spiritualState === "growing" && ctx.engagementLevel !== "new") {
    parts.push("Consistent return — slightly deeper angle is appropriate.");
  }
  if (parts.length === 0) return "";
  return `\n\nEngagement signal (background only): ${parts.join(" ")}`;
}

function applyMode(
  source: MemorySourceKey,
  mode: RetrievalMode,
  raw: MemoryRawInput,
  cues: string[],
): string {
  const full = raw.fullNotes;

  switch (source) {
    case "journalMemory":
      if (mode === "off") return "";
      if (mode === "themes") return buildThemesNote("journal", raw.journalThemes);
      if (mode === "full") return full.memoryNote;
      return "";

    case "journalEcho":
      if (mode === "off") return "";
      if (mode === "themes") return buildThemesNote("echo", raw.journalEchoThemes);
      if (mode === "full") return full.journalEchoNote;
      return "";

    case "savedVerses":
      if (mode === "off") return "";
      if (mode === "conditional") {
        return buildConditionalVersesNote(raw.savedVerseList, cues, full.memoryVerseNote);
      }
      if (mode === "full") return full.memoryVerseNote;
      return "";

    case "priorSession":
      if (!raw.priorSession) return "";
      if (mode === "off") return "";
      if (mode === "carryForward") return buildPriorSessionCarryForwardNote(raw.priorSession);
      if (mode === "explored") return buildPriorSessionExploredNote(raw.priorSession);
      if (mode === "full") return full.guidanceContinuityNote || buildGuidanceContinuityPrompt(raw.priorSession);
      return "";

    case "relationshipProfile":
      if (!raw.relationshipProfile || !profileHasSignal(raw.relationshipProfile)) return "";
      if (mode === "off") return "";
      if (mode === "compact") {
        const compact = buildRelationshipProfileCompactNote(raw.relationshipProfile);
        return compact ? `\n\n${compact}` : "";
      }
      if (mode === "full") return full.relationshipProfileNote || buildRelationshipProfileTcpNote(raw.relationshipProfile);
      return "";

    case "walkingThePath":
      if (mode === "off" || !raw.walkingThePathEligible) return "";
      if (mode === "full") return full.walkingThePathNote;
      return "";

    case "patterns":
      if (mode === "off") return "";
      if (mode === "compact") return buildCompactPatternsNote(raw.userMemCtx);
      if (mode === "full") return full.userPatternNote || buildMemoryPromptNote(raw.userMemCtx);
      return "";

    default:
      return "";
  }
}

export function extractJournalThemes(
  entries: Array<{ type: string; content: string; title?: string | null }>,
  max = 4,
): string[] {
  const visible = entries.filter((e) => e.type !== "guidance_memory").slice(0, max);
  return visible.map((e) => {
    const typeLabel =
      e.type === "prayer" ? "Prayer"
        : e.type === "reflection" ? "Reflection"
          : e.type === "verse" ? "Scripture"
            : "Note";
    const title = e.title?.trim();
    if (title && title.length <= 36) return `${typeLabel}: ${title}`;
    const words = e.content.replace(/\n+/g, " ").trim().split(/\s+/).slice(0, 5).join(" ");
    if (words.length > 36) return `${typeLabel} (recent)`;
    return `${typeLabel}: ${words}`;
  });
}

export function orchestrateMemoryRetrieval(raw: MemoryRawInput): MemoryOrchestrationResult {
  if (!isMemoryOrchestratorEnabled()) {
    const notes = raw.fullNotes;
    const allChars = Object.values(notes).join("").length;
    return {
      ...notes,
      policyStage: resolveMindStageForRetrieval({
        cachedSessionMind: raw.cachedSessionMind,
        conversationClosing: raw.conversationClosing,
        exchangeNum: raw.exchangeNum,
      }),
      sectionsIncluded: [],
      retrievalCharCount: allChars,
    };
  }

  const policyStage = resolveMindStageForRetrieval({
    cachedSessionMind: raw.cachedSessionMind,
    conversationClosing: raw.conversationClosing,
    exchangeNum: raw.exchangeNum,
  });
  const policy = resolveEffectivePolicy(policyStage, raw.turnKind);
  const cues = [raw.situation, raw.coreIssue ?? ""].filter(Boolean);
  const sectionsIncluded: MemorySourceKey[] = [];

  const memoryNote = applyMode("journalMemory", policy.journalMemory, raw, cues);
  if (memoryNote) sectionsIncluded.push("journalMemory");

  const journalEchoNote = applyMode("journalEcho", policy.journalEcho, raw, cues);
  if (journalEchoNote) sectionsIncluded.push("journalEcho");

  const memoryVerseNote = applyMode("savedVerses", policy.savedVerses, raw, cues);
  if (memoryVerseNote) sectionsIncluded.push("savedVerses");

  const guidanceContinuityNote = applyMode("priorSession", policy.priorSession, raw, cues);
  if (guidanceContinuityNote) sectionsIncluded.push("priorSession");

  const relationshipProfileNote = applyMode("relationshipProfile", policy.relationshipProfile, raw, cues);
  if (relationshipProfileNote) sectionsIncluded.push("relationshipProfile");

  const walkingThePathNote = applyMode("walkingThePath", policy.walkingThePath, raw, cues);
  if (walkingThePathNote) sectionsIncluded.push("walkingThePath");

  const userPatternNote = applyMode("patterns", policy.patterns, raw, cues);
  if (userPatternNote) sectionsIncluded.push("patterns");

  const retrievalCharCount =
    memoryNote.length
    + journalEchoNote.length
    + memoryVerseNote.length
    + guidanceContinuityNote.length
    + relationshipProfileNote.length
    + walkingThePathNote.length
    + userPatternNote.length;

  return {
    memoryNote,
    journalEchoNote,
    memoryVerseNote,
    guidanceContinuityNote,
    relationshipProfileNote,
    walkingThePathNote,
    userPatternNote,
    policyStage,
    sectionsIncluded,
    retrievalCharCount,
  };
}
