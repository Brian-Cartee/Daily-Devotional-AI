import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Headphones, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { isIntroFlowComplete } from "@/lib/introState";
import { useDailyVerse } from "@/hooks/use-verses";
import { getListenFirstPreference, setListenFirstPreference } from "@/lib/listenFirst";
import { canUseListenFirstAuto } from "@/lib/listenPolicy";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { TalkItThroughHeroPrompt } from "@/components/TalkItThroughHeroPrompt";

export type ThresholdData = {
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

/** Classic brand lines — live on the photo, like the original homepage hero */
const BRAND_TAGLINE = "Find your way back to God";
const BRAND_TAGLINE_SUB = "one moment at a time.";

export function ThresholdHero() {
  const sessionId = getSessionId();
  const daysWithApp = getRelationshipAge();
  const { data: verse, isLoading: verseLoading } = useDailyVerse();
  const [listenFirst, setListenFirst] = useState(() => getListenFirstPreference());
  const showPhotoTaglines = !isIntroFlowComplete() && daysWithApp < 3;

  const isPro = isProVerifiedLocally();

  const { data: thresholdRes, isLoading: thresholdLoading } = useQuery<{ threshold: ThresholdData }>({
    queryKey: ["/api/home/threshold", sessionId, daysWithApp, isPro],
    queryFn: async () => {
      const res = await fetch(
        `/api/home/threshold?sessionId=${encodeURIComponent(sessionId)}&daysWithApp=${daysWithApp}&isPro=${isPro}`,
      );
      if (!res.ok) throw new Error("threshold failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const threshold = thresholdRes?.threshold;

  const toggleListenFirst = () => {
    if (!canUseListenFirstAuto()) return;
    const next = !listenFirst;
    setListenFirst(next);
    setListenFirstPreference(next);
  };

  const showTalkPrompt = !thresholdLoading;

  return (
    <div className="relative bg-[#09031e]">
      {/* ── Cinematic photo band — road & hill visible (original homepage feel) ── */}
      <div
        className={`relative w-full overflow-hidden max-h-[400px] sm:max-h-[440px] ${
          showPhotoTaglines
            ? "h-[46vh] min-h-[260px] sm:h-[44vh]"
            : "h-[38vh] min-h-[220px] sm:h-[36vh]"
        }`}
        aria-hidden={false}
      >
        <img
          src="/hero-landing.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_42%] sm:object-[center_38%]"
          decoding="async"
        />
        {/* Light top scrim for “Why this exists” handle legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,4,18,0.35) 0%, rgba(8,4,18,0.05) 28%, rgba(8,4,18,0.0) 50%, rgba(9,3,30,0.55) 78%, #09031e 100%)",
          }}
        />
        {showPhotoTaglines && (
          <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center text-center px-6 pt-[3.75rem] sm:pt-16">
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="manifesto-line text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] max-w-[18ch]"
              style={{ fontSize: "clamp(1.35rem, 5.2vw, 1.85rem)" }}
            >
              {BRAND_TAGLINE}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-2 text-[15px] sm:text-base text-white/90 font-medium drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]"
            >
              {BRAND_TAGLINE_SUB}
            </motion.p>
          </div>
        )}
      </div>

      {/* ── Personal threshold + actions (dark band below the path) ── */}
      <div className="relative z-10 max-w-xl mx-auto w-full px-3 sm:px-5 pt-4 sm:pt-5 pb-6 sm:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="text-white font-bold leading-[1.15] mb-2 tracking-tight"
            style={{ fontSize: "clamp(1.5rem, 5vw, 2.1rem)" }}
            data-testid="text-threshold-headline"
          >
            {thresholdLoading ? "…" : threshold?.headline ?? "What's on your heart?"}
          </h1>
          <p className="text-[16px] sm:text-[17px] text-white/80 leading-snug mb-3 font-medium line-clamp-2 sm:line-clamp-none sm:leading-relaxed">
            {thresholdLoading ? "…" : threshold?.subtext}
          </p>
          {threshold?.continuityLine && (
            <p
              className="hidden sm:block text-[15px] text-violet-100/85 leading-relaxed mb-4 pl-3.5 border-l-2 border-violet-400/40"
              data-testid="text-threshold-continuity"
            >
              {threshold.continuityLine}
            </p>
          )}

          {showTalkPrompt && !thresholdLoading && (
            <div className="mb-3 sm:mb-4">
              <TalkItThroughHeroPrompt phase={threshold?.phase} />
            </div>
          )}

          {verse && !verseLoading && (
            <Link href="/devotional">
              <div
                data-testid="card-daily-verse-threshold"
                className="mb-3 rounded-xl border border-violet-500/20 bg-black/30 backdrop-blur-sm px-3.5 py-3 active:scale-[0.99] transition-transform flex items-start gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200/70 mb-1">
                    Today&apos;s verse
                  </p>
                  <p className="path-reminder-quote text-[15px] text-white/88 line-clamp-2 leading-snug">
                    &ldquo;{verse.text}&rdquo;
                  </p>
                  <p className="text-[13px] font-semibold text-violet-200/85 mt-1">— {verse.reference}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-violet-300/60 shrink-0 mt-4" aria-hidden />
              </div>
            </Link>
          )}

          {threshold?.secondaryCta && daysWithApp < 3 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <Link href={threshold.secondaryCta.href}>
                <span
                  data-testid="btn-threshold-secondary"
                  className="text-[14px] font-semibold text-violet-200/80 hover:text-white underline-offset-4 hover:underline transition-colors"
                >
                  {threshold.secondaryCta.label} →
                </span>
              </Link>
            </div>
          )}

          {(threshold?.listenFirstSuggested || listenFirst || !isProVerifiedLocally()) &&
            (isProVerifiedLocally() ? (
              <button
                type="button"
                onClick={toggleListenFirst}
                data-testid="btn-listen-first-pref"
                className={`mt-5 flex items-center gap-2 text-[13px] font-medium transition-colors ${
                  listenFirst ? "text-violet-300" : "text-white/45 hover:text-white/65"
                }`}
              >
                <Headphones className="w-4 h-4" />
                {listenFirst ? "Listen-first mode on" : "Prefer to listen instead of read"}
              </button>
            ) : (
              <Link href="/pricing">
                <span
                  data-testid="btn-listen-first-pro"
                  className="mt-5 flex items-center gap-2 text-[13px] font-medium text-white/45 hover:text-white/65 transition-colors"
                >
                  <Headphones className="w-4 h-4" />
                  Pro: mornings start with listen
                </span>
              </Link>
            ))}
        </motion.div>
      </div>
    </div>
  );
}
