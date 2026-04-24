import { useState, useEffect, useCallback } from "react";
import { useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, BookOpen, Lightbulb, Eye, EyeOff } from "lucide-react";
import { ALL_JOURNEYS, type Journey, type GuidedChapter } from "@/data/journeys";
import { BiblePassageText } from "@/components/BiblePassageText";
import { useQuery } from "@tanstack/react-query";

function usePassageText(apiRef: string, enabled: boolean) {
  const url = `/api/bible?ref=${encodeURIComponent(apiRef)}`;
  return useQuery<{ text: string; reference: string }>({ queryKey: [url], enabled });
}

const SLIDE_VARIANTS = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

type ViewMode = "summary" | "scripture" | "why";

export default function PresentMode() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const journeyId = params.get("j");
  const startChapter = params.get("c");

  const journey = journeyId ? ALL_JOURNEYS.find(j => j.id === journeyId) ?? null : null;

  const startIdx = journey && startChapter
    ? Math.max(0, journey.entries.findIndex(e => e.id === startChapter))
    : 0;

  const [index, setIndex] = useState(startIdx);
  const [dir, setDir] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [showControls, setShowControls] = useState(true);
  const [controlTimer, setControlTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const chapter: GuidedChapter | null = journey ? journey.entries[index] ?? null : null;
  const scriptureQuery = usePassageText(chapter?.apiRef ?? "", viewMode === "scripture");

  const navigate = useCallback((delta: number) => {
    if (!journey) return;
    const next = index + delta;
    if (next < 0 || next >= journey.entries.length) return;
    setDir(delta);
    setIndex(next);
    setViewMode("summary");
  }, [index, journey]);

  const cycleView = useCallback(() => {
    setViewMode(v => {
      if (v === "summary") return "why";
      if (v === "why") return "scripture";
      return "summary";
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        navigate(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === "Escape") {
        window.close();
        window.history.back();
      } else if (e.key === "Enter" || e.key === "v" || e.key === "V") {
        cycleView();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, cycleView]);

  const resetControlTimer = useCallback(() => {
    setShowControls(true);
    if (controlTimer) clearTimeout(controlTimer);
    const t = setTimeout(() => setShowControls(false), 4000);
    setControlTimer(t);
  }, [controlTimer]);

  useEffect(() => {
    resetControlTimer();
    return () => { if (controlTimer) clearTimeout(controlTimer); };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resetControlTimer);
    window.addEventListener("touchstart", resetControlTimer);
    return () => {
      window.removeEventListener("mousemove", resetControlTimer);
      window.removeEventListener("touchstart", resetControlTimer);
    };
  }, [resetControlTimer]);

  if (!journey || !chapter) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <p className="text-xl font-semibold opacity-60">Journey not found</p>
          <button onClick={() => window.history.back()} className="text-sm underline opacity-40 hover:opacity-70">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const total = journey.entries.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const viewLabel = viewMode === "summary" ? "Passage Summary" : viewMode === "why" ? "Why It Matters" : chapter.reference;

  return (
    <div
      className="fixed inset-0 bg-slate-950 text-white flex flex-col select-none overflow-hidden"
      onClick={resetControlTimer}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 opacity-20 pointer-events-none transition-all duration-700 ${
        viewMode === "summary" ? "bg-gradient-to-br from-indigo-900 via-slate-950 to-slate-950" :
        viewMode === "why"     ? "bg-gradient-to-br from-amber-900 via-slate-950 to-slate-950" :
                                 "bg-gradient-to-br from-teal-900 via-slate-950 to-slate-950"
      }`} />

      {/* Top bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="relative z-20 flex items-center justify-between px-8 pt-6 pb-2"
          >
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-black uppercase tracking-[0.15em] text-white/50">
                {journey.title}
              </span>
              <span className="text-white/20">·</span>
              <span className="text-[13px] text-white/40 font-medium">
                {index + 1} of {total}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.history.back()}
                data-testid="btn-present-close"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Exit (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="relative z-10 h-0.5 bg-white/10 mx-8 rounded-full overflow-hidden mt-2">
        <motion.div
          className="h-full bg-white/40 rounded-full"
          animate={{ width: `${((index + 1) / total) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8 sm:px-16 lg:px-24 overflow-hidden">
        <AnimatePresence custom={dir} mode="wait">
          <motion.div
            key={`${chapter.id}-${viewMode}`}
            custom={dir}
            variants={SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-full max-w-5xl mx-auto text-center space-y-8"
          >
            {/* View mode label */}
            <div className="flex items-center justify-center gap-2">
              <span className={`text-[11px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border transition-colors duration-300 ${
                viewMode === "summary"   ? "text-indigo-300 border-indigo-500/40 bg-indigo-500/10" :
                viewMode === "why"       ? "text-amber-300 border-amber-500/40 bg-amber-500/10" :
                                           "text-teal-300 border-teal-500/40 bg-teal-500/10"
              }`}>
                {viewLabel}
              </span>
            </div>

            {/* Passage heading */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                {chapter.title}
              </h1>
              <p className={`text-xl sm:text-2xl font-semibold transition-colors duration-300 ${
                viewMode === "scripture" ? "text-teal-300" : "text-white/50"
              }`}>
                {chapter.reference}
              </p>
            </div>

            {/* Content body */}
            {viewMode === "summary" && (
              <p className="text-xl sm:text-2xl lg:text-[1.65rem] text-white/85 leading-relaxed font-light max-w-4xl mx-auto">
                {chapter.summary}
              </p>
            )}

            {viewMode === "why" && (
              <p className="text-xl sm:text-2xl lg:text-[1.65rem] text-amber-100/90 leading-relaxed font-light max-w-4xl mx-auto">
                {chapter.whyItMatters}
              </p>
            )}

            {viewMode === "scripture" && (
              <div className="max-w-3xl mx-auto">
                {scriptureQuery.isLoading && (
                  <p className="text-white/40 text-lg animate-pulse">Loading scripture…</p>
                )}
                {scriptureQuery.data && (
                  <BiblePassageText
                    text={scriptureQuery.data.text}
                    className="text-lg sm:text-xl lg:text-2xl text-teal-100/90 leading-relaxed font-light text-left"
                    verseNumClassName="text-[0.6em] font-bold text-teal-300/60 mr-1 select-none"
                  />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="relative z-20 flex items-center justify-between px-8 pb-8 pt-3 gap-4"
          >
            {/* Prev */}
            <button
              onClick={() => navigate(-1)}
              disabled={isFirst}
              data-testid="btn-present-prev"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-sm font-semibold"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            {/* View cycle */}
            <div className="flex items-center gap-2">
              <button
                onClick={cycleView}
                data-testid="btn-present-view"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-sm font-medium"
                title="Cycle view (Enter)"
              >
                {viewMode === "summary" ? <Lightbulb className="w-4 h-4 text-amber-400" /> :
                 viewMode === "why"     ? <BookOpen className="w-4 h-4 text-teal-400" /> :
                                         <Eye className="w-4 h-4 text-indigo-400" />}
                <span className="hidden sm:inline">
                  {viewMode === "summary" ? "Why It Matters" : viewMode === "why" ? "Read Scripture" : "Summary"}
                </span>
              </button>
            </div>

            {/* Next */}
            <button
              onClick={() => navigate(1)}
              disabled={isLast}
              data-testid="btn-present-next"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-sm font-semibold"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard hint — fades after first show */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[11px] text-white/20 pointer-events-none"
          >
            <span>← → Navigate</span>
            <span>·</span>
            <span>Enter  Cycle view</span>
            <span>·</span>
            <span>Esc  Exit</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
