/**
 * The Return — daily engagement state machine
 *
 * Five time-based phases guide the user through their day
 * without pressure, guilt, or urgency.
 */

export type DayPhase = "morning" | "midday" | "evening" | "close" | "latenight";
export type WalkLevel = "beginner" | "returning" | "growing" | "struggling";

export interface ReturnPhase {
  phase: DayPhase;
  eyebrow: string;
  headline: string;
  subtext: string;
  cta: string;
  ctaUrl: string;
  secondaryCta?: string;
  secondaryUrl?: string;
}

// ── Phase detection ───────────────────────────────────────────────────────────

export function getDayPhase(): DayPhase {
  const h = new Date().getHours();
  if (h >= 23 || h < 5)  return "latenight";
  if (h >= 5  && h < 11) return "morning";
  if (h >= 11 && h < 17) return "midday";
  if (h >= 17 && h < 21) return "evening";
  return "close"; // 21–23
}

// ── Walk level ────────────────────────────────────────────────────────────────

export function getWalkLevel(daysWithApp: number): WalkLevel {
  if (daysWithApp <= 7)  return "beginner";
  if (daysWithApp <= 30) return "returning";
  if (daysWithApp <= 90) return "growing";
  return "struggling"; // long-term users may hit dryness — treat with depth
}

// ── Last emotion (set by mood check-in) ──────────────────────────────────────

const EMOTION_KEY = `sp_checkin_emotion_${new Date().toISOString().slice(0, 10)}`;

export function getLastEmotion(): string | null {
  try { return localStorage.getItem(EMOTION_KEY); } catch { return null; }
}

export function saveLastEmotion(emotion: string) {
  try { localStorage.setItem(EMOTION_KEY, emotion); } catch {}
}

// ── Phase content (static base) ───────────────────────────────────────────────

const MORNING_VERSES = [
  { text: "Come to me, all who are weary...", ref: "Matthew 11:28" },
  { text: "This is the day that the Lord has made.", ref: "Psalm 118:24" },
  { text: "The steadfast love of the Lord never ceases.", ref: "Lamentations 3:22" },
  { text: "He gives strength to the weary.", ref: "Isaiah 40:29" },
  { text: "Your word is a lamp to my feet.", ref: "Psalm 119:105" },
  { text: "Peace I leave with you; My peace I give you.", ref: "John 14:27" },
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
];

export function getTodayMorningVerse(): { text: string; ref: string } {
  const i = Math.floor(Date.now() / 86_400_000) % MORNING_VERSES.length;
  return MORNING_VERSES[i];
}

// ── Personalized headline variants ────────────────────────────────────────────

function morningHeadline(level: WalkLevel, lastEmotion: string | null): string {
  if (lastEmotion === "anxious" || lastEmotion === "hard") {
    return "A word for what you're carrying today.";
  }
  if (lastEmotion === "grateful" || lastEmotion === "hopeful") {
    return "Something is already waiting for you today.";
  }
  if (level === "beginner") return "You don't need to figure it all out. Just begin.";
  if (level === "returning") return "The door is still open. It always has been.";
  return "Something is waiting for you today.";
}

function middayHeadline(lastEmotion: string | null): string {
  if (lastEmotion === "drained") return "You've been carrying a lot. Take a breath.";
  if (lastEmotion === "lonely") return "Before you move on — you're not as alone as it feels.";
  if (lastEmotion === "anxious") return "Before you move on… take a breath.";
  return "Before you move on… take a breath.";
}

function eveningHeadline(lastEmotion: string | null): string {
  if (lastEmotion === "hard") return "The day was heavy. How did you walk through it?";
  if (lastEmotion === "steady") return "You held steady today. How does it feel to look back?";
  return "How did you walk today?";
}

// ── Main getter ───────────────────────────────────────────────────────────────

export function getReturnPhase(daysWithApp = 0): ReturnPhase {
  const phase = getDayPhase();
  const level = getWalkLevel(daysWithApp);
  const lastEmotion = getLastEmotion();

  switch (phase) {
    case "morning":
      return {
        phase: "morning",
        eyebrow: "Morning",
        headline: morningHeadline(level, lastEmotion),
        subtext: "You don't have to carry it alone today.",
        cta: "Where are you today?",
        ctaUrl: "/guidance",
        secondaryCta: "Today's devotional",
        secondaryUrl: "/devotional",
      };

    case "midday":
      return {
        phase: "midday",
        eyebrow: "Midday",
        headline: middayHeadline(lastEmotion),
        subtext: "Where are you, really?",
        cta: "Take a moment",
        ctaUrl: "/guidance",
      };

    case "evening":
      return {
        phase: "evening",
        eyebrow: "Evening",
        headline: eveningHeadline(lastEmotion),
        subtext: "Not perfection. Just honest reflection.",
        cta: "Reflect on your walk",
        ctaUrl: "/alignment",
        secondaryCta: "Or bring something to God",
        secondaryUrl: "/guidance",
      };

    case "close":
      return {
        phase: "close",
        eyebrow: "Closing the day",
        headline: "Tomorrow is another step.",
        subtext: "You don't have to get it all right — just keep walking.",
        cta: "Rest and pray",
        ctaUrl: "/devotional",
      };

    default: // latenight — handled by LateNightBannerCard
      return {
        phase: "latenight",
        eyebrow: "Still with you",
        headline: "Whatever brought you here tonight — you're not alone.",
        subtext: "God meets people exactly where they are.",
        cta: "Bring it to God",
        ctaUrl: "/guidance",
      };
  }
}

// ── State machine transitions ─────────────────────────────────────────────────
//
// ARRIVAL (morning)
//   └─ "Where are you today?" → /guidance (Depth Flow)
//        └─ response received → Walk This Today card appears
//
// MIDDAY
//   └─ "Take a breath" → /guidance → quick AI response
//
// EVENING
//   └─ "How did you walk today?" → /alignment (Scriptural Alignment)
//        └─ all 5 answered → "Tomorrow is another step." (close message)
//
// CLOSE (21–23h)
//   └─ "Rest and pray" → /devotional
//
// Notes:
//   - No tracking of missed sessions
//   - No "you should have opened this earlier" language
//   - Absence is never acknowledged negatively
//   - Each arrival is treated as a fresh beginning
