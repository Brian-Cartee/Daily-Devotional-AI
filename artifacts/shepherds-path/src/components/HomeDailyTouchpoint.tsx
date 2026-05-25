import { getRelationshipAge } from "@/lib/relationship";
import { CheckinCard, GratitudePromptCard, WeeklyReflectionCard } from "@/components/EngagementCards";

/** One reflection touchpoint per day — keeps the home stack from feeling like homework. */
export function HomeDailyTouchpoint({ sessionId }: { sessionId: string }) {
  const slot = (getRelationshipAge() + new Date().getDay()) % 3;
  if (slot === 0) return <CheckinCard />;
  if (slot === 1) return <GratitudePromptCard sessionId={sessionId} />;
  return <WeeklyReflectionCard />;
}
