#!/usr/bin/env node
/**
 * Memory orchestrator unit checks (PR-7).
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-memory-orchestrator.mjs
 */
import {
  orchestrateMemoryRetrieval,
  scoreVerseRelevance,
  extractJournalThemes,
} from "../artifacts/api-server/src/philip-runtime/memory/orchestrator.ts";
import { isMemoryOrchestratorEnabled } from "../artifacts/api-server/src/philip-runtime/memory/policies.ts";

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

const fullJournal = "\n\nWhat you already know:\n[Prayer — Family]: They wrote about stress at home and feeling alone.";
const fullEcho = "\n\nRecent entries:\n[Prayer, written yesterday]: I cannot keep doing this alone.";
const fullVerses = '\n\nSaved verses:\nPsalm 23 — "The Lord is my shepherd"';
const fullPrior = "\n\nPRIOR TALK IT THROUGH\nEmotional weight: grief about someone you love";
const fullProfile = "\n\nTrust: returning (2 prior sessions).\nDo not re-ask: marriage distance";
const fullPatterns = '\n\nPattern recognition: "often carries worry at night"';

const baseRaw = {
  situation: "My marriage feels distant and I am exhausted",
  coreIssue: "marriage distance",
  exchangeNum: 0,
  journalContext: "snippet",
  journalThemes: ["Prayer: Family stress", "Reflection: loneliness"],
  journalEcho: "echo",
  journalEchoThemes: ["Prayer: exhaustion"],
  savedVerses: "Psalm 23",
  savedVerseList: [{ reference: "Psalm 23", text: "The Lord is my shepherd; I shall not want." }],
  priorSession: {
    memory: {
      summary: "internal",
      carryForward: "You were carrying grief about someone you love.",
      explored: ["loss"],
      themes: ["grief"],
    },
    ageMs: 86400000,
    createdAt: new Date().toISOString(),
  },
  relationshipProfile: {
    v: 1,
    sessionId: "s1",
    trustBand: "returning",
    exploredAcrossSessions: ["marriage distance"],
    themesAcrossSessions: ["marriage"],
    sessionCount: 2,
    directnessCeiling: 2,
    updatedAt: new Date().toISOString(),
  },
  walkingThePathEligible: true,
  walkingThePathNote: "\n\nWalking the path tonal shift",
  userMemCtx: {
    dominantEmotion: null,
    recentTrend: null,
    spiritualState: "growing",
    engagementLevel: "regular",
    recentEmotions: [],
    naturalLanguageHint: "often carries worry at night",
  },
  fullNotes: {
    memoryNote: `\n\nJournal context:\n${"grief and loss at home. ".repeat(30)}`,
    journalEchoNote: `\n\nRecent entries:\n${"work stress and exhaustion. ".repeat(30)}`,
    memoryVerseNote: fullVerses,
    guidanceContinuityNote: fullPrior,
    relationshipProfileNote: fullProfile,
    walkingThePathNote: "\n\nWalking the path tonal shift",
    userPatternNote: fullPatterns,
  },
};

console.log("Memory orchestrator — stage policies");

assert("enabled by default", isMemoryOrchestratorEnabled());

const recognition = orchestrateMemoryRetrieval({
  ...baseRaw,
  turnKind: "first_response",
  exchangeNum: 0,
});
assert("recognition uses themes not full journal", recognition.memoryNote.includes("themes") && !recognition.memoryNote.includes("cannot keep"));
assert("recognition carry-forward only for prior", recognition.guidanceContinuityNote.includes("carry-forward") && !recognition.guidanceContinuityNote.includes("PRIOR TALK IT THROUGH"));
assert("recognition saved verses off", recognition.memoryVerseNote === "");
assert("recognition stage", recognition.policyStage === "recognition");

const exploration = orchestrateMemoryRetrieval({
  ...baseRaw,
  turnKind: "follow_up",
  exchangeNum: 2,
  cachedSessionMind: { stage: "exploration", version: 2, exchangeNum: 2, philipSummaries: [], state: {}, phase1Included: true, canonicalTurnCount: 4 },
});
assert("exploration omits journal", exploration.memoryNote === "" && exploration.journalEchoNote === "");
assert("exploration keeps compact profile", exploration.relationshipProfileNote.includes("Do not re-ask"));
assert("exploration patterns compact", exploration.userPatternNote.includes("Consistent return"));

const closing = orchestrateMemoryRetrieval({
  ...baseRaw,
  turnKind: "follow_up",
  exchangeNum: 5,
  conversationClosing: true,
});
assert("closing strips memory", closing.memoryNote === "" && closing.relationshipProfileNote === "" && closing.memoryVerseNote === "");
assert("closing stage", closing.policyStage === "closing");

const fullChars = Object.values(baseRaw.fullNotes).join("").length;
assert("recognition retrieval smaller than full dump", recognition.retrievalCharCount < fullChars * 0.7);

const verseScore = scoreVerseRelevance(
  { reference: "Psalm 23", text: "The Lord is my shepherd; I shall not want." },
  ["marriage", "shepherd", "lord", "want", "exhausted"],
);
assert("verse relevance scores", verseScore >= 0.7);

const themes = extractJournalThemes([
  { type: "prayer", content: "Lord help me with my family stress tonight", title: "Family" },
]);
assert("theme extraction avoids long quotes", themes[0].includes("Prayer") && themes[0].length < 50);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
