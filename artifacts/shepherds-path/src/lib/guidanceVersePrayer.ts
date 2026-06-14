import { getSessionId } from "@/lib/session";
import { getUserName } from "@/lib/userName";
import { apiSessionExtras } from "@/lib/requestExtras";

export type GuidanceVerse = { reference: string; text: string };

export type FetchGuidanceVersePrayerResult =
  | { ok: true; verse: GuidanceVerse | null; prayer: string | null }
  | { ok: false; limitReached?: boolean; error: string };

const ATTEMPT_TIMEOUT_MS = 28_000;
const RETRY_DELAYS_MS = [0, 2_000, 4_500];

/** Shown only when the verse-and-prayer API fails after retries — never a follow-up question. */
export const GUIDANCE_FALLBACK_PRAYER =
  "Lord, You see what happened and how much it hurt. Meet me here — steady my heart, heal what can be healed, and show me the next faithful step. I trust You with what I cannot fix alone. Amen.";

const VERSE_REF_RE = /\b\d?\s?[A-Za-z]+\s+\d+:\d+\b/;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reject pastoral follow-up questions mislabeled as prayer. */
export function isLikelyPrayerText(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 24) return false;
  if (t.endsWith("?")) return false;
  if (/^(what|how|when|where|why|which|who)\b/i.test(t) && t.includes("?")) return false;
  return /\b(amen|lord|god|father|jesus|spirit)\b/i.test(t) || t.length >= 80;
}

async function fetchOnce(
  situation: string,
  signal: AbortSignal,
  phase1UserReply?: string,
): Promise<FetchGuidanceVersePrayerResult> {
  const res = await fetch("/api/guidance/verse-and-prayer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation: situation.trim(),
      ...(phase1UserReply?.trim() ? { phase1UserReply: phase1UserReply.trim() } : {}),
      sessionId: getSessionId(),
      userName: getUserName() ?? undefined,
      ...apiSessionExtras(),
    }),
    signal,
  });

  let data: {
    verse?: GuidanceVerse | null;
    prayer?: string | null;
    limitReached?: boolean;
    message?: string;
  } = {};
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "invalid response" };
  }

  if (res.status === 429 || data.limitReached) {
    return { ok: false, limitReached: true, error: data.message ?? "limit reached" };
  }

  if (!res.ok) {
    return { ok: false, error: data.message ?? `HTTP ${res.status}` };
  }

  const verse =
    data.verse && typeof data.verse.text === "string" && data.verse.reference
      ? { text: data.verse.text.trim(), reference: data.verse.reference.trim() }
      : null;
  const prayer = typeof data.prayer === "string" && data.prayer.trim() ? data.prayer.trim() : null;

  if (!verse && !prayer) {
    return { ok: false, error: "empty verse and prayer" };
  }

  return { ok: true, verse, prayer };
}

/** Fetch personalized Scripture + prayer with retries for slow or flaky connections. */
export async function fetchGuidanceVerseAndPrayer(
  situation: string,
  phase1UserReply?: string,
): Promise<FetchGuidanceVersePrayerResult> {
  const trimmed = situation.trim();
  if (!trimmed) return { ok: false, error: "empty situation" };

  let lastError = "unknown error";

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt]!);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

    try {
      const result = await fetchOnce(trimmed, controller.signal, phase1UserReply);
      window.clearTimeout(timeoutId);
      if (result.ok) return result;
      lastError = result.error;
      if (result.limitReached) return result;
    } catch (err) {
      window.clearTimeout(timeoutId);
      lastError = err instanceof Error && err.name === "AbortError" ? "timeout" : "network error";
    }
  }

  return { ok: false, error: lastError };
}

export const GUIDANCE_VERSE_INTRO =
  "David asked the same question once — and here's what he found:";

const API_VERSE_INTRO_PATTERNS = [
  /^There is a place in Scripture that has walked this same road:\s*/i,
  /^There is a place in Scripture that sounds exactly like this:\s*/i,
  /^The psalms have walked this same road:\s*/i,
  /^There is a moment in Scripture written for exactly this kind of courage:\s*/i,
  /^Scripture has a line that opens this exact door:\s*/i,
];

/** Strip API-prepended intro lines; show a consistent UI intro before the verse body. */
export function formatGuidanceVerseDisplay(raw: string): { intro: string; text: string } {
  let text = raw.trim();
  for (const pattern of API_VERSE_INTRO_PATTERNS) {
    text = text.replace(pattern, "");
  }
  return { intro: GUIDANCE_VERSE_INTRO, text: text.trim() || raw.trim() };
}

export function extractVerseFromGuidanceText(raw: string): string | null {
  const paras = raw
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
  return paras.find((p) => VERSE_REF_RE.test(p)) ?? null;
}
