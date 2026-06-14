import { motion } from "framer-motion";
import { copyToClipboard } from "@/lib/shareVerse";

const MILESTONES: Record<
  number,
  { label: string; message: string; verseText: string; verseReference: string }
> = {
  3: {
    label: "SOMETHING IS TAKING ROOT",
    message:
      "Three days. You showed up when it was easy and when it wasn't. That's how this works.",
    verseText: "But those who hope in the Lord will renew their strength.",
    verseReference: "Isaiah 40:31",
  },
  7: {
    label: "ONE FULL WEEK",
    message:
      "A full week. Seven mornings you chose to start here. God notices faithfulness like that.",
    verseText: "Blessed is the one who perseveres under trial.",
    verseReference: "James 1:12",
  },
  14: {
    label: "TWO WEEKS STRONG",
    message:
      "Two weeks of showing up. Whatever brought you back each day — that's the Spirit working in you.",
    verseText: "Let us not become weary in doing good, for at the proper time we will reap a harvest.",
    verseReference: "Galatians 6:9",
  },
  21: {
    label: "A HABIT IS FORMING",
    message:
      "21 days. Researchers say that's when a habit starts to feel natural. This is becoming part of who you are.",
    verseText: "I have learned, in whatsoever state I am, therewith to be content.",
    verseReference: "Philippians 4:11",
  },
  30: {
    label: "ONE MONTH",
    message:
      "30 days. A full month of mornings with God. That's not nothing — that's a life being shaped.",
    verseText:
      "Being confident of this, that he who began a good work in you will carry it on to completion.",
    verseReference: "Philippians 1:6",
  },
  60: {
    label: "TWO MONTHS",
    message:
      "60 days of coming back. You're not the same person you were two months ago.",
    verseText: "Your word is a lamp for my feet, a light on my path.",
    verseReference: "Psalm 119:105",
  },
  100: {
    label: "100 DAYS",
    message:
      "100 days. Most people never make it here. You did — one morning at a time.",
    verseText: "Well done, good and faithful servant.",
    verseReference: "Matthew 25:21",
  },
};

interface StreakMilestoneProps {
  streakCount: number;
  userName?: string;
}

function buildShareText(
  streakCount: number,
  verseText: string,
  verseReference: string,
): string {
  return `Day ${streakCount} of walking with God daily. '${verseText}' — ${verseReference}\n\nShepherd's Path — shepherdspathai.com`;
}

async function shareMilestoneText(text: string) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ text });
      return;
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return;
  }
  await copyToClipboard(text);
}

export function StreakMilestone({ streakCount, userName: _userName }: StreakMilestoneProps) {
  const milestone = MILESTONES[streakCount];
  if (!milestone) return null;

  const shareText = buildShareText(streakCount, milestone.verseText, milestone.verseReference);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full mb-4 overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-[#0f0a1e] via-[#140d28] to-[#1a0f35] px-6 py-7 text-center shadow-lg shadow-amber-900/15"
      data-testid="card-streak-milestone"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: "inset 0 0 40px rgba(251, 191, 36, 0.06)" }}
      />

      <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/85 mb-4">
        {milestone.label}
      </p>

      <p
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-[72px] sm:text-[80px] font-bold leading-none text-white/[0.06]"
      >
        {streakCount}
      </p>

      <p
        className="relative text-[17px] sm:text-[18px] leading-[1.65] text-white/92 italic mx-auto max-w-md"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {milestone.message}
      </p>

      <div className="relative mx-auto mt-6 mb-4 h-px w-16 bg-white/15" />

      <p
        className="relative text-[15px] leading-relaxed text-white/55 italic mx-auto max-w-sm"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        &ldquo;{milestone.verseText}&rdquo;
      </p>
      <p className="relative mt-2 text-[13px] font-bold text-white/45 text-right max-w-sm mx-auto">
        — {milestone.verseReference}
      </p>

      <button
        type="button"
        onClick={() => void shareMilestoneText(shareText)}
        className="relative mt-5 text-[12px] font-medium text-amber-400/55 hover:text-amber-400/80 transition-colors underline underline-offset-4"
        data-testid="button-share-streak-milestone"
      >
        Share this milestone
      </button>
    </motion.div>
  );
}
