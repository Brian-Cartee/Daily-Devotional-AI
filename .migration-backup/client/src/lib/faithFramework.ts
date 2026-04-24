export interface FrameworkDay {
  dayIndex: number;
  dayName: string;
  name: string;
  theme: string;
  description: string;
  verse: { text: string; ref: string };
  prayer: string;
  journalPrompt: string;
  guidanceHint: string;
  actionLabel: string;
  actionRoute: string;
  color: {
    accent: string;
    badge: string;
    border: string;
    bg: string;
    text: string;
    gradient: string;
  };
}

const FRAMEWORK: FrameworkDay[] = [
  {
    dayIndex: 0,
    dayName: "Sunday",
    name: "Surrender Sunday",
    theme: "Rest & Renewal",
    description: "Step back, breathe, and let God prepare you for the week ahead.",
    verse: {
      text: "Come to me, all you who are weary and burdened, and I will give you rest.",
      ref: "Matthew 11:28",
    },
    prayer:
      "Lord, I release this week — the wins, the failures, the worries — into Your hands. Renew my spirit and prepare me for what's ahead.",
    journalPrompt:
      "What do I need to surrender to God this week? Where have I been carrying something that isn't mine to carry?",
    guidanceHint:
      "It's Surrender Sunday. I want to release what I've been carrying and ask God to renew my spirit for the week ahead.",
    actionLabel: "Read today's devotional",
    actionRoute: "/devotional",
    color: {
      accent: "hsl(258 42% 52%)",
      badge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
      border: "border-violet-200 dark:border-violet-800",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      text: "text-violet-700 dark:text-violet-300",
      gradient: "from-violet-400 via-purple-500 to-indigo-500",
    },
  },
  {
    dayIndex: 1,
    dayName: "Monday",
    name: "Vision Monday",
    theme: "Calling & Alignment",
    description: "Set your intentions and declare what you believe God is calling you toward this week.",
    verse: {
      text: "For I know the plans I have for you, declares the Lord — plans to prosper you and not to harm you, plans to give you hope and a future.",
      ref: "Jeremiah 29:11",
    },
    prayer:
      "Lord, open my eyes to the calling You've placed on my life. Align my intentions with Your purpose — not mine — this week.",
    journalPrompt:
      "What do I sense God is calling me toward this week? What one step of alignment can I take today?",
    guidanceHint:
      "It's Vision Monday. I want to understand what God is calling me toward right now and set my intentions for the week.",
    actionLabel: "Seek guidance on your calling",
    actionRoute: "/guidance",
    color: {
      accent: "hsl(248 60% 55%)",
      badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
      border: "border-indigo-200 dark:border-indigo-800",
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
      text: "text-indigo-700 dark:text-indigo-300",
      gradient: "from-indigo-400 via-violet-500 to-purple-500",
    },
  },
  {
    dayIndex: 2,
    dayName: "Tuesday",
    name: "Tactical Tuesday",
    theme: "Disciplined Action",
    description: "Identify your 3 non-negotiable steps of faithfulness and move with intention.",
    verse: {
      text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.",
      ref: "Colossians 3:23",
    },
    prayer:
      "Father, give me the discipline to act on what I know is right. Let every step I take today be one of faithfulness, not just busyness.",
    journalPrompt:
      "What are my 3 non-negotiable steps of faithfulness this week? What has been getting in the way of doing what I know I'm called to do?",
    guidanceHint:
      "It's Tactical Tuesday. I want help identifying my 3 most important steps of faithfulness for this week.",
    actionLabel: "Plan your faithful steps",
    actionRoute: "/guidance",
    color: {
      accent: "hsl(210 75% 48%)",
      badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      text: "text-blue-700 dark:text-blue-300",
      gradient: "from-blue-400 via-sky-500 to-cyan-500",
    },
  },
  {
    dayIndex: 3,
    dayName: "Wednesday",
    name: "Wisdom Wednesday",
    theme: "Scripture & Understanding",
    description: "Go deeper into God's Word. If reading the Bible feels hard — listen to it instead. Scripture was meant to be heard.",
    verse: {
      text: "If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.",
      ref: "James 1:5",
    },
    prayer:
      "Lord, give me wisdom — not just knowledge. Help me understand what I read today in a way that changes how I live.",
    journalPrompt:
      "What scripture has been speaking to me lately? What is God trying to show me through His Word right now?",
    guidanceHint:
      "It's Wisdom Wednesday. I want to go deeper into scripture and understand what God is teaching me through His Word.",
    actionLabel: "Listen to scripture today",
    actionRoute: "/understand",
    color: {
      accent: "hsl(190 70% 42%)",
      badge: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
      border: "border-teal-200 dark:border-teal-800",
      bg: "bg-teal-50 dark:bg-teal-950/30",
      text: "text-teal-700 dark:text-teal-300",
      gradient: "from-teal-400 via-emerald-500 to-green-500",
    },
  },
  {
    dayIndex: 4,
    dayName: "Thursday",
    name: "Trust Thursday",
    theme: "Surrender & Trust",
    description: "Let go of control. Trust that God's plan is better than your own.",
    verse: {
      text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
      ref: "Proverbs 3:5–6",
    },
    prayer:
      "God, I confess I have been holding on to things that belong to You. Today I choose to trust Your plan more than my own understanding.",
    journalPrompt:
      "Where am I struggling to trust God right now? What specific thing can I release to Him today?",
    guidanceHint:
      "It's Trust Thursday. I'm struggling to surrender control over something and I need guidance on truly trusting God's plan.",
    actionLabel: "Bring it to God today",
    actionRoute: "/guidance",
    color: {
      accent: "hsl(160 60% 38%)",
      badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-700 dark:text-emerald-300",
      gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    },
  },
  {
    dayIndex: 5,
    dayName: "Friday",
    name: "Faithful Friday",
    theme: "Gratitude & Reflection",
    description: "Acknowledge your wins and your blessings — both are gifts from God.",
    verse: {
      text: "Rejoice always, pray continually, give thanks in all circumstances; for this is God's will for you in Christ Jesus.",
      ref: "1 Thessalonians 5:16–18",
    },
    prayer:
      "Thank You, Lord. For today. For this week. For grace I didn't earn and mercy I can't fully comprehend. Let gratitude be my posture.",
    journalPrompt:
      "What is one thing God did this week that I almost missed? What blessing am I most grateful for right now?",
    guidanceHint:
      "It's Faithful Friday. I want to reflect on where I've seen God move this week and build a heart of gratitude.",
    actionLabel: "Write a grateful reflection",
    actionRoute: "/journal",
    color: {
      accent: "hsl(38 92% 48%)",
      badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-700 dark:text-amber-300",
      gradient: "from-amber-400 via-orange-400 to-yellow-400",
    },
  },
  {
    dayIndex: 6,
    dayName: "Saturday",
    name: "Strength Saturday",
    theme: "Mind, Body & Spirit",
    description: "Build mental, physical, and spiritual strength — all three are given by God.",
    verse: {
      text: "I can do all this through him who gives me strength.",
      ref: "Philippians 4:13",
    },
    prayer:
      "Father, strengthen me today — not just in body, but in spirit and in mind. Let me be a person of resilience built on faith, not willpower alone.",
    journalPrompt:
      "Where do I feel weak right now — physically, mentally, or spiritually? What does it look like to invite God into that weakness?",
    guidanceHint:
      "It's Strength Saturday. I want to understand what it means to be strong in God and how to grow in resilience rooted in faith.",
    actionLabel: "Ask for strength today",
    actionRoute: "/guidance",
    color: {
      accent: "hsl(16 85% 50%)",
      badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
      border: "border-orange-200 dark:border-orange-800",
      bg: "bg-orange-50 dark:bg-orange-950/30",
      text: "text-orange-700 dark:text-orange-300",
      gradient: "from-orange-400 via-red-400 to-rose-400",
    },
  },
];

export function getTodayFramework(): FrameworkDay {
  const dayIndex = new Date().getDay();
  return FRAMEWORK[dayIndex];
}

export function getFrameworkByDay(dayIndex: number): FrameworkDay {
  return FRAMEWORK[dayIndex % 7];
}

export function getAllFrameworkDays(): FrameworkDay[] {
  return FRAMEWORK;
}
