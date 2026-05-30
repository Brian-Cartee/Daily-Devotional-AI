import type { ListenScope } from "@/lib/listenPolicy";
import { isProVerifiedLocally } from "@/lib/proStatus";

/** Match server caps in artifacts/api-server/src/listenLimits.ts (with small buffer). */
export function maxListenChars(scope: ListenScope = "snippet"): number {
  if (isProVerifiedLocally()) return 4500;
  if (scope === "verse") return 600;
  if (scope === "devotional") return 8000;
  return 1100;
}

/** Trim passage text so TTS policy accepts it (Psalm chapters, Bible read, etc.). */
export function truncateForListen(text: string, scope: ListenScope = "snippet"): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const cap = maxListenChars(scope);
  if (trimmed.length <= cap) return trimmed;
  const slice = trimmed.slice(0, cap);
  return `${slice.replace(/\s\S*$/, "").trim()}…`;
}
