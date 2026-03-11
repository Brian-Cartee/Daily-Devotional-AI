import { useState, useEffect, useRef } from "react";
import { saveBookmark, getBookmark } from "@/lib/bookmarks";
import { ResumeBar } from "@/components/ResumeBar";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, HeartHandshake, Loader2, Share2, Check, BookOpen, MessageCircle, Bookmark, BookmarkCheck, Flame, Heart } from "lucide-react";
import { SiX, SiFacebook, SiWhatsapp, SiTelegram } from "react-icons/si";
import { useDailyVerse } from "@/hooks/use-verses";
import { streamAI } from "@/lib/streamAI";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BibleStudyChat } from "@/components/BibleStudyChat";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { ShareButton } from "@/components/ShareButton";
import { useToast } from "@/hooks/use-toast";
import { capitalizeDivinePronouns } from "@/lib/divinePronouns";
import { getStoredLang } from "@/lib/language";
import { getUserName } from "@/lib/userName";
import { ListenButton } from "@/components/ListenButton";
import { getHeroImage } from "@/lib/heroImage";
import { canUseAi, recordAiUsage, getRemainingAi } from "@/lib/aiUsage";
import { UpgradeModal } from "@/components/UpgradeModal";
import { AchievementModal } from "@/components/AchievementModal";
import { checkStreakAchievement, checkDevotionalFirstComplete, markAchievementSeen, type Achievement } from "@/lib/achievements";
import { TipPrompt, shouldShowTip } from "@/components/TipPrompt";

function StepLabel({ number: _number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <div className="h-px w-5 bg-border/70" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/85">{label}</span>
      <div className="h-px flex-1 bg-border/40" />
    </div>
  );
}

