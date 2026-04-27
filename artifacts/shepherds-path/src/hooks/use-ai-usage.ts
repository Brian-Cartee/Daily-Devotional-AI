import { useState, useEffect, useCallback } from "react";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";

export interface AiUsage {
  used: number;
  limit: number;
  remaining: number;
}

let globalUsage: AiUsage | null = null;
const listeners = new Set<(u: AiUsage) => void>();

function notifyAll(u: AiUsage) {
  globalUsage = u;
  listeners.forEach(fn => fn(u));
}

async function fetchUsage(): Promise<AiUsage> {
  const sessionId = getSessionId();
  const daysWithApp = getRelationshipAge();
  const res = await fetch(`/api/ai-usage?sessionId=${encodeURIComponent(sessionId)}&daysWithApp=${daysWithApp}`);
  if (!res.ok) return { used: 0, limit: daysWithApp <= 14 ? 12 : 7, remaining: daysWithApp <= 14 ? 12 : 7 };
  return res.json();
}

export async function refreshAiUsage(): Promise<void> {
  try {
    const usage = await fetchUsage();
    notifyAll(usage);
  } catch { /* silently ignore */ }
}

export function useAiUsage() {
  const [usage, setUsage] = useState<AiUsage | null>(globalUsage);

  const refresh = useCallback(async () => {
    try {
      const u = await fetchUsage();
      notifyAll(u);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    const handler = (u: AiUsage) => setUsage(u);
    listeners.add(handler);
    if (!globalUsage) {
      refresh();
    } else {
      setUsage(globalUsage);
    }
    return () => { listeners.delete(handler); };
  }, [refresh]);

  return { usage, refresh };
}
