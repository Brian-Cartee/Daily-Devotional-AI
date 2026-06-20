import { useState, useEffect, useRef, useCallback, type CSSProperties, type ReactNode } from "react";
import { isIOS, isAndroid, isNativeWebViewShell } from "@/lib/platform";
import { Link, Redirect } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ShieldCheck, ChevronDown, Check, Share2, Flame, Sparkles, BookMarked, HandHeart } from "lucide-react";
import { DailyArtCard } from "@/components/DailyArtCard";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { useWelcomeOverlay } from "@/hooks/use-welcome-overlay";
import { SplashScreen } from "@/components/SplashScreen";
import { pickHomeReturnOverlay } from "@/lib/homeReturnOverlay";
import { clearReturningHome, isReturningHome, markIntroFlowComplete } from "@/lib/introState";
import { setEntryOverlayActive } from "@/lib/entryOverlayState";
import { hydrateWhyPanelFromServer } from "@/lib/homeHeroState";
import {
  consumeThresholdJustCompleted,
  shouldShowThresholdArrival,
} from "@/lib/thresholdState";
import { shouldRedirectToNightShepherd } from "@/lib/nightShepherdState";
import { WEEK_LABELS, getCurrentWeekDates, getTodayIndex } from "@/components/StreakWidget";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { fetchStreak } from "@/lib/streakApi";
import { isProVerifiedLocally, isProNudgeDismissed, dismissProNudge } from "@/lib/proStatus";
import { getRelationshipAge } from "@/lib/relationship";
import { SCROLL_TO_EXPLORE_KEY } from "@/lib/homePathsNav";
import {
  applyHomeScrollToTop,
  captureHomeScrollGeneration,
  isExploreScrollCancelled,
} from "@/lib/scrollPageToTop";
import { useDemoMode } from "@/components/DemoProvider";
import { getUserName } from "@/lib/userName";
import {
  getRhythm, hasFirstAction,
  getRhythmDismissed, incrementRhythmDismissed,
  getRecommendedJourneyId, getJourneyName, getDailyVerse, getPrayerPrompt,
  FOCUS_LABELS, type FaithRhythm,
} from "@/lib/faithRhythm";
import { FaithRhythmSetup } from "@/components/FaithRhythmSetup";
import { GuidedWalkthrough, recordWalkthroughVisit } from "@/components/GuidedWalkthrough";
import {
  GreetingHeader, ShareVerseButton, SundaySummaryCard,
  LateNightBannerCard,
} from "@/components/EngagementCards";
import { ScriptureForYou } from "@/components/ScriptureForYou";
import { PrayForThemCard } from "@/components/PrayForThem";
import { TheThreadCard } from "@/components/TheThreadCard";
import { HomeEngagementStack } from "@/components/HomeEngagementStack";
import { HomeYourPathCard } from "@/components/HomeYourPathCard";
import { hasActiveHomeEngagementSlot } from "@/lib/homeEngagementPriority";
import { shouldShowYourPathCard } from "@/lib/homePathProgress";
import { setLastOpenDate } from "@/lib/engagementCards";
import { isLateNight } from "@/lib/nightMode";
import { readCarryToday } from "@/lib/devotionalContinuity";
import { shareAppInviteText, shareAppUrl, shareNative } from "@/lib/shareVerse";
import { NATIVE_CARD, NATIVE_PAGE, NATIVE_TEXT, NATIVE_TEXT_SOFT } from "@/lib/nativeColors";
import { nativeDiag } from "@/lib/nativeDiag";
import { HomeEntryScreen, markEntryShown, shouldShowHomeEntry } from "@/components/HomeEntryScreen";
import { BeginTodaysWalk, hasShownBeginWalk, markBeginWalkShown } from "@/components/BeginTodaysWalk";
import {
  bumpHomeVisitAfterThreshold,
  isHomeDevotionalFocusPeriod,
  isHomeMarketplaceCollapsed,
  isPrayerClosetCompactTeaser,
  isSacredFirstHomeVisit,
  shouldShowHomeDailyArt,
  shouldShowPrayerClosetOnHome,
} from "@/lib/firstSession";
import { isThresholdComplete, isThresholdReplay } from "@/lib/thresholdState";
import { WhyThisExistsPanel } from "@/components/WhyThisExistsPanel";
import {
  SCRIPTURE_COMMITMENT_LEAD,
  SCRIPTURE_COMMITMENT_LINES,
} from "@/content/scriptureCommitment";
import { SCROLL_TO_SCRIPTURE_COMMITMENT_EVENT } from "@/lib/openConvictionPanel";
import { HOME_EMAIL_SUBSCRIBE_ANCHOR_ID } from "@/lib/homeEmailSubscribe";
import { HomeDailyEmailStatus } from "@/components/EmailSubscribe";
import { SimpleNotifNudge, DeepNotifNudge } from "@/components/NotifNudge";
import { defaultPresenceDoor } from "@/components/HomePresenceDoors";
import { ThresholdHero } from "@/components/ThresholdHero";
import type { HomePresenceContext } from "@/lib/homePresenceContext";
import { shouldShowArrivalRitual } from "@/components/ArrivalRitual";
import { WitnessLetterCard } from "@/components/witness/WitnessLetterCard";
import { LamentSeasonHomeCard } from "@/components/lament/LamentSeasonHomeCard";
import { isLamentSeasonActive } from "@/lib/lamentPathway";
import { SpiritualWeatherCard } from "@/components/SpiritualWeatherCard";
import { HomePathsBlock } from "@/components/HomePathsBlock";
import { ShortcutPathIcon } from "@/components/ShortcutPathIcon";
import { PrayerClosetHomeCard } from "@/components/PrayerClosetHomeCard";
import { ExternalPromoLinks } from "@/components/ExternalPromoLinks";
import { HomeHeartLink } from "@/components/HomeHeartLink";
import { BrandIcon } from "@/components/BrandIcon";
import { ThresholdModeRhythmCard } from "@/components/ThresholdModeRhythmCard";
import { useDailyVerse } from "@/hooks/use-verses";
import { getDevotionalHeroImage } from "@/lib/devotionalHeroImage";
import { apiSessionExtras } from "@/lib/requestExtras";

const logoSmall = "/logo-mark-white.png";
const logoWhite = "/logo-mark-white.png";
const logoLarge = "/logo-mark-white.png";

function formatVisitDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayStr = today.toISOString().split("T")[0];
  const yestStr = yesterday.toISOString().split("T")[0];
  if (dateStr === todayStr) return "Today";
  if (dateStr === yestStr) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getCarryToday(): { text: string; reference: string } | null {
  const payload = readCarryToday();
  if (!payload) return null;
  return { text: payload.text, reference: payload.reference };
}

