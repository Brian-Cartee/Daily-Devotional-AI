import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Headphones } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { isIntroFlowComplete } from "@/lib/introState";
import {
  getThresholdNeed,
  getThresholdNeedAcknowledgment,
  type ThresholdNeed,
} from "@/lib/thresholdState";
import { useDailyVerse } from "@/hooks/use-verses";
import { getListenFirstPreference, setListenFirstPreference } from "@/lib/listenFirst";
import { canUseListenFirstAuto } from "@/lib/listenPolicy";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { focusHeroTalkInput } from "@/components/TalkItThroughHeroPrompt";
import { HomePresenceDoors, defaultPresenceDoor } from "@/components/HomePresenceDoors";
import type { PresenceDoorId } from "@/components/HomePresenceDoors";
import { HomePresenceHero } from "@/components/HomePresenceHero";
import { ArrivalRitual, shouldShowArrivalRitual } from "@/components/ArrivalRitual";
import type { HomePresenceContext } from "@/lib/homePresenceContext";
import { openWhyPanel } from "@/lib/openWhyPanel";
import { getModeCompanionLine, getThresholdAtmosphere, getThresholdModePlan } from "@/lib/thresholdModePlan";
import { fireHaptic } from "@/lib/haptics";
import { isHomeDevotionalFocusPeriod, shouldShowHeroVerseSnippet } from "@/lib/firstSession";
import { fetchStreak } from "@/lib/streakApi";

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

const BRAND_TAGLINE = "Find your way back to God";
const BRAND_TAGLINE_SUB = "one moment at a time.";
const NEED_LABEL: Record<ThresholdNeed, string> = {
  peace: "peace",
  grief: "grief support",
  battle: "strength",
  worship: "worship",
  gratitude: "gratitude",
  stillness: "stillness",
  "deep-dive": "depth in Scripture",
  "morning-surrender": "morning surrender",
  "night-prayer": "night prayer",
  comfort: "comfort",
  honesty: "honesty",
  hope: "hope",
};

type ThresholdHeroProps = {
  onPresenceContextChange?: (ctx: HomePresenceContext) => void;
};

