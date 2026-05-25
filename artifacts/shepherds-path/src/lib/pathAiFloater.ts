/** Path AI floater — page context, prompts, and visibility rules */

export const HIDE_FLOATER_PREFIXES = [
  "/guidance",
  "/prayer-closet",
  "/shepherd-admin",
  "/present",
  "/demo",
  "/display",
  "/screenshot-gen",
];

export function shouldHidePathAiFloater(path: string): boolean {
  return HIDE_FLOATER_PREFIXES.some((p) => path.startsWith(p));
}

export type PathAiPageId =
  | "home"
  | "devotional"
  | "journal"
  | "read"
  | "study"
  | "journey"
  | "alignment"
  | "moments"
  | "default";

export interface PathAiPrompt {
  label: string;
  icon: string;
  testId?: string;
  /** Opens a page instead of sending a question to Path AI */
  navigateTo?: string;
}

export const PATH_AI_HOW_TO_USE_PROMPT: PathAiPrompt = {
  label: "How does this app work?",
  icon: "📱",
  testId: "how-app-works",
  navigateTo: "/how-to-use",
};

function withAppGuidePrompt(prompts: PathAiPrompt[]): PathAiPrompt[] {
  const rest = prompts.filter((p) => p.testId !== PATH_AI_HOW_TO_USE_PROMPT.testId);
  return [PATH_AI_HOW_TO_USE_PROMPT, ...rest];
}

export interface PathAiPageContext {
  pageId: PathAiPageId;
  chipLabel: string;
  greeting: string;
  subline: string;
  prompts: PathAiPrompt[];
}

const UNIVERSAL_PROMPTS: PathAiPrompt[] = [
  { label: "I feel anxious and overwhelmed", icon: "🌿" },
  { label: "Help me understand a Bible verse", icon: "📖" },
  { label: "I need encouragement right now", icon: "🌄" },
];

function finishContext(ctx: PathAiPageContext): PathAiPageContext {
  return { ...ctx, prompts: withAppGuidePrompt(ctx.prompts) };
}

