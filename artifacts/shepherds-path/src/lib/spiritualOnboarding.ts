export type SeasonOfSoul = "weary" | "hungry" | "rebuilding" | "grateful";
export type CovenantCadence = "10-min" | "15-min" | "20-min";

const SEASON_KEY = "sp_season_of_soul";
const COVENANT_KEY = "sp_daily_covenant";
const FIRST_PRAYER_DONE_KEY = "sp_first_prayer_completed";
const STARTED_AT_KEY = "sp_spiritual_onboarding_started_at";

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore storage limits */
  }
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveSpiritualOnboarding(selection: {
  season: SeasonOfSoul;
  covenant: CovenantCadence;
}): void {
  safeSet(SEASON_KEY, selection.season);
  safeSet(COVENANT_KEY, selection.covenant);
  safeSet(STARTED_AT_KEY, new Date().toISOString());
}

export function getSpiritualOnboardingSelection(): {
  season: SeasonOfSoul | null;
  covenant: CovenantCadence | null;
} {
  const seasonRaw = safeGet(SEASON_KEY);
  const covenantRaw = safeGet(COVENANT_KEY);
  const season =
    seasonRaw === "weary" || seasonRaw === "hungry" || seasonRaw === "rebuilding" || seasonRaw === "grateful"
      ? seasonRaw
      : null;
  const covenant =
    covenantRaw === "10-min" || covenantRaw === "15-min" || covenantRaw === "20-min"
      ? covenantRaw
      : null;
  return { season, covenant };
}

export function markFirstPrayerCompleted(): void {
  safeSet(FIRST_PRAYER_DONE_KEY, "1");
}

export function isFirstPrayerCompleted(): boolean {
  return safeGet(FIRST_PRAYER_DONE_KEY) === "1";
}
