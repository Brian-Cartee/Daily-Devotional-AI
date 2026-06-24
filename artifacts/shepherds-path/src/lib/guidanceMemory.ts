import { getSessionId } from "./session";

export type GuidanceMemoryRecall = {
  id: string;
  carryForward: string | null;
  summary: string | null;
};

/** Fetch the most recent Talk it Through memory for this session. */
export async function fetchGuidanceMemory(): Promise<GuidanceMemoryRecall | null> {
  const sessionId = getSessionId();
  try {
    const res = await fetch(`/api/user-memory?sessionId=${encodeURIComponent(sessionId)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      id?: string | null;
      carryForward?: string | null;
      summary?: string | null;
    };
    if (!data.id) return null;
    const carryForward = data.carryForward?.trim() || null;
    const summary = data.summary?.trim() || null;
    if (!carryForward && !summary) return null;
    return { id: data.id, carryForward, summary };
  } catch {
    return null;
  }
}

/** Turn carryForward / summary into Philip's opening line — no generic welcome. */
export function buildPhilipReturnLine(memory: GuidanceMemoryRecall): string | null {
  const cf = memory.carryForward?.trim();
  if (cf) {
    let core = cf.replace(/\.$/, "").trim();
    core = core.replace(/^You were\s+/i, "");
    if (/^(carrying|wondering|asking|feeling|sitting with|grappling|holding|grieving|fearing|doubting)/i.test(core)) {
      return `You were ${core}. Is it still there?`;
    }
    return `You were sitting with ${core}. Is it still there?`;
  }

  const summary = memory.summary?.trim();
  if (summary && summary.length >= 12) {
    const line = summary.replace(/\.$/, "");
    return `${line}. Is it still there?`;
  }

  return null;
}