export function ThresholdHero({ onPresenceContextChange }: ThresholdHeroProps = {}) {
  const sessionId = getSessionId();
  const daysWithApp = getRelationshipAge();
  const { data: verse } = useDailyVerse();
  const [listenFirst, setListenFirst] = useState(() => getListenFirstPreference());
  const [activeDoor, setActiveDoor] = useState<PresenceDoorId>(defaultPresenceDoor);
  const focusTalkAfterSelect = useRef(false);
  const thresholdNeed = getThresholdNeed();
  const modePlan = getThresholdModePlan(thresholdNeed);
  const verseReference =
    verse && typeof verse === "object" && "reference" in verse
      ? String((verse as { reference?: unknown }).reference ?? "")
      : "";
  const showPhotoTaglines = !isIntroFlowComplete() && daysWithApp < 3;
  const chapelWeekFocus = daysWithApp <= 7;

  const { data: streakData } = useQuery({
    queryKey: ["/api/streak", isProVerifiedLocally()],
    queryFn: fetchStreak,
    staleTime: 60_000,
  });
  const devotionalVisitCount = streakData?.visitDates?.length ?? 0;
  const homeDevotionalFocus = isHomeDevotionalFocusPeriod(daysWithApp, devotionalVisitCount);
  const showReturningVerseSnippet = shouldShowHeroVerseSnippet(daysWithApp, homeDevotionalFocus);

  const firstWeekDoor: PresenceDoorId = modePlan.defaultDoor;
  const needAck =
    thresholdNeed && daysWithApp < 14 ? getThresholdNeedAcknowledgment(thresholdNeed) : null;

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
  const showTalkPrompt = !thresholdLoading;
  const [showArrival, setShowArrival] = useState(() => shouldShowArrivalRitual());
  const companionLine = getModeCompanionLine(thresholdNeed);
  const atmosphere = getThresholdAtmosphere(thresholdNeed);

  const effectiveDoor: PresenceDoorId = homeDevotionalFocus ? "scripture" : chapelWeekFocus ? firstWeekDoor : activeDoor;

  const selectDoor = (id: PresenceDoorId) => {
    fireHaptic("soft");
    setActiveDoor(id);
    if (id === "talk") focusTalkAfterSelect.current = true;
  };

  useEffect(() => {
    onPresenceContextChange?.({ door: effectiveDoor, arrivalOpen: showArrival });
  }, [effectiveDoor, showArrival, onPresenceContextChange]);

  useEffect(() => {
    if (activeDoor !== "talk" || !focusTalkAfterSelect.current) return;
    focusTalkAfterSelect.current = false;
    const t = window.setTimeout(() => focusHeroTalkInput(), 80);
    return () => window.clearTimeout(t);
  }, [activeDoor]);

  const toggleListenFirst = () => {
    if (!canUseListenFirstAuto()) return;
    const next = !listenFirst;
    setListenFirst(next);
    setListenFirstPreference(next);
  };

  return (
    <div className="relative bg-[#09031e]" id="sp-home-top" data-testid="home-threshold-hero">
      <div
        className={`relative w-full overflow-hidden max-h-[460px] sm:max-h-[500px] ${
          showPhotoTaglines
            ? "h-[52vh] min-h-[300px] sm:h-[50vh]"
            : "h-[46vh] min-h-[280px] sm:h-[44vh]"
        }`}
        aria-hidden={false}
      >
        <img
          src="/hero-landing.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_30%] sm:object-[center_32%]"
          decoding="async"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: atmosphere.heroOverlay,
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
              className="mt-2 text-[15px] sm:text-base font-medium drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]"
              style={{ color: "rgba(255,255,255,0.90)" }}
            >
              {BRAND_TAGLINE_SUB}
            </motion.p>
          </div>
        )}
      </div>

      <div className="relative z-10 max-w-xl mx-auto w-full px-3 sm:px-5 pt-4 sm:pt-5 pb-8 sm:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            data-testid="link-why-collapsed"
            onClick={openWhyPanel}
            aria-label="Open why we built this"
            className="mb-3 text-left text-[11px] font-semibold uppercase tracking-[0.2em] hover:text-white/75 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70"
            style={{ display: "block", color: "rgba(255,255,255,0.50)" }}
          >
            Why we built this
          </button>

          <h1
            className="font-bold leading-[1.18] mb-2 tracking-tight"
            style={{ fontSize: "clamp(1.5rem, 5vw, 2.1rem)", color: "#ffffff" }}
            data-testid="text-threshold-headline"
          >
            {thresholdLoading ? "…" : threshold?.headline ?? "What are you carrying into today?"}
          </h1>
          <p
            className="text-[16px] sm:text-[17px] leading-relaxed mb-3 font-medium"
            style={{ color: "rgba(255,255,255,0.78)" }}
            data-testid="text-threshold-subtext"
          >
            {thresholdLoading
              ? "…"
              : threshold?.subtext ??
                modePlan.firstSessionLine}
          </p>
          {showArrival && (
            <div className="mb-3">
              <ArrivalRitual defaultOpen onComplete={() => setShowArrival(false)} />
            </div>
          )}
          {needAck && (
            <p
              className="text-[14px] leading-relaxed mb-3"
              style={{ color: "rgba(254,243,199,0.70)" }}
              data-testid="text-threshold-need-line"
            >
              {needAck}
            </p>
          )}
          {companionLine && (
            <p
              className={`text-[13px] leading-relaxed mb-3 pl-3 border-l-2 ${atmosphere.accentBorderClass}`}
              style={{ color: "rgba(255,255,255,0.72)" }}
              data-testid="text-threshold-mode-companion"
            >
              {companionLine}
            </p>
          )}
          {thresholdNeed && verseReference && (
            <p
              className="text-[13px] leading-relaxed mb-3"
              style={{ color: "rgba(255,255,255,0.68)" }}
              data-testid="text-threshold-need-verse-bridge"
            >
              You asked for {NEED_LABEL[thresholdNeed]}. Today&apos;s Word meets you in{" "}
              <span style={{ color: "rgba(253,230,138,0.85)", fontWeight: 600 }}>{verseReference}</span>.
            </p>
          )}
          {threshold?.continuityLine && (
            <p
              className="hidden sm:block text-[15px] leading-relaxed mb-4 pl-3.5 border-l-2 border-amber-500/30"
              style={{ color: "rgba(255,255,255,0.70)" }}
              data-testid="text-threshold-continuity"
            >
              {threshold.continuityLine}
            </p>
          )}

          {showReturningVerseSnippet && verse && (
            <div
              className="rounded-xl border border-amber-500/22 bg-black/38 px-3.5 py-3 mb-3 backdrop-blur-sm"
              data-testid="hero-returning-verse-snippet"
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5"
                style={{ color: "rgba(253,230,138,0.65)" }}
              >
                Today&apos;s Word
              </p>
              <p
                className="text-[15px] line-clamp-2 leading-snug italic"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)", color: "rgba(255,255,255,0.90)" }}
              >
                &ldquo;{verse.text}&rdquo;
              </p>
              <p
                className="text-[12px] font-semibold mt-1.5"
                style={{ color: "rgba(253,230,138,0.75)" }}
              >
                — {verse.reference}
              </p>
            </div>
          )}

          {showTalkPrompt && !thresholdLoading && (
            homeDevotionalFocus ? (
              <div className="mb-3" data-testid="home-hero-devotional-focus">
                {verse ? (
                  <div className="rounded-xl border border-amber-500/20 bg-black/35 px-3.5 py-3 mb-3">
                    <p
                      className="text-[11px] font-bold uppercase tracking-[0.18em] mb-1.5"
                      style={{ color: "rgba(253,230,138,0.70)" }}
                    >
                      Today&apos;s Word
                    </p>
                    <p
                      className="text-[15px] line-clamp-3 leading-snug italic"
                      style={{ fontFamily: "var(--font-serif, Georgia, serif)", color: "rgba(255,255,255,0.88)" }}
                    >
                      &ldquo;{verse.text}&rdquo;
                    </p>
                    <p
                      className="text-[13px] font-semibold mt-1.5"
                      style={{ color: "rgba(253,230,138,0.75)" }}
                    >
                      — {verse.reference}
                    </p>
                  </div>
                ) : (
                  <p
                    className="text-[14px] mb-3 leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    Your verse, reflection, and prayer are ready below.
                  </p>
                )}
                <Link href="/devotional?listen=1">
                  <span
                    data-testid="btn-hero-play-devotional"
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-semibold text-white bg-primary shadow-md shadow-black/25 active:scale-[0.99] mb-2.5"
                  >
                    <Headphones className="w-4 h-4" />
                    Play today&apos;s Word
                  </span>
                </Link>
                <Link href="/devotional">
                  <span
                    data-testid="btn-hero-open-devotional-focus"
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white/90 border border-white/25 active:scale-[0.99]"
                  >
                    Read instead
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
                <p
                  className="text-[12px] text-center mt-2.5 leading-snug"
                  style={{ color: "rgba(255,255,255,0.48)" }}
                >
                  One step: verse, reflection, prayer. Talk it through is below when you need it.
                </p>
              </div>
            ) : (
              <>
                {!chapelWeekFocus && (
                  <HomePresenceDoors selected={activeDoor} onSelect={selectDoor} panelId="home-presence-panel" />
                )}
                <div className="mb-4" role="tabpanel" id="home-presence-panel" aria-label="Your chosen step">
                  <HomePresenceHero
                    door={effectiveDoor}
                    phase={threshold?.phase}
                    thresholdNeed={thresholdNeed}
                    verse={verse ?? null}
                    onSelectTalk={() => selectDoor("talk")}
                  />
                </div>
              </>
            )
          )}

          {!chapelWeekFocus && threshold?.secondaryCta && daysWithApp < 3 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <Link href={threshold.secondaryCta.href}>
                <a
                  data-testid="btn-threshold-secondary"
                  className="inline-flex min-h-[44px] items-center text-[14px] font-semibold hover:text-white/80 underline-offset-4 hover:underline transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                  aria-label={threshold.secondaryCta.label}
                >
                  {threshold.secondaryCta.label} →
                </a>
              </Link>
            </div>
          )}

          {!chapelWeekFocus &&
            (threshold?.listenFirstSuggested || listenFirst || !isProVerifiedLocally()) &&
            (isProVerifiedLocally() ? (
              <button
                type="button"
                onClick={toggleListenFirst}
                data-testid="btn-listen-first-pref"
                className={`mt-5 flex items-center gap-2 text-[13px] font-medium transition-colors ${
                  listenFirst ? "text-amber-200/80" : "text-white/40 hover:text-white/60"
                }`}
              >
                <Headphones className="w-4 h-4" />
                {listenFirst ? "Listen-first mode on" : "Prefer to listen instead of read"}
              </button>
            ) : (
              <Link href="/pricing">
                <a
                  data-testid="btn-listen-first-pro"
                  className="mt-5 inline-flex min-h-[44px] items-center gap-2 text-[13px] font-medium text-white/40 hover:text-white/60 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70"
                >
                  <Headphones className="w-4 h-4" />
                  Optional: listen-first mornings with Pro
                </a>
              </Link>
            ))}
        </motion.div>
      </div>
    </div>
  );
}
