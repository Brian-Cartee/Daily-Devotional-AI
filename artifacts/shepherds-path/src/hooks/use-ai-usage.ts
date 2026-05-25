import { useState, useEffect, useCallback } from "react";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { getAiDailyLimits, AI_HONEYMOON_DAYS } from "@/lib/aiLimits";

export interface AiUsage {
  used: number;
  limit: number;
  hardLimit: number;
  remaining: number;
  phase?: "honeymoon" | "standard";
}

let globalUsage: AiUsage | null = null;
const listeners = new Set<(u: AiUsage) => void>();

function notifyAll(u: AiUsage) {
  globalUsage = u;
  listeners.forEach((fn) => fn(u));
}

export function getGlobalAiUsage(): AiUsage | null {
  return globalUsage;
}

async function fetchUsage(): Promise<AiUsage> {
  const sessionId = getSessionId();
  const daysWithApp = getRelationshipAge();
  const isPro = isProVerifiedLocally();
  const res = await fetch(
    `/api/ai-usage?sessionId=${encodeURIComponent(sessionId)}&daysWithApp=${daysWithApp}&isPro=${isPro}`,
  );
  if (!res.ok) {
    const { displayLimit, hardLimit, phase } = getAiDailyLimits(daysWithApp);
    return { used: 0, limit: displayLimit, hardLimit, remaining: displayLimit, phase };
  }
  return res.json();
}

export async function refreshAiUsage(): Promise<AiUsage | null> {
  try {
    const usage = await fetchUsage();
    notifyAll(usage);
    return usage;
  } catch {
    return null;
  }
}

export function useAiUsage() {
  const [usage, setUsage] = useState<AiUsage | null>(globalUsage);

  const refresh = useCallback(async () => {
    await refreshAiUsage();
  }, []);

  useEffect(() => {
    const handler = (u: AiUsage) => setUsage(u);
    listeners.add(handler);
    if (!globalUsage) {
      void refreshAiUsage();
    } else {
      setUsage(globalUsage);
    }
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return { usage, refresh };
}
