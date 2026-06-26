import {
  parseGuidanceMemoryContent,
  sanitizeCarryForwardForSpeech,
  type GuidanceMemoryPayload,
} from "../../lib/guidanceMemory";

export const RELATIONSHIP_PROFILE_VERSION = 1;

export type TrustBand = "new" | "returning" | "familiar" | "entrusted";

export interface RelationshipProfile {
  v: number;
  sessionId: string;
  trustBand: TrustBand;
  exploredAcrossSessions: string[];
  themesAcrossSessions: string[];
  carryForward?: string;
  lastMeaningfulTopic?: string;
  sessionCount: number;
  directnessCeiling: 1 | 2 | 3;
  updatedAt: string;
}

const MAX_EXPLORED = 12;
const MAX_THEMES = 8;
const PROFILE_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000;

export function isRelationshipProfileEnabled(): boolean {
  return process.env.PHILIP_RELATIONSHIP_PROFILE !== "0";
}

/** Theme/explored labels only — no journal sentences. */
export function sanitizeProfileLabel(text: string): string {
  let s = text.trim().replace(/\s+/g, " ");
  if (s.length > 80) s = s.slice(0, 77) + "…";
  if (/["“”]/.test(s)) return "";
  if (s.split(/\s+/).length > 12) return "";
  return s;
}

function dedupeLabels(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const label = sanitizeProfileLabel(raw);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= max) break;
  }
  return out;
}

function mergeLabelLists(existing: string[], incoming: string[], max: number): string[] {
  return dedupeLabels([...incoming, ...existing], max);
}

export function computeTrustBand(sessionCount: number): TrustBand {
  if (sessionCount >= 6) return "entrusted";
  if (sessionCount >= 3) return "familiar";
  if (sessionCount >= 1) return "returning";
  return "new";
}

export function directnessCeilingForTrust(trustBand: TrustBand): 1 | 2 | 3 {
  if (trustBand === "entrusted" || trustBand === "familiar") return 3;
  if (trustBand === "returning") return 2;
  return 1;
}

export function collectCompletedGuidanceMemories(
  entries: Array<{ type: string; content: string; createdAt: string | Date }>,
): GuidanceMemoryPayload[] {
  const results: GuidanceMemoryPayload[] = [];
  for (const entry of entries) {
    if (entry.type !== "guidance_memory") continue;
    const ageMs = Date.now() - new Date(entry.createdAt).getTime();
    if (ageMs > PROFILE_MAX_AGE_MS) continue;
    const memory = parseGuidanceMemoryContent(entry.content);
    const hasStructure = (memory.explored?.length ?? 0) > 0 || (memory.themes?.length ?? 0) > 0;
    if (!hasStructure) continue;
    results.push(memory);
  }
  return results;
}

export function mergeGuidanceMemoryIntoProfile(
  existing: RelationshipProfile | null,
  sessionMemory: GuidanceMemoryPayload,
  sessionId: string,
  options?: { isNewSession?: boolean },
): RelationshipProfile {
  const exploredIncoming = sessionMemory.explored?.filter(Boolean) ?? [];
  const themesIncoming = sessionMemory.themes?.filter(Boolean) ?? [];
  const carry = sessionMemory.carryForward
    ? sanitizeCarryForwardForSpeech(sessionMemory.carryForward)
    : undefined;

  const sessionCount = (existing?.sessionCount ?? 0) + (options?.isNewSession ? 1 : 0);
  const trustBand = computeTrustBand(sessionCount);

  const exploredAcrossSessions = mergeLabelLists(
    existing?.exploredAcrossSessions ?? [],
    exploredIncoming,
    MAX_EXPLORED,
  );
  const themesAcrossSessions = mergeLabelLists(
    existing?.themesAcrossSessions ?? [],
    themesIncoming,
    MAX_THEMES,
  );

  const lastMeaningfulTopic =
    themesIncoming[0]
    ?? exploredIncoming[0]
    ?? existing?.lastMeaningfulTopic;

  return {
    v: RELATIONSHIP_PROFILE_VERSION,
    sessionId,
    trustBand,
    exploredAcrossSessions,
    themesAcrossSessions,
    carryForward: carry || existing?.carryForward,
    lastMeaningfulTopic: lastMeaningfulTopic
      ? sanitizeProfileLabel(lastMeaningfulTopic) || existing?.lastMeaningfulTopic
      : existing?.lastMeaningfulTopic,
    sessionCount,
    directnessCeiling: directnessCeilingForTrust(trustBand),
    updatedAt: new Date().toISOString(),
  };
}

