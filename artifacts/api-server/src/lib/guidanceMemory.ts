/** Parsed guidance_memory journal content (v1 JSON or legacy plain text). */
export type GuidanceMemoryPayload = {
  v?: number;
  summary: string;
  carryForward?: string;
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
        };
      }
    } catch {
      /* fall through */
    }
  }
  return { summary: trimmed };
}

export function serializeGuidanceMemory(payload: GuidanceMemoryPayload): string {
  return JSON.stringify({ v: 1, summary: payload.summary, carryForward: payload.carryForward });
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
      summary: parsed.summary.trim(),
      carryForward: parsed.carryForward?.trim() || undefined,
    };
  } catch {
    return null;
  }
}
