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
      "You opened God's Word, sat with it, prayed through it, and offered your gratitude. That is not a small thing. That is a soul turning toward its Maker.",
    voiceScript:
      "You just completed your first full devotional. You opened God's Word, sat with it, prayed through it, and offered your gratitude back to God. That is not a small thing. That is a soul turning toward its Maker. This is exactly how transformation begins — not in one dramatic moment, but in a quiet decision to show up. God saw you today. Well done. We will be here tomorrow.",
    colorFrom: "from-amber-500",
    colorTo: "to-orange-500",
  },
  streak_1: {
    id: "streak_1",
    emoji: "🔥",
    title: "Day One — You Showed Up",
    subtitle: "The most important step",
    message:
      "In a world full of noise and distraction, you chose something different today. You chose God. Do not underestimate what you started.",
    voiceScript:
      "Day one. You showed up. In a world full of noise, distraction, and things competing for your attention — you chose something different. You chose God. That choice, made consistently and faithfully every single morning, will change your life. We have seen it happen. Do not underestimate what you started today. See you tomorrow.",
    colorFrom: "from-amber-400",
    colorTo: "to-red-400",
  },
  streak_7: {
    id: "streak_7",
    emoji: "🌟",
    title: "One Week of Faithfulness",
    subtitle: "7-day devotional streak",
    message:
      "Seven days of choosing God before anything else. The disciples walked with Jesus daily for years — and so are you. Keep going.",
    voiceScript:
      "Seven days. One full week of choosing God before you chose anything else. Let that sink in. The disciples did not become men of God in a single afternoon — they walked with Jesus, daily, for years. And right now, you are doing the same thing. Seven days is the beginning of a habit. A habit is the beginning of a life. Keep going.",
    colorFrom: "from-yellow-400",
    colorTo: "to-amber-500",
  },
  streak_14: {
    id: "streak_14",
    emoji: "⭐",
    title: "Two Weeks Strong",
    subtitle: "14-day devotional streak",
    message:
      "Fourteen mornings where you could have scrolled your phone and instead opened God's Word. That is conviction. That is character being built.",
    voiceScript:
      "Two weeks. Fourteen mornings where you could have rolled over, checked your phone, and let the world in first — and instead you opened God's Word. That is conviction. That is character. Studies show habits form around 21 days — you are nearly there. But more than a habit, you are building a life of accountability before God. He has seen every single one of those days. And He is pleased. Keep going.",
    colorFrom: "from-sky-400",
    colorTo: "to-blue-500",
  },
  streak_30: {
    id: "streak_30",
    emoji: "🏆",
    title: "One Month Walk",
    subtitle: "30-day devotional streak",
    message:
      "Thirty days. Something has shifted in you — even if you can't fully name it yet. That is what daily time with God does. Your roots are growing.",
    voiceScript:
      "Thirty days. One full month. Do you feel it? Something has shifted in you — even if you cannot fully name it yet. That is what daily time with God does. It does not always come in flashes of lightning. Most of the time it comes quietly, steadily — like roots growing deep into soil you cannot even see. Sin is losing ground. Peace is gaining it. This is real spiritual formation. Keep going.",
    colorFrom: "from-violet-500",
    colorTo: "to-purple-600",
  },
  streak_100: {
    id: "streak_100",
    emoji: "💎",
    title: "Century of Grace",
    subtitle: "100-day devotional streak",
    message:
      "One hundred days. What you have built is not just a streak — it is a way of life quietly reshaping who you are from the inside out.",
    voiceScript:
      "One hundred days. A hundred mornings where you chose the Lord over everything else competing for your attention. This is not ordinary. Most people never get here. What you have built is not just a streak — it is a way of life. A daily rhythm of Scripture, reflection, and prayer that is quietly reshaping who you are from the inside out. Sin does not stand a chance against a life rooted in God's Word. God sees every single one of those days. Well done, good and faithful servant.",
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
