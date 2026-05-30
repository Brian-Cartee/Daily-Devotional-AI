import { isProVerifiedLocally } from "@/lib/proStatus";

export type ListenScope = "verse" | "devotional" | "guidance" | "snippet";

const DEVOTIONAL_CHAIN_KEY = "sp_listen_devotional_chain";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

/** Pro-only: speculative TTS prewarm after AI generates text. */
export function canPrewarmListen(): boolean {
  return isProVerifiedLocally();
}

/** Pro-only: auto-play full listen when content is ready. */
export function canUseListenFirstAuto(): boolean {
  return isProVerifiedLocally();
}

/** Free: one full devotional chain (verse + reflection + prayer) per day. */
export function canStartDevotionalChain(): boolean {
  if (isProVerifiedLocally()) return true;
  try {
    const raw = localStorage.getItem(DEVOTIONAL_CHAIN_KEY);
    if (!raw) return true;
    const data = JSON.parse(raw) as { date: string };
    return data.date !== today();
  } catch {
    return true;
  }
}

export function recordDevotionalChainStarted(): void {
  if (isProVerifiedLocally()) return;
  try {
    localStorage.setItem(DEVOTIONAL_CHAIN_KEY, JSON.stringify({ date: today() }));
  } catch {
    /* noop */
  }
}

/** Full Guidance listen chain is Pro-only. */
export function canStartGuidanceChain(): boolean {
  return isProVerifiedLocally();
}

export const LISTEN_LIMIT_COPY = {
  devotional:
    "You've used today's free full listen. Pro lets you hear every devotional, replay, and Talk It Through session without limits.",
  guidance:
    "Hear this guidance — verse, response, and prayer in one flow — is included with Pro.",
  snippet: "Daily listen limit reached. Pro includes unlimited audio.",
  verse: "This passage is too long for a single listen. Try a shorter section.",
  text_too_long: "This section is long — we're reading the first part aloud.",
  listen_daily_cap: "Daily listen limit reached. Pro includes unlimited audio.",
  pro_required: "Full listen for this section is included with Pro.",
  session_required: "Please refresh and try listen again.",
} as const;

export type ListenLimitMessageKey = keyof typeof LISTEN_LIMIT_COPY;
