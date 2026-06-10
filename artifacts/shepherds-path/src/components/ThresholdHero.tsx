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

  const photoHeight = showPhotoTaglines ? "min(52vh, 460px)" : "min(46vh, 420px)";

  return (
    <div
      id="sp-home-top"
      data-testid="home-threshold-hero"
      style={{ position: "relative", backgroundColor: "#09031e" }}
    >
      <div
        aria-hidden={false}
        style={{
          position: "relative",
          width: "100%",
          height: photoHeight,
          minHeight: showPhotoTaglines ? "300px" : "280px",
          maxHeight: "500px",
          overflow: "hidden",
        }}
      >
        <img
          src="/hero-landing.webp"
          alt=""
          decoding="async"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 30%",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: atmosphere.heroOverlay,
          }}
        />
        {showPhotoTaglines && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              paddingLeft: "24px",
              paddingRight: "24px",
              paddingTop: "max(3.75rem, env(safe-area-inset-top))",
            }}
          >
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="manifesto-line"
              style={{
                fontSize: "clamp(1.35rem, 5.2vw, 1.85rem)",
                color: "#ffffff",
                maxWidth: "18ch",
                textShadow: "0 2px 12px rgba(0,0,0,0.65)",
              }}
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

      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "36rem",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingTop: "16px",
          paddingBottom: "40px",
          boxSizing: "border-box",
          backgroundColor: "#09031e",
        }}
      >
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
            style={{
              fontSize: "clamp(1.5rem, 5vw, 2.1rem)",
              color: "#ffffff",
              fontWeight: 700,
              lineHeight: 1.18,
              marginBottom: "8px",
              letterSpacing: "-0.02em",
            }}
            data-testid="text-threshold-headline"
          >
            {thresholdLoading ? "…" : threshold?.headline ?? "What are you carrying into today?"}
          </h1>
          <p
            style={{
              fontSize: "16px",
              lineHeight: 1.625,
              marginBottom: "12px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.78)",
            }}
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
              data-testid="hero-returning-verse-snippet"
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(245,158,11,0.22)",
                backgroundColor: "rgba(0,0,0,0.38)",
                padding: "12px 14px",
                marginBottom: "12px",
              }}
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
                  <div
                    style={{
                      borderRadius: "12px",
                      border: "1px solid rgba(245,158,11,0.20)",
                      backgroundColor: "rgba(0,0,0,0.35)",
                      padding: "12px 14px",
                      marginBottom: "12px",
                    }}
                  >
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
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      borderRadius: "12px",
                      padding: "14px",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#ffffff",
                      backgroundColor: "#7c3aed",
                      marginBottom: "10px",
                      boxSizing: "border-box",
                    }}
                  >
                    <Headphones className="w-4 h-4" />
                    Play today&apos;s Word
                  </span>
                </Link>
                <Link href="/devotional">
                  <span
                    data-testid="btn-hero-open-devotional-focus"
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      borderRadius: "12px",
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.90)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      boxSizing: "border-box",
                    }}
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
