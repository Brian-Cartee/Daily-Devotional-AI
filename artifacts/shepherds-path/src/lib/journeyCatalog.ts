import { ALL_JOURNEYS, type Journey } from "@/data/journeys";
import { PRO_GUIDED_PATHWAYS } from "@/data/guidedPathways";
import { isProVerifiedLocally } from "@/lib/proStatus";

export function getJourneyById(id: string): Journey | undefined {
  return ALL_JOURNEYS.find((j) => j.id === id) ?? PRO_GUIDED_PATHWAYS.find((p) => p.id === id);
}

export function canAccessJourney(journey: Journey, isPro = isProVerifiedLocally()): boolean {
  if (!journey.proOnly) return true;
  return isPro;
}

export function freeJourneys(): Journey[] {
  return ALL_JOURNEYS;
}

export function proPathways(): Journey[] {
  return PRO_GUIDED_PATHWAYS;
}

/** Map common Guidance situations to a curated pathway (no AI). */
export function suggestPathwayForSituation(situation: string): Journey | undefined {
  const s = situation.toLowerCase();
  if (/grief|griev|mourning|funeral|passed away|lost (my|a )?(mom|dad|mother|father|husband|wife|child|friend|loved)/.test(s)) {
    return PRO_GUIDED_PATHWAYS.find((p) => p.id === "pathway-grief");
  }
  if (/anxiet|worry|worri|panic|overwhelm|can't sleep|cannot sleep|racing thought/.test(s)) {
    return PRO_GUIDED_PATHWAYS.find((p) => p.id === "pathway-anxiety");
  }
  if (/lonely|alone|isolat|no one|nobody|left out|invisible/.test(s)) {
    return PRO_GUIDED_PATHWAYS.find((p) => p.id === "pathway-loneliness");
  }
  if (/doubt|don't believe|do not believe|faith feels|not sure (i )?believe|skeptic/.test(s)) {
    return PRO_GUIDED_PATHWAYS.find((p) => p.id === "pathway-doubt");
  }
  if (/angry|anger|bitter|forgive|resent|rage|frustrat/.test(s)) {
    return PRO_GUIDED_PATHWAYS.find((p) => p.id === "pathway-anger");
  }
  return undefined;
}
