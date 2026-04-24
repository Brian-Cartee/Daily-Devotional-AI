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
  photo?: string;
  photoOverlay?: string;
}

export interface Badge {
  name: string;
  verse: string;
  threshold: number;
}

export const PSALM23_BADGES: Badge[] = [
  { name: "Green Pastures",   verse: "Psalm 23:2", threshold: 3   },
  { name: "Still Waters",     verse: "Psalm 23:2", threshold: 7   },
  { name: "Restored",         verse: "Psalm 23:3", threshold: 14  },
  { name: "Righteous Paths",  verse: "Psalm 23:3", threshold: 21  },
  { name: "No Fear",          verse: "Psalm 23:4", threshold: 30  },
  { name: "Anointed",         verse: "Psalm 23:5", threshold: 60  },
  { name: "Goodness & Mercy", verse: "Psalm 23:6", threshold: 90  },
  { name: "Dwelling",         verse: "Psalm 23:6", threshold: 365 },
];

export function getBadge(streak: number): Badge | null {
  if (streak < 3) return null;
  let current: Badge | null = null;
  for (const badge of PSALM23_BADGES) {
    if (streak >= badge.threshold) current = badge;
  }
  return current;
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
    photo: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=800&q=80",
    photoOverlay: "rgba(160,70,10,0.52)",
  },
  streak_1: {
    id: "streak_1",
    emoji: "🔥",
    title: "Day One — You Showed Up",
    subtitle: "The most important step",
    message:
      "In a world where everything fights for your attention — you chose God first. That's where it starts.",
    voiceScript:
      "Day one is in the books. You showed up. In a world where everything is competing for your attention — your phone, the news, the noise — you chose God first. And honestly? That is kind of a big deal. That is where it starts.",
    colorFrom: "from-amber-400",
    colorTo: "to-red-400",
    photo: "https://images.unsplash.com/photo-1418050327236-8de8ba25f5a1?w=800&q=80",
    photoOverlay: "rgba(140,50,10,0.50)",
  },
  streak_3: {
    id: "streak_3",
    emoji: "🌿",
    title: "Green Pastures",
    subtitle: "3-day streak · Psalm 23:2",
    message:
      "\"He makes me lie down in green pastures.\" Three days of choosing rest in God before the rush of the day. You are learning what it means to be led.",
    voiceScript:
      "Green Pastures. Three days. Psalm 23 says He makes you lie down in green pastures — and that word 'makes' is important. It means He provides the kind of rest you cannot give yourself. Three days of showing up is you learning to receive that. The path gets quieter the further you walk it.",
    colorFrom: "from-green-400",
    colorTo: "to-emerald-500",
    photo: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80",
    photoOverlay: "rgba(20,100,60,0.50)",
  },
  streak_7: {
    id: "streak_7",
    emoji: "💧",
    title: "Still Waters",
    subtitle: "7-day streak · Psalm 23:2",
    message:
      "\"He leads me beside still waters.\" Seven days of being led. You are not forcing this — you are being guided. That is the whole difference.",
    voiceScript:
      "Still Waters. Seven days. He leads you beside still waters — not turbulent ones, not impressive ones. Still ones. Quiet ones. The kind that restore something in you that noise keeps stealing. Seven days of showing up. That kind of honesty builds something — even if it doesn't feel like it yet.",
    colorFrom: "from-sky-400",
    colorTo: "to-blue-500",
    photo: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    photoOverlay: "rgba(10,60,130,0.48)",
  },
  streak_14: {
    id: "streak_14",
    emoji: "✨",
    title: "Restored",
    subtitle: "14-day streak · Psalm 23:3",
    message:
      "\"He restores my soul.\" Two weeks. Something in you is being put back together — quietly, daily, without fanfare. That is what this is.",
    voiceScript:
      "Restored. Fourteen days. He restores my soul — not fixes it, not upgrades it. Restores it. Like something that was always meant to be whole. Two weeks of time with God is two weeks of that restoration work happening in you, whether you feel it yet or not.",
    colorFrom: "from-violet-400",
    colorTo: "to-purple-500",
    photo: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
    photoOverlay: "rgba(80,20,130,0.48)",
  },
  streak_21: {
    id: "streak_21",
    emoji: "🛤️",
    title: "Righteous Paths",
    subtitle: "21-day streak · Psalm 23:3",
    message:
      "\"He guides me in paths of righteousness.\" Three weeks. The path you are walking is not accidental — you are being guided.",
    voiceScript:
      "Righteous Paths. Twenty-one days. That is not an accident. He guides you in paths of righteousness for His name's sake. Meaning: He has a reason for walking with you through this. It is not random. The path you are on was chosen for you, and you have been faithful enough to stay on it for three weeks. That matters more than you know.",
    colorFrom: "from-amber-500",
    colorTo: "to-yellow-400",
    photo: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80",
    photoOverlay: "rgba(120,80,10,0.48)",
  },
  streak_30: {
    id: "streak_30",
    emoji: "🏔️",
    title: "No Fear",
    subtitle: "30-day streak · Psalm 23:4",
    message:
      "\"Even though I walk through the valley of the shadow of death, I will fear no evil.\" Thirty days. You have walked through some valleys to get here. You are still here.",
    voiceScript:
      "No Fear. Thirty days. The valley of the shadow of death is not just a poetic phrase — it is a real place, and some of your thirty days were probably spent in it. There's a quiet rhythm forming here. Not something you have to keep — just something that's been present. And the promise is not that the valley disappears. It is that you do not have to walk it alone.",
    colorFrom: "from-slate-500",
    colorTo: "to-zinc-700",
    photo: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    photoOverlay: "rgba(30,30,50,0.55)",
  },
  streak_60: {
    id: "streak_60",
    emoji: "🫒",
    title: "Anointed",
    subtitle: "60-day streak · Psalm 23:5",
    message:
      "\"You anoint my head with oil.\" Sixty days. You are known here. That anointing is God's way of saying: I see you. I have set you apart. You belong at this table.",
    voiceScript:
      "Anointed. Sixty days. You anoint my head with oil — in ancient times, that was an act of honor. Of recognition. Of being seen and set apart. Sixty days of daily faithfulness means God has been watching, every morning, every time you chose this over everything else pulling at you. You are anointed for whatever comes next. Do not forget that.",
    colorFrom: "from-amber-600",
    colorTo: "to-orange-700",
    photo: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80",
    photoOverlay: "rgba(120,60,0,0.52)",
  },
  streak_100: {
    id: "streak_100",
    emoji: "💎",
    title: "Goodness & Mercy",
    subtitle: "100-day streak · Psalm 23:6",
    message:
      "\"Surely goodness and mercy shall follow me all the days of my life.\" One hundred days. Goodness and mercy are not ahead of you — they have been following you the whole time.",
    voiceScript:
      "Goodness and Mercy. One hundred days. Surely — not maybe, not hopefully. Surely — goodness and mercy will follow you all the days of your life. A hundred mornings of opening this. A hundred days of being followed by something good, even when it was hard to see. That promise has been true every single one of those days. And it will be true tomorrow.",
    colorFrom: "from-rose-400",
    colorTo: "to-pink-600",
    photo: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80",
    photoOverlay: "rgba(160,20,80,0.48)",
  },
  streak_365: {
    id: "streak_365",
    emoji: "🏠",
    title: "Dwelling",
    subtitle: "365-day streak · Psalm 23:6",
    message:
      "\"I will dwell in the house of the Lord forever.\" One year. Every day. You don't just visit here anymore. You live here.",
    voiceScript:
      "Dwelling. Three hundred and sixty-five days. I will dwell in the house of the Lord forever. You started this a year ago — maybe out of curiosity, maybe out of need, maybe out of desperation. And now, after every kind of day this year has given you, you are still here. You don't visit anymore. You live here. That is the most beautiful thing.",
    colorFrom: "from-primary",
    colorTo: "to-violet-600",
    photo: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80",
    photoOverlay: "rgba(60,30,120,0.55)",
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
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(Array.from(shown)));
}

export function hasSeenAchievement(id: string): boolean {
  return getShownIds().has(id);
}

export function checkStreakAchievement(streak: number, isNewDay: boolean): Achievement | null {
  if (!isNewDay) return null;

  const milestones: Array<[number, string]> = [
    [1,   "streak_1"],
    [3,   "streak_3"],
    [7,   "streak_7"],
    [14,  "streak_14"],
    [21,  "streak_21"],
    [30,  "streak_30"],
    [60,  "streak_60"],
    [100, "streak_100"],
    [365, "streak_365"],
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
