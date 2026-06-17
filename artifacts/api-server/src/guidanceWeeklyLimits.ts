const guidanceWeekStore = new Map<string, { weekKey: string; count: number }>();

export const FREE_GUIDANCE_CONVERSATIONS_PER_WEEK = 3;

/** Monday 00:00 UTC for the current week. */
export function currentWeekKey(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getCount(sessionId: string): number {
  const weekKey = currentWeekKey();
  const row = guidanceWeekStore.get(sessionId);
  if (!row || row.weekKey !== weekKey) return 0;
  return row.count;
}

export function recordGuidanceConversationStart(sessionId: string): number {
  const weekKey = currentWeekKey();
  const row = guidanceWeekStore.get(sessionId);
  if (!row || row.weekKey !== weekKey) {
    guidanceWeekStore.set(sessionId, { weekKey, count: 1 });
    return 1;
  }
  row.count += 1;
  return row.count;
}

export function checkGuidanceWeeklyLimit(sessionId: string | undefined): {
  ok: boolean;
  used: number;
  limit: number;
} {
  if (!sessionId) return { ok: false, used: 0, limit: FREE_GUIDANCE_CONVERSATIONS_PER_WEEK };
  const used = getCount(sessionId);
  return {
    ok: used < FREE_GUIDANCE_CONVERSATIONS_PER_WEEK,
    used,
    limit: FREE_GUIDANCE_CONVERSATIONS_PER_WEEK,
  };
}

export const GUIDANCE_WEEKLY_LIMIT_MESSAGE =
  "You've had 3 conversations this week. Upgrade to Pro for unlimited Talk It Through access.";
