import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, HeartHandshake, Loader2, Share2, Check, BookOpen, MessageCircle, Bookmark, BookmarkCheck } from "lucide-react";
import { useDailyVerse, useGenerateAI } from "@/hooks/use-verses";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BibleStudyChat } from "@/components/BibleStudyChat";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";

function StepLabel({ number: _number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <div className="h-px w-5 bg-border/70" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/60">{label}</span>
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
      reflectionMutation.mutate({ verseId: verse.id, type: "reflection" });
      prayerMutation.mutate({ verseId: verse.id, type: "prayer" });
    }
  }, [verse]);

  const handleShare = async () => {
    if (!verse) return;
    const prayerText = prayerMutation.data?.content
      ? "\n\n🙏 " + prayerMutation.data.content.replace(/^(here'?s? (is )?a? ?(short |brief )?prayer[^:]*:?\s*)/i, "").trim()
      : "";
    const text = `📖 ${verse.reference}\n\n"${verse.text}"${prayerText}\n\n— Shepherd Path`;
    if (navigator.share) {
      try { await navigator.share({ title: `Today's Word: ${verse.reference}`, text }); } catch { }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
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
          src="/hero-devotional.png"
          alt="Morning devotional"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-end h-full pb-8 px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">
              Daily Devotional · {dateStr}
            </div>
            <p className="text-white/50 text-[13px] italic">Walk the path. Follow the Word.</p>
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
            <button
              data-testid="save-verse"
              onClick={() => saveMutation.mutate({ type: "verse", content: verse.text, reference: verse.reference, verseDate: verse.date })}
              disabled={savedVerse || saveMutation.isPending}
              className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              {savedVerse ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" /> : <Bookmark className="w-3.5 h-3.5" />}
              {savedVerse ? "Saved to Journal" : "Save to Journal"}
            </button>
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
                    {reflectionMutation.data.content.split("\n").filter(p => p.trim()).map((para, i) => (
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
                  <PrayerText text={prayerMutation.data.content} />
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

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <Button
              data-testid="button-ask-scripture"
              size="lg"
              onClick={() => setChatOpen(v => !v)}
              className="rounded-xl px-5 font-bold text-sm flex-1"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Ask About This Scripture
            </Button>
            <Button
              data-testid="button-share"
              size="lg"
              variant="outline"
              onClick={handleShare}
              className="rounded-xl px-4 font-semibold text-sm"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
            </Button>
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

        </motion.div>
      </main>
    </>
  );
}
