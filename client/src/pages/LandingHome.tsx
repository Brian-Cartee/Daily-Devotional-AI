import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Compass, BookOpen, ArrowRight, ShieldCheck, ChevronDown, Check, Share2, MessageCircle, Flame, Sparkles, Mic, MicOff, Star, Smartphone, Download, Zap } from "lucide-react";
import { DailyArtCard } from "@/components/DailyArtCard";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { useWelcomeOverlay } from "@/hooks/use-welcome-overlay";
import { NamePrompt } from "@/components/NamePrompt";
import { hasBeenPrompted } from "@/lib/userName";
import { WEEK_LABELS, getCurrentWeekDates, getTodayIndex } from "@/components/StreakWidget";
import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { useDemoMode } from "@/components/DemoProvider";
import { getRemainingAi } from "@/lib/aiUsage";

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

  const placeholders = [
    "I'm going through a divorce and I don't know how to move forward…",
    "I just lost someone I love and I'm struggling to find peace…",
    "I'm battling anxiety and my faith feels weak right now…",
    "My marriage is falling apart and I don't know where to turn…",
    "I feel distant from God and I'm not sure why…",
    "I'm facing a health diagnosis and I'm scared…",
    "I lost my job and I'm not sure what God is doing…",
    "I'm carrying grief that no one around me seems to understand…",
  ];

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
        <span className="text-[13px] font-semibold text-white/95" style={{ letterSpacing: "0.01em" }}>What are you carrying today?</span>
      </div>

      <div className="px-5 pt-4 pb-5 bg-card">


        {/* Section 1 — open question */}
        <form onSubmit={handleSubmit}>
          <div className="relative rounded-xl border border-border/50 bg-muted/40 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all overflow-hidden">
            {/* Textarea */}
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              data-testid="hero-ai-input"
              rows={3}
              className="w-full bg-transparent px-4 pt-3 pb-2 text-[15px] text-foreground outline-none resize-none leading-relaxed"
            />
            {/* Animated placeholder overlay */}
            {!query && (
              <span
                className="absolute left-4 top-3 text-[15px] text-muted-foreground/65 pointer-events-none leading-relaxed transition-opacity duration-300"
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
                    : <Mic className="w-4 h-4 opacity-50 hover:opacity-80" />
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
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white disabled:opacity-25 hover:bg-primary/90 transition-all shadow-sm shadow-primary/30"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Warm nudge — only when 1–3 responses remain, before the hard wall */}
        {(() => {
          const remaining = getRemainingAi();
          if (remaining > 3 || remaining <= 0 || remaining === Infinity) return null;
          return (
            <Link href="/pricing">
              <div className="mt-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 hover:bg-amber-500/12 transition-colors cursor-pointer group">
                <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-[12px] text-amber-800 dark:text-amber-300 leading-snug flex-1">
                  <span className="font-bold">{remaining} free {remaining === 1 ? "response" : "responses"} left today</span>
                  <span className="text-amber-700/70 dark:text-amber-400/70"> — Pro gives you unlimited, every day.</span>
                </p>
                <ArrowRight className="w-3 h-3 text-amber-600/60 dark:text-amber-400/60 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })()}

        {/* Situation chips — secondary helper, not the preferred path */}
        <div className="mt-3">
          <p className="text-[11px] text-muted-foreground/45 mb-2 px-0.5">
            Not sure where to start? Tap one to fill in a starting point — then make it your own.
          </p>
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {[
              { label: "I'm grieving",         fill: "I'm grieving the loss of someone I love and I don't know how to process the pain…" },
              { label: "Marriage struggles",    fill: "My marriage is struggling and I don't know where to turn…" },
              { label: "Feeling distant from God", fill: "I feel distant from God lately and I'm not sure why…" },
              { label: "Battling anxiety",      fill: "I'm battling anxiety and my faith feels weak right now…" },
              { label: "Health challenge",      fill: "I'm facing a health challenge and I'm scared about what comes next…" },
              { label: "Need direction",        fill: "I need direction for my life and I'm not sure which way to go…" },
              { label: "Job or finances",       fill: "I'm going through financial difficulty and I'm stressed and worried…" },
              { label: "Feeling lost",          fill: "I feel lost and I'm struggling to find my purpose right now…" },
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
              {visitedToday ? "Continue today's devotional" : "Open today's devotional"}
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
  "AI reflections are always grounded in the actual Bible passage being studied",
  "Nothing in this app is presented as equal to or a replacement for Scripture",
  "Content is shaped by the historic, orthodox Christian faith — not cultural opinion",
  "This commitment applies to every user and every church using this platform",
];

export default function LandingHome() {
  const [expanded, setExpanded] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [shared, setShared] = useState(false);
  const { show: showWelcome, dismiss: dismissWelcome } = useWelcomeOverlay();
  const demo = useDemoMode();

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
    if (!hasBeenPrompted()) {
      setTimeout(() => setShowNamePrompt(true), 400);
    } else {
      focusHeroInput();
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatePresence>
        {showWelcome && <WelcomeOverlay onDismiss={handleDismissWelcome} />}
      </AnimatePresence>
      <AnimatePresence>
        {showNamePrompt && <NamePrompt onDone={() => { setShowNamePrompt(false); focusHeroInput(); }} />}
      </AnimatePresence>

      {/* Hero section */}
      <div className="relative h-[56vh] min-h-[360px] max-h-[560px] overflow-hidden">
        <img
          src="/hero-landing.png"
          alt="A road cresting a green hill toward golden light"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center center" }}
        />
        <div className="absolute inset-0" style={{background: "linear-gradient(to bottom, rgba(10,8,24,0.22) 0%, rgba(10,8,24,0.08) 38%, rgba(10,8,24,0.52) 100%)"}} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        {/* Brand mark + Share — top right of hero */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-col items-end gap-2">
          <img
            src={logoSmall}
            alt=""
            aria-hidden="true"
            className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-contain pointer-events-none select-none"
            style={{ opacity: 0.48, filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.5))" }}
          />
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
            <div className="flex items-center justify-start gap-3 mb-3">
              <div className="h-px w-10 bg-white/40" />
              <span className="text-white/60 text-[11px]">✦</span>
              <div className="h-px w-10 bg-white/40" />
            </div>
            <p className="text-white/90 max-w-xs drop-shadow" style={{ fontFamily: "var(--font-decorative)", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(1.4rem, 5vw, 1.8rem)", letterSpacing: "0.01em" }}>
              Scripture for what you're going through.{" "}
              <span className="text-amber-300/70 not-italic" style={{ fontSize: "0.65em" }}>✝</span>
            </p>

            {/* Social proof — trust signal in first viewport */}
            {!demo?.config.isDemo && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-4 flex items-center gap-2"
              >
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-3 h-3 fill-amber-400 text-amber-400" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <span
                  className="text-white/70 font-medium"
                  style={{ fontSize: "11px", letterSpacing: "0.02em", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                >
                  Trusted by believers worldwide
                </span>
              </motion.div>
            )}

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
            backgroundImage: "url('/hero-landing.png')",
            backgroundSize: "cover",
            backgroundPosition: "center 18%",
            filter: "blur(6px)",
            opacity: 0.32,
            transform: "scale(1.04)",
          }}
        />
      </div>

      {/* Section cards */}
      <div className="max-w-xl md:max-w-4xl mx-auto px-5 pb-20 relative z-10 -mt-16 sm:-mt-20">

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
          {/* AI Prompt — hero entry point */}
          <HeroAIPrompt />

          {/* Daily Devotional — primary action */}
          <DevotionalCard />

          {/* Bible Journeys + Read — core content, moved up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map(({ href, icon: Icon, pillText, title, description, cta, testid, imageBg, border, iconColor, pillClass, accentGradient, iconBg, iconShadow, photo }) => (
            <Link key={href} href={href}>
              <div
                data-testid={testid}
                className={`group relative rounded-2xl border ${border} bg-card p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden h-full`}
              >
                {photo && (
                  <img
                    src={photo}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover opacity-[0.13] pointer-events-none select-none"
                  />
                )}
                <div className={`absolute inset-0 ${imageBg} pointer-events-none`} />
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentGradient} opacity-70 rounded-l-2xl`} />
                <img
                  src={logoWhite}
                  alt=""
                  aria-hidden="true"
                  className="absolute top-3 right-3 w-11 h-11 object-contain opacity-[0.18] pointer-events-none select-none"
                  
                />
                <div className="relative z-10 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} shadow-sm ${iconShadow}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-center justify-start gap-2 mb-1">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${pillClass} whitespace-nowrap`}>
                        {pillText}
                      </span>
                    </div>
                    <h2 className="text-[17px] font-bold text-foreground mb-1 leading-tight tracking-tight">
                      {title}
                    </h2>
                    <p className="text-[15px] text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                    <div className={`flex items-center gap-1.5 mt-3.5 text-sm font-semibold ${iconColor} group-hover:gap-2.5 transition-all`}>
                      {cta}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          </div>

        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10"
        >
          {/* Section header */}
          <div className="flex flex-col items-center gap-2 mb-5 px-0.5">
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-primary/30" />
              <div className="flex items-center gap-1.5 shrink-0">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-primary/20 to-primary/30" />
            </div>
            <p className="text-[13px] font-bold uppercase tracking-widest text-foreground/50">What people are saying</p>
          </div>

          {/* Featured spiritual guidance testimonial */}
          <div className="relative rounded-2xl overflow-hidden mb-3 border border-border bg-card shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-amber-400" />
            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/12 text-primary">Spiritual Guidance</span>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-[15px] text-foreground leading-relaxed italic font-medium mb-4">
                &ldquo;I was in the middle of the hardest season of my life and didn't know where to turn. I typed out what I was feeling and within seconds I had scripture that felt like it was written exactly for my situation. It wasn't generic — it was pastoral. I cried. I'm not embarrassed to say that.&rdquo;
              </p>
              <div className="flex items-center gap-2.5 pt-3 border-t border-border">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-[12px] font-bold text-primary">
                  M
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground leading-none">Marcus</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Spiritual Guidance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Second spiritual guidance testimonial */}
          <div className="relative rounded-2xl overflow-hidden mb-3 border border-border bg-card shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400 via-primary to-violet-500" />
            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/12 text-amber-700 dark:text-amber-400">Spiritual Guidance</span>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-[15px] text-foreground leading-relaxed italic font-medium mb-4">
                &ldquo;I typed three sentences about my marriage falling apart. What came back wasn't a list of verses or a church pamphlet — it sat with me in the pain first. It was honest and real and it felt like it was written for me specifically. No other app has ever done that.&rdquo;
              </p>
              <div className="flex items-center gap-2.5 pt-3 border-t border-border">
                <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-[12px] font-bold text-amber-700 dark:text-amber-400">
                  R
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground leading-none">Rachel</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Spiritual Guidance</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                quote: "I open Shepherd's Path before I even make coffee. The morning devotional sets a completely different tone for my day.",
                name: "Eric",
                detail: "Daily devotional",
                accentClass: "from-sky-400 to-primary",
                avatarBg: "bg-sky-500/15",
                avatarColor: "text-sky-700 dark:text-sky-400",
              },
              {
                quote: "I've been a Christian for 30 years, but these Bible journeys are showing me things I never noticed. The context is remarkable.",
                name: "Cindy",
                detail: "Journey: Life of Jesus",
                accentClass: "from-violet-500 to-amber-400",
                avatarBg: "bg-violet-500/15",
                avatarColor: "text-violet-700 dark:text-violet-400",
              },
            ].map(({ quote, name, detail, accentClass, avatarBg, avatarColor }) => (
              <div
                key={name}
                className="relative rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col gap-3 overflow-hidden"
              >
                <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${accentClass}`} />
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[13px] text-foreground leading-relaxed flex-1 italic">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="flex items-center gap-2.5 pt-1 border-t border-border">
                  <div className={`w-7 h-7 rounded-full ${avatarBg} flex items-center justify-center text-[11px] font-bold ${avatarColor}`}>
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground leading-none">{name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Scripture commitment card — trust footer, sits at the very bottom */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="relative mt-5 rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
          data-testid="commitment-card"
        >
          {/* Bold top accent stripe */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-amber-400" />
          <img
            src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&q=80"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
            style={{ opacity: 0.06, filter: "saturate(0.7) brightness(0.95)" }}
          />
          <button
            onClick={() => setExpanded(v => !v)}
            data-testid="btn-commitment-toggle"
            className="w-full text-left px-5 py-4 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/30">
              <ShieldCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-bold text-foreground leading-tight">Our Commitment to Scripture</p>
                <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-primary rounded px-1.5 py-0.5 leading-none">Read This</span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-0.5">We mean every word. AI grounded in God's Word — always.</p>
            </div>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="commitment-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                {/* Bible photo — full-width banner on mobile */}
                  <div className="relative h-36 overflow-hidden md:hidden border-t border-primary/10">
                    <img
                      src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&q=85"
                      alt="Open Bible"
                      className="w-full h-full object-cover object-center"
                      style={{ filter: "brightness(0.88) saturate(0.82)" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/85" />
                  </div>

                <div className="border-t border-primary/10 md:grid md:grid-cols-[1fr_220px] lg:grid-cols-[1fr_280px] md:gap-0 md:border-t-0">
                  {/* Text content */}
                  <div className="px-5 pb-6 pt-4">
                    <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                      Shepherd's Path uses AI to help you engage with the Word of God — not to reinterpret it. The Bible is our only source and standard. Every reflection, prayer, and explanation generated by our AI is grounded in the passage being studied and shaped by the historic, orthodox Christian faith.
                    </p>

                    <div className="space-y-2.5 mb-5">
                      {COMMITMENT_POINTS.map((point) => (
                        <div key={point} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          <p className="text-sm text-foreground/75 leading-snug">{point}</p>
                        </div>
                      ))}
                    </div>

                    <p className="text-[13px] text-foreground/60 italic border-t border-primary/10 pt-4 leading-relaxed">
                      "Your word is a lamp to my feet and a light to my path." — Psalm 119:105
                    </p>
                  </div>

                  {/* Bible photo — desktop only */}
                  <div className="hidden md:block relative overflow-hidden rounded-br-2xl">
                    <img
                      src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&q=85"
                      alt="Open Bible"
                      className="w-full h-full object-cover object-center"
                      style={{ minHeight: "220px", filter: "brightness(0.92) saturate(0.85)" }}
                    />
                    {/* Left fade so photo blends into the text side */}
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/30 to-transparent" />
                    {/* Subtle vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Soft divider before Daily Art */}
        <div className="flex items-center gap-3 mt-10 px-0.5">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-primary/30" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 shrink-0">A Moment of Beauty</p>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-primary/20 to-primary/30" />
        </div>

        {/* Daily Art — between Scripture commitment and download CTA */}
        <div className="mt-4 rounded-2xl overflow-hidden shadow-sm border border-border relative">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-amber-400 z-10" />
          <DailyArtCard />
        </div>

        {/* Closing CTA band */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="relative mt-6 rounded-2xl overflow-hidden border border-primary/25 bg-gradient-to-br from-primary/12 via-violet-500/8 to-amber-500/6 backdrop-blur-sm"
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/50 via-violet-400/40 to-amber-400/35" />
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
          <div className="px-5 py-6 flex flex-col items-center text-center gap-4">
            <img
              src={logoWhite}
              alt="Shepherd's Path"
              className="w-20 h-20 object-contain opacity-80"
            />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70 mb-1">Available Now</p>
              <p className="text-[20px] font-bold text-foreground leading-tight">Start your journey today.</p>
              <p className="text-[16px] text-foreground/75 mt-2 leading-relaxed">
                A faithful guide, available every morning — grounded in Scripture, shaped for your life.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <a
                href="https://apps.apple.com/us/app/shepherds-path/id6744949609"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="btn-appstore-cta"
                className="flex items-center gap-3 w-full sm:w-auto justify-center px-5 py-3 rounded-xl bg-foreground text-background font-semibold text-[14px] hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.shepherdspath.app"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="btn-googleplay-cta"
                className="flex items-center gap-3 w-full sm:w-auto justify-center px-5 py-3 rounded-xl border border-primary/30 bg-primary/10 text-foreground font-semibold text-[14px] hover:bg-primary/15 active:scale-[0.98] transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" aria-hidden="true">
                  <path d="M3.18 23.76c.3.17.65.19.97.08l12.49-7.21-2.65-2.65-10.81 9.78zM.35 1.33C.13 1.67 0 2.12 0 2.67v18.66c0 .55.13 1 .35 1.34l.07.07 10.46-10.46v-.25L.42 1.26l-.07.07zM20.69 10.23l-2.83-1.63-2.97 2.97 2.97 2.97 2.84-1.63c.81-.47.81-1.22-.01-1.68zM3.18.24L15.67 7.45l-2.65 2.65L2.21.32c.32-.1.67-.08.97.08v-.16z"/>
                </svg>
                Google Play
              </a>
            </div>
            <p className="text-[14px] text-foreground/60 italic">
              "Your word is a lamp to my feet and a light to my path." — Psalm 119:105
            </p>
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
              <span key={tag} className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border border-primary/20 bg-primary/6 text-primary/80">
                {tag}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mb-4" />

          {/* Links — 2×2 grid, no orphan separators */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-foreground/70 text-center mb-2.5 px-4">
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
          </div>

          {/* Email + Share — stacked to avoid overflow */}
          <div className="flex flex-col items-center gap-1.5 text-sm text-foreground/70">
            <a href="mailto:support@shepherdspathai.com" className="hover:text-foreground transition-colors" data-testid="link-support-footer">
              support@shepherdspathai.com
            </a>
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
    </div>
  );
}
