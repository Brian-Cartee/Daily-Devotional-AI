/** Parsed guidance_memory journal content (v1/v2 JSON or legacy plain text). */
export type GuidanceMemoryPayload = {
  v?: number;
  summary: string;
  carryForward?: string;
  /** Short emotional theme labels — no proper names */
  themes?: string[];
  /** Areas already explored in that session — helps avoid re-asking */
  explored?: string[];
  savedAt?: string;
};

export type GuidanceContinuityRecord = {
  memory: GuidanceMemoryPayload;
  ageMs: number;
  createdAt: string;
};

export function parseGuidanceMemoryContent(content: string): GuidanceMemoryPayload {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    try {
      const start = trimmed.indexOf("{");
      const end = trimmed.lastIndexOf("}");
      const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<GuidanceMemoryPayload>;
      if (parsed.summary?.trim()) {
        return {
          v: parsed.v ?? 1,
          summary: parsed.summary.trim(),
          carryForward: parsed.carryForward?.trim() || undefined,
          themes: parsed.themes?.map(t => t.trim()).filter(Boolean),
          explored: parsed.explored?.map(t => t.trim()).filter(Boolean),
          savedAt: parsed.savedAt?.trim() || undefined,
        };
      }
    } catch {
      /* fall through */
    }
  }
  return { summary: trimmed };
}

export function serializeGuidanceMemory(payload: GuidanceMemoryPayload): string {
  return JSON.stringify({
    v: 2,
    summary: payload.summary,
    carryForward: payload.carryForward,
    themes: payload.themes?.length ? payload.themes.slice(0, 3) : undefined,
    explored: payload.explored?.length ? payload.explored.slice(0, 4) : undefined,
    savedAt: payload.savedAt ?? new Date().toISOString(),
  });
}