function PrayerText({ text }: { text: string }) {
  const cleaned = text.replace(/^(here'?s? (is )?a? ?(short |brief )?prayer[^:]*:?\s*)/i, "").trim();
  return (
    <p className="text-[15px] leading-[2] text-foreground/75 italic font-normal">
      {cleaned}
    </p>
  );
}

export default function Devotional() {
  const { data: verse, isLoading: isVerseLoading, error: verseError } = useDailyVerse();
  const [reflectionContent, setReflectionContent] = useState("");
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionError, setReflectionError] = useState(false);
  const [prayerContent, setPrayerContent] = useState("");
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerError, setPrayerError] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [devotionalStarted, setDevotionalStarted] = useState(false);
  const [savedReflection, setSavedReflection] = useState(false);
  const [savedPrayer, setSavedPrayer] = useState(false);
  const [savedVerse, setSavedVerse] = useState(false);
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number; visitDates?: string[] } | null>(null);
  const pendingStreakAchievementRef = useRef<Achievement | null>(null);
  const [gratitudeInput, setGratitudeInput] = useState("");
  const [gratitudePrayer, setGratitudePrayer] = useState("");
  const [gratitudePrayerLoading, setGratitudePrayerLoading] = useState(false);
  const [savedGratitude, setSavedGratitude] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [showTipPrompt, setShowTipPrompt] = useState(false);
  const [streakForTip, setStreakForTip] = useState(0);
  const { toast } = useToast();

  // Show thank-you toast if returning from tip checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tip") === "thank-you") {
      toast({ description: "Thank you for your gift. It means everything. 🙏" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  const saveMutation = useMutation({
    mutationFn: async (body: { type: string; content: string; reference?: string; verseDate?: string }) => {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, sessionId }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal", sessionId] });
      if (variables.type === "reflection") setSavedReflection(true);
      if (variables.type === "prayer") setSavedPrayer(true);
      if (variables.type === "verse") setSavedVerse(true);
      toast({ description: "Saved to your journal." });
    },
    onError: () => toast({ description: "Could not save. Please try again.", variant: "destructive" }),
  });

  useEffect(() => {
    if (verse && !devotionalStarted) {
      setDevotionalStarted(true);
      saveBookmark("devotional", {
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        label: `Today's devotional · ${verse.reference}`,
      });
      const lang = getStoredLang();
      const userName = getUserName() ?? undefined;
      generateReflection(verse.id, lang, userName);
      generatePrayer(verse.id, lang, userName);
      fetch("/api/streak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).then(r => r.json()).then(data => {
        if (data.currentStreak) {
          setStreak(data);
          const achievement = checkStreakAchievement(data.currentStreak, data.isNewDay);
          if (achievement) {
            pendingStreakAchievementRef.current = achievement;
          }
        }
      }).catch(() => {});
    }
  }, [verse]);

  const generateReflection = async (verseId: number, lang: string, userName?: string) => {
    setReflectionLoading(true);
    setReflectionContent("");
    setReflectionError(false);
    try {
      const result = await streamAI("/api/ai/generate", {
        verseId, type: "reflection", lang, userName,
        sessionId: getSessionId(), daysWithApp: getRelationshipAge(),
      }, (text) => setReflectionContent(capitalizeDivinePronouns(text)));
      setReflectionContent(capitalizeDivinePronouns(result));
    } catch {
      setReflectionError(true);
    }
    setReflectionLoading(false);
  };

  const generatePrayer = async (verseId: number, lang: string, userName?: string) => {
    setPrayerLoading(true);
    setPrayerContent("");
    setPrayerError(false);
    try {
      const result = await streamAI("/api/ai/generate", {
        verseId, type: "prayer", lang, userName,
        sessionId: getSessionId(), daysWithApp: getRelationshipAge(),
      }, (text) => setPrayerContent(capitalizeDivinePronouns(text)));
      setPrayerContent(capitalizeDivinePronouns(result));
    } catch {
      setPrayerError(true);
    }
    setPrayerLoading(false);
  };

  const handleGratitudePrayer = async () => {
    if (!gratitudeInput.trim() || !verse) return;
    if (!canUseAi()) { setShowUpgrade(true); return; }
    recordAiUsage();
    setGratitudePrayerLoading(true);
    setGratitudePrayer("");
    try {
      const res = await fetch("/api/chat/passage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passageRef: verse.reference,
          passageText: verse.text,
          lang: getStoredLang(),
          userName: getUserName() ?? undefined,
          sessionId: getSessionId(),
          daysWithApp: getRelationshipAge(),
          messages: [{
            role: "user",
            content: `The reader has just finished their devotional on ${verse.reference}: "${verse.text}". They want to offer a personal prayer of thanksgiving to God. What they are grateful for today: "${gratitudeInput.trim()}". Write a short, intimate closing prayer (3–4 sentences) that weaves together their gratitude and the spirit of today's verse. Begin with "Lord," or "Father," and close with "Amen." Write in first person as if they are speaking it aloud. Keep it warm and unhurried.`,
          }],
        }),
      });
      const data = await res.json();
      const prayer = capitalizeDivinePronouns(data.content ?? "");
      setGratitudePrayer(prayer);

      // Fire achievement after full devotional completion (Step 4 — Thank Him)
      if (prayer) {
        const devotionalAchievement = checkDevotionalFirstComplete();
        if (devotionalAchievement) {
          setTimeout(() => {
            markAchievementSeen(devotionalAchievement.id);
            setCurrentAchievement(devotionalAchievement);
          }, 1200);
        } else if (pendingStreakAchievementRef.current) {
          const streakAchievement = pendingStreakAchievementRef.current;
          pendingStreakAchievementRef.current = null;
          setTimeout(() => {
            markAchievementSeen(streakAchievement.id);
            setCurrentAchievement(streakAchievement);
          }, 1200);
        }
      }
    } catch {
      setGratitudePrayer("Sorry, we couldn't generate your prayer right now. Please try again.");
    }
    setGratitudePrayerLoading(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setEmailLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      if (res.ok || res.status === 409) {
        setEmailSubmitted(true);
      } else {
        toast({ description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ description: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setEmailLoading(false);
  };

  const handleShare = async () => {
    if (!verse) return;
    const prayerText = prayerContent
      ? "\n\n🙏 " + prayerContent.replace(/^(here'?s? (is )?a? ?(short |brief )?prayer[^:]*:?\s*)/i, "").trim()
      : "";
    const text = `📖 ${verse.reference}\n\n"${verse.text}"${prayerText}\n\n— Shepherd's Path`;
    if (navigator.share) {
      try { await navigator.share({ title: `Today's Word: ${verse.reference}`, text }); } catch { }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const buildShareText = () => {
    if (!verse) return "";
    return `📖 ${verse.reference}\n\n"${verse.text}"\n\nReflect & pray with me at Shepherd's Path 🙏\nshepherdspathAI.com`;
  };

  const shareOnX = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,width=600,height=450");
  };

  const shareOnFacebook = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://www.facebook.com/sharer/sharer.php?quote=${text}&u=https://shepherdspathAI.com`, "_blank", "noopener,width=600,height=450");
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
  };

  const shareOnTruthSocial = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://truthsocial.com/share?text=${text}`, "_blank", "noopener");
  };

  const shareOnTelegram = () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://t.me/share/url?url=https://shepherdspathAI.com&text=${text}`, "_blank", "noopener");
  };

  if (isVerseLoading) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background pt-14">
          <Loader2 className="w-6 h-6 animate-spin text-primary/40 mb-4" />
          <p className="text-muted-foreground text-sm font-medium">Loading today's word...</p>
        </div>
      </>
    );
  }

  if (verseError || !verse) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background pt-14">
          <div className="bg-card border border-border p-10 rounded-2xl text-center max-w-md shadow-sm">
            <HeartHandshake className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Just a moment</h2>
            <p className="text-muted-foreground text-sm">We couldn't load today's verse. Take a breath and try refreshing.</p>
            <Button variant="outline" className="mt-6 rounded-full px-8 font-semibold" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </div>
      </>
    );
  }

  const dateStr = new Date(verse.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric"
  });

  return (
    <>
      <NavBar />

      {/* Hero */}
      <div className="relative h-[40vh] min-h-[260px] max-h-[400px] overflow-hidden pt-14">
        <img
          src={getHeroImage("devotional")}
          alt="Morning devotional"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-end h-full pb-8 px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/25 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-widest mb-2 drop-shadow-lg whitespace-nowrap">
              Daily Devotional · {dateStr}
            </div>
            <p className="text-white text-[13px] italic drop-shadow-lg" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>Walk the path. Follow the Word.</p>
          </motion.div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-xl mx-auto px-5 pb-24 -mt-2 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >

          {/* Streak indicator + weekly tracker */}
          <AnimatePresence>
            {streak && streak.currentStreak >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center gap-2 py-1"
                data-testid="streak-indicator"
              >
                {/* Day count row */}
                <div className="flex items-center gap-2.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500/80" />
                  <span className="text-[12px] font-medium text-muted-foreground">
                    Day #{streak.currentStreak} of my Walk
                  </span>
                  {streak.longestStreak > streak.currentStreak && (
                    <span className="text-[11px] text-muted-foreground/50">· best {streak.longestStreak}</span>
                  )}
                </div>

                {/* Weekly dots */}
                {(() => {
                  const LABELS = ["M","T","W","T","F","S","S"];
                  const today = new Date();
                  const day = today.getDay();
                  const monday = new Date(today);
                  monday.setDate(today.getDate() - ((day === 0 ? 7 : day) - 1));
                  const weekDates = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + i);
                    return d.toISOString().split("T")[0];
                  });
                  const todayIdx = day === 0 ? 6 : day - 1;
                  const visitSet = new Set(streak.visitDates ?? []);
                  return (
                    <div className="flex items-center gap-1.5">
                      {LABELS.map((label, i) => {
                        const visited = visitSet.has(weekDates[i]);
                        const isToday = i === todayIdx;
                        const isFuture = i > todayIdx;
                        return (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isToday ? "text-primary/80" : "text-muted-foreground/30"}`}>
                              {label}
                            </span>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              visited && isToday
                                ? "bg-primary shadow-sm"
                                : visited
                                ? "border border-primary/25 bg-transparent"
                                : isToday
                                ? "border border-primary/40 bg-primary/5"
                                : isFuture
                                ? "border border-muted-foreground/10 bg-muted/20"
                                : "border border-muted-foreground/15 bg-muted/15"
                            }`}>
                              {visited && isToday && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />}
                              {visited && !isToday && <div className="w-2 h-2 rounded-full bg-primary" />}
                              {!visited && isToday && <div className="w-1 h-1 rounded-full bg-primary/60" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEP 1: TODAY'S WORD */}
          <div className="bg-card border border-border/60 rounded-2xl px-7 py-8 shadow-sm">
            <StepLabel number={1} label="Today's Word" />
            <blockquote className="verse-text text-[1.7rem] sm:text-[2rem] text-balance mb-7 leading-relaxed">
              "{verse.text}"
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-bold text-primary tracking-wide flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {verse.reference}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="mt-5 pt-4 border-t border-border/25 grid grid-cols-3 divide-x divide-border/30">
              <button
                data-testid="save-verse"
                onClick={() => saveMutation.mutate({ type: "verse", content: verse.text, reference: verse.reference, verseDate: verse.date })}
                disabled={savedVerse || saveMutation.isPending}
                className="flex flex-col items-center gap-1.5 py-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                {savedVerse ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
                <span className="text-[11px] font-semibold leading-none">{savedVerse ? "Saved" : "Save"}</span>
              </button>
              <div className="flex justify-center">
                <ListenButton
                  text={`${verse.text} — ${verse.reference}`}
                  label="Listen"
                  vertical
                />
              </div>
              <button
                data-testid="button-share"
                onClick={handleShare}
                className="flex flex-col items-center gap-1.5 py-1 text-muted-foreground hover:text-primary transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                <span className="text-[11px] font-semibold leading-none">{copied ? "Copied!" : "Share"}</span>
              </button>
            </div>

            {/* Social sharing row */}
            <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-center gap-1.5">
              <span className="text-[11px] text-muted-foreground/45 font-medium mr-1">Share</span>
              <button
                data-testid="share-x"
                onClick={shareOnX}
                title="Share on X (Twitter)"
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all"
              >
                <SiX className="w-3.5 h-3.5" />
              </button>
              <button
                data-testid="share-facebook"
                onClick={shareOnFacebook}
                title="Share on Facebook"
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-[#1877F2] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all"
              >
                <SiFacebook className="w-3.5 h-3.5" />
              </button>
              <button
                data-testid="share-whatsapp"
                onClick={shareOnWhatsApp}
                title="Share on WhatsApp"
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-[#25D366] hover:bg-green-50 dark:hover:bg-green-950/40 transition-all"
              >
                <SiWhatsapp className="w-3.5 h-3.5" />
              </button>
              <button
                data-testid="share-truthsocial"
                onClick={shareOnTruthSocial}
                title="Share on Truth Social"
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-[#7347CC] hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-all"
              >
                <span className="text-[11px] font-black leading-none">T</span>
              </button>
              <button
                data-testid="share-telegram"
                onClick={shareOnTelegram}
                title="Share on Telegram"
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-[#2AABEE] hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-all"
              >
                <SiTelegram className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* STEP 2: REFLECTION */}
          <div className="bg-card border border-border/60 rounded-2xl px-7 py-8 shadow-sm">
            <StepLabel number={2} label="Reflection" />
            <AnimatePresence mode="wait">
              {reflectionLoading && !reflectionContent && (
                <motion.div key="ref-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-full" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-5/6" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-4/5" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-3/4 mt-1" />
                </motion.div>
              )}
              {reflectionContent && (
                <motion.div key="ref-content" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                  <div className="text-[15px] leading-relaxed text-foreground/80 space-y-3">
                    {reflectionContent.split("\n").filter(p => p.trim()).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                  {!reflectionLoading && (
                    <div className="mt-4 flex items-center gap-4">
                      <button
                        data-testid="save-reflection"
                        onClick={() => saveMutation.mutate({ type: "reflection", content: reflectionContent, reference: verse.reference, verseDate: verse.date })}
                        disabled={savedReflection || saveMutation.isPending}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {savedReflection ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" /> : <Bookmark className="w-3.5 h-3.5" />}
                        {savedReflection ? "Saved to Journal" : "Save to Journal"}
                      </button>
                      <ShareButton title={`Reflection — ${verse.reference}`} text={reflectionContent} className="text-[12px] font-semibold" />
                      <ListenButton text={reflectionContent} label="Listen" />
                    </div>
                  )}
                </motion.div>
              )}
              {reflectionError && (
                <motion.p key="ref-error" className="text-sm text-muted-foreground italic">
                  Could not load reflection. <button onClick={() => generateReflection(verse.id, getStoredLang(), getUserName() ?? undefined)} className="underline text-primary">Try again</button>
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* STEP 3: PRAYER */}
          <div className="bg-card border border-border/60 rounded-2xl px-7 py-8 shadow-sm">
            <StepLabel number={3} label="Prayer" />
            <AnimatePresence mode="wait">
              {prayerLoading && !prayerContent && (
                <motion.div key="pray-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-full" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-5/6" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-2/3" />
                </motion.div>
              )}
              {prayerContent && (
                <motion.div key="pray-content" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                  <PrayerText text={prayerContent} />
                  {!prayerLoading && (
                    <div className="mt-4 flex items-center gap-4">
                      <button
                        data-testid="save-prayer"
                        onClick={() => saveMutation.mutate({ type: "prayer", content: prayerContent, reference: verse.reference, verseDate: verse.date })}
                        disabled={savedPrayer || saveMutation.isPending}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {savedPrayer ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" /> : <Bookmark className="w-3.5 h-3.5" />}
                        {savedPrayer ? "Saved to Journal" : "Save to Journal"}
                      </button>
                      <ShareButton title={`Prayer — ${verse.reference}`} text={prayerContent} className="text-[12px] font-semibold" />
                      <ListenButton text={prayerContent} label="Listen" />
                    </div>
                  )}
                </motion.div>
              )}
              {prayerError && (
                <motion.p key="pray-error" className="text-sm text-muted-foreground italic">
                  Could not load prayer. <button onClick={() => generatePrayer(verse.id, getStoredLang(), getUserName() ?? undefined)} className="underline text-primary">Try again</button>
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* STEP 4: THANK HIM */}
          <div className="bg-card border border-border/60 rounded-2xl px-7 py-8 shadow-sm">
            <StepLabel number={4} label="Thank Him" />
            <p className="text-[14px] text-muted-foreground mb-4 leading-relaxed">
              What are you grateful for today?
            </p>
            <textarea
              value={gratitudeInput}
              onChange={(e) => setGratitudeInput(e.target.value)}
              placeholder="My family, a quiet morning, a door that opened..."
              rows={3}
              data-testid="input-gratitude"
              className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 text-[14px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-primary/25 resize-none placeholder:text-muted-foreground/50 transition-shadow"
            />
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                onClick={handleGratitudePrayer}
                disabled={!gratitudeInput.trim() || gratitudePrayerLoading}
                data-testid="button-generate-gratitude-prayer"
                className="rounded-xl font-semibold"
              >
                {gratitudePrayerLoading
                  ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Praying...</>
                  : <><Heart className="w-3.5 h-3.5 mr-2" /> Generate Closing Prayer</>
                }
              </Button>
            </div>

            <AnimatePresence>
              {gratitudePrayer && (
                <motion.div
                  key="gratitude-prayer"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="mt-6 pt-5 border-t border-border/40"
                >
                  <PrayerText text={gratitudePrayer} />
                  <div className="mt-4 flex items-center gap-4 flex-wrap">
                    <button
                      data-testid="save-gratitude-prayer"
                      onClick={() => {
                        saveMutation.mutate({ type: "prayer", content: gratitudePrayer, reference: verse.reference, verseDate: verse.date });
                        setSavedGratitude(true);
                      }}
                      disabled={savedGratitude || saveMutation.isPending}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {savedGratitude ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" /> : <Bookmark className="w-3.5 h-3.5" />}
                      {savedGratitude ? "Saved to Journal" : "Save to Journal"}
                    </button>
                    <ShareButton
                      title={`Closing Prayer — ${verse.reference}`}
                      text={gratitudePrayer}
                      className="text-[12px] font-semibold"
                    />
                    <ListenButton text={gratitudePrayer} label="Listen" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="pt-1">
            <button
              data-testid="button-ask-scripture"
              onClick={() => setChatOpen(v => !v)}
              className="w-full rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-all px-5 py-4 text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">Ask AI About This Scripture</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">History · context · cross-references · application</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <MessageCircle className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </button>
          </div>

          {/* AI Chat */}
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.4 }}
              >
                <BibleStudyChat
                  verseId={verse.id}
                  initialReflection={reflectionContent}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Capture */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="bg-card border border-border/50 rounded-2xl px-7 py-7 text-center shadow-sm"
            data-testid="email-capture"
          >
            <AnimatePresence mode="wait">
              {emailSubmitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-1.5"
                >
                  <p className="text-base font-semibold text-foreground">You're on the list.</p>
                  <p className="text-sm text-muted-foreground">Tomorrow's verse will be in your inbox by 7 AM.</p>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div>
                    <p className="text-base font-semibold text-foreground">Get tomorrow's verse by email</p>
                    <p className="text-sm text-muted-foreground mt-1">Delivered every morning at 7 AM. Free.</p>
                  </div>
                  <form onSubmit={handleEmailSubmit} className="flex gap-2.5 max-w-xs mx-auto">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="your@email.com"
                      required
                      data-testid="input-email-capture"
                      className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={emailLoading || !emailInput.trim()}
                      data-testid="button-email-subscribe"
                      className="rounded-xl px-4 font-semibold shrink-0"
                    >
                      {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Subscribe"}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </motion.div>
      </main>

      <AnimatePresence>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {currentAchievement && (
          <AchievementModal
            achievement={currentAchievement}
            onClose={() => {
              const achieved = currentAchievement;
              setCurrentAchievement(null);
              // After a milestone streak achievement, gently offer the tip prompt
              const milestones = ["streak_7", "streak_14", "streak_30", "streak_60", "streak_100"];
              if (milestones.includes(achieved.id) && shouldShowTip()) {
                const s = streak?.currentStreak ?? 7;
                setTimeout(() => { setStreakForTip(s); setShowTipPrompt(true); }, 600);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTipPrompt && (
          <TipPrompt
            streakDays={streakForTip}
            onClose={() => setShowTipPrompt(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
