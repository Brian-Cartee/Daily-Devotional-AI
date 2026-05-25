import OpenAI from "openai";
import { storage } from "./storage";

export type ThresholdPayload = {
  headline: string;
  subtext: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  phase: string;
  daysWithApp: number;
  streak: number;
  listenFirstSuggested: boolean;
  continuityLine?: string;
};

export type WeeklyWeatherPayload = {
  shouldShow: boolean;
  weekLabel: string;
  observations: string[];
  invitation: string;
  guidancePrefill?: string;
  tier: "free" | "pro";
  theme?: string | null;
  seasonLetter?: string | null;
  journalCount?: number;
};

function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return 999;
  return Math.floor((Date.now() - then) / 86_400_000);
}

function excerpt(text: string, max = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function pickJournalTheme(entries: { type: string; content: string; createdAt: Date | string }[]): string | null {
  const recent = entries.slice(0, 12);
  const text = recent.map((e) => e.content.toLowerCase()).join(" ");
  const themes: [RegExp, string][] = [
    [/anxiet|worry|overwhelm|fear/, "anxiety"],
    [/grief|loss|died|miss/, "grief"],
    [/lonely|alone|isolat/, "loneliness"],
    [/grateful|thankful|bless/, "gratitude"],
    [/marriage|spouse|husband|wife|child|family/, "family"],
    [/work|job|money|debt|financ/, "provision"],
    [/angry|anger|frustrat/, "anger"],
    [/doubt|faith|believe/, "faith"],
  ];
  for (const [re, label] of themes) {
    if (re.test(text)) return label;
  }
  return null;
}

function recentJournalContext(
  entries: { type: string; content: string; createdAt: Date | string }[],
  days = 14,
): { theme: string | null; snippet: string | null; memoryLine: string | null } {
  const cutoff = Date.now() - days * 86_400_000;
  const recent = entries.filter((e) => new Date(e.createdAt).getTime() >= cutoff);
  const theme = pickJournalTheme(recent);
  const human = recent.find((e) => e.type !== "guidance_memory");
  const memory = recent.find((e) => e.type === "guidance_memory");
  return {
    theme,
    snippet: human?.content ? excerpt(human.content, 72) : null,
    memoryLine: memory?.content ? excerpt(memory.content, 96) : null,
  };
}

export async function buildThresholdPayload(
  sessionId: string,
  daysWithApp: number,
  isPro = false,
): Promise<ThresholdPayload> {
  const hour = new Date().getHours();
  const listenFirstSuggested = hour >= 21 || hour < 5;

  let streak = 0;
  try {
    const s = await storage.getStreak(sessionId);
    streak = s?.currentStreak ?? 0;
  } catch {
    /* noop */
  }

  let lastVisitDays = 0;
  try {
    const entries = await storage.getJournalEntries(sessionId);
    if (entries.length > 0) {
      const newest = entries[0]?.createdAt;
      if (newest) lastVisitDays = daysSince(String(newest));
    }
    const { theme, snippet: lastSnippet, memoryLine } = recentJournalContext(entries, isPro ? 21 : 14);

    if (lastVisitDays >= 3) {
      return {
        headline: "Nothing has been lost.",
        subtext: "Pick up where you left off — or tell me what's on your heart today.",
        primaryCta: { label: "Talk it through", href: "/guidance" },
        secondaryCta: { label: "Today's devotional", href: "/devotional" },
        phase: "returning",
        daysWithApp,
        streak,
        listenFirstSuggested,
        continuityLine: isPro && memoryLine ? `Last time we talked, you were carrying: “${memoryLine}”` : undefined,
      };
    }

    if (theme && lastSnippet && daysWithApp >= (isPro ? 3 : 5)) {
      return {
        headline: "What are you carrying today?",
        subtext: isPro && memoryLine
          ? `You've been walking through ${theme}. Something from our last conversation may still be with you — we can pick that up, or start fresh.`
          : `You've been walking through ${theme} lately. If that's still with you, we can stay there — or start fresh.`,
        primaryCta: { label: "Talk it through", href: `/guidance?situation=${encodeURIComponent(`I'm still carrying ${theme} and need God's presence today`)}` },
        secondaryCta: { label: "Just read today's verse", href: "/devotional" },
        phase: "remembered",
        daysWithApp,
        streak,
        listenFirstSuggested,
        continuityLine: isPro && memoryLine ? memoryLine : undefined,
      };
    }
  } catch {
    /* journal optional */
  }

  if (hour >= 23 || hour < 5) {
    return {
      headline: "Still awake?",
      subtext: "You don't have to figure it out tonight. Bring what's heavy — or let today's verse hold you.",
      primaryCta: { label: "Talk it through", href: "/guidance" },
      secondaryCta: { label: "Listen to today's verse", href: "/devotional" },
      phase: "latenight",
      daysWithApp,
      streak,
      listenFirstSuggested: true,
    };
  }

  if (hour >= 5 && hour < 11) {
    return {
      headline: daysWithApp <= 3 ? "Good morning — you don't have to walk alone." : "What are you carrying into today?",
      subtext: "One honest step is enough. Scripture and prayer can meet you before the day rushes in.",
      primaryCta: { label: "Talk it through", href: "/guidance" },
      secondaryCta: { label: "Today's devotional", href: "/devotional" },
      phase: "morning",
      daysWithApp,
      streak,
      listenFirstSuggested,
    };
  }

  if (hour >= 17 && hour < 22) {
    return {
      headline: "How did today land on your soul?",
      subtext: "Before the day closes, take a breath with God — alignment, gratitude, or whatever is true.",
      primaryCta: { label: "Evening alignment", href: "/alignment" },
      secondaryCta: { label: "Talk it through", href: "/guidance" },
      phase: "evening",
      daysWithApp,
      streak,
      listenFirstSuggested,
    };
  }

  return {
    headline: "What's on your heart right now?",
    subtext: "No performance. No perfect words. Just honesty — and Scripture that meets you there.",
    primaryCta: { label: "Talk it through", href: "/guidance" },
    secondaryCta: { label: "Today's devotional", href: "/devotional" },
    phase: "midday",
    daysWithApp,
    streak,
    listenFirstSuggested,
  };
}

async function generateProSeasonLetter(
  recent: { type: string; content: string }[],
  observations: string[],
  theme: string | null,
  name?: string | null,
): Promise<string | null> {
  try {
    const cutoffContext = recent
      .filter((e) => e.type !== "verse")
      .slice(0, 6)
      .map((e) => {
        const label =
          e.type === "guidance_memory"
            ? "Guidance"
            : e.type === "prayer"
              ? "Prayer"
              : e.type === "reflection"
                ? "Reflection"
                : "Journal";
        return `[${label}]: ${e.content.replace(/\n+/g, " ").slice(0, 280)}`;
      })
      .join("\n");

    if (!cutoffContext.trim()) return null;

    const nameClause = name ? ` Their name is ${name}.` : "";
    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 320,
      temperature: 0.78,
      messages: [
        {
          role: "system",
          content: `You write a weekly "spiritual weather" letter for one Christian app user.${nameClause}

Write 4–5 sentences as a warm pastoral mirror of their week — not preachy, not clinical. Reflect what they actually named (themes, emotions, prayers). End with one gentle invitation toward God. No bullet points. No subject line.

Observations we already surfaced: ${observations.join(" ")}
${theme ? `Dominant theme: ${theme}.` : ""}`,
        },
        { role: "user", content: `Their week in their words:\n\n${cutoffContext}` },
      ],
    });
    const letter = completion.choices[0]?.message?.content?.trim();
    if (letter && letter.length > 40 && letter.length < 1200) return letter;
  } catch (err) {
    console.error("[weather] season letter failed:", err);
  }
  return null;
}

