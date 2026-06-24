import { getBookmark } from "./bookmarks";
import { readCarryToday, getDaysSinceLastDevotionalVisit } from "./devotionalContinuity";
import { getTodayFramework } from "./faithFramework";
import { getJourneyById } from "./journeyCatalog";
import { journeyDayStorageKey } from "./journeyListenText";

const JOURNEY_BOOKMARK_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** Build optional context for Talk it Through — active Journey step and/or Today's Word. */
export function buildJourneyContext(): string {
  const parts: string[] = [];

  const journeyBm = getBookmark("journey");
  if (journeyBm && Date.now() - journeyBm.savedAt < JOURNEY_BOOKMARK_MAX_AGE_MS) {
    const journey = getJourneyById(journeyBm.journeyId);
    if (journey) {
      try {
        const dayId = localStorage.getItem(journeyDayStorageKey(journey.id));
        const chapter = dayId ? journey.entries.find((e) => e.id === dayId) : undefined;
        const step = chapter ?? journey.entries[0];
        if (step) {
          parts.push(
            `Bible Journey "${journey.title}" — Day ${step.order}: "${step.title}" (${step.reference}), theme: ${step.theme}`,
          );
        }
      } catch {
        parts.push(`Bible Journey "${journey.title}"`);
      }
    } else if (journeyBm.label) {
      parts.push(`Bible Journey: ${journeyBm.label}`);
    }
  }

  const carry = readCarryToday();
  if (carry) {
    const snippet = carry.text.length > 140 ? `${carry.text.slice(0, 137).trim()}…` : carry.text;
    parts.push(`Today's Word they've been sitting with: ${carry.reference} — "${snippet}"`);
  } else if (getDaysSinceLastDevotionalVisit() === 0) {
    const framework = getTodayFramework();
    parts.push(`Today's Word rhythm: ${framework.name} — ${framework.theme} (${framework.verse.ref})`);
  }

  return parts.join(". ");
}
