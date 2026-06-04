import { isProVerifiedLocally } from "@/lib/proStatus";
import { LISTEN_LIMIT_COPY_PASTORAL } from "@/lib/proUpgradeCopy";

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

export const LISTEN_LIMIT_COPY = LISTEN_LIMIT_COPY_PASTORAL;

export type ListenLimitMessageKey = keyof typeof LISTEN_LIMIT_COPY;
