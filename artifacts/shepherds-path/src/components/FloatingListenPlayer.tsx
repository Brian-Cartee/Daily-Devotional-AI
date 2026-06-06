import { ChevronLeft, ChevronRight, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { useTTS } from "@/hooks/use-tts";
import { getUserVoice } from "@/lib/userName";
import type { ListenScope } from "@/lib/listenPolicy";

type TTSControls = ReturnType<typeof useTTS>;

type Props = {
  titleLine: string;
  listenText: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  tts: TTSControls;
  scope?: ListenScope;
  onListenStart?: () => void;
  onListenStop?: () => void;
  testId?: string;
};

export function FloatingListenPlayer({
  titleLine,
  listenText,
  canPrev,
  canNext,
  onPrev,
  onNext,
  tts,
  scope = "snippet",
  onListenStart,
  onListenStop,
  testId = "floating-listen-player",
}: Props) {
  const { playing, loading, loadingLong, error, blocked, progress, toggle, resumeAfterBlock } = tts;

  const handlePlay = () => {
    if (!listenText.trim()) return;
    if (blocked) {
      resumeAfterBlock();
      onListenStart?.();
      return;
    }
    if (playing) {
      toggle(listenText, getUserVoice(), { scope });
      onListenStop?.();
      return;
    }
    onListenStart?.();
    toggle(listenText, getUserVoice(), { scope });
  };

  const statusLabel = () => {
    if (blocked) return "Tap to play";
    if (loading && loadingLong) return "Still preparing…";
    if (loading) return "Preparing…";
    if (error) return "Try again";
    if (playing) return "Playing";
    return "Listen";
  };

  if (!listenText.trim()) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.22 }}
        className="fixed bottom-[4.75rem] left-3 right-3 z-40 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-md pointer-events-none"
        data-testid={testId}
      >
        <div className="pointer-events-auto rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-xl shadow-black/10 overflow-hidden">
          {playing && (
            <div className="h-0.5 bg-muted/40">
              <div
                className="h-full bg-primary transition-all duration-300 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="px-3 pt-2 pb-2.5">
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate mb-2">
              {titleLine}
              <span className="normal-case font-medium text-muted-foreground/60"> · {statusLabel()}</span>
            </p>
            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={onPrev}
                disabled={!canPrev}
                aria-label="Previous"
                data-testid={`${testId}-prev`}
                className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handlePlay}
                disabled={(loading && !playing) || !listenText.trim()}
                aria-label={playing ? "Pause audio" : "Play audio"}
                data-testid={`${testId}-play`}
                className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 transition-opacity shrink-0"
              >
                {loading && !playing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : error ? (
                  <RotateCcw className="w-6 h-6" />
                ) : playing ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onNext}
                disabled={!canNext}
                aria-label="Next"
                data-testid={`${testId}-next`}
                className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors shrink-0"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
