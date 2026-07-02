import type { PresenceDoorId } from "@/components/HomePresenceDoors";
import type { ThresholdNeed } from "@/lib/thresholdState";

export type DayPart = "morning" | "day" | "night";

export type ThresholdModePlan = {
  key: string;
  title: string;
  firstSessionLine: string;
  returnLine: string;
  notifPrompt: string;
  notifSuccess: string;
  rhythmMorningLabel: string;
  rhythmMorningHref: string;
  rhythmNightLabel: string;
  rhythmNightHref: string;
  defaultDoor: PresenceDoorId;
};

export type ThresholdAtmosphere = {
  heroOverlay: string;
  accentBorderClass: string;
  rhythmCardClass: string;
};

export type ThresholdInteractionProfile = {
  breathWaitMs: number;
  breathPulseSeconds: number;
  settleFadeSeconds: number;
};

const DEFAULT_PLAN: ThresholdModePlan = {
  key: "default",
  title: "Gentle start",
  firstSessionLine: "One honest step is enough. We will go gently.",
  returnLine: "Welcome back. No catching up needed.",
  notifPrompt: "Want a quiet reminder for tomorrow?",
  notifSuccess: "We'll hold a quiet place for you tomorrow.",
  rhythmMorningLabel: "Morning Surrender",
  rhythmMorningHref: "/devotional",
  rhythmNightLabel: "Night Prayer",
  rhythmNightHref: "/night",
  defaultDoor: "quiet",
};

const MODE_PLANS: Partial<Record<ThresholdNeed, ThresholdModePlan>> = {
  peace: {
    key: "peace",
    title: "Peace",
    firstSessionLine: "Settle your breathing. Let Scripture meet you without hurry.",
    returnLine: "You returned to peace today.",
    notifPrompt: "Want a gentle morning peace reminder?",
    notifSuccess: "We'll send a quiet peace reminder tomorrow.",
    rhythmMorningLabel: "Start in stillness",
    rhythmMorningHref: "/sigh",
    rhythmNightLabel: "Close in peace",
    rhythmNightHref: "/night",
    defaultDoor: "quiet",
  },
  grief: {
    key: "grief",
    title: "Grief",
    firstSessionLine: "Bring your grief as it is. You do not have to carry it alone.",
    returnLine: "You came back with what is heavy. That matters.",
    notifPrompt: "Want a gentle check-in tomorrow morning?",
    notifSuccess: "We'll send a gentle grief check-in tomorrow.",
    rhythmMorningLabel: "Lament with Scripture",
    rhythmMorningHref: "/sigh",
    rhythmNightLabel: "Night Shepherd",
    rhythmNightHref: "/night",
    defaultDoor: "quiet",
  },
  battle: {
    key: "battle",
    title: "Battle",
    firstSessionLine: "You are not weak for needing strength. Stand one prayer at a time.",
    returnLine: "You returned to the fight with God beside you.",
    notifPrompt: "Want a strength reminder tomorrow morning?",
    notifSuccess: "We'll send a strength reminder tomorrow.",
    rhythmMorningLabel: "Armor prayer",
    rhythmMorningHref: "/speak-life",
    rhythmNightLabel: "Release the battle",
    rhythmNightHref: "/night",
    defaultDoor: "speaklife",
  },
  worship: {
    key: "worship",
    title: "Worship",
    firstSessionLine: "Turn your attention toward God. Let gratitude become prayer.",
    returnLine: "You returned to worship today.",
    notifPrompt: "Want a worship invitation tomorrow morning?",
    notifSuccess: "We'll send a worship invitation tomorrow.",
    rhythmMorningLabel: "Open with Scripture",
    rhythmMorningHref: "/devotional",
    rhythmNightLabel: "End in thanksgiving",
    rhythmNightHref: "/night",
    defaultDoor: "scripture",
  },
  gratitude: {
    key: "gratitude",
    title: "Gratitude",
    firstSessionLine: "Notice one gift from God today. Let thanks become steady.",
    returnLine: "You returned with gratitude today.",
    notifPrompt: "Want a gratitude reminder for tomorrow?",
    notifSuccess: "We'll send a gratitude reminder tomorrow.",
    rhythmMorningLabel: "Begin with thanks",
    rhythmMorningHref: "/devotional",
    rhythmNightLabel: "Give thanks tonight",
    rhythmNightHref: "/night",
    defaultDoor: "scripture",
  },
  stillness: {
    key: "stillness",
    title: "Stillness",
    firstSessionLine: "The quiet is enough. Breathe and let your soul slow down.",
    returnLine: "You returned to stillness today.",
    notifPrompt: "Want a stillness reminder tomorrow morning?",
    notifSuccess: "We'll send a stillness reminder tomorrow.",
    rhythmMorningLabel: "Stillness first",
    rhythmMorningHref: "/sigh",
    rhythmNightLabel: "Night stillness",
    rhythmNightHref: "/night",
    defaultDoor: "quiet",
  },
  "deep-dive": {
    key: "deep-dive",
    title: "Scripture Deep Dive",
    firstSessionLine: "Go deeper today. Stay with the Word until it speaks clearly.",
    returnLine: "You returned to depth in Scripture today.",
    notifPrompt: "Want a Scripture deep-dive reminder tomorrow?",
    notifSuccess: "We'll send a Scripture reminder tomorrow.",
    rhythmMorningLabel: "Deep dive now",
    rhythmMorningHref: "/devotional",
    rhythmNightLabel: "Night reflection",
    rhythmNightHref: "/night",
    defaultDoor: "scripture",
  },
  "morning-surrender": {
    key: "morning-surrender",
    title: "Morning Surrender",
    firstSessionLine: "Offer this day to God. One honest yes is enough.",
    returnLine: "You returned to surrender this morning.",
    notifPrompt: "Want a morning surrender reminder?",
    notifSuccess: "We'll send a morning surrender reminder.",
    rhythmMorningLabel: "Surrender this day",
    rhythmMorningHref: "/devotional",
    rhythmNightLabel: "Release the day",
    rhythmNightHref: "/night",
    defaultDoor: "scripture",
  },
  "night-prayer": {
    key: "night-prayer",
    title: "Night Prayer",
    firstSessionLine: "You can release the day now. Let prayer hold what you cannot.",
    returnLine: "You returned to night prayer today.",
    notifPrompt: "Want a gentle night prayer reminder?",
    notifSuccess: "We'll send a quiet night reminder.",
    rhythmMorningLabel: "Begin gently",
    rhythmMorningHref: "/devotional",
    rhythmNightLabel: "Pray before sleep",
    rhythmNightHref: "/night",
    defaultDoor: "quiet",
  },
};

