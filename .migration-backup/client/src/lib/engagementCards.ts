// ── Engagement Card Tracking ──────────────────────────────────────────────────
// All localStorage helpers for the engagement card system.

// ── Last open / returning user ─────────────────────────────────────────────────
const LAST_OPEN_KEY = "sp_last_open";
const RETURN_CARD_DISMISSED_KEY = "sp_return_dismissed";

export function getLastOpenDate(): string | null {
  return localStorage.getItem(LAST_OPEN_KEY);
}

export function setLastOpenDate(): void {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(LAST_OPEN_KEY, today);
}

export function getDaysAway(): number {
  const last = getLastOpenDate();
  if (!last) return 0;
  const today = new Date().toISOString().split("T")[0];
  if (last === today) return 0;
  return Math.floor(
    (new Date(today).getTime() - new Date(last).getTime()) / 86_400_000
  );
}

export function isReturningUser(): boolean {
  return getDaysAway() >= 2;
}

export function isReturnCardDismissedToday(): boolean {
  const today = new Date().toISOString().split("T")[0];
  return localStorage.getItem(RETURN_CARD_DISMISSED_KEY) === today;
}

export function dismissReturnCard(): void {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(RETURN_CARD_DISMISSED_KEY, today);
}

// ── Last guidance session ──────────────────────────────────────────────────────
const LAST_GUIDANCE_KEY = "sp_last_guidance";

export function saveLastGuidanceSession(): void {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(LAST_GUIDANCE_KEY, today);
}

export function getLastGuidanceDate(): string | null {
  return localStorage.getItem(LAST_GUIDANCE_KEY);
}

export function daysSinceGuidance(): number {
  const last = getLastGuidanceDate();
  if (!last) return 999;
  const today = new Date().toISOString().split("T")[0];
  if (last === today) return 0;
  return Math.floor((new Date(today).getTime() - new Date(last).getTime()) / 86_400_000);
}

// ── Gratitude weekly prompt ────────────────────────────────────────────────────
function getWeekKey(): string {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    (((d.getTime() - oneJan.getTime()) / 86_400_000) + oneJan.getDay() + 1) / 7
  );
  return `sp_gratitude_${d.getFullYear()}_${weekNum}`;
}

export function hasGratitudeThisWeek(): boolean {
  return !!localStorage.getItem(getWeekKey());
}

export function markGratitudeThisWeek(): void {
  localStorage.setItem(getWeekKey(), "1");
}

// ── Tip cards ─────────────────────────────────────────────────────────────────
export interface TipCard {
  id: string;
  heading: string;
  body: string;
}

export const TIP_CARDS: TipCard[] = [
  {
    id: "tip-bookmark",
    heading: "Bookmark your place",
    body: "Open any Bible journey and tap the bookmark icon — the app remembers exactly where you left off so you can pick up from the home screen.",
  },
  {
    id: "tip-study",
    heading: "Ask anything about the Bible",
    body: "The Study section is built for any question — type a topic like 'forgiveness', a person's name, or a verse reference and dig in.",
  },
  {
    id: "tip-memory",
    heading: "Memorize a verse step by step",
    body: "In your Journal there's a Memory Verses tab. Save a verse and the app guides you to learn it word by word at your own pace.",
  },
  {
    id: "tip-notifications",
    heading: "Let today's verse find you",
    body: "You can receive each day's verse and reflection by email — quietly, in your morning. Sign up on the home screen.",
  },
  {
    id: "tip-prayer-journal",
    heading: "Your prayers are worth saving",
    body: "The Journal tracks every prayer you write so you can look back and see how God has moved. Tap 'Journal' in the nav to try it.",
  },
];

const TIP_DISMISSED_PREFIX = "sp_tip_dismissed_";
const TIP_LAST_SHOWN_KEY = "sp_tip_last_shown";

export function getNextTip(): TipCard | null {
  const lastShown = localStorage.getItem(TIP_LAST_SHOWN_KEY);
  const today = new Date().toISOString().split("T")[0];
  if (lastShown === today) return null;
  return TIP_CARDS.find((t) => !localStorage.getItem(TIP_DISMISSED_PREFIX + t.id)) ?? null;
}

export function dismissTip(id: string): void {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(TIP_DISMISSED_PREFIX + id, "1");
  localStorage.setItem(TIP_LAST_SHOWN_KEY, today);
}

// ── Daily check-in ────────────────────────────────────────────────────────────
export type CheckinEmotion = "hard" | "anxious" | "okay" | "lonely" | "grateful" | "hopeful" | "drained";

const CHECKIN_PREFIX = "sp_checkin_";

export function getTodayCheckin(): CheckinEmotion | null {
  const today = new Date().toISOString().split("T")[0];
  return (localStorage.getItem(CHECKIN_PREFIX + today) as CheckinEmotion) ?? null;
}

export function saveCheckin(emotion: CheckinEmotion): void {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(CHECKIN_PREFIX + today, emotion);
}

export const CHECKIN_PROMPTS: Record<CheckinEmotion, string> = {
  hard: "Today feels heavy and I could use some encouragement from God's Word…",
  anxious: "I'm feeling anxious right now and need God's peace to settle over me…",
  okay: "I'm doing okay today and just want to spend a few quiet minutes with God…",
  lonely: "I'm feeling lonely today and need a reminder that God is with me…",
  grateful: "I'm feeling grateful today and want to bring that thankfulness to God…",
  hopeful: "I'm feeling hopeful today and want to hold onto that with God's help…",
  drained: "I'm feeling drained and empty — I need God to renew my strength today…",
};

// ── Sunday summary ─────────────────────────────────────────────────────────────
function getSundayKey(): string {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    (((d.getTime() - oneJan.getTime()) / 86_400_000) + oneJan.getDay() + 1) / 7
  );
  return `sp_sunday_${d.getFullYear()}_${weekNum}`;
}

export function isSunday(): boolean {
  return new Date().getDay() === 0;
}

export function isSundaySummaryDismissed(): boolean {
  return !!localStorage.getItem(getSundayKey());
}

export function dismissSundaySummary(): void {
  localStorage.setItem(getSundayKey(), "1");
}

// ── First Steps seeker card ────────────────────────────────────────────────────
const FIRST_STEPS_CARD_KEY = "sp_first_steps_dismissed";

export function shouldShowFirstStepsCard(daysWithApp: number): boolean {
  if (daysWithApp > 7) return false;
  return !localStorage.getItem(FIRST_STEPS_CARD_KEY);
}

export function dismissFirstStepsCard(): void {
  localStorage.setItem(FIRST_STEPS_CARD_KEY, "1");
}

// ── Time-aware greeting ────────────────────────────────────────────────────────
export function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Still here";
}
