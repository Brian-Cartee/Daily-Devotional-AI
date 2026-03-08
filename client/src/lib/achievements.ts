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
      "Read it. Reflected on it. Prayed it. Thanked God. That is the whole thing — and you nailed it. Not bad for a first timer.",
    voiceScript:
      "Well, look at that. You just completed your first full devotional. You read God's Word, reflected on it, prayed through it, and thanked Him. That is the whole thing — and you nailed it. Not bad for a first timer. Not bad at all. God saw every moment of it. We will be right here tomorrow.",
    colorFrom: "from-amber-500",
    colorTo: "to-orange-500",
  },
  streak_1: {
    id: "streak_1",
    emoji: "🔥",
    title: "Day One — You Showed Up",
    subtitle: "The most important step",
    message:
      "In a world where everything fights for your attention — you chose God first. Don't let it go to your head. Just do it again tomorrow.",
    voiceScript:
      "Day one is in the books. You showed up. In a world where everything is competing for your attention — your phone, the news, the noise — you chose God first. And honestly? That is kind of a big deal. Don't let it go to your head though. Just do it again tomorrow. And the day after that.",
    colorFrom: "from-amber-400",
    colorTo: "to-red-400",
  },
  streak_7: {
    id: "streak_7",
    emoji: "🌟",
    title: "One Week of Faithfulness",
    subtitle: "7-day devotional streak",
    message:
      "Seven days in a row. At this point you should probably just accept that this is your life now. We think it's a great life to have.",
    voiceScript:
      "Seven days in a row. Seven. At this point, you should probably just accept that this is your life now — and honestly, we think that is a fantastic life to have. The disciples walked with Jesus daily for years. You are doing the same thing. Seven days is the beginning of a habit. A habit is the beginning of a life. Keep going.",
    colorFrom: "from-yellow-400",
    colorTo: "to-amber-500",
  },
  streak_14: {
    id: "streak_14",
    emoji: "⭐",
    title: "Two Weeks Strong",
    subtitle: "14-day devotional streak",
    message:
      "Fourteen mornings of choosing God over the snooze button. We're not sure the snooze button has noticed. But God definitely has.",
    voiceScript:
      "Two weeks. Fourteen mornings of choosing God over the snooze button. That is no small thing. Studies say habits form around 21 days — you are almost there. And between you and us, you are already a different person than when you started. We are not sure the snooze button has noticed. But God has. Every single morning. Keep going.",
    colorFrom: "from-sky-400",
    colorTo: "to-blue-500",
  },
  streak_30: {
    id: "streak_30",
    emoji: "🏆",
    title: "One Month Walk",
    subtitle: "30-day devotional streak",
    message:
      "Thirty days. We believed in you from day one — but thirty days? That's impressive. Sin is losing ground. Peace is moving in. Don't stop now.",
    voiceScript:
      "Thirty days. One whole month. Okay — we have to be honest with you. We believed in you from day one. But thirty days? That is genuinely impressive. Something is shifting inside you, even if you cannot fully name it yet. Sin is losing ground. Peace is moving in. That is not an accident — that is what daily time with God does. Keep going. Do not stop now.",
    colorFrom: "from-violet-500",
    colorTo: "to-purple-600",
  },
  streak_100: {
    id: "streak_100",
    emoji: "💎",
    title: "Century of Grace",
    subtitle: "100-day devotional streak",
    message:
      "One hundred days. We need a moment. A hundred mornings choosing God before anything else. That is not normal. That is extraordinary.",
    voiceScript:
      "One hundred days. We need a moment. Okay — we are back. A hundred mornings where you chose God before your phone, before your coffee, before anything else. That is not normal. That is extraordinary. You have made the daily walk with Jesus part of who you are — and sin does not stand a chance against a life built on God's Word. Well done, good and faithful servant.",
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