export function getThresholdModePlan(need: ThresholdNeed | null | undefined): ThresholdModePlan {
  if (!need) return DEFAULT_PLAN;
  return MODE_PLANS[need] ?? DEFAULT_PLAN;
}

export function getModeCompanionLine(need: ThresholdNeed | null | undefined): string | null {
  switch (need) {
    case "peace":
      return "Peace is not pretending. Breathe slowly and let your soul settle.";
    case "grief":
      return "Grief is not weakness. You are safe to lament here.";
    case "deep-dive":
      return "Depth takes unhurried attention. Stay with one verse until it opens.";
    case "battle":
      return "Stand one prayer at a time. Courage grows in honest dependence.";
    case "night-prayer":
      return "Release the day gently. You do not need to carry it into sleep.";
    default:
      return null;
  }
}

export function getCurrentDayPart(): DayPart {
  const hour = new Date().getHours();
  if (hour < 11) return "morning";
  if (hour < 18) return "day";
  return "night";
}

export function getThresholdAtmosphere(need: ThresholdNeed | null | undefined): ThresholdAtmosphere {
  switch (need) {
    case "grief":
      return {
        heroOverlay:
          "linear-gradient(to bottom, rgba(8,4,18,0.72) 0%, rgba(8,4,18,0.28) 14%, rgba(8,4,18,0) 38%, rgba(28,20,52,0.62) 78%, #09031e 100%)",
        accentBorderClass: "border-violet-200/35",
        rhythmCardClass: "border-violet-200/20 bg-violet-950/25",
      };
    case "battle":
      return {
        heroOverlay:
          "linear-gradient(to bottom, rgba(8,4,18,0.72) 0%, rgba(8,4,18,0.25) 14%, rgba(8,4,18,0) 38%, rgba(58,26,20,0.5) 78%, #09031e 100%)",
        accentBorderClass: "border-amber-300/35",
        rhythmCardClass: "border-amber-200/20 bg-amber-950/20",
      };
    case "worship":
    case "gratitude":
      return {
        heroOverlay:
          "linear-gradient(to bottom, rgba(8,4,18,0.72) 0%, rgba(8,4,18,0.22) 14%, rgba(8,4,18,0) 38%, rgba(42,34,14,0.5) 78%, #09031e 100%)",
        accentBorderClass: "border-amber-200/35",
        rhythmCardClass: "border-amber-200/25 bg-amber-900/15",
      };
    case "deep-dive":
      return {
        heroOverlay:
          "linear-gradient(to bottom, rgba(8,4,18,0.72) 0%, rgba(8,4,18,0.24) 14%, rgba(8,4,18,0) 38%, rgba(18,32,58,0.52) 78%, #09031e 100%)",
        accentBorderClass: "border-sky-200/35",
        rhythmCardClass: "border-sky-200/20 bg-sky-950/20",
      };
    default:
      return {
        heroOverlay:
          "linear-gradient(to bottom, rgba(8,4,18,0.72) 0%, rgba(8,4,18,0.28) 14%, rgba(8,4,18,0) 38%, rgba(9,3,30,0.55) 78%, #09031e 100%)",
        accentBorderClass: "border-violet-300/35",
        rhythmCardClass: "border-white/12 bg-zinc-900/45",
      };
  }
}

export function getThresholdInteractionProfile(
  need: ThresholdNeed | null | undefined,
): ThresholdInteractionProfile {
  switch (need) {
    case "grief":
      return { breathWaitMs: 5600, breathPulseSeconds: 6.4, settleFadeSeconds: 0.62 };
    case "battle":
      return { breathWaitMs: 3800, breathPulseSeconds: 4.6, settleFadeSeconds: 0.34 };
    case "deep-dive":
      return { breathWaitMs: 4800, breathPulseSeconds: 5.2, settleFadeSeconds: 0.46 };
    case "night-prayer":
      return { breathWaitMs: 5200, breathPulseSeconds: 6.0, settleFadeSeconds: 0.56 };
    default:
      return { breathWaitMs: 4200, breathPulseSeconds: 5.6, settleFadeSeconds: 0.45 };
  }
}
