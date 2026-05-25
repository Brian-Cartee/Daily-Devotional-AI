import { getRelationshipAge } from "@/lib/relationship";
import { getTodayCheckin } from "@/lib/engagementCards";
import { CheckinCard, GratitudePromptCard, WeeklyReflectionCard } from "@/components/EngagementCards";

/** One reflection touchpoint per day — check-in always shows until saved today */
export function HomeDailyTouchpoint({ sessionId }: { sessionId: string }) {
  if (!getTodayCheckin()) return <CheckinCard />;

  const slot = (getRelationshipAge() + new Date().getDay()) % 3;
  if (slot === 0) return <CheckinCard />;
  if (slot === 1) return <GratitudePromptCard sessionId={sessionId} />;
  return <WeeklyReflectionCard />;
}
