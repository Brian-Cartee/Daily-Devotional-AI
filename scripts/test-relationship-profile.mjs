#!/usr/bin/env node
/**
 * Relationship Profile v0 unit checks (PR-6).
 * Run: cd artifacts/api-server && node --import tsx/esm ../../scripts/test-relationship-profile.mjs
 */
import {
  mergeGuidanceMemoryIntoProfile,
  bootstrapProfileFromJournal,
  buildRelationshipProfileTcpNote,
  buildRelationshipProfilePlannerAddendum,
  mergedPriorExplored,
  sanitizeProfileLabel,
  isRelationshipProfileEnabled,
  profileHasSignal,
} from "../artifacts/api-server/src/philip-runtime/mind/relationshipProfile.ts";

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

console.log("Relationship profile — merge and TCP");

const session1 = {
  summary: "They were grieving a parent loss and feeling distant from God.",
  carryForward: "You were carrying grief about someone you love.",
  themes: ["grief", "distance from God"],
  explored: ["loss of parent", "anger at God"],
};

let profile = mergeGuidanceMemoryIntoProfile(null, session1, "sess-1", { isNewSession: true });
assert("first session sets returning trust", profile.trustBand === "returning");
assert("stores themes only", profile.themesAcrossSessions.includes("grief"));
assert("stores explored", profile.exploredAcrossSessions.includes("loss of parent"));
assert("does not store summary verbatim", !profile.carryForward?.includes("parent loss"));

const session2 = {
  summary: "Marriage tension resurfaced; they tried texting again.",
  themes: ["marriage"],
  explored: ["communication with spouse"],
};
profile = mergeGuidanceMemoryIntoProfile(profile, session2, "sess-1", { isNewSession: true });
assert("second session bumps count", profile.sessionCount === 2);
assert("merges explored deduped", profile.exploredAcrossSessions.length >= 3);
assert("familiar after 3 sessions", mergeGuidanceMemoryIntoProfile(profile, { summary: "x", explored: ["work stress"] }, "sess-1", { isNewSession: true }).trustBand === "familiar");

const journalEntries = [
  {
    type: "guidance_memory",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    content: JSON.stringify({
      v: 2,
      summary: "internal",
      themes: ["doubt"],
      explored: ["faith questions"],
    }),
  },
  {
    type: "guidance_memory",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    content: JSON.stringify({
      v: 2,
      summary: "internal",
      themes: ["exhaustion"],
      explored: ["burnout at work"],
    }),
  },
];

const boot = bootstrapProfileFromJournal("sess-2", journalEntries);
assert("bootstrap from journal", boot && boot.sessionCount === 2);
assert("bootstrap has themes", boot?.themesAcrossSessions.length === 2);

const tcp = buildRelationshipProfileTcpNote(profile);
assert("TCP includes trust posture", /Trust:|directness|Recurring themes/i.test(tcp));
assert("TCP has cross-session explored", /Cross-session ground/i.test(tcp));
assert("TCP forbids quoting", /Never quote/i.test(tcp));

const planner = buildRelationshipProfilePlannerAddendum(profile);
assert("planner addendum lists explored", planner.includes("RELATIONSHIP PROFILE"));

const merged = mergedPriorExplored(["loss of parent"], profile);
assert("merged prior explored dedupes", merged.length >= 2);

assert("rejects long quote-like labels", sanitizeProfileLabel('"I cannot do this anymore"') === "");
assert("enabled by default", isRelationshipProfileEnabled());
assert("profile has signal", profileHasSignal(profile));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
