import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, HandHelping, HeartHandshake, Loader2 } from "lucide-react";
import { useDailyVerse, useGenerateAI } from "@/hooks/use-verses";
import { AILoadingState } from "@/components/AILoadingState";
import { AIResponseCard } from "@/components/AIResponseCard";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: verse, isLoading: isVerseLoading, error: verseError } = useDailyVerse();
  const generateAI = useGenerateAI();
  const [activeType, setActiveType] = useState<"reflection" | "prayer" | null>(null);

  const handleGenerate = (type: "reflection" | "prayer") => {
    if (!verse) return;
    setActiveType(type);
    generateAI.mutate({ verseId: verse.id, type });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
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
        <div className="glass-card p-10 rounded-3xl text-center max-w-md">
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

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background via-background to-accent/10 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-3xl mx-auto"
      >
        {/* Header */}
        <motion.header variants={itemVariants} className="text-center mb-16">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide mb-6">
            Daily Bread
          </div>
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">
            {new Date(verse.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </motion.header>

        {/* Verse Section */}
        <motion.section variants={itemVariants} className="text-center mb-16 relative">
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-9xl text-primary/5 font-serif leading-none select-none pointer-events-none">
            "
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-slate-800 dark:text-slate-100 leading-snug sm:leading-tight mb-8 text-balance">
            {verse.text}
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-border" />
            <p className="font-semibold text-lg text-primary tracking-wide">
              {verse.reference}
            </p>
            <div className="h-px w-12 bg-border" />
          </div>
        </motion.section>

        {/* Encouragement Message */}
        <motion.section variants={itemVariants} className="mb-12">
          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl p-8 border border-white/20 text-center shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
              {verse.encouragement}
            </p>
          </div>
        </motion.section>

        {/* Action Buttons */}
        <motion.section variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Button
            size="lg"
            onClick={() => handleGenerate("reflection")}
            disabled={generateAI.isPending}
            className={`
              rounded-full px-8 py-6 text-base shadow-lg transition-all duration-300
              ${activeType === "reflection" && generateAI.isPending 
                ? "bg-primary/80 scale-95" 
                : "bg-primary hover:bg-primary/90 hover:shadow-primary/25 hover:-translate-y-1"}
            `}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Reflect with AI
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            onClick={() => handleGenerate("prayer")}
            disabled={generateAI.isPending}
            className={`
              rounded-full px-8 py-6 text-base border-2 transition-all duration-300 bg-white/50 backdrop-blur-sm
              ${activeType === "prayer" && generateAI.isPending 
                ? "bg-secondary/10 border-secondary/30 scale-95" 
                : "border-secondary/20 text-secondary-foreground hover:bg-secondary hover:text-white hover:border-secondary hover:shadow-xl hover:shadow-secondary/20 hover:-translate-y-1"}
            `}
          >
            {/* Using a heart icon as prayer hands might not be in base lucide-react */}
            <HeartHandshake className="w-5 h-5 mr-2" />
            Generate Prayer
          </Button>
        </motion.section>

        {/* AI Response Area */}
        <AnimatePresence mode="wait">
          {generateAI.isPending && activeType && (
            <AILoadingState key="loading" type={activeType} />
          )}
          
          {generateAI.isSuccess && generateAI.data && activeType && !generateAI.isPending && (
            <AIResponseCard 
              key="response" 
              type={activeType} 
              content={generateAI.data.content} 
            />
          )}

          {generateAI.isError && !generateAI.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 p-6 bg-destructive/10 text-destructive rounded-2xl text-center border border-destructive/20"
            >
              <p>We're sorry, we couldn't generate the response right now. Please try again.</p>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </main>
  );
}
