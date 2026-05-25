import { isProVerifiedLocally } from "@/lib/proStatus";
import { getGlobalAiUsage, refreshAiUsage } from "@/hooks/use-ai-usage";
import { AI_LIMIT_STANDARD_DISPLAY } from "@/lib/aiLimits";

/** For pricing / FAQ when days-with-app is unknown */
export const AI_FREE_LIMIT = AI_LIMIT_STANDARD_DISPLAY;

export { refreshAiUsage };

export function canUseAi(): boolean {
  const usage = getGlobalAiUsage();
  if (!usage) return true;
  return usage.used < usage.hardLimit;
}

/** Shown in UI counters — based on advertised limit, not hidden grace */
export function getRemainingAi(): number {
  const usage = getGlobalAiUsage();
  if (!usage) return AI_FREE_LIMIT;
  return Math.max(0, usage.limit - usage.used);
}

/** Only show "X of Y left" when close to the advertised cap */
export function shouldShowAiCounter(): boolean {
  if (isProVerifiedLocally()) return false;
  const remaining = getRemainingAi();
  return remaining > 0 && remaining <= 2;
}

export function recordAiUsage(): void {
  void refreshAiUsage();
}
