import { useState, useRef, useEffect } from "react";
import { isIOS } from "@/lib/platform";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Sunrise, Swords, Compass, BookOpen, ArrowRight, ShieldCheck, ChevronDown, ChevronRight, Check, Share2, Flame, Sparkles, Mic, MicOff, Star, Smartphone, Download, Zap, SlidersHorizontal, BookMarked, HandHeart, Heart, Gift, Users, Volume2, Play, Trophy, Moon } from "lucide-react";
import { DailyArtCard } from "@/components/DailyArtCard";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { useWelcomeOverlay } from "@/hooks/use-welcome-overlay";
import { SplashScreen, shouldShowSplash } from "@/components/SplashScreen";
import { WEEK_LABELS, getCurrentWeekDates, getTodayIndex } from "@/components/StreakWidget";
import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { useDemoMode } from "@/components/DemoProvider";
import { canUseAi, recordAiUsage } from "@/lib/aiUsage";
import { AiPauseModal } from "@/components/AiPauseModal";
import { streamAI } from "@/lib/streamAI";
import { getUserName } from "@/lib/userName";
import {
  getRhythm, markFirstAction, hasFirstAction,
  getRhythmDismissed, incrementRhythmDismissed,
  getRecommendedJourneyId, getJourneyName, getDailyVerse, getPrayerPrompt,
  FOCUS_LABELS, type FaithRhythm,
} from "@/lib/faithRhythm";
import { FaithRhythmSetup } from "@/components/FaithRhythmSetup";
import { GuidedWalkthrough, shouldShowWalkthrough, recordWalkthroughVisit } from "@/components/GuidedWalkthrough";
import { isProVerifiedLocally, isProNudgeDismissed, dismissProNudge } from "@/lib/proStatus";
import {
  GreetingHeader, ReturningUserCard, GratitudePromptCard,
  CheckinCard, ShareVerseButton, SundaySummaryCard, FrameworkDayCard,
  FirstStepsCard, WeeklyReflectionCard, NotificationNudgeCard, LateNightBannerCard,
  WalkMilestoneCard,
} from "@/components/EngagementCards";
import { setLastOpenDate } from "@/lib/engagementCards";
import { isLateNight } from "@/lib/nightMode";
import { HomeEntryScreen, shouldShowHomeEntry, markEntryShown } from "@/components/HomeEntryScreen";

const logoSmall = "/logo-mark-white.png";
const logoWhite = "/logo-mark-white.png";
const logoLarge = "/logo-mark-white.png";

const sections = [
  {
    href: "/understand",
    icon: Compass,
    pillText: "Choose Your Journey",
    title: "Bible Journeys",
    description: "Guided paths through Scripture — the Psalms, the Life of Jesus, Lent, the Sermon on the Mount, and more. Each one takes you deeper.",
    cta: "Explore Journeys",
    testid: "card-understand",
    imageBg: "bg-gradient-to-br from-indigo-500/10 to-violet-500/5",
    border: "border-indigo-900/10",
    iconColor: "text-indigo-500",
    pillClass: "bg-indigo-500/10 text-indigo-600",
    accentGradient: "bg-gradient-to-b from-indigo-400 to-violet-500",
    iconBg: "bg-gradient-to-br from-indigo-100 to-violet-50",
    iconShadow: "shadow-indigo-200/60",
    photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=700&q=70&auto=format&fit=crop",
  },
  {
    href: "/read",
    icon: BookOpen,
    pillText: "Full Bible",
    title: "Read the Bible",
    description: "Read Genesis to Revelation in KJV, WEB, or ASV — with AI available for context, explanation, and reflection.",
    cta: "Start Reading",
    testid: "card-read",
    imageBg: "bg-gradient-to-br from-amber-500/10 to-orange-500/5",
    border: "border-amber-900/10",
    iconColor: "text-amber-500",
    pillClass: "bg-amber-500/10 text-amber-600",
    accentGradient: "bg-gradient-to-b from-amber-400 to-orange-500",
    iconBg: "bg-gradient-to-br from-amber-100 to-orange-50",
    iconShadow: "shadow-amber-200/60",
    photo: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=700&q=70&auto=format&fit=crop",
  },
];

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