export async function buildWeeklyWeather(
  sessionId: string,
  opts?: { isPro?: boolean; withSeasonLetter?: boolean; subscriberName?: string | null },
): Promise<WeeklyWeatherPayload> {
  const isPro = opts?.isPro === true;
  const tier = isPro ? "pro" : "free";
  const weekLabel = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(new Date());
  const empty: WeeklyWeatherPayload = {
    shouldShow: false,
    weekLabel,
    observations: [],
    invitation: "",
    tier,
  };

  try {
    const entries = await storage.getJournalEntries(sessionId);
    const weekAgo = Date.now() - 7 * 86_400_000;
    const recent = entries.filter((e) => new Date(e.createdAt).getTime() >= weekAgo);
    const minEntries = isPro ? 1 : 2;
    if (recent.length < minEntries) {
      return empty;
    }

    const text = recent.map((e) => e.content.toLowerCase()).join(" ");
    const observations: string[] = [];

    const countMatch = (re: RegExp, label: string) => {
      const hits = (text.match(re) || []).length;
      if (hits >= (isPro ? 1 : 2)) observations.push(`You named ${label} this week.`);
    };

    countMatch(/anxiet|worry|overwhelm|fear/, "anxiety or worry");
    countMatch(/grateful|thankful|bless/, "gratitude");
    countMatch(/grief|loss|miss/, "grief or loss");
    countMatch(/pray|prayer|lord|father/, "prayer");
    countMatch(/alone|lonely/, "loneliness");

    if (isPro) {
      const guidanceCount = recent.filter((e) => e.type === "guidance_memory").length;
      if (guidanceCount > 0) {
        observations.push(
          guidanceCount === 1
            ? "You opened Guidance once this week — that honesty matters."
            : `You brought ${guidanceCount} conversations to Guidance this week.`,
        );
      }
    }

    if (observations.length === 0) {
      observations.push(`You showed up ${recent.length} time${recent.length === 1 ? "" : "s"} in your journal this week.`);
      observations.push("That consistency matters — even when the words feel ordinary.");
    }

    const theme = pickJournalTheme(recent);
    const guidancePrefill = theme
      ? `This week I've been carrying ${theme}. Help me bring it honestly before God.`
      : "Help me understand what this week has been trying to teach me spiritually.";

    let seasonLetter: string | null = null;
    if (isPro && opts?.withSeasonLetter) {
      seasonLetter = await generateProSeasonLetter(recent, observations, theme, opts.subscriberName);
    }

    return {
      shouldShow: true,
      weekLabel,
      observations: observations.slice(0, isPro ? 5 : 4),
      invitation: isPro
        ? "This is your week, reflected back — not to fix you, but to walk with you into the next one."
        : "Want to bring this to God together?",
      guidancePrefill,
      tier,
      theme,
      seasonLetter,
      journalCount: recent.length,
    };
  } catch {
    return empty;
  }
}

export function weeklyWeatherEmailSubject(theme: string | null): string {
  if (theme === "grief") return "Your week held grief — God sees it";
  if (theme === "anxiety") return "What your week has been carrying";
  if (theme === "gratitude") return "Gratitude showed up in your week";
  if (theme === "loneliness") return "You weren't alone in writing this";
  return "Your spiritual weather this week";
}

type VerseFrameOpenAI = {
  chat: {
    completions: {
      create: (args: unknown) => Promise<{ choices: Array<{ message?: { content?: string | null } }> }>;
    };
  };
};

export async function buildVerseFrame(
  openai: VerseFrameOpenAI,
  reference: string,
  text: string,
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 60,
      messages: [
        {
          role: "system",
          content:
            "Write ONE short pastoral sentence (max 18 words) framing today's Bible verse for a weary Christian app user. Warm, non-preachy, no clichés. No quotes around the verse text.",
        },
        { role: "user", content: `${reference}: "${text.slice(0, 200)}"` },
      ],
    });
    const line = completion.choices[0]?.message?.content?.trim();
    if (line && line.length < 120) return line;
  } catch {
    /* fallback */
  }
  return "One word for today — let it walk with you.";
}
