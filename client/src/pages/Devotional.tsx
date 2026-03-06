import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, HeartHandshake, Loader2, Share2, Check } from "lucide-react";
import { useDailyVerse, useGenerateAI } from "@/hooks/use-verses";
import { AILoadingState } from "@/components/AILoadingState";
import { AIResponseCard } from "@/components/AIResponseCard";
import { BibleStudyChat } from "@/components/BibleStudyChat";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";

export default function Devotional() {
  const { data: verse, isLoading: isVerseLoading, error: verseError } = useDailyVerse();
  const generateAI = useGenerateAI();
  const [activeType, setActiveType] = useState<"reflection" | "prayer" | null>(null);
  const [studyMode, setStudyMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = (type: "reflection" | "prayer") => {
    if (!verse) return;
    setActiveType(type);
    setStudyMode(false);
    generateAI.mutate({ verseId: verse.id, type });
  };

  const handleReflectWithAI = () => {
    if (!verse) return;
    setActiveType("reflection");
    setStudyMode(true);
    generateAI.mutate({ verseId: verse.id, type: "reflection" });
  };

  const handleShare = async () => {
    if (!verse) return;
    const text = `"${verse.text}" — ${verse.reference}\n\n${verse.encouragement}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Daily Verse: ${verse.reference}`, text }); } catch { }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isVerseLoading) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background pt-14">
          <Loader2 className="w-6 h-6 animate-spin text-primary/40 mb-4" />
          <p className="text-muted-foreground text-sm font-medium">Loading today's verse...</p>
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

  const reflectionReady = generateAI.isSuccess && generateAI.data && activeType === "reflection" && !generateAI.isPending;

  const dateStr = new Date(verse.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric"
  });

  return (
    <>
      <NavBar />

      {/* Hero image section */}
      <div className="relative h-[46vh] min-h-[300px] max-h-[460px] overflow-hidden pt-14">
        <img
          src="/hero-devotional.png"
          alt="Morning devotional"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col items-center justify-end h-full pb-8 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/70 text-[11px] font-bold uppercase tracking-widest mb-3">
              Daily Devotional · {dateStr}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-5 pb-20 -mt-2 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Verse card */}
          <div className="bg-card border border-border rounded-2xl p-7 mb-4 shadow-sm">
            <blockquote className="verse-text text-2xl sm:text-3xl text-foreground leading-relaxed mb-6 text-balance">
              "{verse.text}"
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-bold text-primary tracking-wide">{verse.reference}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>

          {/* Encouragement */}
          <div className="bg-muted/60 border border-border/50 rounded-2xl px-6 py-5 mb-6">
            <p className="text-[15px] text-foreground/80 leading-relaxed font-medium">
              {verse.encouragement}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2.5 mb-8">
            <Button
              data-testid="button-reflect-ai"
              size="lg"
              onClick={handleReflectWithAI}
              disabled={generateAI.isPending}
              className="rounded-xl px-6 font-bold text-sm flex-1 sm:flex-none"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Reflect with AI
            </Button>

            <Button
              data-testid="button-generate-prayer"
              size="lg"
              variant="outline"
              onClick={() => handleGenerate("prayer")}
              disabled={generateAI.isPending}
              className="rounded-xl px-6 font-bold text-sm flex-1 sm:flex-none"
            >
              <HeartHandshake className="w-4 h-4 mr-2" />
              Generate Prayer
            </Button>

            <Button
              data-testid="button-share"
              size="lg"
              variant="ghost"
              onClick={handleShare}
              className="rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="w-4 h-4 mr-1.5 text-green-500" /> : <Share2 className="w-4 h-4 mr-1.5" />}
              {copied ? "Copied!" : "Share"}
            </Button>
          </div>

          {/* AI Response Area */}
          <AnimatePresence mode="wait">
            {generateAI.isPending && activeType && (
              <AILoadingState key="loading" type={activeType} />
            )}

            {generateAI.isSuccess && generateAI.data && activeType === "prayer" && !generateAI.isPending && (
              <AIResponseCard key="prayer-response" type="prayer" content={generateAI.data.content} />
            )}

            {reflectionReady && studyMode && (
              <motion.div
                key="study-session"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/60 rounded-l-2xl" />
                  <div className="flex items-center gap-2.5 mb-4 pl-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground tracking-tight">Guided Reflection</h3>
                  </div>
                  <div className="pl-2 text-[14px] leading-relaxed text-foreground/75 space-y-3">
                    {generateAI.data!.content.split("\n").map((para, i) =>
                      para.trim() ? <p key={i}>{para}</p> : null
                    )}
                  </div>
                </div>

                <BibleStudyChat verseId={verse.id} initialReflection={generateAI.data!.content} />
              </motion.div>
            )}

            {generateAI.isError && !generateAI.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-5 bg-destructive/8 text-destructive rounded-2xl text-center border border-destructive/15 text-sm"
              >
                We couldn't generate that response right now. Please try again.
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </>
  );
}
