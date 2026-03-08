import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, HeartHandshake, Loader2, Share2, Check, BookOpen, MessageCircle, Bookmark, BookmarkCheck, Flame, Heart } from "lucide-react";
import { SiX, SiFacebook, SiWhatsapp } from "react-icons/si";
import { useDailyVerse, useGenerateAI } from "@/hooks/use-verses";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BibleStudyChat } from "@/components/BibleStudyChat";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import { capitalizeDivinePronouns } from "@/lib/divinePronouns";
import { getStoredLang } from "@/lib/language";
import { getHeroImage } from "@/lib/heroImage";
import { canUseAi, recordAiUsage, getRemainingAi } from "@/lib/aiUsage";
import { UpgradeModal } from "@/components/UpgradeModal";

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
  const reflectionMutation = useGenerateAI();
  const prayerMutation = useGenerateAI();
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [devotionalStarted, setDevotionalStarted] = useState(false);
  const [savedReflection, setSavedReflection] = useState(false);
  const [savedPrayer, setSavedPrayer] = useState(false);
  const [savedVerse, setSavedVerse] = useState(false);
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number } | null>(null);
  const [gratitudeInput, setGratitudeInput] = useState("");
  const [gratitudePrayer, setGratitudePrayer] = useState("");
  const [gratitudePrayerLoading, setGratitudePrayerLoading] = useState(false);
  const [savedGratitude, setSavedGratitude] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { toast } = useToast();
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
      const lang = getStoredLang();
      reflectionMutation.mutate({ verseId: verse.id, type: "reflection", lang });
      prayerMutation.mutate({ verseId: verse.id, type: "prayer", lang });
      fetch("/api/streak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).then(r => r.json()).then(data => {
        if (data.currentStreak) setStreak(data);
      }).catch(() => {});
    }
  }, [verse]);

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
          messages: [{
            role: "user",
            content: `The reader has just finished their devotional on ${verse.reference}: "${verse.text}". They want to offer a personal prayer of thanksgiving to God. What they are grateful for today: "${gratitudeInput.trim()}". Write a short, intimate closing prayer (3–4 sentences) that weaves together their gratitude and the spirit of today's verse. Begin with "Lord," or "Father," and close with "Amen." Write in first person as if they are speaking it aloud. Keep it warm and unhurried.`,
          }],
        }),
      });
      const data = await res.json();
      setGratitudePrayer(capitalizeDivinePronouns(data.content ?? ""));
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
    const prayerText = prayerMutation.data?.content
      ? "\n\n🙏 " + prayerMutation.data.content.replace(/^(here'?s? (is )?a? ?(short |brief )?prayer[^:]*:?\s*)/i, "").trim()
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
    weekday: "long", month: "long", day: "numeric"
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/25 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-widest mb-2 drop-shadow-lg">
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

          {/* Streak indicator */}
          <AnimatePresence>
            {streak && streak.currentStreak > 1 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                className="flex items-center justify-center gap-2.5 py-1"
                data-testid="streak-indicator"
              >
                <Flame className="w-3.5 h-3.5 text-amber-500/80" />
                <span className="text-[12px] font-medium text-muted-foreground">
                  {streak.currentStreak} Day Walk
                </span>
                {streak.longestStreak > streak.currentStreak && (
                  <span className="text-[11px] text-muted-foreground/50">· best {streak.longestStreak}</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEP 1: TODAY'S WORD */}
          <div className="bg-card border border-border/60 rounded-2xl px-7 py-8 shadow-sm">
            <StepLabel number={1} label="Today's Word" />
            <blockquote className="verse-text text-[1.3rem] sm:text-[1.45rem] text-balance mb-7">
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
            <div className="mt-4 flex items-center justify-between">
              <button
                data-testid="save-verse"
                onClick={() => saveMutation.mutate({ type: "verse", content: verse.text, reference: verse.reference, verseDate: verse.date })}
                disabled={savedVerse || saveMutation.isPending}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                {savedVerse ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" /> : <Bookmark className="w-3.5 h-3.5" />}
                {savedVerse ? "Saved to Journal" : "Save to Journal"}
              </button>
              <button
                data-testid="button-share"
                onClick={handleShare}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Share Scripture"}
              </button>
            </div>

            {/* Social sharing row */}
            <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-center gap-3">
              <span className="text-[11px] text-muted-foreground/45 font-medium">Share on</span>
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
            </div>
          </div>

          {/* STEP 2: REFLECTION */}
          <div className="bg-card border border-border/60 rounded-2xl px-7 py-8 shadow-sm">
            <StepLabel number={2} label="Reflection" />
            <AnimatePresence mode="wait">
              {reflectionMutation.isPending && (
                <motion.div key="ref-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-full" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-5/6" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-4/5" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-3/4 mt-1" />
                </motion.div>
              )}
              {reflectionMutation.isSuccess && reflectionMutation.data && (
                <motion.div key="ref-content" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                  <div className="text-[15px] leading-relaxed text-foreground/80 space-y-3">
                    {capitalizeDivinePronouns(reflectionMutation.data.content).split("\n").filter(p => p.trim()).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                  <button
                    data-testid="save-reflection"
                    onClick={() => saveMutation.mutate({ type: "reflection", content: reflectionMutation.data!.content, reference: verse.reference, verseDate: verse.date })}
                    disabled={savedReflection || saveMutation.isPending}
                    className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {savedReflection ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" /> : <Bookmark className="w-3.5 h-3.5" />}
                    {savedReflection ? "Saved to Journal" : "Save to Journal"}
                  </button>
                </motion.div>
              )}
              {reflectionMutation.isError && (
                <motion.p key="ref-error" className="text-sm text-muted-foreground italic">
                  Could not load reflection. <button onClick={() => reflectionMutation.mutate({ verseId: verse.id, type: "reflection" })} className="underline text-primary">Try again</button>
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* STEP 3: PRAYER */}
          <div className="bg-card border border-border/60 rounded-2xl px-7 py-8 shadow-sm">
            <StepLabel number={3} label="Prayer" />
            <AnimatePresence mode="wait">
              {prayerMutation.isPending && (
                <motion.div key="pray-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-full" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-5/6" />
                  <div className="h-3.5 bg-muted animate-pulse rounded-full w-2/3" />
                </motion.div>
              )}
              {prayerMutation.isSuccess && prayerMutation.data && (
                <motion.div key="pray-content" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                  <PrayerText text={capitalizeDivinePronouns(prayerMutation.data.content)} />
                  <button
                    data-testid="save-prayer"
                    onClick={() => saveMutation.mutate({ type: "prayer", content: prayerMutation.data!.content, reference: verse.reference, verseDate: verse.date })}
                    disabled={savedPrayer || saveMutation.isPending}
                    className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {savedPrayer ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" /> : <Bookmark className="w-3.5 h-3.5" />}
                    {savedPrayer ? "Saved to Journal" : "Save to Journal"}
                  </button>
                </motion.div>
              )}
              {prayerMutation.isError && (
                <motion.p key="pray-error" className="text-sm text-muted-foreground italic">
                  Could not load prayer. <button onClick={() => prayerMutation.mutate({ verseId: verse.id, type: "prayer" })} className="underline text-primary">Try again</button>
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
                  <div className="mt-4 flex items-center justify-between">
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
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                      <Sparkles className="w-3 h-3" />
                      GPT-4o · Shepherd's Path
                    </span>
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
                  <span className="text-[10px] font-semibold text-muted-foreground/70 bg-muted/80 px-2 py-0.5 rounded-full hidden sm:inline">GPT-4o</span>
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
                  initialReflection={reflectionMutation.data?.content ?? ""}
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
    </>
  );
}