function DevotionalCard({ homeFocus = false }: { homeFocus?: boolean }) {
  const isPro = isProVerifiedLocally();
  const { data } = useQuery({
    queryKey: ["/api/streak", isPro],
    queryFn: fetchStreak,
    staleTime: 60_000,
  });
  const { data: verse } = useDailyVerse();
  const verseDate = verse?.date;
  const verseArtGenStarted = useRef(false);
  const queryClient = useQueryClient();

  const { data: verseArt } = useQuery({
    queryKey: ["/api/verse-art", verseDate],
    queryFn: async () => {
      if (!verseDate) return null;
      const res = await fetch(`/api/verse-art/${verseDate}`);
      if (!res.ok) return null;
      return res.json() as { imageUrl: string | null; cached: boolean };
    },
    enabled: !!verseDate,
    staleTime: 6 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!verse || !verseDate || verseArt === undefined || verseArtGenStarted.current) return;
    if (verseArt?.imageUrl) return;
    verseArtGenStarted.current = true;
    fetch("/api/verse-art/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verseDate: verse.date,
        verseText: verse.text,
        verseReference: verse.reference,
        ...apiSessionExtras(),
      }),
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["/api/verse-art", verseDate] }))
      .catch(() => {});
  }, [verse, verseDate, verseArt, queryClient]);

  const cardBgSrc = verseArt?.imageUrl ?? getDevotionalHeroImage(verseDate);

  const weekDates = getCurrentWeekDates();
  const todayIdx = getTodayIndex();
  const visitDates: string[] = data?.visitDates ?? [];
  const streak = data?.currentStreak ?? 0;

  // Build the visit set. If streak > stored dates (data gap from before visitDates was tracked),
  // infer the missing prior days by counting back from today.
  const visitSet = new Set(visitDates);
  if (streak > visitSet.size) {
    for (let i = 0; i < streak; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      visitSet.add(d);
    }
  }
  const visitedToday = visitSet.has(weekDates[todayIdx]);
  const rawVisitSet = new Set(visitDates);
  const showMissedDayAck =
    rawVisitSet.has(weekDates[todayIdx]) &&
    streak >= 2 &&
    weekDates.some((date, i) => i < todayIdx && !rawVisitSet.has(date));

  return (
    <Link href="/devotional" className="sp-native-card-link">
      <div
        data-testid="card-devotional"
        className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
        style={{
          position: "relative",
          borderRadius: "16px",
          border: "1px solid rgba(19,78,74,0.10)",
          backgroundColor: NATIVE_CARD,
          padding: "20px",
          overflow: "hidden",
        }}
      >
        <img
          src={cardBgSrc}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.38,
            pointerEvents: "none",
            userSelect: "none",
            filter: "saturate(0.85) brightness(0.92)",
          }}
          onError={(e) => {
            const el = e.currentTarget;
            const fallback = getDevotionalHeroImage(verseDate);
            if (el.src !== fallback) el.src = fallback;
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(to bottom right, rgba(20,184,166,0.20), rgba(16,185,129,0.08), transparent)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(to top, rgba(26,21,32,0.70), transparent 55%)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "3px",
            borderRadius: "16px 0 0 16px",
            background: "linear-gradient(to bottom, #2dd4bf, #10b981)",
            opacity: 0.7,
          }}
        />
        <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "flex-start", gap: "16px" }}>
          <ShortcutPathIcon variant="devotional" />
          <div style={{ flex: 1, minWidth: 0, paddingTop: "2px", paddingBottom: "2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(20,184,166,0.20)",
                  color: "#14b8a6",
                  border: "1px solid rgba(45,212,191,0.40)",
                }}
              >
                Daily
              </span>
              {visitedToday && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(16,185,129,0.10)",
                    color: "#10b981",
                  }}
                >
                  <Check style={{ width: 12, height: 12 }} strokeWidth={3} /> You returned today
                </span>
              )}
            </div>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: NATIVE_TEXT,
                marginBottom: "4px",
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
              }}
            >
              {homeFocus ? "Today's Word" : "Daily Devotional"}
            </h2>
            <p style={{ fontSize: "15px", color: NATIVE_TEXT_SOFT, lineHeight: 1.625 }}>
              {homeFocus
                ? "Today's verse, a short reflection, and a prayer you can make your own. Read slowly — no rush."
                : "Each day brings a new scripture, a personal reflection, and a guided moment to hear from God — grounded in the passage, shaped for your real life. Open it, sit with it, let it speak."}
            </p>
            <div
              className="group-hover:gap-2.5 transition-all"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "14px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#14b8a6",
              }}
            >
              {visitedToday ? "Return to today's devotional" : homeFocus ? "Begin today's Word" : "Sit with today's message"}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

        {/* Horizontal week tracker */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid rgba(19,78,74,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
              {WEEK_LABELS.map((label, i) => {
                const date = weekDates[i];
                const visited = visitSet.has(date);
                const isToday = i === todayIdx;
                const isFuture = i > todayIdx;
                const labelColor = isToday
                  ? "#2dd4bf"
                  : visited
                    ? "rgba(20, 184, 166, 0.60)"
                    : "rgba(180, 175, 195, 0.25)";
                let circleStyle: CSSProperties = {
                  width: "22px",
                  height: "22px",
                  borderRadius: "9999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                };
                if (visited && isToday) {
                  circleStyle = { ...circleStyle, backgroundColor: "#14b8a6", boxShadow: "0 1px 2px rgba(45, 212, 191, 0.50)" };
                } else if (visited) {
                  circleStyle = {
                    ...circleStyle,
                    backgroundColor: "rgba(19, 78, 74, 0.30)",
                    border: "1px solid rgba(45, 212, 191, 0.50)",
                  };
                } else if (isToday) {
                  circleStyle = {
                    ...circleStyle,
                    border: "2px solid rgba(45, 212, 191, 0.60)",
                    backgroundColor: "rgba(19, 78, 74, 0.20)",
                  };
                } else if (isFuture) {
                  circleStyle = { ...circleStyle, border: "1px solid rgba(180, 175, 195, 0.10)" };
                } else {
                  circleStyle = {
                    ...circleStyle,
                    border: "1px solid rgba(180, 175, 195, 0.12)",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                  };
                }
                return (
                  <div
                    key={i}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
                  >
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        lineHeight: 1,
                        color: labelColor,
                      }}
                    >
                      {label}
                    </span>
                    <div style={circleStyle}>
                      {visited && isToday && <Check style={{ width: "12px", height: "12px", color: "#fff" }} strokeWidth={3} />}
                      {visited && !isToday && <Check style={{ width: "10px", height: "10px", color: "#2dd4bf" }} strokeWidth={3} />}
                      {isToday && !visited && (
                        <div
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "9999px",
                            backgroundColor: "rgba(45, 212, 191, 0.50)",
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {streak > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingBottom: "2px" }}>
                {streak >= 7 ? (
                  <Flame style={{ width: "14px", height: "14px", color: "#f59e0b" }} />
                ) : (
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "9999px",
                      backgroundColor: "#2dd4bf",
                      display: "inline-block",
                    }}
                  />
                )}
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#2dd4bf" }}>{streak}d</span>
              </div>
            )}
          </div>
          {showMissedDayAck && (
            <p
              className="text-[13px] text-muted-foreground/70 italic text-center mt-2"
              data-testid="text-missed-day-ack"
              style={{ position: "relative", zIndex: 10 }}
            >
              You missed a day and came back anyway. That&apos;s what this is.
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

const COMMITMENT_POINTS = [
  "Rooted in the Trinitarian faith — Father, Son, and Holy Spirit — trusting that the Holy Spirit is a living Person who opens Scripture to you as you read",
  "AI is here to illuminate the passage being studied — never to reinterpret, replace, or stand beside Scripture",
  "Grounded in historic, orthodox Christian faith across centuries and traditions — the same faith passed down through every generation",
  "Built for showing up — whenever you're able, however you're able",
];

const FAQ_ITEMS = [
  {
    q: "What is Shepherd's Path?",
    a: "It's a quiet companion for your faith. Not a Bible app or a content platform — a place designed to meet you where you are and walk with you toward a deeper relationship with God. Each part of the app serves a different moment: something to receive, something to express, something to understand.",
  },
  {
    q: "Do I need to know anything about the Bible to start?",
    a: "Not at all. Many people who find their way here are curious, skeptical, or returning after a long time away. You don't need any background. There's no entry requirement — just begin where you are.",
  },
  {
    q: "Is it free?",
    a: "Yes. The Daily Devotional, Talk It Through, Bible reading, Journeys, and Journal are all free. A Pro option exists for those who want to go deeper — but the core experience is and will remain free.",
  },
  {
    q: "What is the Daily Devotional?",
    a: "Each day, a verse is waiting for you. Not a lecture — something to sit with. You can read it, listen to it, or simply let it rest in you. It's the same for everyone that day. It takes as long as you need.",
  },
  {
    q: "What is Talk It Through?",
    a: "A quiet place to bring what's on your heart. You share what's weighing on you — honestly, without filtering — and receive scripture and a written prayer shaped for that moment. It's not advice. It's presence.",
  },
  {
    q: "What are Journeys?",
    a: "Guided paths through Scripture shaped around seasons of life, questions you're carrying, and themes that matter. You don't choose a program — you step into something and walk through it at your own pace. Each journey is 7 passages long.",
  },
  {
    q: "What is the Journal for?",
    a: "A private place to hold what God is doing in your life. Prayers you've prayed, things that have spoken to you, words you don't want to forget. It's not designed to be productive — it's designed to be personal. It becomes more meaningful over time.",
  },
  {
    q: 'What does "Explore Scripture" do?',
    a: "Bring any question, passage, or thing you're wondering about — and it will find what Scripture says about it. It's understanding, not searching. You can type something as open as 'I feel like I've failed' or as specific as a chapter and verse.",
  },
  {
    q: 'What is "Your Walk"?',
    a: "A personalized path through Scripture built around where you actually are — exploring faith for the first time, returning after time away, growing deeper, or struggling and needing something to hold onto. Two quick questions, and your path is ready.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. Shepherd's Path doesn't require a login. Your experience — your journal, your progress, your preferences — is saved privately to your device. Nothing is tied to a name, email, or profile unless you choose to subscribe to the daily verse.",
  },
  {
    q: "Is my journal private?",
    a: "Yes. Your prayers and reflections are stored locally on your device. We cannot read them, and they are never sent to our servers. What you write stays with you.",
  },
  {
    q: "What is Pro?",
    a: "Pro unlocks deeper access — more Talk It Through conversations, expanded Journeys, and the ability to listen to any passage. It supports the work of keeping the app free for everyone else. There's no pressure to upgrade; the free experience is complete on its own.",
  },
  {
    q: "Is there a mobile app?",
    a: 'Yes — search "Shepherd\'s Path" on the App Store (iOS). Android is coming soon. In Safari you can also use Share → Add to Home Screen for a quick shortcut to the same experience.',
  },
  {
    q: "Where do I begin?",
    a: "Wherever feels right. Most people start with the Devotional — it's the gentlest entry point. Or open Talk It Through. Or step into a Journey. There's no wrong door. The app is designed so any place you start is the right place.",
  },
];

const FAQ_INITIAL_COUNT = 3;

/** Shared section label for home footer blocks — readable on phone and desktop */
function HomeSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5 sm:mb-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.14em] text-foreground/70 shrink-0 text-center max-w-[min(100%,14rem)] leading-snug">
        {children}
      </p>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border/50 to-transparent" />
    </div>
  );
}

function FaqItem({ item, index, open, setOpen }: { item: { q: string; a: string }; index: number; open: number | null; setOpen: (i: number | null) => void }) {
  const isOpen = open === index;
  return (
    <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/50">
      <button
        type="button"
        data-testid={`faq-toggle-${index}`}
        onClick={() => setOpen(isOpen ? null : index)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 sm:py-[1.125rem] min-h-[52px] text-left touch-manipulation"
      >
        <span className="text-[15px] sm:text-base font-semibold text-foreground leading-snug pr-1">{item.q}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" aria-hidden />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border/40"
          >
            <p
              data-testid={`faq-answer-${index}`}
              className="px-4 sm:px-5 pt-3 pb-5 text-[14px] sm:text-[15px] text-foreground/85 leading-relaxed"
            >
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const remaining = FAQ_ITEMS.length - FAQ_INITIAL_COUNT;

  return (
    <div className="px-0 mb-8 sm:mb-10 max-w-xl mx-auto w-full">
      <HomeSectionLabel>Questions people ask</HomeSectionLabel>
      <div className="space-y-2.5 sm:space-y-3">
        {FAQ_ITEMS.slice(0, FAQ_INITIAL_COUNT).map((item, i) => (
          <FaqItem key={i} item={item} index={i} open={open} setOpen={setOpen} />
        ))}

        <AnimatePresence initial={false}>
          {showAll && FAQ_ITEMS.slice(FAQ_INITIAL_COUNT).map((item, i) => (
            <motion.div
              key={FAQ_INITIAL_COUNT + i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: i * 0.04 }}
            >
              <FaqItem item={item} index={FAQ_INITIAL_COUNT + i} open={open} setOpen={setOpen} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!showAll && (
        <button
          type="button"
          data-testid="button-faq-show-more"
          onClick={() => setShowAll(true)}
          className="mt-4 w-full min-h-[48px] py-3.5 rounded-2xl border border-border/50 bg-card/40 text-[14px] sm:text-[15px] font-medium text-foreground/75 hover:text-foreground hover:bg-card/70 transition-colors flex items-center justify-center gap-2 touch-manipulation"
        >
          <ChevronDown className="w-4 h-4" aria-hidden />
          {remaining} more questions
        </button>
      )}
    </div>
  );
}

function ClosingManifesto() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        marginTop: "40px",
        marginBottom: "8px",
        maxWidth: "36rem",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 120% 100% at 50% 50%, rgba(122,1,141,0.16) 0%, rgba(122,1,141,0.05) 60%, transparent 85%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "32px 20px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "28px",
            width: "100%",
            maxWidth: "20rem",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "linear-gradient(to right, transparent, rgba(139,92,246,0.40))",
            }}
          />
          <div style={{ flexShrink: 0, filter: "drop-shadow(0 0 24px rgba(122,1,141,0.5))" }}>
            <BrandIcon size={80} />
          </div>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "linear-gradient(to left, transparent, rgba(139,92,246,0.40))",
            }}
          />
        </div>

        <p
          className="manifesto-line"
          style={{ fontSize: "clamp(1.5rem, 4.8vw, 1.625rem)", color: "rgba(255,255,255,0.95)", marginBottom: "12px", marginTop: 0 }}
        >
          The path is here.
        </p>
        <p
          className="manifesto-line"
          style={{ fontSize: "clamp(1.7rem, 5.4vw, 1.875rem)", color: "#ffffff", marginBottom: "16px", marginTop: 0 }}
        >
          Start where you are.
        </p>
        <p
          className="manifesto-line manifesto-line--emphasis"
          style={{ fontSize: "clamp(1.95rem, 6.2vw, 2.5rem)", color: "#ffffff", margin: 0, maxWidth: "16ch" }}
        >
          Walking it is up to you.
        </p>
      </div>
    </div>
  );
}

