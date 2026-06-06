import type { GuidedChapter } from "@/data/journeys";

/** Combined narration for one Journey step — passage + brief pastoral context. */
export function buildJourneyStepListenText(chapter: GuidedChapter, passageText: string): string {
  const cleaned = passageText.replace(/\[\d+\]/g, " ").replace(/\s+/g, " ").trim();
  const intro = `Day ${chapter.order}. ${chapter.title}. ${chapter.reference}.`;
  const context = chapter.whyItMatters.trim();
  if (!cleaned) return `${intro} ${context}`;
  return `${intro} ${cleaned} ${context}`;
}

export function journeyDayStorageKey(journeyId: string): string {
  return `sp_journey_day_${journeyId}`;
}