function HeroAIPrompt() {
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const hasSpeechSupport = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const dayPlaceholders = [
    "I'm going through a divorce and I don't know how to move forward…",
    "I just lost someone I love and I'm struggling to find peace…",
    "I'm battling anxiety and my faith feels weak right now…",
    "My marriage is falling apart and I don't know where to turn…",
    "I feel distant from God and I'm not sure why…",
    "I'm facing a health diagnosis and I'm scared…",
    "I lost my job and I'm not sure what God is doing…",
    "I'm carrying grief that no one around me seems to understand…",
  ];
  const nightPlaceholders = [
    "I can't sleep — something is weighing on me tonight…",
    "It's late and I feel completely alone right now…",
    "I don't know how to pray, but I need something tonight…",
    "Something is keeping me up and I don't know where else to go…",
    "My mind won't stop — I'm looking for some peace…",
    "I'm scared and it's late and I just need some comfort…",
  ];
  const placeholders = isLateNight() ? nightPlaceholders : dayPlaceholders;

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIndex(i => (i + 1) % placeholders.length);
        setPlaceholderVisible(true);
      }, 400);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handler(e: CustomEvent<{ text: string }>) {
      setQuery(e.detail.text);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    window.addEventListener("sp-fill-prompt", handler as EventListener);
    return () => window.removeEventListener("sp-fill-prompt", handler as EventListener);
  }, []);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setQuery(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        inputRef.current?.focus();
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    markFirstAction();
    navigate(`/guidance?situation=${encodeURIComponent(query.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (query.trim()) navigate(`/guidance?situation=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden mb-1 shadow-lg shadow-primary/15 border border-primary/20"
    >
      {/* Colored header band */}
      <div className="px-5 py-3.5 flex items-center gap-2.5" style={{ background: "linear-gradient(135deg, hsl(258 42% 32%), hsl(258 38% 42%))" }}>
        <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white/90" />
        </div>
        <span className="text-[14px] font-bold text-white" style={{ letterSpacing: "0.01em" }}>Talk It Through</span>
      </div>

      <div className="px-5 pt-4 pb-5 bg-card">


        {/* Section 1 — open question */}
        <form onSubmit={handleSubmit}>
          <div className="relative rounded-xl border border-amber-400/30 bg-background focus-within:ring-2 focus-within:ring-amber-400/40 focus-within:border-amber-400/70 transition-all overflow-hidden shadow-sm">
            {/* Textarea */}
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck
              autoCapitalize="sentences"
              autoCorrect="on"
              autoComplete="off"
              ref={inputRef}
              data-testid="hero-ai-input"
              rows={4}
              className="w-full bg-transparent px-4 pt-3 pb-2 text-[15px] text-foreground outline-none resize-none leading-relaxed"
            />
            {/* Animated placeholder overlay */}
            {!query && (
              <span
                className="absolute left-4 top-3 text-[15px] text-muted-foreground pointer-events-none leading-relaxed transition-opacity duration-300"
                style={{ opacity: placeholderVisible ? 1 : 0, right: "0.75rem" }}
              >
                {placeholders[placeholderIndex]}
              </span>
            )}
            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-2 pb-2">
              {hasSpeechSupport ? (
                <button
                  type="button"
                  onClick={toggleVoice}
                  data-testid="button-voice-input"
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all relative"
                  style={{ color: isListening ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}
                >
                  {isListening
                    ? <MicOff className="w-4 h-4" />
                    : <Mic className="w-4 h-4 opacity-60 hover:opacity-90" />
                  }
                  {isListening && (
                    <span className="absolute inset-0 rounded-lg animate-ping bg-red-400/20" />
                  )}
                </button>
              ) : <span />}
              <button
                type="submit"
                disabled={!query.trim()}
                data-testid="hero-ai-submit"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-amber-950 disabled:opacity-50 transition-all shadow-md shadow-amber-400/50"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>

        {/* Situation chips — secondary helper, not the preferred path */}
        <div className="mt-3">
          <p className="text-[11px] text-muted-foreground/70 mb-2 px-0.5">
            Not sure where to start? Tap one to fill in a starting point — then make it your own.
          </p>
          <div className="relative">
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
            {[
              { label: "I'm carrying grief",         fill: "I'm grieving the loss of someone I love and I don't know how to process the pain…" },
              { label: "I'm facing something in my marriage",    fill: "My marriage is struggling and I don't know where to turn…" },
              { label: "I feel distant from God", fill: "I feel distant from God lately and I'm not sure why…" },
              { label: "I'm struggling with anxiety",      fill: "I'm battling anxiety and my faith feels weak right now…" },
              { label: "I'm facing something with my health",      fill: "I'm facing a health challenge and I'm scared about what comes next…" },
              { label: "I'm searching for direction",        fill: "I need direction for my life and I'm not sure which way to go…" },
              { label: "I'm under financial pressure",       fill: "I'm going through financial difficulty and I'm stressed and worried…" },
              { label: "I feel lost",          fill: "I feel lost and I'm struggling to find my purpose right now…" },
            ].map(({ label, fill }) => (
              <button
                key={label}
                type="button"
                data-testid={`chip-situation-${label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => {
                  setQuery(fill);
                  inputRef.current?.focus();
                }}
                className="shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-foreground/60 hover:bg-primary/10 hover:text-foreground/80 hover:border-primary/35 active:scale-95 transition-all"
              >
                {label}
              </button>
            ))}
            </div>
            {/* Fade + chevron — signals more chips to the right */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 flex items-center justify-end"
              style={{ background: "linear-gradient(to right, transparent, hsl(var(--card)) 75%)" }}>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 mr-0.5" />
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

function DevotionalCard() {
  const sessionId = getSessionId();
  const { data } = useQuery<{ currentStreak: number; longestStreak: number; visitDates: string[] }>({
    queryKey: ["/api/streak", sessionId],
    queryFn: () => fetch(`/api/streak?sessionId=${sessionId}`).then(r => r.json()),
    staleTime: 60_000,
  });

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

  return (
    <Link href="/devotional">
      <div
        data-testid="card-devotional"
        className="group relative rounded-2xl border border-teal-900/10 bg-card p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
      >
        <img
          src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=700&q=70&auto=format&fit=crop"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.32] pointer-events-none select-none"
          style={{ filter: "saturate(0.75) brightness(1.05)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-emerald-500/8 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/70 via-transparent to-transparent pointer-events-none" />
        {/* Left accent strip */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-teal-400 to-emerald-500 opacity-70 rounded-l-2xl" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-teal-100 to-emerald-50 shadow-sm shadow-teal-200/60">
            <Sun className="w-5 h-5 text-teal-500" />
          </div>
          <div className="flex-1 min-w-0 py-0.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600">
                Daily
              </span>
              {visitedToday && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" strokeWidth={3} /> Done today
                </span>
              )}
            </div>
            <h2 className="text-[17px] font-bold text-foreground mb-1 leading-tight tracking-tight">
              Daily Devotional
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Each day brings a new scripture, a personal reflection, and an AI-guided moment to hear from God — grounded in the actual passage, shaped for your real life. Open it, sit with it, let it speak.
            </p>
            <div className="flex items-center gap-1.5 mt-3.5 text-sm font-semibold text-teal-500 group-hover:gap-2.5 transition-all">
              {visitedToday ? "Continue today's devotional" : "Sit with today's message"}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

        {/* Horizontal week tracker */}
        <div className="relative z-10 mt-4 pt-3 border-t border-teal-900/8">
          <div className="flex items-end justify-center gap-3">
            <div className="flex items-end gap-2.5">
              {WEEK_LABELS.map((label, i) => {
                const date = weekDates[i];
                const visited = visitSet.has(date);
                const isToday = i === todayIdx;
                const isFuture = i > todayIdx;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className={`text-[9px] font-bold uppercase leading-none ${isToday ? "text-teal-600 dark:text-teal-400" : visited ? "text-teal-500/60" : "text-muted-foreground/25"}`}>
                      {label}
                    </span>
                    <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all ${
                      visited && isToday
                        ? "bg-teal-500 shadow-sm shadow-teal-400/50"
                        : visited
                        ? "bg-teal-50 dark:bg-teal-900/30 border border-teal-300/70 dark:border-teal-700/50"
                        : isToday
                        ? "border-2 border-teal-400/60 bg-teal-50/50"
                        : isFuture
                        ? "border border-muted-foreground/10"
                        : "border border-muted-foreground/12 bg-muted/10"
                    }`}>
                      {visited && isToday && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      {visited && !isToday && <Check className="w-2.5 h-2.5 text-teal-400" strokeWidth={3} />}
                      {isToday && !visited && <div className="w-1.5 h-1.5 rounded-full bg-teal-400/50" />}
                    </div>
                  </div>
                );
              })}
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1 pb-0.5">
                {streak >= 7
                  ? <Flame className="w-3.5 h-3.5 text-amber-500" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                }
                <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">{streak}d</span>
              </div>
            )}
          </div>
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
    q: 'What is "Bible in a Year"?',
    a: "A daily path through all of Scripture, broken into manageable readings. You follow the plan at your own pace — there's no pressure to stay on a schedule. If you miss a day, you simply continue from where you left off.",
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
    a: 'Yes. Shepherd\'s Path is available on iOS through the App Store. An Android version is coming soon. You can also add it to your home screen from your browser — tap the share button and choose "Add to Home Screen" — for a native app feel.',
  },
  {
    q: "Where do I begin?",
    a: "Wherever feels right. Most people start with the Devotional — it's the gentlest entry point. Or open Talk It Through. Or step into a Journey. There's no wrong door. The app is designed so any place you start is the right place.",
  },
];