export function getPathAiPageContext(
  path: string,
  opts?: { verseReference?: string | null },
): PathAiPageContext {
  const ref = opts?.verseReference?.trim();

  if (path.startsWith("/how-to-use")) {
    return finishContext({
      pageId: "default",
      chipLabel: "App guide",
      greeting: "Questions about the app?",
      subline: "Path AI can still help — or browse the full guide on this page",
      prompts: [
        { label: "What's the best place to start each morning?", icon: "🌅" },
        { label: "What's the difference between Path AI and Talk it through?", icon: "💬" },
        ...UNIVERSAL_PROMPTS.slice(0, 1),
      ],
    });
  }

  if (path.startsWith("/devotional")) {
    return finishContext({
      pageId: "devotional",
      chipLabel: ref ? `Today's verse · ${ref}` : "Today's devotional",
      greeting: ref ? `Ask about ${ref}` : "Ask about today's devotional",
      subline: "A quick faithful answer — or go deeper in Talk It Through",
      prompts: [
        ...(ref
          ? [
              {
                label: `What does ${ref} mean for what I'm facing?`,
                icon: "✝️",
                testId: "verse-meaning",
              },
              {
                label: `Help me pray through ${ref}`,
                icon: "🙏",
                testId: "verse-prayer",
              },
            ]
          : []),
        { label: "Something from today's reflection is sticking with me", icon: "💭" },
        { label: "I need a short prayer before I go on with my day", icon: "🕊️" },
        ...UNIVERSAL_PROMPTS.slice(0, 2),
      ],
    });
  }

  if (path.startsWith("/journal")) {
    return finishContext({
      pageId: "journal",
      chipLabel: "Your journal",
      greeting: "Process what you've been carrying",
      subline: "Path AI can help you pray, clarify, or see Scripture alongside your entries",
      prompts: [
        { label: "Help me turn what I'm feeling into a prayer", icon: "🙏" },
        { label: "What might God be saying through what I wrote?", icon: "📖" },
        { label: "I'm stuck — help me find the next honest step", icon: "🌿" },
        ...UNIVERSAL_PROMPTS.slice(0, 1),
      ],
    });
  }

  if (path.startsWith("/read") || path.startsWith("/study")) {
    return finishContext({
      pageId: path.startsWith("/study") ? "study" : "read",
      chipLabel: path.startsWith("/study") ? "Quick study" : "Bible reading",
      greeting: "Understand what you're reading",
      subline: "Plain-language explanation grounded in Scripture",
      prompts: [
        { label: "Explain this passage in everyday language", icon: "📖" },
        { label: "What's the main point God wants me to hear?", icon: "✝️" },
        { label: "How do I apply this to my life this week?", icon: "🌿" },
        { label: "I have a question about a word or culture in the Bible", icon: "🔍" },
      ],
    });
  }

  if (path.startsWith("/understand")) {
    return finishContext({
      pageId: "journey",
      chipLabel: "Bible journey",
      greeting: "Go deeper on this journey",
      subline: "Clarify a step, wrestle with a hard truth, or pray it into your week",
      prompts: [
        { label: "This journey step feels confusing — help me understand", icon: "📖" },
        { label: "How do I actually live this out this week?", icon: "🌿" },
        { label: "I'm doubting — meet me with Scripture", icon: "🕊️" },
        ...UNIVERSAL_PROMPTS.slice(0, 1),
      ],
    });
  }

  if (path.startsWith("/alignment")) {
    return finishContext({
      pageId: "alignment",
      chipLabel: "Walk Today",
      greeting: "Continue your Walk Today",
      subline: "Bring today's reflection into conversation with God",
      prompts: [
        { label: "Help me pray through what was hard today", icon: "🙏" },
        { label: "What Scripture speaks to where I struggled?", icon: "📖" },
        { label: "I want to surrender one thing before tonight", icon: "🕊️" },
      ],
    });
  }

  if (path === "/" || path.startsWith("/moments")) {
    return finishContext({
      pageId: path === "/" ? "home" : "moments",
      chipLabel: "Shepherd's Path",
      greeting: "What's on your heart?",
      subline: "One faithful answer here — full companionship in Talk It Through",
      prompts: [
        { label: "I want to start my day with God", icon: "🌅" },
        { label: "Something is weighing on me and I need Scripture", icon: "🌿" },
        { label: "Help me understand a Bible verse", icon: "📖" },
        { label: "I have a difficult decision to make", icon: "🕊️" },
      ],
    });
  }

  return finishContext({
    pageId: "default",
    chipLabel: "Path AI",
    greeting: "Ask Path AI",
    subline: "Grounded in Scripture · guided with care",
    prompts: [...UNIVERSAL_PROMPTS, { label: "I want to grow closer to God", icon: "✝️" }],
  });
}

export function buildTodayWalkMessage(): string | null {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(`sp_walk_${today}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as { responses: Record<string, string>; reflection: string };
    const dims = ["faith", "obedience", "love", "surrender", "endurance"];
    const answered = dims.filter((d) => data.responses[d]).length;
    if (answered < 5) return null;
    const dimLabels: Record<string, string> = {
      faith: "Faith",
      obedience: "Obedience",
      love: "Love",
      surrender: "Surrender",
      endurance: "Endurance",
    };
    const hard = dims
      .filter((d) => data.responses[d] === "struggled" || data.responses[d] === "not-yet")
      .map((d) => dimLabels[d]);
    if (hard.length === 0) {
      return "I just finished my Walk Today reflection and it was a good day. I want to go deeper with God — can you help me?";
    }
    if (hard.length === 1) {
      return `I just finished my Walk Today reflection. ${hard[0]} was hard for me today. Can you help me work through this with Scripture?`;
    }
    const listed =
      hard.length === 2
        ? hard.join(" and ")
        : `${hard.slice(0, -1).join(", ")}, and ${hard[hard.length - 1]}`;
    return `I just finished my Walk Today reflection. ${listed} were challenging for me today. Can you help me bring this to God?`;
  } catch {
    return null;
  }
}

export const FLOATER_PEEK_SESSION_KEY = "sp_floater_peek_shown";
export const FLOATER_USED_KEY = "sp_floater_opened_once";