export function bootstrapProfileFromJournal(
  sessionId: string,
  entries: Array<{ type: string; content: string; createdAt: string | Date }>,
): RelationshipProfile | null {
  const memories = collectCompletedGuidanceMemories(entries);
  if (memories.length === 0) return null;

  let profile: RelationshipProfile | null = null;
  for (let i = 0; i < memories.length; i++) {
    profile = mergeGuidanceMemoryIntoProfile(profile, memories[i], sessionId, {
      isNewSession: true,
    });
  }
  return profile;
}

export function profileHasSignal(profile: RelationshipProfile | null): boolean {
  if (!profile) return false;
  return (
    profile.sessionCount > 0
    || profile.exploredAcrossSessions.length > 0
    || profile.themesAcrossSessions.length > 0
    || !!profile.carryForward
  );
}

export function buildRelationshipProfileTcpNote(profile: RelationshipProfile): string {
  const trustLabels: Record<TrustBand, string> = {
    new: "still forming",
    returning: "returning",
    familiar: "familiar over time",
    entrusted: "deep trust earned",
  };

  const directness =
    profile.directnessCeiling >= 3
      ? "Earned directness is appropriate — they have shown up repeatedly. Ask the harder question when it fits."
      : profile.directnessCeiling >= 2
        ? "Warm depth is appropriate; do not rush past what they offer."
        : "Lead with recognition and patience; trust is still forming.";

  const themes = profile.themesAcrossSessions.slice(0, 4).join(", ");
  const explored = profile.exploredAcrossSessions.slice(0, 6).join("; ");

  let block = `Trust: ${trustLabels[profile.trustBand]} (${profile.sessionCount} meaningful Talk it Through session${profile.sessionCount === 1 ? "" : "s"}).\n${directness}`;

  if (profile.carryForward) {
    block += `\nSoft carry-forward — hold lightly, never assume unchanged: ${profile.carryForward}`;
  }
  if (themes) block += `\nRecurring themes (labels only, not quotes): ${themes}`;
  if (explored) {
    block += `\nCross-session ground already walked — do not re-ask unless they reopen it: ${explored}`;
  }

  block += `
Never quote their past words. Never invent visit counts beyond what is stated here. Themes and explored areas are inference — not a dossier.`;

  return block;
}

/** Compact cross-session posture for exploration/deepening turns. */
export function buildRelationshipProfileCompactNote(profile: RelationshipProfile): string {
  const explored = profile.exploredAcrossSessions.slice(0, 6).join("; ");
  const themes = profile.themesAcrossSessions.slice(0, 3).join(", ");
  let block = `Trust: ${profile.trustBand} (${profile.sessionCount} prior session${profile.sessionCount === 1 ? "" : "s"}).`;
  if (profile.carryForward) {
    block += `\nCarry-forward (hold lightly): ${profile.carryForward}`;
  }
  if (explored) block += `\nDo not re-ask: ${explored}`;
  else if (themes) block += `\nThemes: ${themes}`;
  block += "\nNever quote past words.";
  return block;
}

/** Planner addendum — explored across sessions on all turns. */
export function buildRelationshipProfilePlannerAddendum(profile: RelationshipProfile | null): string {
  if (!profile) return "";
  const explored = profile.exploredAcrossSessions.filter(Boolean);
  const themes = profile.themesAcrossSessions.filter(Boolean);
  if (explored.length === 0 && themes.length === 0) return "";

  let block = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RELATIONSHIP PROFILE — CROSS-SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  if (explored.length > 0) {
    block += `\nExplored across prior sessions (do not re-ask):\n${explored.map((e) => `  - ${e}`).join("\n")}`;
  }
  if (themes.length > 0) {
    block += `\nRecurring themes: ${themes.join(", ")}`;
  }
  block += `
Fresh territory unless they explicitly reopen a thread.`;
  return block;
}

export function appendRelationshipProfileToPlannerState(
  stateBlock: string,
  profile: RelationshipProfile | null,
): string {
  const addendum = buildRelationshipProfilePlannerAddendum(profile);
  if (!addendum) return stateBlock;
  return stateBlock + addendum;
}

/** Merge prior-session + profile explored for question gates. */
export function mergedPriorExplored(
  priorSessionExplored: string[],
  profile: RelationshipProfile | null,
): string[] {
  const fromProfile = profile?.exploredAcrossSessions ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...priorSessionExplored, ...fromProfile]) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}
