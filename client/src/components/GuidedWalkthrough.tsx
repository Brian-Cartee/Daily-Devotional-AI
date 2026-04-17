import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, X, Play, Square, Check } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";
import { getUserVoice } from "@/lib/userName";

const WALKTHROUGH_KEY = "sp_walkthrough_done";
const WALKTHROUGH_VISITS_KEY = "sp_walkthrough_visits";
const MAX_VISITS = 3;

export function recordWalkthroughVisit(): void {
  try {
    const n = parseInt(localStorage.getItem(WALKTHROUGH_VISITS_KEY) || "0", 10);
    localStorage.setItem(WALKTHROUGH_VISITS_KEY, String(n + 1));
  } catch {}
}

export function shouldShowWalkthrough(): boolean {
  try {
    if (localStorage.getItem(WALKTHROUGH_KEY)) return false;
    const visits = parseInt(localStorage.getItem(WALKTHROUGH_VISITS_KEY) || "0", 10);
    return visits <= MAX_VISITS;
  } catch {
    return false;
  }
}

function dismissWalkthrough(): void {
  try {
    localStorage.setItem(WALKTHROUGH_KEY, "1");
  } catch {}
}

const STEPS = [
  {
    id: "talk",
    title: "Talk It Through",
    subtitle: "Where everything begins",
    script: `When you're ready… this is where you begin. You can share whatever's on your heart here. Just be honest about where you are. You don't have to carry it alone.`,
  },
  {
    id: "response",
    title: "How It Responds",
    subtitle: "Personal, not generic",
    script: `When you share, the response is built around you. You'll receive scripture that speaks to your moment… a reflection shaped by what you're going through… and a prayer you can step into. Not something generic. Something personal.`,
  },
  {
    id: "journey",
    title: "Your Bible Journey",
    subtitle: "Something ongoing, not one-time",
    script: `From there, something deeper begins. A Bible journey is created around what you shared… guiding you through scripture, reflection, and meaning over time. You can move at your own pace. One step at a time.`,
  },
  {
    id: "listen",
    title: "Listen to Everything",
    subtitle: "Let it come to you",
    script: `At any point, you can listen instead of read. Your guidance… your prayer… your journey… all of it can be heard. If you'd rather listen… you can. And let it meet you where you are.`,
  },
  {
    id: "journal",
    title: "Your Journal",
    subtitle: "Keep what matters",
    script: `Along the way, you can keep what matters. A prayer that stayed with you… a verse you don't want to forget… a moment you want to come back to. Your journal becomes a place to hold what matters… and to come back to what God is doing in your life.`,
  },
];

const FULL_TOUR_SCRIPT = STEPS.map(s => s.script).join("\n\n");

interface Props {
  onDismiss: () => void;
}

