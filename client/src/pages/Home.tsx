import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, HeartHandshake, Loader2 } from "lucide-react";
import { useDailyVerse, useGenerateAI } from "@/hooks/use-verses";
import { AILoadingState } from "@/components/AILoadingState";
import { AIResponseCard } from "@/components/AIResponseCard";
import { BibleStudyChat } from "@/components/BibleStudyChat";
import { EmailSubscribe } from "@/components/EmailSubscribe";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: verse, isLoading: isVerseLoading, error: verseError } = useDailyVerse();
  const generateAI = useGenerateAI();
  const [activeType, setActiveType] = useState<"reflection" | "prayer" | null>(null);
  const [studyMode, setStudyMode] = useState(false);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.18, delayChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  if (isVerseLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-accent/20">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50 mb-4" />
        <p className="text-muted-foreground font-serif italic text-lg animate-pulse">
          Opening today's verse...
        </p>
      </div>
    );
  }

  if (verseError || !verse) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-white/20 p-10 rounded-3xl text-center max-w-md">
          <HeartHandshake className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">Moments of Pause</h2>
          <p className="text-muted-foreground">
            We couldn't load today's verse. Please take a deep breath and try refreshing the page.
          </p>
          <Button
            variant="outline"
            className="mt-6 rounded-full px-8"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  const reflectionReady = generateAI.isSuccess && generateAI.data && activeType === "reflection" && !generateAI.isPending;

  return (
    <>
    <EmailSubscribe />
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background via-background to-accent/10 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <motion.header variants={itemVariants} className="text-center mb-14">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide mb-5">
            Daily Bread
          </div>
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">
            {new Date(verse.date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric"
            })}
          </p>
        </motion.header>

        {/* Verse */}
        <motion.section variants={itemVariants} className="text-center mb-10 relative">
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-9xl text-primary/5 font-serif leading-none select-none pointer-events-none">
            "
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-slate-800 dark:text-slate-100 leading-snug mb-7 text-balance">
            {verse.text}
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-10 bg-border" />
            <p className="font-semibold text-base text-primary tracking-wide">{verse.reference}</p>
            <div className="h-px w-10 bg-border" />
          </div>
        </motion.section>

        {/* Encouragement */}
        <motion.section variants={itemVariants} className="mb-10">
          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {verse.encouragement}
            </p>
          </div>
        </motion.section>

        {/* Primary action buttons */}
        <motion.section
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            data-testid="button-reflect-ai"
            size="lg"
            onClick={handleReflectWithAI}
            disabled={generateAI.isPending}
            className="rounded-full px-8 text-base shadow-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Reflect with AI
          </Button>

          <Button
            data-testid="button-generate-prayer"
            size="lg"
            variant="outline"
            onClick={() => handleGenerate("prayer")}
            disabled={generateAI.isPending}
            className="rounded-full px-8 text-base border-2 bg-white/50 dark:bg-transparent backdrop-blur-sm"
          >
            <HeartHandshake className="w-5 h-5 mr-2" />
            Generate Prayer
          </Button>
        </motion.section>

        {/* AI Response Area */}
        <AnimatePresence mode="wait">
          {generateAI.isPending && activeType && (
            <AILoadingState key="loading" type={activeType} />
          )}

          {/* Prayer response (static card, no chat) */}
          {generateAI.isSuccess && generateAI.data && activeType === "prayer" && !generateAI.isPending && (
            <AIResponseCard
              key="prayer-response"
              type="prayer"
              content={generateAI.data.content}
            />
          )}

          {/* Reflection response + interactive study chat */}
          {reflectionReady && studyMode && (
            <motion.div
              key="study-session"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-8"
            >
              {/* Initial reflection card */}
              <div className="bg-white/50 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-white/20 p-6 relative">
                <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl bg-gradient-to-b from-primary/40 to-primary/10" />
                <div className="flex items-center gap-2 mb-4 pl-1">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold font-serif text-slate-800 dark:text-slate-100">
                    Guided Reflection
                  </h3>
                </div>
                <div className="pl-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300 space-y-3">
                  {generateAI.data!.content.split("\n").map((para, i) =>
                    para.trim() ? <p key={i}>{para}</p> : null
                  )}
                </div>
              </div>

              {/* Interactive follow-up chat */}
              <BibleStudyChat
                verseId={verse.id}
                initialReflection={generateAI.data!.content}
              />
            </motion.div>
          )}

          {generateAI.isError && !generateAI.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 p-6 bg-destructive/10 text-destructive rounded-2xl text-center border border-destructive/20"
            >
              <p>We couldn't generate that response right now. Please try again.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pb-16" />
      </motion.div>
    </main>
    </>
  );
}