// Deterministic arch data mirroring the Chris Harrison Bible cross-reference visualization
// Colors shift blue → green → red based on span (distance between referenced books)
const BIBLE_ARCHES: { left: number; right: number; t: number }[] = (() => {
  const out: { left: number; right: number; t: number }[] = [];
  for (let i = 0; i < 160; i++) {
    const s1 = (Math.sin(i * 127.1) * 0.5 + 0.5);
    const s2 = (Math.sin(i * 311.7 + 1.3) * 0.5 + 0.5);
    const x1 = 6 + s1 * 388;
    const x2 = 6 + s2 * 388;
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    if (right - left < 4) continue;
    out.push({ left, right, t: (right - left) / 388 });
  }
  return out;
})();

function LandingHomeInner() {
  const sessionId = getSessionId();
  const inNativeApp = isNativeWebViewShell();
  // In the iOS app, permanently mark intro complete so cold-launch sessionStorage
  // loss never triggers the "step inside" splash when tapping the Home button.
  if (inNativeApp) markIntroFlowComplete();
  const skipIntrosForHome = isReturningHome() && !inNativeApp;

  const [homeVisitAfterThreshold] = useState(() =>
    isThresholdComplete() ? bumpHomeVisitAfterThreshold() : 0,
  );
  const chapelWeekFocus = homeVisitAfterThreshold > 0 && homeVisitAfterThreshold <= 7;
  const sacredFirstHome = isSacredFirstHomeVisit(homeVisitAfterThreshold);
  const blockHomeOverlays = sacredFirstHome || skipIntrosForHome;
  const forceIntro =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("intro");
  const [homeReturnOverlay] = useState(() =>
    pickHomeReturnOverlay({
      blockHomeOverlays,
      inNativeApp,
      homeVisitAfterThreshold,
      chapelWeekFocus,
      forceIntro,
    }),
  );

  useEffect(() => {
    if (inNativeApp) {
      void hydrateWhyPanelFromServer();
    }
  }, [inNativeApp]);

  useEffect(() => {
    if (!inNativeApp) return;
    nativeDiag("home_mount");
    const t = window.setTimeout(() => {
      const card = document.querySelector('[data-testid="card-devotional"]');
      nativeDiag("devotional_card_rendered", card ? "visible" : "missing");
    }, 800);
    return () => window.clearTimeout(t);
  }, [inNativeApp]);

  const [showSplash, setShowSplash] = useState(() => homeReturnOverlay === "splash");
  const [thresholdWelcome, setThresholdWelcome] = useState(() => consumeThresholdJustCompleted());
  useEffect(() => {
    if (!isReturningHome()) return;
    applyHomeScrollToTop();
    clearReturningHome();
  }, []);

  const [showBeginWalk, setShowBeginWalk] = useState(() => {
    try { return !!localStorage.getItem("sp_start_burden") && !hasShownBeginWalk(); } catch { return false; }
  });
  const [showEntryScreen, setShowEntryScreen] = useState(() => {
    if (homeReturnOverlay === "entry") return true;
    // Native app: check synchronously so splash shows before home renders (no flash)
    try {
      if (isNativeWebViewShell()) {
        const last = parseInt(localStorage.getItem("sp_last_active_ts") ?? "0", 10);
        const elapsed = Date.now() - last;
        if (elapsed >= 5_000 && shouldShowHomeEntry(true)) return true;
      }
    } catch { /* storage unavailable */ }
    return false;
  });
  useEffect(() => {
    setEntryOverlayActive(showEntryScreen);
    return () => setEntryOverlayActive(false);
  }, [showEntryScreen]);

  // In native WebView (TestFlight), force-close/reopen doesn't reload the page.
  // Track background time and show the entry splash on real reopens (5s+ away).
  useEffect(() => {
    if (!isNativeWebViewShell()) return;
    const LAST_ACTIVE_KEY = "sp_last_active_ts";
    const REOPEN_THRESHOLD_MS = 5_000; // 5s — covers force-close and real reopens

    const recordActive = () => {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    };

    const tryShowSplash = () => {
      const last = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) ?? "0", 10);
      const elapsed = Date.now() - last;
      if (elapsed < REOPEN_THRESHOLD_MS) return;
      recordActive(); // prevent double-fire
      clearReturningHome();
      if (shouldShowHomeEntry(true)) {
        setShowEntryScreen(true);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") { recordActive(); return; }
      tryShowSplash();
    };

    // Native AppState bridge — primary trigger from index.tsx AppState listener
    (window as any).__onAppForeground = tryShowSplash;

    // Fire immediately on mount — catches cold launch and page navigations back to home
    tryShowSplash();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", tryShowSplash);
    window.addEventListener("pageshow", tryShowSplash);
    // Fallback poll — stops itself after firing to avoid double-shows
    const poll = setInterval(() => {
      const last = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) ?? "0", 10);
      if (Date.now() - last >= REOPEN_THRESHOLD_MS) tryShowSplash();
    }, 1000);
    return () => {
      (window as any).__onAppForeground = undefined;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", tryShowSplash);
      window.removeEventListener("pageshow", tryShowSplash);
      clearInterval(poll);
    };
  }, []);
  const [shared, setShared] = useState(false);
  const [rhythm, setRhythm] = useState<FaithRhythm | null>(() => getRhythm());
  const [showRhythmSetup, setShowRhythmSetup] = useState(false);
  const [rhythmExpanded, setRhythmExpanded] = useState(false);
  const [rhythmDismissCount, setRhythmDismissCount] = useState(() => getRhythmDismissed());
  const [proNudgeHidden, setProNudgeHidden] = useState(() => isProNudgeDismissed());
  const welcomeOverlayEnabled = homeReturnOverlay === "welcome";
  const { show: showWelcome, dismiss: dismissWelcome } = useWelcomeOverlay(welcomeOverlayEnabled);
  const showWelcomeOverlay = welcomeOverlayEnabled && showWelcome;
  useEffect(() => {
    if (showWelcomeOverlay) setEntryOverlayActive(true);
  }, [showWelcomeOverlay]);
  const [showWalkthrough, setShowWalkthrough] = useState(() => homeReturnOverlay === "walkthrough");
  useEffect(() => {
    if (!showWalkthrough) return;
    recordWalkthroughVisit();
  }, [showWalkthrough]);
  useEffect(() => {
    if (isNativeWebViewShell()) return;
    if (!sessionStorage.getItem(SCROLL_TO_EXPLORE_KEY)) return;
    sessionStorage.removeItem(SCROLL_TO_EXPLORE_KEY);
    const gen = captureHomeScrollGeneration();
    const scrollToIt = () => {
      if (isExploreScrollCancelled(gen)) return;
      const el = document.getElementById("explore-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    setTimeout(scrollToIt, 200);
    setTimeout(scrollToIt, 500);
  }, []);
  const [commitmentOpen, setCommitmentOpen] = useState(false);
  const [showDepthExtras, setShowDepthExtras] = useState(false);
  const demo = useDemoMode();

  const revealScriptureCommitment = useCallback(() => {
    setShowDepthExtras(true);
    setCommitmentOpen(true);
    const scrollToIt = () => {
      document
        .getElementById("scripture-commitment-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    setTimeout(scrollToIt, 120);
    setTimeout(scrollToIt, 450);
  }, []);

  useEffect(() => {
    const onScrollCommitment = () => revealScriptureCommitment();
    window.addEventListener(SCROLL_TO_SCRIPTURE_COMMITMENT_EVENT, onScrollCommitment);
    return () => window.removeEventListener(SCROLL_TO_SCRIPTURE_COMMITMENT_EVENT, onScrollCommitment);
  }, [revealScriptureCommitment]);

  useEffect(() => {
    if (window.location.hash !== "#scripture-commitment") return;
    revealScriptureCommitment();
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [revealScriptureCommitment]);

  const isProStreak = isProVerifiedLocally();
  const { data: streakData } = useQuery({
    queryKey: ["/api/streak", isProStreak],
    queryFn: fetchStreak,
    staleTime: 60_000,
  });

  const hasAction = hasFirstAction() || (streakData?.visitDates?.length ?? 0) > 0;
  const showNudge = !rhythm && hasAction && rhythmDismissCount < 2;

  const handleRhythmDone = () => {
    setRhythm(getRhythm());
    setShowRhythmSetup(false);
  };

  const handleRhythmDismiss = () => {
    incrementRhythmDismissed();
    setRhythmDismissCount((c) => c + 1);
    setShowRhythmSetup(false);
  };

  const handleNudgeDismiss = () => {
    incrementRhythmDismissed();
    setRhythmDismissCount((c) => c + 1);
  };

  const streak = streakData?.currentStreak ?? 0;
  const visitCount = streakData?.visitDates?.length ?? 0;
  const daysWithApp = getRelationshipAge();
  const homeDevotionalFocus = isHomeDevotionalFocusPeriod(daysWithApp, visitCount);
  const homeMarketplaceCollapsed = isHomeMarketplaceCollapsed(daysWithApp, visitCount);
  const isPro = isProVerifiedLocally();
  const showYourPath = shouldShowYourPathCard(daysWithApp, visitCount);
  const engagementBusy =
    hasActiveHomeEngagementSlot(daysWithApp) || showYourPath || showWalkthrough;
  const showProNudge =
    !!rhythm &&
    streak >= 5 &&
    daysWithApp >= 7 &&
    !isPro &&
    !proNudgeHidden &&
    !demo?.config.isDemo &&
    !engagementBusy &&
    !isLateNight();
  const carryToday = getCarryToday();
  const chapelExploreCollapsed = daysWithApp < 14;
  const showSecondaryHomeCards = !homeMarketplaceCollapsed && daysWithApp >= 3;
  const [presenceCtx, setPresenceCtx] = useState<HomePresenceContext>(() => ({
    door: defaultPresenceDoor(),
    arrivalOpen: shouldShowArrivalRitual(),
  }));
  const onPresenceContextChange = useCallback((ctx: HomePresenceContext) => {
    setPresenceCtx(ctx);
  }, []);
  const hideDevotionalCard = !homeDevotionalFocus && presenceCtx.door === "scripture";
  const showPrayerClosetCard = shouldShowPrayerClosetOnHome(presenceCtx.door === "quiet");
  const prayerClosetCompactTeaser = isPrayerClosetCompactTeaser(homeDevotionalFocus, daysWithApp);
  const showDailyArt = shouldShowHomeDailyArt();
  const showGreeting = Boolean(getUserName()); // show from day 1

  useEffect(() => { setLastOpenDate(); }, []);

  const handleProNudgeDismiss = () => {
    dismissProNudge();
    setProNudgeHidden(true);
  };

  const handleShareApp = async () => {
    const tagline =
      "Your daily walk with Jesus — AI-guided devotionals, Bible journeys, prayer & more.";
    const result = await shareNative({
      title: "Shepherd's Path",
      text: shareAppInviteText(tagline),
      url: shareAppUrl(),
    });
    if (result === "cancelled" || result === "delegated") return;
    if (result === "shared" || result === "copied") {
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  };

  const handleDismissWelcome = () => {
    dismissWelcome();
    markEntryShown();
    setShowEntryScreen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      data-testid="landing-home"
      className="relative"
      style={{ minHeight: "100vh", background: NATIVE_PAGE }}
    >
      <AnimatePresence>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showBeginWalk && (
          <BeginTodaysWalk onEnter={() => {
            markBeginWalkShown();
            setShowBeginWalk(false);
            const el = document.getElementById("card-devotional") ?? document.querySelector('[data-testid="card-devotional"]');
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!showBeginWalk && showWelcomeOverlay && <WelcomeOverlay onDismiss={handleDismissWelcome} />}
      </AnimatePresence>
      {!showBeginWalk && showEntryScreen && <HomeEntryScreen onDismiss={() => { setShowEntryScreen(false); window.scrollTo({ top: 0, behavior: "instant" }); }} />}
      <AnimatePresence>
        {showRhythmSetup && (
          <FaithRhythmSetup onDone={handleRhythmDone} onDismiss={handleRhythmDismiss} />
        )}
      </AnimatePresence>

      {/* Always mounted so “Why we built this” works before first action */}
      <WhyThisExistsPanel />

      {/* Desktop side vignette — frames the content column on wide screens only */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden xl:block"
        style={{
          background: "linear-gradient(to right, rgba(0,0,0,0.55) 0%, transparent calc(50% - 480px), transparent calc(50% + 480px), rgba(0,0,0,0.55) 100%)",
          zIndex: 3,
        }}
      />

      <ThresholdHero onPresenceContextChange={onPresenceContextChange} />

      {/* "You stepped inside" message and Gentle Start card removed —
          they interrupted the flow between the hero and Good morning/Today's Word */}

      {/* Section cards */}
      <div
        style={{
          maxWidth: "36rem",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingBottom: "24px",
          position: "relative",
          zIndex: 10,
          marginTop: homeDevotionalFocus ? "8px" : "-16px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >

        {/* Side logo watermarks — near inner edge of each margin, aligned with lower card row */}
        <div className="hidden xl:block absolute pointer-events-none select-none" style={{ left: "calc((100% - 100vw) / 4 - 72px)", top: "30%", transform: "translateY(-50%)" }} aria-hidden="true">
          <img src={logoLarge} alt="" className="w-36 h-36 object-contain rounded-3xl" style={{ opacity: 0.06 }} />
        </div>
        <div className="hidden xl:block absolute pointer-events-none select-none" style={{ right: "calc((100% - 100vw) / 4 - 72px)", top: "30%", transform: "translateY(-50%)" }} aria-hidden="true">
          <img src={logoLarge} alt="" className="w-36 h-36 object-contain rounded-3xl" style={{ opacity: 0.06 }} />
        </div>
        <motion.div
          initial={inNativeApp ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: inNativeApp ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          {showGreeting && <GreetingHeader />}
          {!homeDevotionalFocus && !homeMarketplaceCollapsed && carryToday && (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/45 px-4 py-3" data-testid="card-carry-today">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300/80 mb-1">Carry this today</p>
              <p className="text-[15px] leading-relaxed italic text-foreground/90">"{carryToday.text}"</p>
              <p className="text-[12px] font-semibold text-zinc-300/75 mt-1">— {carryToday.reference}</p>
            </div>
          )}

          {/* Keep the first screen calm: only show these after a first meaningful action */}
          {!homeDevotionalFocus && !homeMarketplaceCollapsed && hasAction && (
            <>
              <SpiritualWeatherCard />
              <SimpleNotifNudge />
              <DeepNotifNudge />
            </>
          )}

          {(sacredFirstHome || homeDevotionalFocus) && (
            <p
              className="text-center text-[13px] text-muted-foreground/80 leading-relaxed px-2 -mt-1"
              data-testid="text-sacred-first-hint"
            >
              {homeDevotionalFocus
                ? "Tap Today's Word — verse, reflection, and prayer are ready."
                : "Start with today\u2019s Word below — one honest step is enough."}
            </p>
          )}

          {/* ══ Today's step first — week one / until first devotional visit ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {homeDevotionalFocus && !hideDevotionalCard && (
            <div
              data-testid="label-todays-step"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginTop: "12px",
                marginBottom: "4px",
                paddingLeft: "2px",
                paddingRight: "2px",
              }}
            >
              <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, rgba(196,78,224,0.35))" }} />
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  color: "rgba(196, 78, 224, 0.80)",
                  flexShrink: 0,
                  margin: 0,
                }}
              >
                Today&apos;s step
              </p>
              <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, rgba(196,78,224,0.35))" }} />
            </div>
          )}

          {!hideDevotionalCard && <DevotionalCard homeFocus={homeDevotionalFocus} />}

          {/* ScriptureForYou removed — clutters home, duplicates Today's Word */}

          {/* The Thread — weekly synthesis, shown after 3+ days */}
          <TheThreadCard daysWithApp={daysWithApp} />

          {/* PrayForThemCard removed from home feed — accessible via Prayer Closet */}

          {!homeDevotionalFocus && !homeMarketplaceCollapsed && showSecondaryHomeCards && (
            <WitnessLetterCard />
          )}

          {!homeDevotionalFocus && !homeMarketplaceCollapsed && <LamentSeasonHomeCard />}

          <HomePathsBlock
            homeDevotionalFocus={homeDevotionalFocus}
            chapelWeekFocus={chapelWeekFocus}
            homeMarketplaceCollapsed={homeMarketplaceCollapsed}
            inNativeApp={inNativeApp}
            chapelExploreCollapsed={chapelExploreCollapsed}
            showPrayerClosetBanner={showPrayerClosetCard}
          />

          {showPrayerClosetCard && (
            <PrayerClosetHomeCard compactTeaser={prayerClosetCompactTeaser} />
          )}

          {/* greeting now rendered once at top of card stack */}
          {homeDevotionalFocus && carryToday && (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/45 px-4 py-3" data-testid="card-carry-today">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300/80 mb-1">Carry this today</p>
              <p className="text-[15px] leading-relaxed italic text-foreground/90">"{carryToday.text}"</p>
              <p className="text-[12px] font-semibold text-zinc-300/75 mt-1">— {carryToday.reference}</p>
            </div>
          )}

          <AnimatePresence>
            {showWalkthrough && !homeDevotionalFocus && (
              <GuidedWalkthrough onDismiss={() => setShowWalkthrough(false)} />
            )}
          </AnimatePresence>

          {showYourPath && !homeDevotionalFocus && !homeMarketplaceCollapsed && (
            <HomeYourPathCard daysWithApp={daysWithApp} devotionalVisitCount={visitCount} />
          )}

          {!homeDevotionalFocus && !homeMarketplaceCollapsed && <LateNightBannerCard />}
          {!homeDevotionalFocus && !homeMarketplaceCollapsed && !showYourPath && (
            <HomeEngagementStack daysWithApp={daysWithApp} />
          )}

          {/* Today's Rhythm card — shown once rhythm is set up */}
          {rhythm && (() => {
            const verse = getDailyVerse(rhythm.focus);
            const prayer = getPrayerPrompt(rhythm.focus);
            const journeyId = getRecommendedJourneyId(rhythm);
            const journeyName = getJourneyName(journeyId);
            const focusLabel = FOCUS_LABELS[rhythm.focus];
            return (
              <div className="relative rounded-2xl border border-white/10 bg-card overflow-hidden shadow-sm">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-zinc-500/70 via-zinc-400/50 to-zinc-300/35" />
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-zinc-400/70 to-zinc-500/45 opacity-80 rounded-l-2xl" />
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-400/5 via-zinc-300/5 to-transparent pointer-events-none" />
                <div className="relative z-10 px-5 pt-4 pb-4">
                  {/* Header — always visible, tap to expand */}
                  <button
                    type="button"
                    onClick={() => setRhythmExpanded(e => !e)}
                    className="w-full flex items-center justify-between"
                    aria-expanded={rhythmExpanded}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShortcutPathIcon variant="pathways" size="sm" />
                      <span className="text-[12px] font-bold uppercase tracking-widest text-zinc-300/80">Your Rhythm Today</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-zinc-900/55 text-zinc-200 border border-white/10">
                        {focusLabel}
                      </span>
                      <span className="text-zinc-400/60 text-[12px]" aria-hidden>
                        {rhythmExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {rhythmExpanded && (
                    <div className="mt-3">
                      {/* Today's verse */}
                      <div className="mb-3 px-3.5 py-3 rounded-xl bg-zinc-900/35 border border-white/10">
                        <p className="text-[13px] font-bold uppercase tracking-widest text-zinc-300/70 mb-1.5">Today's Word</p>
                        <p className="path-reminder-quote text-[14px] text-foreground mb-1.5">
                          &ldquo;{verse.text}&rdquo;
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[12px] font-bold text-zinc-300/75">— {verse.ref}</p>
                          <ShareVerseButton verseText={verse.text} verseRef={verse.ref} />
                        </div>
                      </div>

                      {/* Prayer + Journey — two columns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                        <div className="px-3.5 py-3 rounded-xl bg-muted/50 border border-border/60">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <HandHeart className="w-3.5 h-3.5 text-zinc-300/75" />
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Bring to Prayer</p>
                          </div>
                          <p className="text-[12px] text-foreground/75 leading-snug italic">
                            {prayer}
                          </p>
                        </div>
                        <Link href={`/understand?j=${journeyId}`}>
                          <div className="px-3.5 py-3 rounded-xl bg-muted/50 border border-border/60 hover:border-white/15 hover:bg-zinc-800/25 transition-all cursor-pointer h-full group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <BookMarked className="w-3.5 h-3.5 text-zinc-300/75" />
                              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Your Journey</p>
                            </div>
                            <p className="text-[12px] text-foreground/75 leading-snug font-semibold group-hover:text-zinc-200 transition-colors">
                              {journeyName} →
                            </p>
                          </div>
                        </Link>
                      </div>

                      {/* Footer — adjust */}
                      <button
                        data-testid="btn-adjust-rhythm"
                        onClick={() => setShowRhythmSetup(true)}
                        className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-medium"
                      >
                        Adjust my rhythm
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {showSecondaryHomeCards && (
            <SundaySummaryCard streak={streak} visitCount={streakData?.visitDates?.length ?? 0} />
          )}

          {/* ── Your Walk Today — end-of-day alignment card (5pm+) ── */}
          {!homeDevotionalFocus && !homeMarketplaceCollapsed && showSecondaryHomeCards && new Date().getHours() >= 17 && <Link href="/alignment">
            <div
              data-testid="card-walk-today-entry"
              className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(130deg, hsl(240 20% 10%), hsl(30 18% 12%))", border: "1px solid rgba(251,191,36,0.18)" }}
            >
              {/* Glowing top edge */}
              <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)" }} />
              <div className="px-5 py-4">
                {/* Path dots decoration */}
                <div className="flex items-center gap-1.5 mb-3">
                  {[0.2, 0.45, 0.65, 0.8, 1].map((o, i) => (
                    <div key={i} className="flex items-center gap-1.5 flex-1 last:flex-none">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: `rgba(251,191,36,${o})`, boxShadow: o > 0.6 ? `0 0 6px rgba(251,191,36,${o * 0.6})` : "none" }}
                      />
                      {i < 4 && <div className="flex-1 h-px bg-amber-400/12" />}
                    </div>
                  ))}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-400/60 mb-1">End of day</p>
                    <p className="text-[17px] font-bold text-white leading-tight">Your Walk Today</p>
                    <p className="text-[12px] text-white/40 mt-0.5">Not perfection. Alignment.</p>
                  </div>
                  <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}>
                    <ArrowRight className="w-4 h-4 text-amber-400/80" />
                  </div>
                </div>
                <p className="text-[11px] text-white/28 mt-3">Faith · Obedience · Love · Surrender · Endurance</p>
              </div>
            </div>
          </Link>}

          {showProNudge && (
            <div
              data-testid="card-pro-nudge"
              className="relative rounded-2xl overflow-hidden border border-border/50 bg-card/60"
            >
              <div className="relative z-10 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <ShortcutPathIcon variant="streak" size="sm" />
                    <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground leading-snug">
                      {streak} morning{streak !== 1 ? "s" : ""} with God — Pro keeps the walk when life gets loud.
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Archive search, listen-first, streak grace — optional, never required.
                    </p>
                    </div>
                  </div>
                  <button
                    data-testid="btn-pro-nudge-dismiss"
                    onClick={handleProNudgeDismiss}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all shrink-0"
                    aria-label="Dismiss"
                  >
                    <span className="text-lg leading-none">×</span>
                  </button>
                </div>
                <Link href="/pricing">
                  <span
                    data-testid="btn-pro-nudge-cta"
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:text-primary/80"
                  >
                    See Pro
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            </div>
          )}

          {showDailyArt && (
            <>
              {/* Closing grace note — after paths, before depth extras */}
              <div
                data-testid="section-take-a-moment"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "16px",
                  paddingLeft: "2px",
                  paddingRight: "2px",
                }}
              >
                <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, rgba(196,78,224,0.35))" }} />
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "rgba(237,232,224,0.60)",
                    flexShrink: 0,
                    margin: 0,
                  }}
                >
                  Take a moment
                </p>
                <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, rgba(196,78,224,0.35))" }} />
              </div>
              <div
                style={{
                  position: "relative",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.20)",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    zIndex: 10,
                    background: "linear-gradient(to right, #c44ee0, #8b5cf6, #fbbf24)",
                  }}
                />
                <DailyArtCard />
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowDepthExtras((v) => !v)}
            data-testid="toggle-depth-extras"
            aria-expanded={showDepthExtras}
            className="mt-8 w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 min-h-[52px] rounded-2xl border border-border/50 bg-card/40 text-[15px] sm:text-base font-semibold text-foreground/85 hover:text-foreground hover:bg-card/60 transition-colors touch-manipulation"
          >
            <span>{showDepthExtras ? "Hide Scripture & our story" : "About Scripture & our story"}</span>
            <ChevronDown className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${showDepthExtras ? "rotate-180" : ""}`} aria-hidden />
          </button>

          {showDepthExtras && (
          <>
          {/* ── 63,779 Scripture Unity Card ── */}
          <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(120,60,200,0.22)" }}>
            {/* SVG arch visualization — simplified Chris Harrison style */}
            <div style={{ background: "linear-gradient(180deg, #06030f 0%, #0d0620 100%)" }}>
              <svg viewBox="0 0 400 110" className="w-full" style={{ height: "110px", display: "block" }} preserveAspectRatio="none">
                {/* Baseline */}
                <line x1="0" y1="104" x2="400" y2="104" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8" />
                {/* 66 book tick marks */}
                {Array.from({ length: 66 }, (_, i) => {
                  const x = 6 + (i / 65) * 388;
                  return <line key={i} x1={x} y1="99" x2={x} y2="105" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />;
                })}
                {/* Arch curves — rainbow colored by span like the original visualization */}
                {BIBLE_ARCHES.map(({ left, right, t }, i) => {
                  const cx = (left + right) / 2;
                  const height = t * 95 + 4;
                  const cy = 104 - height;
                  const hue = Math.round(240 - t * 240);
                  const opacity = 0.28 + t * 0.22;
                  return (
                    <path
                      key={i}
                      d={`M ${left} 104 Q ${cx} ${cy} ${right} 104`}
                      fill="none"
                      stroke={`hsla(${hue},88%,62%,${opacity})`}
                      strokeWidth="0.75"
                    />
                  );
                })}
              </svg>
            </div>

            {/* Content body */}
            <div className="px-5 pt-5 pb-6" style={{ background: "linear-gradient(135deg, rgba(8,4,22,0.98) 0%, rgba(18,8,40,0.98) 100%)" }}>
              <p className="text-[10.5px] font-black uppercase tracking-[0.24em] mb-3" style={{ color: "rgba(192,132,252,0.6)" }}>One Unified Story</p>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[44px] font-extrabold leading-none" style={{ color: "rgba(255,255,255,0.96)", letterSpacing: "-0.02em" }}>63,779</span>
              </div>
              <p className="text-[14px] mb-5" style={{ color: "rgba(255,255,255,0.50)" }}>cross-references woven through one Book</p>

              {/* Three stats */}
              <div className="flex gap-0 mb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {[
                  { value: "66", label: "books" },
                  { value: "~40", label: "authors" },
                  { value: "1,500", label: "years written" },
                ].map(({ value, label }, i) => (
                  <div key={i} className="flex-1 text-center py-3.5" style={{ borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                    <p className="text-[22px] font-extrabold leading-none mb-1" style={{ color: "rgba(192,132,252,0.95)" }}>{value}</p>
                    <p className="text-[10.5px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.38)" }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* The argument */}
              <p className="path-reminder-quote text-[13.5px]" style={{ color: "rgba(255,255,255,0.72)" }}>
                "Shepherds, kings, fishermen — 40 authors who never met, writing across 15 centuries. Yet every thread points to the same story. No committee planned this."
              </p>
              <p className="text-[12px] mt-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
                Each arc above represents a real cross-reference in Scripture — short arcs in blue, long-range connections in red. The visualization was created by Chris Harrison and Christoph Römhild.
              </p>
            </div>
          </div>

          {/* ── Our Commitment to Scripture ── */}
          <div
            id="scripture-commitment-section"
            className="mt-8 rounded-2xl overflow-hidden scroll-mt-24"
            style={{ border: "1px solid rgba(212,165,116,0.22)" }}
          >

            {/* Bible hero image — acts as the toggle header */}
            <button
              data-testid="toggle-commitment"
              onClick={() => setCommitmentOpen(v => !v)}
              className="relative w-full block text-left focus:outline-none"
              style={{ height: "128px" }}
            >
              <img
                src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=700&q=72"
                alt="Open Bible"
                className="w-full h-full object-cover"
                style={{ objectPosition: "center 38%" }}
              />
              {/* Dark gradient so header text is legible */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,3,22,0.35) 0%, rgba(8,3,22,0.82) 100%)" }} />
              {/* Header text + chevron */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(212,165,116,0.85)" }} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.90)" }}>Our Commitment to Scripture</p>
                </div>
                <motion.div animate={{ rotate: commitmentOpen ? 180 : 0 }} transition={{ duration: 0.22 }}>
                  <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.55)" }} />
                </motion.div>
              </div>
            </button>

            {/* Collapsible body */}
            <AnimatePresence initial={false}>
              {commitmentOpen && (
                <motion.div
                  key="commitment-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(212,165,116,0.07) 0%, rgba(14,12,20,0.98) 48%)",
                  }}
                >
                  <div className="px-5 pt-4 pb-5">
                    <p
                      className="text-[14px] leading-relaxed mb-4"
                      style={{ color: "rgba(255,255,255,0.78)", fontFamily: "var(--font-serif, Georgia, serif)" }}
                    >
                      {SCRIPTURE_COMMITMENT_LEAD}
                    </p>
                    <div className="space-y-2.5">
                      {SCRIPTURE_COMMITMENT_LINES.map((line, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div
                            className="w-1 h-1 rounded-full mt-2 shrink-0"
                            style={{ background: "rgba(212,165,116,0.75)" }}
                          />
                          <p className="text-[13px] leading-snug" style={{ color: "rgba(255,255,255,0.82)" }}>
                            {line}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p
                      className="path-reminder-quote text-[14px] mt-4 pt-3 leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.75)", borderTop: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo;
                      <span className="block text-[11px] font-sans not-italic mt-1 tracking-wide text-white/45">
                        Psalm 119:105
                      </span>
                    </p>
                    <p className="text-center mt-3">
                      <Link
                        href="/alignment"
                        data-testid="link-commitment-alignment"
                        className="text-[12px] font-medium text-amber-200/70 hover:text-amber-100 underline underline-offset-2"
                      >
                        Read how we align with Scripture →
                      </Link>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Testimonials ── */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4 px-0.5">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-primary/30" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 shrink-0">What people are saying</p>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-primary/20 to-primary/30" />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mr-5 pr-5 snap-x snap-proximity scrollbar-none">
              {[
                {
                  quote: "I hadn't opened a Bible in fifteen years. This app doesn't make you feel behind. It just meets you. I've used it every morning for three months now.",
                  name: "Rachel M.",
                  descriptor: "Returning to faith",
                  stars: 5,
                },
                {
                  quote: "Talk It Through changed how I pray. I type what I'm actually feeling — even when I'm angry — and what comes back is scripture that fits. It's not a search engine. It's something else.",
                  name: "Marcus T.",
                  descriptor: "Daily user, 6 months",
                  stars: 5,
                },
                {
                  quote: "My husband passed in January. I found this app a week later. I don't have words for what it's meant to me during that time. It felt like someone was there.",
                  name: "Diane L.",
                  descriptor: "Pro subscriber",
                  stars: 5,
                },
                {
                  quote: "I'm skeptical of Christian apps. Most feel like a product. This one feels like it actually cares about where you are. I recommended it to my whole small group.",
                  name: "James K.",
                  descriptor: "Small group leader",
                  stars: 5,
                },
              ].map(({ quote, name, descriptor, stars }, i) => (
                <div
                  key={i}
                  data-testid={`testimonial-${i}`}
                  className="rounded-2xl border border-border/40 bg-card/40 px-4 py-4 shrink-0 w-[78vw] max-w-[300px] snap-start"
                >
                  <div className="flex items-center gap-0.5 mb-2.5">
                    {Array.from({ length: stars }).map((_, s) => (
                      <svg key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-[13.5px] text-foreground/90 leading-relaxed mb-3 italic">"{quote}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground leading-none">{name}</p>
                      <p className="text-[11px] text-muted-foreground/70 leading-none mt-0.5">{descriptor}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
          )}

          </div>

        </motion.div>


        {/* Footer — readable column width on wide screens */}
        <motion.div
          initial={inNativeApp ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: inNativeApp ? 0 : 0.7 }}
          className="mt-10 sm:mt-12 pb-2 max-w-xl mx-auto w-full"
        >
          <HomeDailyEmailStatus
            anchorId={HOME_EMAIL_SUBSCRIBE_ANCHOR_ID}
            className="mb-8 sm:mb-10 scroll-mt-24 scroll-mb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
          >
            <HomeSectionLabel>Your daily email</HomeSectionLabel>
          </HomeDailyEmailStatus>

          <FaqSection />

          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mb-6 sm:mb-7" />

          <nav
            aria-label="Site links"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              columnGap: "16px",
              rowGap: "4px",
              fontSize: "14px",
              textAlign: "center",
              marginBottom: "20px",
              paddingLeft: "8px",
              paddingRight: "8px",
            }}
          >
            {(
              [
                ["/pricing", "Plans & Pricing", "link-pricing-footer", undefined] as const,
                ["/about", "About", "link-about-footer", undefined] as const,
                ["/salvation", "Beginning with Jesus", "link-salvation-footer", "rgba(251, 113, 133, 0.90)"] as const,
                ["/greatest-gift", "The Greatest Gift", "link-greatest-gift-footer", "rgba(251, 191, 36, 0.90)"] as const,
                ["/prayer-wall", "Prayer Wall", "link-prayer-wall-footer", undefined] as const,
                ["/how-to-use", "How to Use", "link-how-to-use-footer", undefined] as const,
                ["/privacy", "Privacy Policy", "link-privacy-footer", undefined] as const,
                ["/terms", "Terms", "link-terms-footer", undefined] as const,
              ]
            ).map(([href, label, testId, accentColor]) => (
              <Link
                key={href}
                href={href}
                data-testid={testId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  padding: "8px 4px",
                  color: accentColor ?? "rgba(237, 232, 224, 0.75)",
                  textDecoration: "none",
                  fontWeight: accentColor ? 600 : 400,
                }}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/display"
              data-testid="link-display-footer"
              style={{
                gridColumn: "span 2 / span 2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "44px",
                padding: "8px 4px",
                color: "rgba(237, 232, 224, 0.75)",
                textDecoration: "none",
              }}
            >
              Scripture Display Mode
            </Link>
          </nav>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "center",
              gap: "8px",
              fontSize: "14px",
              color: "rgba(237, 232, 224, 0.65)",
              marginBottom: "8px",
              paddingLeft: "8px",
              paddingRight: "8px",
            }}
          >
            <Link
              href="/support"
              data-testid="link-support-footer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "44px",
                color: "rgba(237, 232, 224, 0.65)",
                textDecoration: "none",
              }}
            >
              Contact Support
            </Link>
            <Link
              href="/feedback"
              data-testid="link-feedback-footer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "44px",
                fontWeight: 500,
                color: "rgba(237, 232, 224, 0.65)",
                textDecoration: "none",
              }}
            >
              Share Feedback
            </Link>
            <button
              type="button"
              onClick={handleShareApp}
              data-testid="btn-share-app-footer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                minHeight: "44px",
                border: "none",
                background: "transparent",
                color: "rgba(237, 232, 224, 0.65)",
                fontSize: "14px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {shared ? (
                <>
                  <Check style={{ width: 16, height: 16, color: "#22c55e" }} aria-hidden />
                  Shared!
                </>
              ) : (
                <>
                  <Share2 style={{ width: 16, height: 16 }} aria-hidden />
                  Share App
                </>
              )}
            </button>
          </div>

          {/* ── Closing sequence: Manifesto → Scripture → Download ── */}
          <ClosingManifesto />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              padding: "0 20px",
              marginTop: "-8px",
              marginBottom: "32px",
              maxWidth: "28rem",
              marginLeft: "auto",
              marginRight: "auto",
              width: "100%",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "rgba(237,232,224,0.70)",
                width: "100%",
                margin: 0,
              }}
            >
              A reminder for the path
            </p>
            <p
              className="path-reminder-quote"
              style={{
                fontSize: "17px",
                color: "rgba(237,232,224,0.88)",
                textAlign: "center",
                width: "100%",
                maxWidth: "22rem",
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo;
            </p>
            <p style={{ fontSize: "13px", color: "rgba(237,232,224,0.60)", fontWeight: 500, width: "100%", margin: 0 }}>
              — Psalm 119:105
            </p>
          </div>

          {!inNativeApp && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                padding: "0 20px",
                marginBottom: "8px",
                maxWidth: "28rem",
                marginLeft: "auto",
                marginRight: "auto",
                width: "100%",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: "15px", color: "rgba(237,232,224,0.65)", letterSpacing: "0.02em", width: "100%", margin: 0 }}>
                If you want it with you —
              </p>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%", maxWidth: "20rem" }}>
                {!isAndroid() && (
                  <a
                    href="https://apps.apple.com/app/shepherds-path/id6760953522"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="btn-appstore-cta"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      width: "100%",
                      padding: "14px 20px",
                      minHeight: "48px",
                      borderRadius: "12px",
                      backgroundColor: "#ede8e0",
                      color: "#0d0612",
                      fontWeight: 600,
                      fontSize: "15px",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: "currentColor", flexShrink: 0 }} aria-hidden="true">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    View on the App Store
                  </a>
                )}
                {!isIOS() && (
                  <a
                    href="https://play.google.com/store/apps/details?id=com.shepherdspath.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="btn-googleplay-cta"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      width: "100%",
                      padding: "14px 20px",
                      minHeight: "48px",
                      borderRadius: "12px",
                      border: "1px solid rgba(196,78,224,0.30)",
                      backgroundColor: "rgba(196,78,224,0.10)",
                      color: "#ede8e0",
                      fontWeight: 600,
                      fontSize: "15px",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: "currentColor", flexShrink: 0 }} aria-hidden="true">
                      <path d="M3.18 23.76c.3.17.65.19.97.08l12.49-7.21-2.65-2.65-10.81 9.78zM.35 1.33C.13 1.67 0 2.12 0 2.67v18.66c0 .55.13 1 .35 1.34l.07.07 10.46-10.46v-.25L.42 1.26l-.07.07zM20.69 10.23l-2.83-1.63-2.97 2.97 2.97 2.97 2.84-1.63c.81-.47.81-1.22-.01-1.68zM3.18.24L15.67 7.45l-2.65 2.65L2.21.32c.32-.1.67-.08.97.08v-.16z"/>
                    </svg>
                    View on Google Play
                  </a>
                )}
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: inNativeApp ? "24px" : "40px",
              paddingTop: "24px",
              borderTop: "1px solid rgba(255,255,255,0.10)",
              width: "100%",
              maxWidth: "28rem",
              marginLeft: "auto",
              marginRight: "auto",
              textAlign: "center",
              paddingBottom: "max(6.5rem, calc(5.5rem + env(safe-area-inset-bottom, 0px)))",
            }}
          >
            {!inNativeApp && <ExternalPromoLinks variant="footer" />}
            <p style={{ fontSize: "13px", color: "rgba(237,232,224,0.55)", lineHeight: 1.5, padding: "0 16px", width: "100%", margin: 0 }}>
              © {new Date().getFullYear()} Shepherd&apos;s Path. All rights reserved.
            </p>
            <a
              href="https://www.shepherdspathai.com"
              style={{
                fontSize: "13px",
                color: "rgba(237,232,224,0.50)",
                textDecoration: "none",
                letterSpacing: "0.02em",
                padding: "4px 16px",
              }}
            >
              shepherdspathai.com
            </a>
          </div>
        </motion.div>
      </div>

    </div>
  );
}

export default function LandingHome() {
  if (!isReturningHome()) {
    // Returning user triggering a daily check-in replay → existing threshold flow
    if (isThresholdReplay()) return <Redirect to="/threshold" />;
    // Brand-new user who has never completed onboarding → new elegant onboarding
    if (!isThresholdComplete()) return <Redirect to="/welcome" />;
  }
  if (shouldRedirectToNightShepherd()) {
    return <Redirect to="/night" />;
  }
  return <LandingHomeInner />;
}