export function GuidedWalkthrough({ onDismiss }: Props) {
  const [phase, setPhase] = useState<"tour" | "done">("tour");
  const voice = getUserVoice() || "shimmer";
  const tts = useTTS();

  const activeStep = Math.min(4, Math.floor((tts.progress / 100) * STEPS.length));

  useEffect(() => {
    if (phase === "tour" && tts.progress >= 99 && !tts.playing && !tts.loading) {
      const t = setTimeout(() => {
        setPhase("done");
        dismissWalkthrough();
      }, 800);
      return () => clearTimeout(t);
    }
  }, [tts.progress, tts.playing, tts.loading, phase]);

  const toggleTour = () => {
    if (tts.playing) {
      tts.stop();
    } else {
      tts.play(FULL_TOUR_SCRIPT, voice);
    }
  };

  const handleDismiss = () => {
    tts.stop();
    dismissWalkthrough();
    onDismiss();
  };

  const isStarted = tts.progress > 0 || tts.playing || tts.loading;

  const currentLabel = isStarted
    ? STEPS[activeStep].title
    : "5 sections · ~90 sec";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-primary/20 bg-card shadow-sm overflow-hidden"
    >
      <AnimatePresence mode="wait">

        {/* ── Tour phase ── */}
        {phase === "tour" && (
          <motion.div
            key="tour"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pt-3 pb-3"
          >
            {/* Single top row: icon · label · progress dots · dismiss */}
            <div className="flex items-center gap-2 mb-3">
              <Headphones className="w-3.5 h-3.5 text-primary/60 shrink-0" strokeWidth={1.8} />
              <span className="text-[11px] font-bold text-foreground/50 uppercase tracking-wide shrink-0">
                App Tour
              </span>

              {/* Progress dots inline */}
              <div className="flex gap-1 flex-1 items-center">
                {STEPS.map((s, i) => (
                  <div
                    key={s.id}
                    className={`flex-1 h-[3px] rounded-full transition-all duration-500 ${
                      !isStarted
                        ? "bg-muted/40"
                        : i < activeStep
                          ? "bg-primary/50"
                          : i === activeStep && tts.playing
                            ? "bg-primary"
                            : i === activeStep && !tts.playing && isStarted
                              ? "bg-primary/70"
                              : "bg-muted/40"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleDismiss}
                data-testid="button-walkthrough-dismiss"
                className="p-1 rounded-full hover:bg-muted/60 transition-colors shrink-0"
              >
                <X className="w-3 h-3 text-muted-foreground/50" />
              </button>
            </div>

            {/* Compact play button with section name inside */}
            <button
              onClick={toggleTour}
              data-testid="button-walkthrough-play"
              className={`w-full rounded-xl border px-3.5 py-2.5 flex items-center gap-3 transition-all ${
                tts.playing
                  ? "border-primary/40 bg-primary/8"
                  : "border-border/50 bg-muted/30 hover:border-primary/30 hover:bg-muted/50"
              }`}
            >
              {/* Play/pause circle */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                tts.playing ? "bg-primary" : "bg-primary/15"
              }`}>
                {tts.loading
                  ? <div className="w-3 h-3 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                  : tts.playing
                    ? <Square className="w-3 h-3 text-white" />
                    : <Play className="w-3 h-3 text-primary" />
                }
              </div>

              {/* Section name + state */}
              <div className="flex-1 text-left min-w-0">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={isStarted ? activeStep : "idle"}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.15 }}
                    className={`text-[13px] font-semibold leading-tight truncate ${
                      tts.playing ? "text-foreground" : "text-foreground/75"
                    }`}
                  >
                    {tts.loading ? "Preparing…" : currentLabel}
                  </motion.p>
                </AnimatePresence>

                {/* Progress bar — only while playing */}
                {tts.playing && tts.progress > 0 && (
                  <div className="mt-1.5 w-full h-[2px] rounded-full bg-primary/15 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${tts.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}

                {/* Sub-label when not playing */}
                {!tts.playing && !tts.loading && (
                  <p className="text-[11px] text-muted-foreground/45 mt-0.5 truncate">
                    {isStarted
                      ? `Paused · ${STEPS[activeStep].subtitle}`
                      : "Tap to hear how the app works"}
                  </p>
                )}
              </div>
            </button>

            {/* Skip — tiny text link */}
            <div className="flex justify-center mt-2">
              <button
                onClick={handleDismiss}
                data-testid="button-walkthrough-skip"
                className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors py-0.5"
              >
                Skip tour
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Done phase ── */}
        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-4 text-center"
          >
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-2.5">
              <Check className="w-4.5 h-4.5 text-primary" />
            </div>
            <p className="text-[15px] font-bold text-foreground mb-1">You're ready.</p>
            <p className="text-[12px] text-muted-foreground/65 leading-relaxed mb-3.5">
              Whenever you're ready, just share what's on your heart.
            </p>
            <button
              onClick={handleDismiss}
              data-testid="button-walkthrough-finish"
              className="w-full rounded-xl bg-primary text-primary-foreground text-[13px] font-bold py-2.5 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Let's go
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