const FAQ_INITIAL_COUNT = 5;

function FaqItem({ item, index, open, setOpen }: { item: { q: string; a: string }; index: number; open: number | null; setOpen: (i: number | null) => void }) {
  return (
    <div className="border border-border/40 rounded-2xl overflow-hidden bg-card/40">
      <button
        data-testid={`faq-toggle-${index}`}
        onClick={() => setOpen(open === index ? null : index)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-[13px] font-semibold text-foreground leading-snug">{item.q}</span>
        <motion.div
          animate={{ rotate: open === index ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open === index && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p
              data-testid={`faq-answer-${index}`}
              className="px-4 pb-4 text-[13px] text-foreground/80 leading-relaxed"
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
    <div className="px-0 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/80 shrink-0">Questions people ask</p>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border/60 to-transparent" />
      </div>
      <div className="space-y-1">
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
          data-testid="button-faq-show-more"
          onClick={() => setShowAll(true)}
          className="mt-3 w-full py-3 rounded-2xl border border-border/40 bg-card/30 text-[13px] text-muted-foreground/80 hover:text-foreground hover:bg-card/60 transition-colors flex items-center justify-center gap-1.5"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          {remaining} more questions
        </button>
      )}
    </div>
  );
}

export default function LandingHome() {
  const [, navigate] = useLocation();
  const [showSplash, setShowSplash] = useState(() => shouldShowSplash());
  const [showEntryScreen, setShowEntryScreen] = useState(() => shouldShowHomeEntry());
  const [expanded, setExpanded] = useState(false);
  const [shared, setShared] = useState(false);
  const [rhythm, setRhythm] = useState<FaithRhythm | null>(() => getRhythm());
  const [showRhythmSetup, setShowRhythmSetup] = useState(false);
  const [rhythmDismissCount, setRhythmDismissCount] = useState(() => getRhythmDismissed());
  const [proNudgeHidden, setProNudgeHidden] = useState(() => isProNudgeDismissed());
  const { show: showWelcome, dismiss: dismissWelcome } = useWelcomeOverlay();
  const [showWalkthrough, setShowWalkthrough] = useState(() => shouldShowWalkthrough());
  useEffect(() => { recordWalkthroughVisit(); }, []);
  useEffect(() => {
    if (sessionStorage.getItem('scrollToExplore')) {
      sessionStorage.removeItem('scrollToExplore');
      setTimeout(() => {
        document.getElementById('explore-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }, []);
  // Passage finder state
  const [passageQuery, setPassageQuery] = useState("");
  const [passageResult, setPassageResult] = useState("");
  const [passageLoading, setPassageLoading] = useState(false);
  const [showAiPause, setShowAiPause] = useState(false);
  const [somethingElseOpen, setSomethingElseOpen] = useState(false);
  const [somethingElseText, setSomethingElseText] = useState("");

  const findPassage = async () => {
    const desc = passageQuery.trim();
    if (!desc || passageLoading) return;
    if (!canUseAi()) { setShowAiPause(true); return; }
    recordAiUsage();
    setPassageLoading(true);
    setPassageResult("");
    try {
      const result = await streamAI(
        "/api/chat/passage",
        {
          passageRef: "story-finder",
          passageText: desc,
          userName: getUserName() ?? undefined,
          sessionId: getSessionId(),
          daysWithApp: getRelationshipAge(),
          messages: [{
            role: "user",
            content: `A user is trying to find a Bible story, passage, or verse they remember. They described it as:\n\n"${desc}"\n\nYour job is to identify the scripture(s) that best match this description. For each match, provide:\n- **Story/Passage Name** (the common title)\n- **Reference** (e.g. John 6:1–14; also note parallel passages)\n- **Why it matches** (1 sentence)\n- **Key Verse** (the single most memorable line)\n\nProvide 1–3 matches. Be warm, clear, and helpful. End with an encouraging sentence.`,
          }],
        },
        (text) => setPassageResult(text),
      );
      setPassageResult(result);
    } catch {
      setPassageResult("Sorry, we couldn't search right now. Please try again.");
    }
    setPassageLoading(false);
  };
  const demo = useDemoMode();

  const sessionId = getSessionId();
  const { data: streakData } = useQuery<{ currentStreak: number; visitDates: string[] }>({
    queryKey: ["/api/streak", sessionId],
    queryFn: () => fetch(`/api/streak?sessionId=${sessionId}`).then(r => r.json()),
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
  const isPro = isProVerifiedLocally();
  const showProNudge = !!rhythm && streak >= 3 && !isPro && !proNudgeHidden && !demo?.config.isDemo;

  useEffect(() => { setLastOpenDate(); }, []);

  const handleProNudgeDismiss = () => {
    dismissProNudge();
    setProNudgeHidden(true);
  };

  const handleShareApp = async () => {
    const shareData = {
      title: "Shepherd's Path",
      text: "Your daily walk with Jesus — AI-guided devotionals, Bible journeys, prayer & more.",
      url: "https://www.shepherdspathai.com",
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch { }
  };

  const focusHeroInput = () => {
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('[data-testid="hero-ai-input"]');
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus();
    }, 600);
  };

  const handleDismissWelcome = () => {
    dismissWelcome();
    markEntryShown();
    setShowEntryScreen(false);
    focusHeroInput();
  };

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatePresence>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showWelcome && <WelcomeOverlay onDismiss={handleDismissWelcome} />}
      </AnimatePresence>
      {showEntryScreen && <HomeEntryScreen onDismiss={() => { setShowEntryScreen(false); window.scrollTo({ top: 0, behavior: "instant" }); }} />}
      <AnimatePresence>
        {showRhythmSetup && (
          <FaithRhythmSetup onDone={handleRhythmDone} onDismiss={handleRhythmDismiss} />
        )}
      </AnimatePresence>

      {/* Hero section */}
      <div className="relative h-[56vh] min-h-[360px] max-h-[560px] overflow-hidden">
        <img
          src="/hero-landing.webp"
          alt="A road cresting a green hill toward golden light"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center center" }}
        />
        <div className="absolute inset-0" style={{background: "linear-gradient(to bottom, rgba(10,8,24,0.22) 0%, rgba(10,8,24,0.08) 38%, rgba(10,8,24,0.52) 100%)"}} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        {/* Share — top right of hero */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
          <button
            onClick={handleShareApp}
            data-testid="btn-share-hero"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white/85 text-[11px] font-semibold hover:bg-black/45 active:scale-95 transition-all"
            style={{ letterSpacing: "0.04em" }}
          >
            {shared
              ? <><Check className="w-3 h-3 text-green-400" /> Copied!</>
              : <><Share2 className="w-3 h-3" /> Share</>
            }
          </button>
        </div>

        {/* Hero text */}
        <div className="relative z-10 flex flex-col items-start justify-center h-full text-left px-5 pl-8 sm:pl-14 pb-14 sm:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col items-start leading-none mb-3 select-none">
              <span className="text-white mb-1" style={{ fontFamily: "var(--font-decorative)", fontWeight: 400, fontSize: "clamp(1.25rem, 4vw, 1.5rem)", letterSpacing: "0.24em", textTransform: "uppercase", textShadow: "0 1px 6px rgba(0,0,0,0.9), 0 2px 20px rgba(0,0,0,0.7)" }}>Shepherd's</span>
              <span className="text-white font-black leading-none drop-shadow-lg" style={{ fontSize: "clamp(2.8rem, 11vw, 4.5rem)", letterSpacing: "-0.02em", fontStyle: "italic", textShadow: "0 2px 24px rgba(0,0,0,0.4)" }}>PATH</span>
            </div>
            <p className="text-white/90 drop-shadow mt-2" style={{ fontFamily: "var(--font-decorative)", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(1.1rem, 4vw, 1.65rem)", letterSpacing: "0.01em" }}>
              You don't have to walk this alone.
            </p>

            {demo?.config.isDemo && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                <span className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">For</span>
                <span className="text-white text-[12px] font-bold">{demo.config.churchName}</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Ambient grass — blurred hero image bleeds into side margins on wide screens */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-x-0 bottom-0"
        style={{ top: "56vh", zIndex: 1 }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/hero-landing.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center 18%",
            filter: "blur(6px)",
            opacity: 0.32,
            transform: "scale(1.04)",
          }}
        />
      </div>

      {/* Section cards */}
      <div className="max-w-xl md:max-w-4xl mx-auto px-4 pb-20 relative z-10 -mt-16 sm:-mt-20">

        {/* Side logo watermarks — near inner edge of each margin, aligned with lower card row */}
        <div className="hidden xl:block absolute pointer-events-none select-none" style={{ left: "calc((100% - 100vw) / 4 - 72px)", top: "30%", transform: "translateY(-50%)" }} aria-hidden="true">
          <img src={logoLarge} alt="" className="w-36 h-36 object-contain rounded-3xl" style={{ opacity: 0.06 }} />
        </div>
        <div className="hidden xl:block absolute pointer-events-none select-none" style={{ right: "calc((100% - 100vw) / 4 - 72px)", top: "30%", transform: "translateY(-50%)" }} aria-hidden="true">
          <img src={logoLarge} alt="" className="w-36 h-36 object-contain rounded-3xl" style={{ opacity: 0.06 }} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-3"
        >
          {/* Time-aware greeting */}
          <GreetingHeader />

          {/* ══ FOR YOU ══ */}
          <div className="flex flex-col gap-3">

          {/* Guided walkthrough — passive entry, shows for first few visits */}
          <AnimatePresence>
            {showWalkthrough && (
              <GuidedWalkthrough onDismiss={() => setShowWalkthrough(false)} />
            )}
          </AnimatePresence>

          {/* Late-night presence banner — replaces energetic cards between 11pm–5am */}
          <LateNightBannerCard />

          {/* Walk milestone — grounding acknowledgment at 30/60/100 days */}
          <WalkMilestoneCard daysWithApp={getRelationshipAge()} />

          {/* Returning-user grace card */}
          <ReturningUserCard />

          {/* Notification nudge — shown once to users who haven't enabled reminders */}
          <NotificationNudgeCard />

          {/* ── HERO: Talk It Through prompt — primary entry point ── */}
          <HeroAIPrompt />

          {/* Quick-select chips — horizontal scroll strip */}
          {!isLateNight() && (
            <div className="relative rounded-2xl border border-primary/15 bg-card overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/40 via-violet-500/40 to-primary/40" />
              <div className="px-4 pt-3.5 pb-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60 mb-2.5">
                  Where are you today?
                </p>

                {/* Scrollable chip row — no emojis, icon + label pills */}
                <div className="relative">
                <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  {([
                    { icon: <Zap  className="w-3.5 h-3.5 flex-shrink-0" />, label: "Anxiety",      query: "I'm feeling anxious and overwhelmed and need God's peace" },
                    { icon: <Heart className="w-3.5 h-3.5 flex-shrink-0" />, label: "Grief",       query: "I'm grieving a loss and need God's comfort right now" },
                    { icon: <Moon className="w-3.5 h-3.5 flex-shrink-0" />,  label: "Loneliness", query: "I'm feeling deeply lonely and disconnected and need God's presence" },
                    { icon: <Flame className="w-3.5 h-3.5 flex-shrink-0" />, label: "Anger",       query: "I'm struggling with anger and frustration and need God's guidance" },
                    { icon: <Users className="w-3.5 h-3.5 flex-shrink-0" />, label: "Relationship",query: "I'm struggling in an important relationship and need wisdom from God" },
                  ] as const).map(({ icon, label, query }) => (
                    <button
                      key={label}
                      data-testid={`emotion-card-${label.toLowerCase()}`}
                      onClick={() => { markFirstAction(); navigate(`/guidance?situation=${encodeURIComponent(query)}`); }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-primary/20 bg-muted/30 hover:bg-primary/10 hover:border-primary/45 active:scale-[0.97] transition-all whitespace-nowrap flex-shrink-0 text-primary/75 hover:text-primary"
                    >
                      {icon}
                      <span className="text-[13px] font-semibold">{label}</span>
                    </button>
                  ))}

                  {/* Something else — expands inline input */}
                  <button
                    data-testid="emotion-card-something-else"
                    onClick={() => setSomethingElseOpen(v => !v)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border transition-all whitespace-nowrap flex-shrink-0 ${
                      somethingElseOpen
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-primary/20 bg-muted/30 hover:bg-primary/10 hover:border-primary/45 text-primary/75 hover:text-primary"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-[13px] font-semibold">Something else</span>
                  </button>
                </div>
                {/* Fade + chevron — signals more chips to the right */}
                <div className="pointer-events-none absolute inset-y-0 right-0 w-12 flex items-center justify-end"
                  style={{ background: "linear-gradient(to right, transparent, hsl(var(--card)) 75%)" }}>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 mr-0.5" />
                </div>
                </div>

                {/* Inline input — appears when "Something else" is tapped */}
                <AnimatePresence>
                  {somethingElseOpen && (
                    <motion.div
                      key="something-else-input"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden mt-3"
                    >
                      <div className="flex gap-2 items-end">
                        <textarea
                          autoFocus
                          value={somethingElseText}
                          onChange={e => setSomethingElseText(e.target.value)}
                          placeholder="Describe what you're carrying…"
                          rows={2}
                          data-testid="input-something-else"
                          className="flex-1 resize-none rounded-xl border border-primary/30 bg-background px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 leading-relaxed"
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey && somethingElseText.trim()) {
                              e.preventDefault();
                              markFirstAction();
                              navigate(`/guidance?situation=${encodeURIComponent(somethingElseText.trim())}`);
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            if (!somethingElseText.trim()) return;
                            markFirstAction();
                            navigate(`/guidance?situation=${encodeURIComponent(somethingElseText.trim())}`);
                          }}
                          disabled={!somethingElseText.trim()}
                          data-testid="button-something-else-submit"
                          className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-md shadow-amber-400/30 transition-all"
                        >
                          <ArrowRight className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Daily Devotional */}
          <DevotionalCard />

          {/* First Steps seeker card — shown to new users (days 1–7) */}
          <FirstStepsCard daysWithApp={getRelationshipAge()} />


          {/* Today's Rhythm card — shown once rhythm is set up */}
          {rhythm && (() => {
            const verse = getDailyVerse(rhythm.focus);
            const prayer = getPrayerPrompt(rhythm.focus);
            const journeyId = getRecommendedJourneyId(rhythm);
            const journeyName = getJourneyName(journeyId);
            const focusLabel = FOCUS_LABELS[rhythm.focus];
            return (
              <div className="relative rounded-2xl border border-primary/20 bg-card overflow-hidden shadow-sm">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-indigo-400" />
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-primary to-violet-500 opacity-70 rounded-l-2xl" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-violet-500/3 to-transparent pointer-events-none" />
                <div className="relative z-10 px-5 pt-4 pb-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-primary/12 flex items-center justify-center">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-[12px] font-bold uppercase tracking-widest text-primary/70">Your Rhythm Today</span>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/15">
                      Focused on {focusLabel}
                    </span>
                  </div>

                  {/* Today's verse */}
                  <div className="mb-3 px-3.5 py-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-[13px] font-bold uppercase tracking-widest text-primary/50 mb-1.5">Today's Word</p>
                    <p className="text-[14px] text-foreground leading-relaxed italic mb-1.5">
                      "{verse.text}"
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[12px] font-bold text-primary/60">— {verse.ref}</p>
                      <ShareVerseButton verseText={verse.text} verseRef={verse.ref} />
                    </div>
                  </div>

                  {/* Prayer + Journey — two columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                    <div className="px-3.5 py-3 rounded-xl bg-muted/50 border border-border/60">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <HandHeart className="w-3.5 h-3.5 text-primary/60" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Bring to Prayer</p>
                      </div>
                      <p className="text-[12px] text-foreground/75 leading-snug italic">
                        {prayer}
                      </p>
                    </div>
                    <Link href={`/understand?j=${journeyId}`}>
                      <div className="px-3.5 py-3 rounded-xl bg-muted/50 border border-border/60 hover:border-primary/25 hover:bg-primary/4 transition-all cursor-pointer h-full group">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <BookMarked className="w-3.5 h-3.5 text-primary/60" />
                          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Your Journey</p>
                        </div>
                        <p className="text-[12px] text-foreground/75 leading-snug font-semibold group-hover:text-primary transition-colors">
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
              </div>
            );
          })()}

          {/* Pro conversion nudge — shown at day 3+ streak, rhythm set, free user */}
          {showProNudge && (
            <div
              data-testid="card-pro-nudge"
              className="relative rounded-2xl overflow-hidden border border-amber-300/30 bg-card shadow-sm"
            >
              {/* Warm gradient top bar */}
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400" />
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-amber-400 to-orange-400 opacity-70 rounded-l-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 via-orange-400/3 to-transparent pointer-events-none" />

              <div className="relative z-10 px-5 pt-4 pb-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <span className="text-[12px] font-bold uppercase tracking-widest text-amber-600/80">
                        {streak} morning{streak !== 1 ? "s" : ""} with God
                      </span>
                    </div>
                    <h3 className="text-[16px] font-extrabold text-foreground leading-tight tracking-tight">
                      You're building something real.
                    </h3>
                    <p className="text-[13px] text-muted-foreground leading-snug mt-0.5">
                      Don't let anything interrupt it.
                    </p>
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

                {/* Feature bullets */}
                <div className="flex flex-col gap-1.5 mb-4">
                  {[
                    "Unlimited AI guidance — no daily cap",
                    "Streak protection — miss a day, keep your streak",
                    "Full access to all devotional themes",
                  ].map((point) => (
                    <div key={point} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500 mt-[2px] shrink-0" strokeWidth={3} />
                      <span className="text-[13px] text-foreground/80 leading-snug">{point}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link href="/pricing">
                  <div
                    data-testid="btn-pro-nudge-cta"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[14px] font-bold shadow-sm shadow-amber-500/30 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    See what Pro gives you
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>

                <p className="text-center text-[11px] text-muted-foreground/60 mt-2">
                  Starts at $3.75/month · Billed annually
                </p>
              </div>
            </div>
          )}

          {/* ── Personal reflection cards — daily/weekly touchpoints ── */}
          <CheckinCard />
          <GratitudePromptCard sessionId={sessionId} />
          <WeeklyReflectionCard />
          <SundaySummaryCard streak={streak} visitCount={streakData?.visitDates?.length ?? 0} />

          {/* ── Take a moment — closing grace note for the daily visit ── */}
          <div className="flex items-center gap-3 mt-4 px-0.5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-primary/30" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 shrink-0">Take a moment</p>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-primary/20 to-primary/30" />
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border relative">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-amber-400 z-10" />
            <DailyArtCard />
          </div>

          {/* ── Explore — all features ── */}
          <div id="explore-section" className="mt-2">
            <div className="flex items-center gap-3 mb-3 px-0.5">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-primary/30" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 shrink-0">Explore</p>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-primary/20 to-primary/30" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { href: "/salvation",    Icon: Sunrise,    label: "Beginning with Jesus",    desc: "Meet Jesus without pressure",               color: "text-amber-400",   bg: "border-amber-500/20  bg-amber-500/6",   testid: "explore-salvation" },
                { href: "/understand",   Icon: Compass,    label: "Bible Journeys",          desc: "Let Scripture meet you where you are",       color: "text-indigo-400",  bg: "border-indigo-500/20 bg-indigo-500/6",  testid: "explore-understand" },
                { href: "/journal",      Icon: BookMarked, label: "Prayer Journal",          desc: "A place for what you don't want to lose",    color: "text-teal-400",    bg: "border-teal-500/20   bg-teal-500/6",    testid: "explore-journal" },
                { href: "/iron-circle",  Icon: Swords,     label: "Iron Sharpens Iron",      desc: "Walk alongside others in faith",             color: "text-rose-400",    bg: "border-rose-500/20   bg-rose-500/6",    testid: "explore-iron-circle" },
                { href: "/prayer-wall",  Icon: HandHeart,  label: "Prayer Wall",             desc: "Lift someone up today",                      color: "text-sky-400",     bg: "border-sky-500/20    bg-sky-500/6",     testid: "explore-prayer-wall" },
                { href: "/reading-plans",Icon: Star,       label: "Bible in a Year",         desc: "One step at a time, through it all",          color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-500/6",testid: "explore-reading-plans" },
                { href: "/study",        Icon: Sparkles,   label: "Explore Scripture",       desc: "A question, a passage, or something on your mind", color: "text-amber-400", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-study" },
                { href: "/read",         Icon: BookOpen,   label: "Read the Bible",          desc: "KJV, WEB, and ASV",                          color: "text-amber-400",   bg: "border-amber-500/20  bg-amber-500/6",   testid: "explore-read" },
                { href: "/stories",      Icon: Play,       label: "Stories",                 desc: "Real testimonies of faith",                  color: "text-violet-400",  bg: "border-violet-500/20 bg-violet-500/6",  testid: "explore-stories" },
                { href: "/trivia",       Icon: Trophy,     label: "Bible Trivia",            desc: "A simple way to engage Scripture",            color: "text-violet-400",  bg: "border-violet-500/20 bg-violet-500/6",  testid: "explore-trivia" },
                { href: "/prayer-portrait", Icon: Heart,  label: "Prayer Portrait",         desc: "A prayer spoken over your life",              color: "text-amber-400",   bg: "border-amber-500/20  bg-amber-500/6",   testid: "explore-prayer-portrait" },
              ] as const).map(({ href, Icon, label, desc, color, bg, testid }) => (
                <Link key={href} href={href}>
                  <div
                    data-testid={`card-${testid}`}
                    className={`rounded-2xl border ${bg} p-3.5 cursor-pointer hover:brightness-110 active:scale-[0.97] transition-all h-full`}
                  >
                    <Icon className={`w-5 h-5 ${color} mb-2`} />
                    <p className="text-[13px] font-bold text-foreground leading-tight">{label}</p>
                    <p className="text-[11px] text-muted-foreground/65 mt-0.5 leading-snug">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          </div>

        </motion.div>


        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 pb-2"
        >
          {/* Brand pills — smaller so 2 fit per row on mobile */}
          <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-2 mb-4">
            {["Faith-rooted", "Scripture-grounded", "Built for daily life"].map((tag) => (
              <span key={tag} className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border border-border/60 bg-card/60 text-foreground/75">
                {tag}
              </span>
            ))}
          </div>

          <FaqSection />

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mb-4" />

          {/* Links — 2-col grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-foreground/70 text-center mb-2.5 px-4">
            <Link href="/pricing" className="hover:text-foreground transition-colors" data-testid="link-pricing-footer">
              Plans & Pricing
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors" data-testid="link-about-footer">
              About
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy-footer">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms-footer">
              Terms
            </Link>
            <Link href="/stories" className="hover:text-foreground transition-colors" data-testid="link-stories-footer">
              Stories
            </Link>
            <Link href="/store" className="hover:text-foreground transition-colors" data-testid="link-store-footer">
              Store
            </Link>
            <Link href="/reading-plans" className="hover:text-foreground transition-colors" data-testid="link-plans-footer">
              Bible in a Year
            </Link>
            <Link href="/salvation" className="hover:text-foreground transition-colors font-semibold text-rose-600/80 dark:text-rose-400/80" data-testid="link-salvation-footer">
              Beginning with Jesus
            </Link>
            <Link href="/prayer-wall" className="hover:text-foreground transition-colors" data-testid="link-prayer-wall-footer">
              Prayer Wall
            </Link>
            <Link href="/greatest-gift" className="hover:text-foreground transition-colors font-semibold text-amber-600/80 dark:text-amber-400/80" data-testid="link-greatest-gift-footer">
              The Greatest Gift
            </Link>
            <Link href="/trivia" className="hover:text-foreground transition-colors" data-testid="link-trivia-footer">
              Bible Trivia
            </Link>
            <Link href="/iron-circle" className="hover:text-foreground transition-colors" data-testid="link-iron-circle-footer">
              Iron Sharpens Iron
            </Link>
            <Link href="/study" className="hover:text-foreground transition-colors" data-testid="link-study-footer">
              Explore Scripture
            </Link>
            <Link href="/calling" className="hover:text-foreground transition-colors" data-testid="link-calling-footer">
              Share the Word
            </Link>
            <Link href="/how-to-use" className="hover:text-foreground transition-colors" data-testid="link-how-to-use-footer">
              How to Use
            </Link>
          </div>

          {/* Email + Share — stacked to avoid overflow */}
          <div className="flex flex-col items-center gap-1.5 text-sm text-foreground/70">
            <Link href="/support" className="hover:text-foreground transition-colors" data-testid="link-support-footer">
              Contact Support
            </Link>
            <button
              onClick={handleShareApp}
              data-testid="btn-share-app-footer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              {shared
                ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</>
                : <><Share2 className="w-3.5 h-3.5" /> Share App</>
              }
            </button>
          </div>

          <p className="text-[13px] text-foreground/50 text-center mt-4">
            © {new Date().getFullYear()} Shepherd's Path. All rights reserved.
          </p>
        </motion.div>
      </div>

      {showAiPause && <AiPauseModal onClose={() => setShowAiPause(false)} />}
    </div>
  );
}