/** Soften carry-forward for spoken welcome — presence, not surveillance. */
export function sanitizeCarryForwardForSpeech(line: string): string {
  let s = line.trim();
  s = s.replace(/\b(chemo(?:therapy)?|cancer|diagnosis|surgery|hospice|icu)\b/gi, "something heavy with health");
  s = s.replace(/\b(your |my )?(mom|mother|dad|father|wife|husband|son|daughter|brother|sister)\b(\'s)?/gi, "someone you love");
  return s.replace(/\s+/g, " ").trim();
}

export function extractMemoryJsonFromModel(raw: string): GuidanceMemoryPayload | null {
  const trimmed = raw.trim();
  try {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Partial<GuidanceMemoryPayload>;
    if (!parsed.summary?.trim()) return null;
    return {
      v: 2,
      summary: parsed.summary.trim(),
      carryForward: parsed.carryForward?.trim() || undefined,
      themes: parsed.themes?.map(t => t.trim()).filter(Boolean).slice(0, 3),
      explored: parsed.explored?.map(t => t.trim()).filter(Boolean).slice(0, 4),
    };
  } catch {
    return null;
  }
}

export function formatMemoryAge(ageMs: number): string {
  if (ageMs < 6 * 60 * 60 * 1000) return "earlier today";
  if (ageMs < 30 * 60 * 60 * 1000) return "yesterday";
  if (ageMs < 5 * 24 * 60 * 60 * 1000) return "a few days ago";
  if (ageMs < 21 * 24 * 60 * 60 * 1000) return "a couple weeks ago";
  if (ageMs < 60 * 24 * 60 * 60 * 1000) return "a while back";
  return "some time ago";
}

const PRIOR_SESSION_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000;

/** Pick the most recent completed prior-session memory — skip in-flight pending scratch entries. */
export function pickPriorSessionContinuity(
  entries: Array<{ type: string; content: string; createdAt: string | Date }>,
): GuidanceContinuityRecord | null {
  for (const entry of entries) {
    if (entry.type !== "guidance_memory") continue;
    const ageMs = Date.now() - new Date(entry.createdAt).getTime();
    if (ageMs > PRIOR_SESSION_MAX_AGE_MS) continue;

    const memory = parseGuidanceMemoryContent(entry.content);
    const hasStructure = (memory.explored?.length ?? 0) > 0 || (memory.themes?.length ?? 0) > 0;
    // Pending opening save — summary only, no explored/themes yet
    if (ageMs < 4 * 60 * 60 * 1000 && !hasStructure) continue;

    return {
      memory,
      ageMs,
      createdAt: new Date(entry.createdAt).toISOString(),
    };
  }
  return null;
}

/** Inject prior-session explored areas into the question planner state block. */
export function buildPriorSessionPlannerAddendum(record: GuidanceContinuityRecord | null): string {
  if (!record) return "";
  const explored = record.memory.explored?.filter(Boolean) ?? [];
  const themes = record.memory.themes?.filter(Boolean) ?? [];
  if (explored.length === 0 && themes.length === 0) return "";

  const age = formatMemoryAge(record.ageMs);
  let block = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIOR SESSION (${age}) — DO NOT RE-ASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  if (explored.length > 0) {
    block += `\nAlready explored in their last Talk it Through:\n${explored.map((e) => `  - ${e}`).join("\n")}`;
  }
  if (themes.length > 0) {
    block += `\nThemes from then: ${themes.join(", ")}`;
  }
  block += `
Ask about fresh territory unless they explicitly reopen one of these threads.
Do not rephrase the same question about an explored area.`;
  return block;
}

export function appendPriorSessionToPlannerState(
  stateBlock: string,
  prior: GuidanceContinuityRecord | null,
): string {
  const addendum = buildPriorSessionPlannerAddendum(prior);
  if (!addendum) return stateBlock;
  return stateBlock + addendum;
}

/** Inject at session open — cross-session continuity with anti-hallucination rules. */
export function buildGuidanceContinuityPrompt(record: GuidanceContinuityRecord): string {
  const { memory, ageMs } = record;
  const weight = memory.carryForward?.trim() || memory.summary?.trim();
  if (!weight) return "";

  const age = formatMemoryAge(ageMs);
  const themes = memory.themes?.filter(Boolean).slice(0, 3).join(", ");
  const explored = memory.explored?.filter(Boolean).slice(0, 4).join("; ");

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIOR TALK IT THROUGH (${age})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Emotional weight they were carrying: ${weight}${themes ? `\nThemes: ${themes}` : ""}${explored ? `\nAlready explored then: ${explored}` : ""}

MEMORY RULES — non-negotiable:
— Only reference this if directly relevant to what they share NOW. Soft check ("is that still with you?") — never assume it is unchanged.
— NEVER invent visit counts, days they've come back, or any session history beyond this note.
— NEVER quote their past words verbatim. Never say "you always" or "you tend to."
— If they open something new, follow them. Do not force continuity.
— This is one prior conversation, not a dossier. Hold it lightly.`;
}

export const GUIDANCE_MEMORY_EXTRACT_PENDING = `From what this person just shared, return JSON only:
{"summary":"1 sentence internal note","carryForward":"ONE sentence, second person, ≤25 words — emotional weight they are carrying, NOT proper names or diagnoses. Hold the door open; do not declare facts. Good: You were carrying something heavy about someone you love. Bad: You were dealing with a difficult time."}`;

/** True when a guidance_memory row is an in-flight opening scratch (pending upgrade target). */
export function isPendingGuidanceMemoryEntry(
  entry: { content: string; createdAt: string | Date },
): boolean {
  const ageMs = Date.now() - new Date(entry.createdAt).getTime();
  if (ageMs >= 4 * 60 * 60 * 1000) return false;
  const memory = parseGuidanceMemoryContent(entry.content);
  return !((memory.explored?.length ?? 0) > 0 || (memory.themes?.length ?? 0) > 0);
}

/** Whether to update the latest guidance_memory row instead of inserting another. */
export function shouldUpsertGuidanceMemory(
  latest: { content: string; createdAt: string | Date } | undefined,
  isPendingSave: boolean,
): boolean {
  if (!latest) return false;
  if (isPendingSave) return isPendingGuidanceMemoryEntry(latest);
  if (isPendingGuidanceMemoryEntry(latest)) return true;

  const ageMs = Date.now() - new Date(latest.createdAt).getTime();
  const latestDay = new Date(latest.createdAt).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return latestDay === today && ageMs < 24 * 60 * 60 * 1000;
}

export const GUIDANCE_MEMORY_EXTRACT_COMPLETE = `Extract a spiritual memory from a Talk It Through session. Return JSON only:
{"summary":"1-2 sentences for internal context — what mattered emotionally","carryForward":"ONE sentence, second person, ≤25 words — emotional register and weight, NOT proper names or medical labels. No 'I remember'.","themes":["up to 3 short theme labels — grief, marriage, doubt, exhaustion"],"explored":["up to 4 short areas already discussed — no proper names if sensitive"]}

Rules: specific emotional weight not generic; do not permanently label their whole life as grief/crisis from one conversation; themes/explored help avoid re-asking the same ground next time.`;
