const AI_USAGE_KEY = "sp_ai_usage";
export const AI_FREE_LIMIT = 10;

interface AiUsageData {
  date: string;
  count: number;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function getAiUsage(): AiUsageData {
  try {
    const raw = localStorage.getItem(AI_USAGE_KEY);
    if (!raw) return { date: today(), count: 0 };
    const data = JSON.parse(raw) as AiUsageData;
    if (data.date !== today()) return { date: today(), count: 0 };
    return data;
  } catch {
    return { date: today(), count: 0 };
  }
}

export function canUseAi(): boolean {
  return getAiUsage().count < AI_FREE_LIMIT;
}

export function recordAiUsage(): void {
  const usage = getAiUsage();
  localStorage.setItem(AI_USAGE_KEY, JSON.stringify({
    date: today(),
    count: usage.count + 1,
  }));
}

export function getRemainingAi(): number {
  return Math.max(0, AI_FREE_LIMIT - getAiUsage().count);
}
