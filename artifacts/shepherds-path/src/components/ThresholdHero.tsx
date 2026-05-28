import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Headphones } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { isIntroFlowComplete } from "@/lib/introState";
import {
  getThresholdNeed,
  getThresholdNeedAcknowledgment,
  type ThresholdNeed,
} from "@/lib/thresholdState";
import { hasWhyPanelDismissed } from "@/lib/homeHeroState";
import { useDailyVerse } from "@/hooks/use-verses";
import { getListenFirstPreference, setListenFirstPreference } from "@/lib/listenFirst";
import { canUseListenFirstAuto } from "@/lib/listenPolicy";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { focusHeroTalkInput } from "@/components/TalkItThroughHeroPrompt";
import { HomePresenceDoors, defaultPresenceDoor } from "@/components/HomePresenceDoors";
import type { PresenceDoorId } from "@/components/HomePresenceDoors";
import { HomePresenceHero } from "@/components/HomePresenceHero";
import { ArrivalRitual, shouldShowArrivalRitual } from "@/components/ArrivalRitual";

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
  comfort: "comfort",
  honesty: "honesty",
  hope: "hope",
};

export function ThresholdHero() {
  const sessionId = getSessionId();
  const daysWithApp = getRelationshipAge();
  const { data: verse } = useDailyVerse();
  const [listenFirst, setListenFirst] = useState(() => getListenFirstPreference());
  const [activeDoor, setActiveDoor] = useState<PresenceDoorId>(defaultPresenceDoor);
  const focusTalkAfterSelect = useRef(false);
  const thresholdNeed = getThresholdNeed();
  const verseReference =
    verse && typeof verse === "object" && "reference" in verse
      ? String((verse as { reference?: unknown }).reference ?? "")
      : "";
  const showPhotoTaglines = !isIntroFlowComplete() && daysWithApp < 3;
  const chapelWeekFocus = daysWithApp <= 7;
  const firstWeekDoor: PresenceDoorId =
    thresholdNeed === "comfort"
      ? "quiet"
      : thresholdNeed === "hope"
        ? "scripture"
        : "talk";
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

  const selectDoor = (id: PresenceDoorId) => {
    setActiveDoor(id);
    if (id === "talk") focusTalkAfterSelect.current = true;
  };

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
    <div className="relative bg-[#09031e]">
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
            background:
              "linear-gradient(to bottom, rgba(8,4,18,0.42) 0%, rgba(8,4,18,0.08) 18%, rgba(8,4,18,0) 42%, rgba(9,3,30,0.55) 78%, #09031e 100%)",
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

      <div className="relative z-10 max-w-xl mx-auto w-full px-3 sm:px-5 pt-4 sm:pt-5 pb-8 sm:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {hasWhyPanelDismissed() && (
            <button
              type="button"
              data-testid="link-why-collapsed"
              onClick={() => window.dispatchEvent(new Event("sp-open-why"))}
              className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 hover:text-white/65 transition-colors"
            >
              Why we built this
            </button>
          )}

          <h1
            className="text-white font-bold leading-[1.18] mb-2 tracking-tight"
            style={{ fontSize: "clamp(1.5rem, 5vw, 2.1rem)" }}
            data-testid="text-threshold-headline"
          >
            {thresholdLoading ? "…" : threshold?.headline ?? "What are you carrying into today?"}
          </h1>
          <p
            className="text-[16px] sm:text-[17px] text-white/78 leading-relaxed mb-3 font-medium"
            data-testid="text-threshold-subtext"
          >
            {thresholdLoading
              ? "…"
              : threshold?.subtext ??
                "One honest step is enough. Scripture and prayer can meet you before the noise starts."}
          </p>
          {showArrival && (
            <div className="mb-3">
              <ArrivalRitual defaultOpen onComplete={() => setShowArrival(false)} />
            </div>
          )}
          {needAck && (
            <p
              className="text-[14px] text-amber-100/70 leading-relaxed mb-3"
              data-testid="text-threshold-need-line"
            >
              {needAck}
            </p>
          )}
          {thresholdNeed && verseReference && (
            <p
              className="text-[13px] text-white/68 leading-relaxed mb-3"
              data-testid="text-threshold-need-verse-bridge"
            >
              You asked for {NEED_LABEL[thresholdNeed]}. Today&apos;s Word meets you in{" "}
              <span className="text-amber-200/85 font-semibold">{verseReference}</span>.
            </p>
          )}
          {threshold?.continuityLine && (
            <p
              className="hidden sm:block text-[15px] text-white/70 leading-relaxed mb-4 pl-3.5 border-l-2 border-amber-500/30"
              data-testid="text-threshold-continuity"
            >
              {threshold.continuityLine}
            </p>
          )}

          {showTalkPrompt && !thresholdLoading && (
            <>
              {!chapelWeekFocus && <HomePresenceDoors selected={activeDoor} onSelect={selectDoor} />}
              <div className="mb-4" role="tabpanel" aria-label="Your chosen step">
                <HomePresenceHero
                  door={chapelWeekFocus ? firstWeekDoor : activeDoor}
                  phase={threshold?.phase}
                  thresholdNeed={thresholdNeed}
                  verse={verse ?? null}
                  onSelectTalk={() => selectDoor("talk")}
                />
              </div>
            </>
          )}

          {!chapelWeekFocus && threshold?.secondaryCta && daysWithApp < 3 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <Link href={threshold.secondaryCta.href}>
                <span
                  data-testid="btn-threshold-secondary"
                  className="text-[14px] font-semibold text-white/55 hover:text-white/80 underline-offset-4 hover:underline transition-colors"
                >
                  {threshold.secondaryCta.label} →
                </span>
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
                <span
                  data-testid="btn-listen-first-pro"
                  className="mt-5 flex items-center gap-2 text-[13px] font-medium text-white/40 hover:text-white/60 transition-colors"
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
