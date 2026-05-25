import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";

export type StreakPayload = {
  currentStreak: number;
  longestStreak: number;
  visitDates: string[];
  isNewDay?: boolean;
  freezeApplied?: boolean;
  freezeAvailable?: boolean;
  freezeUsedThisMonth?: boolean;
};

export function streakQueryParams(): string {
  const sessionId = getSessionId();
  const isPro = isProVerifiedLocally();
  return `sessionId=${encodeURIComponent(sessionId)}&isPro=${isPro ? "true" : "false"}`;
}

export async function fetchStreak(): Promise<StreakPayload> {
  const res = await fetch(`/api/streak?${streakQueryParams()}`);
  if (!res.ok) throw new Error("streak fetch failed");
  const data = await res.json();
  return data as StreakPayload;
}

export async function recordStreakVisit(): Promise<StreakPayload> {
  const res = await fetch("/api/streak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: getSessionId(),
      isPro: isProVerifiedLocally(),
    }),
  });
  if (!res.ok) throw new Error("streak record failed");
  return res.json() as Promise<StreakPayload>;
}
