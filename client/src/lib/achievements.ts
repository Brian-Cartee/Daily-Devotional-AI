const ACHIEVEMENTS_KEY = "sp_achievements_shown";

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  message: string;
  voiceScript: string;
  colorFrom: string;
  colorTo: string;
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  devotional_first: {
    id: "devotional_first",
    emoji: "✝️",
    title: "First Devotional Complete",
    subtitle: "You've taken your first full step",
    message:
      "You read the Word, reflected on it, prayed through it, and thanked God — that's a complete, whole-hearted offering. A beautiful beginning.",
    voiceScript:
      "Congratulations. You've completed your first full devotional. You read God's Word, reflected on it, prayed through it, and thanked Him. That is a complete, whole-hearted offering. A beautiful beginning to your walk with Jesus.",
    colorFrom: "from-amber-500",
    colorTo: "to-orange-500",
  },
  streak_1: {
    id: "streak_1",
    emoji: "🔥",
    title: "Day One — You Showed Up",
    subtitle: "The most important step",
    message:
      "Every great journey begins with showing up. Today you took your first step on Shepherd's Path. See you tomorrow.",
    voiceScript:
      "Day one is done. You showed up. That is always the hardest part — and you did it. Every great spiritual journey begins exactly like this. We'll be here waiting for you tomorrow.",
    colorFrom: "from-amber-400",
    colorTo: "to-red-400",
  },
  streak_7: {
    id: "streak_7",
    emoji: "🌟",
    title: "One Week of Faithfulness",
    subtitle: "7-day devotional streak",
    message:
      "Seven consecutive days meeting God in His Word. You're building the most important habit a person can have. Keep going.",
    voiceScript:
      "Seven days. One full week of faithfulness. You have shown up every single day, opened God's Word, and let it speak into your life. The disciples walked with Jesus daily — and so are you. This is no small thing. Keep going.",
    colorFrom: "from-yellow-400",
    colorTo: "to-amber-500",
  },
  streak_14: {
    id: "streak_14",
    emoji: "⭐",
    title: "Two Weeks Strong",
    subtitle: "14-day devotional streak",
    message:
      "Two solid weeks. Studies show it takes about 21 days to form a habit — you're almost there. This is becoming part of who you are.",
    voiceScript:
      "Two weeks. Fourteen days of choosing God over everything else that competes for your morning. Research shows habits form around 21 days — you are almost there. This is no longer just a decision you make. It is becoming part of who you are.",
    colorFrom: "from-sky-400",
    colorTo: "to-blue-500",
  },
  streak_30: {
    id: "streak_30",
    emoji: "🏆",
    title: "One Month Walk",
    subtitle: "30-day devotional streak",
    message:
      "Thirty days. One full month walking with God every morning. Your roots are growing deep into soil that does not shift. This is real spiritual formation.",
    voiceScript:
      "Thirty days. One full month. You have met God in His Word every single morning for a whole month. Your roots are growing deep into soil that does not shift. This is what real spiritual formation looks like — not a single dramatic moment, but a quiet, faithful, daily walk. Well done.",
    colorFrom: "from-violet-500",
    colorTo: "to-purple-600",
  },
  streak_100: {
    id: "streak_100",
    emoji: "💎",
    title: "Century of Grace",
    subtitle: "100-day devotional streak",
    message:
      "One hundred days of walking with Jesus. This is extraordinary. Your faithfulness has shaped you in ways you may not even fully see yet.",
    voiceScript:
      "One hundred days. A century of grace. One hundred mornings where you chose to open God's Word before opening anything else. This is extraordinary. Your faithfulness has shaped you in ways you may not even fully see yet — but God sees. Well done, good and faithful servant.",
    colorFrom: "from-rose-400",
    colorTo: "to-pink-600",
  },
};

function getShownIds(): Set<string> {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markAchievementSeen(id: string): void {
  const shown = getShownIds();
  shown.add(id);
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...shown]));
}

export function hasSeenAchievement(id: string): boolean {
  return getShownIds().has(id);
}

export function checkStreakAchievement(streak: number, isNewDay: boolean): Achievement | null {
  if (!isNewDay) return null;

  const milestones: Array<[number, string]> = [
    [1, "streak_1"],
    [7, "streak_7"],
    [14, "streak_14"],
    [30, "streak_30"],
    [100, "streak_100"],
  ];

  for (const [days, id] of milestones) {
    if (streak === days && !hasSeenAchievement(id)) {
      return ACHIEVEMENTS[id];
    }
  }
  return null;
}

export function checkDevotionalFirstComplete(): Achievement | null {
  const id = "devotional_first";
  if (hasSeenAchievement(id)) return null;
  return ACHIEVEMENTS[id];
}
