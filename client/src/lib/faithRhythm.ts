const RHYTHM_KEY = "sp_faith_rhythm";
const FIRST_ACTION_KEY = "sp_first_action";
const RHYTHM_DISMISSED_KEY = "sp_rhythm_dismissed";

export type Season = "seeking" | "growing" | "hardship" | "deeper";
export type TimeSlot = "5min" | "15min" | "30min";
export type Focus = "peace" | "strength" | "purpose" | "healing" | "gratitude" | "wisdom" | "family";

export interface FaithRhythm {
  season: Season;
  time: TimeSlot;
  focus: Focus;
  setAt: string;
}

export function getRhythm(): FaithRhythm | null {
  try {
    const raw = localStorage.getItem(RHYTHM_KEY);
    return raw ? (JSON.parse(raw) as FaithRhythm) : null;
  } catch {
    return null;
  }
}

export function saveRhythm(r: FaithRhythm): void {
  localStorage.setItem(RHYTHM_KEY, JSON.stringify(r));
}

export function clearRhythm(): void {
  localStorage.removeItem(RHYTHM_KEY);
}

export function markFirstAction(): void {
  localStorage.setItem(FIRST_ACTION_KEY, "1");
}

export function hasFirstAction(): boolean {
  return !!localStorage.getItem(FIRST_ACTION_KEY);
}

export function getRhythmDismissed(): number {
  return parseInt(localStorage.getItem(RHYTHM_DISMISSED_KEY) ?? "0", 10);
}

export function incrementRhythmDismissed(): void {
  localStorage.setItem(RHYTHM_DISMISSED_KEY, String(getRhythmDismissed() + 1));
}

const SEASON_JOURNEY: Record<Season, string> = {
  seeking: "foundation",
  growing: "jesus",
  hardship: "psalms",
  deeper: "sermon-on-the-mount",
};

const FOCUS_JOURNEY_OVERRIDE: Partial<Record<Focus, string>> = {
  peace: "psalms",
  healing: "psalms",
  gratitude: "psalms",
  wisdom: "sermon-on-the-mount",
  purpose: "sermon-on-the-mount",
  family: "jesus",
};

export function getRecommendedJourneyId(r: FaithRhythm): string {
  return FOCUS_JOURNEY_OVERRIDE[r.focus] ?? SEASON_JOURNEY[r.season];
}

const JOURNEY_NAMES: Record<string, string> = {
  foundation: "30-Day Foundation",
  psalms: "Psalms: Songs of the Soul",
  jesus: "The Life of Jesus",
  "sermon-on-the-mount": "The Sermon on the Mount",
  lent: "Lent Journey",
};

export function getJourneyName(id: string): string {
  return JOURNEY_NAMES[id] ?? id;
}

const FOCUS_VERSES: Record<Focus, Array<{ text: string; ref: string }>> = {
  peace: [
    { text: "Peace I leave with you; my peace I give you. I do not give to you as the world gives.", ref: "John 14:27" },
    { text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", ref: "Philippians 4:6" },
    { text: "The Lord gives strength to his people; the Lord blesses his people with peace.", ref: "Psalm 29:11" },
  ],
  strength: [
    { text: "I can do all this through him who gives me strength.", ref: "Philippians 4:13" },
    { text: "The Lord is my strength and my shield; my heart trusts in him, and he helps me.", ref: "Psalm 28:7" },
    { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.", ref: "Joshua 1:9" },
  ],
  purpose: [
    { text: "For I know the plans I have for you, declares the Lord — plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11" },
    { text: "In all things God works for the good of those who love him, who have been called according to his purpose.", ref: "Romans 8:28" },
    { text: "Many are the plans in a person's heart, but it is the Lord's purpose that prevails.", ref: "Proverbs 19:21" },
  ],
  healing: [
    { text: "He heals the brokenhearted and binds up their wounds.", ref: "Psalm 147:3" },
    { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
    { text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", ref: "Psalm 34:18" },
  ],
  gratitude: [
    { text: "Give thanks to the Lord, for he is good; his love endures forever.", ref: "Psalm 107:1" },
    { text: "Rejoice always, pray continually, give thanks in all circumstances; for this is God's will for you in Christ Jesus.", ref: "1 Thessalonians 5:16–18" },
    { text: "This is the day that the Lord has made; let us rejoice and be glad in it.", ref: "Psalm 118:24" },
  ],
  wisdom: [
    { text: "If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.", ref: "James 1:5" },
    { text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him.", ref: "Proverbs 3:5–6" },
    { text: "The fear of the Lord is the beginning of wisdom; all who follow his precepts have good understanding.", ref: "Psalm 111:10" },
  ],
  family: [
    { text: "As for me and my household, we will serve the Lord.", ref: "Joshua 24:15" },
    { text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.", ref: "1 Corinthians 13:4" },
    { text: "Start children off on the way they should go, and even when they are old they will not turn from it.", ref: "Proverbs 22:6" },
  ],
};

export function getDailyVerse(focus: Focus): { text: string; ref: string } {
  const verses = FOCUS_VERSES[focus];
  const dayIndex = Math.floor(Date.now() / 86_400_000) % verses.length;
  return verses[dayIndex];
}

const PRAYER_PROMPTS: Record<Focus, string> = {
  peace: "Lord, quiet the noise in my heart and fill me with a peace that doesn't depend on my circumstances.",
  strength: "Father, where I am weak, be my strength today. I trust You more than I trust myself.",
  purpose: "Lord, show me the path You've set before me. Help me take the next step in faith.",
  healing: "God, bring Your healing to the places that still hurt. I lay it all at Your feet today.",
  gratitude: "Thank You, Lord — for today, for grace, for everything I so easily take for granted.",
  wisdom: "Give me wisdom today to see my situation as You see it, and courage to act on what I know is right.",
  family: "Lord, protect and strengthen the people I love. Draw our home ever closer to You.",
};

export function getPrayerPrompt(focus: Focus): string {
  return PRAYER_PROMPTS[focus];
}

export const FOCUS_LABELS: Record<Focus, string> = {
  peace: "Peace",
  strength: "Strength",
  purpose: "Purpose",
  healing: "Healing",
  gratitude: "Gratitude",
  wisdom: "Wisdom",
  family: "Family",
};
