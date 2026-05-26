import { Link } from "wouter";
import { ArrowRight, BookOpen, Wind } from "lucide-react";
import { TalkItThroughHeroPrompt } from "@/components/TalkItThroughHeroPrompt";
import { ShareVerseTrigger } from "@/components/ShareVerseSheet";
import { easternVerseDateKey } from "@/lib/shareVerse";
import type { PresenceDoorId } from "@/components/HomePresenceDoors";
import type { ThresholdNeed } from "@/lib/thresholdState";
import { isLateNight } from "@/lib/nightMode";

type Verse = { text: string; reference: string };

type Props = {
  door: PresenceDoorId;
  phase?: string;
  thresholdNeed?: ThresholdNeed | null;
  verse?: Verse | null;
  onSelectTalk?: () => void;
};

export function HomePresenceHero({ door, phase, thresholdNeed, verse, onSelectTalk }: Props) {
  if (door === "talk") {
    return (
      <TalkItThroughHeroPrompt phase={phase} thresholdNeed={thresholdNeed} />
    );
  }

  if (door === "scripture") {
    return (
      <div
        className="w-full rounded-2xl border border-amber-500/25 bg-[#12101a]/95 backdrop-blur-sm p-4 sm:p-5 shadow-lg shadow-black/25"
        data-testid="card-sit-scripture-hero"
      >
        <div className="flex items-start gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-amber-200/80 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/55 mb-1">
              Sit in Scripture
            </p>
            <p className="text-[15px] text-white/82 leading-snug">
              Today&apos;s verse and a short devotional — read or listen at your pace.
            </p>
          </div>
        </div>
        {verse ? (
          <div className="rounded-xl border border-amber-500/15 bg-black/30 px-3 py-2.5 mb-3">
            <p
              className="text-[15px] text-white/88 line-clamp-3 leading-snug italic"
              style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
            >
              &ldquo;{verse.text}&rdquo;
            </p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-[13px] font-semibold text-amber-200/75">— {verse.reference}</p>
              <ShareVerseTrigger
                text={verse.text}
                reference={verse.reference}
                date={easternVerseDateKey()}
                label="Share"
                testId="button-share-home-scripture"
                className="text-amber-200/80 hover:text-amber-100"
              />
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-white/50 mb-3">Your verse for today is ready.</p>
        )}
        <Link href="/devotional">
          <span
            data-testid="btn-hero-open-devotional"
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-semibold text-[#1a1208] bg-gradient-to-r from-amber-100/95 via-amber-200/90 to-amber-100/95 shadow-md shadow-black/20 active:scale-[0.99]"
          >
            Open today&apos;s devotional
            <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </div>
    );
  }

  const quietHref = isLateNight() ? "/night" : "/sigh";
  const quietTitle = isLateNight() ? "Night Shepherd" : "Just breathe";

  return (
    <div
      className="w-full rounded-2xl border border-violet-400/20 bg-[#12101a]/95 backdrop-blur-sm p-4 sm:p-5 shadow-lg shadow-black/25"
      data-testid="card-just-breathe-hero"
    >
      <div className="flex items-start gap-2 mb-3">
        <Wind className="w-5 h-5 text-violet-200/75 shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/55 mb-1">
            {quietTitle}
          </p>
          <p className="text-[15px] text-white/82 leading-snug">
            A quieter room — breath, stillness, and gentle Scripture. No performance, no streak
            pressure.
          </p>
        </div>
      </div>
      <Link href={quietHref}>
        <span
          data-testid="btn-hero-quiet-room"
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-semibold text-white bg-violet-600/90 hover:bg-violet-600 shadow-md shadow-black/20 active:scale-[0.99]"
        >
          {isLateNight() ? "Open Night Shepherd" : "Enter the quiet room"}
          <ArrowRight className="w-4 h-4" />
        </span>
      </Link>
      <p className="mt-2.5 text-center text-[11px] text-white/38 leading-relaxed">
        Or return to{" "}
        <button
          type="button"
          className="underline underline-offset-2 text-white/50 hover:text-white/70"
          onClick={onSelectTalk}
        >
          Talk it through
        </button>{" "}
        when you&apos;re ready.
      </p>
    </div>
  );
}
