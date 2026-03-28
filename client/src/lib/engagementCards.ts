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

export function isReturningUser(): boolean {
  const last = getLastOpenDate();
  if (!last) return false;
  const today = new Date().toISOString().split("T")[0];
  if (last === today) return false;
  const daysDiff = Math.floor(
    (new Date(today).getTime() - new Date(last).getTime()) / 86_400_000
  );
  return daysDiff >= 3;
}

export function isReturnCardDismissedToday(): boolean {
  const today = new Date().toISOString().split("T")[0];
  return localStorage.getItem(RETURN_CARD_DISMISSED_KEY) === today;
}

export function dismissReturnCard(): void {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(RETURN_CARD_DISMISSED_KEY, today);
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
    heading: "Let the Word meet you each morning",
    body: "Tap the bell icon to set a morning verse, midday prayer, or evening reflection — delivered to you every day without opening the app.",
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
export type CheckinEmotion = "hard" | "okay" | "grateful";

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
  okay: "I'm doing okay today and just want to spend a few quiet minutes with God…",
  grateful: "I'm feeling grateful today and want to bring that thankfulness to God…",
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

// ── Time-aware greeting ────────────────────────────────────────────────────────
export function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Still here";
}
