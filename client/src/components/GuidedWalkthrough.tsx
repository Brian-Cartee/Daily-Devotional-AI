import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, ChevronRight, X, Play, Square, Check, SkipForward } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";
import { getUserVoice, setUserVoice } from "@/lib/userName";

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
    script: `This is where everything begins. Whatever you're carrying… whatever's been weighing on you… you can bring it here. You don't need the right words. You don't need to have it all figured out. Just start where you are. You don't have to carry this alone.`,
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
    script: `At any point, you can listen instead of read. Your guidance… your prayer… your journey… all of it can be heard. Just tap listen. And let it meet you where you are.`,
  },
  {
    id: "journal",
    title: "Your Journal",
    subtitle: "Keep what matters",
    script: `Along the way, you can keep what matters. A prayer that stayed with you… a verse you don't want to forget… a moment you want to come back to. Your journal becomes a record… of where you've been… and what God has been doing in your life.`,
  },
];

// Full concatenated tour script — all 5 sections played as one continuous audio
const FULL_TOUR_SCRIPT = STEPS.map(s => s.script).join("\n\n");

const VOICE_OPTIONS = [
  { id: "shimmer", label: "Warm & Gentle", sample: "I'm here with you." },
  { id: "onyx",   label: "Deep & Calm",   sample: "I'm here with you." },
];

interface Props {
  onDismiss: () => void;
}

export function GuidedWalkthrough({ onDismiss }: Props) {
  const [phase, setPhase] = useState<"voice" | "tour" | "done">("voice");
  const [selectedVoice, setSelectedVoice] = useState<string>(getUserVoice());
  const tts = useTTS();
  const sampleTts = useTTS();
  const samplingVoice = useRef<string | null>(null);

  // Derive current highlighted step from overall progress (0–100 split across 5 sections)
  const activeStep = Math.min(4, Math.floor((tts.progress / 100) * STEPS.length));

  // Mark done when full audio completes
  useEffect(() => {
    if (phase === "tour" && tts.progress >= 99 && !tts.playing && !tts.loading) {
      const t = setTimeout(() => {
        setPhase("done");
        dismissWalkthrough();
      }, 800);
      return () => clearTimeout(t);
    }
  }, [tts.progress, tts.playing, tts.loading, phase]);

  const handleVoiceConfirm = () => {
    setUserVoice(selectedVoice);
    sampleTts.stop();
    setPhase("tour");
  };

  const playSample = (voiceId: string) => {
    if (samplingVoice.current === voiceId && sampleTts.playing) {
      sampleTts.stop();
      samplingVoice.current = null;
      return;
    }
    samplingVoice.current = voiceId;
    sampleTts.play(VOICE_OPTIONS.find(v => v.id === voiceId)!.sample, voiceId);
  };

  const toggleTour = () => {
    if (tts.playing) {
      tts.stop();
    } else {
      tts.play(FULL_TOUR_SCRIPT, selectedVoice);
    }
  };

  const handleDismiss = () => {
    tts.stop();
    sampleTts.stop();
    dismissWalkthrough();
    onDismiss();
  };

  const isStarted = tts.progress > 0 || tts.playing || tts.loading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-primary/20 bg-card shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-primary/70" strokeWidth={1.8} />
          <span className="text-[12px] font-bold text-foreground/70 uppercase tracking-wide">
            {phase === "voice" ? "App Tour" : phase === "done" ? "You're All Set" : "App Tour"}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          data-testid="button-walkthrough-dismiss"
          className="p-1.5 rounded-full hover:bg-muted/60 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground/60" />
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* ── Phase 1: Voice selection ── */}
        {phase === "voice" && (
          <motion.div
            key="voice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-4"
          >
            <p className="text-[13px] text-foreground/75 leading-relaxed mb-4">
              A quick audio tour of the app — about 90 seconds. First, pick the voice.
            </p>
            <div className="flex gap-2.5 mb-4">
              {VOICE_OPTIONS.map(v => (
                <div
                  key={v.id}
                  role="button"
                  tabIndex={0}
                  data-testid={`button-voice-${v.id}`}
                  onClick={() => setSelectedVoice(v.id)}
                  onKeyDown={e => e.key === "Enter" && setSelectedVoice(v.id)}
                  className={`flex-1 rounded-xl border px-3 py-3 text-left transition-all cursor-pointer ${
                    selectedVoice === v.id
                      ? "border-primary bg-primary/8"
                      : "border-border/60 bg-muted/30 hover:border-primary/40"
                  }`}
                >
                  <p className="text-[13px] font-bold text-foreground capitalize mb-0.5">{v.id}</p>
                  <p className="text-[11px] text-muted-foreground/70">{v.label}</p>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); playSample(v.id); }}
                    data-testid={`button-sample-${v.id}`}
                    className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-primary/70 hover:text-primary transition-colors"
                  >
                    {sampleTts.playing && samplingVoice.current === v.id
                      ? <><Square className="w-2.5 h-2.5" /> Stop</>
                      : <><Play className="w-2.5 h-2.5" /> Hear it</>
                    }
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleVoiceConfirm}
              data-testid="button-walkthrough-start"
              className="w-full rounded-xl bg-primary text-primary-foreground text-[13px] font-bold py-3 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ── Phase 2: Full tour — single play button ── */}
        {phase === "tour" && (
          <motion.div
            key="tour"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-4"
          >
            {/* Section progress indicator */}
            <div className="flex gap-1.5 mb-4">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                    !isStarted
                      ? "bg-muted/50"
                      : i < activeStep
                        ? "bg-primary/50"
                        : i === activeStep && tts.playing
                          ? "bg-primary"
                          : i === activeStep && !tts.playing && isStarted
                            ? "bg-primary/70"
                            : "bg-muted/50"
                  }`}
                />
              ))}
            </div>

            {/* Current section label — updates as audio progresses */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isStarted ? activeStep : "idle"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="mb-3"
              >
                {isStarted ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/55 mb-0.5">
                      {STEPS[activeStep].subtitle}
                    </p>
                    <p className="text-[16px] font-bold text-foreground leading-snug">
                      {STEPS[activeStep].title}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/55 mb-0.5">
                      5 sections · ~90 seconds
                    </p>
                    <p className="text-[16px] font-bold text-foreground leading-snug">
                      Tap play to begin
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Single play/pause button */}
            <button
              onClick={toggleTour}
              data-testid="button-walkthrough-play"
              className={`w-full rounded-xl border px-4 py-3.5 flex items-center gap-3 transition-all mb-3 ${
                tts.playing
                  ? "border-primary/40 bg-primary/8"
                  : "border-border/50 bg-muted/30 hover:border-primary/30 hover:bg-muted/50"
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                tts.playing ? "bg-primary" : "bg-primary/15"
              }`}>
                {tts.loading
                  ? <div className="w-3.5 h-3.5 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                  : tts.playing
                    ? <Square className="w-3.5 h-3.5 text-white" />
                    : <Play className="w-3.5 h-3.5 text-primary" />
                }
              </div>
              <div className="flex-1 text-left">
                <p className={`text-[13px] font-semibold leading-tight ${tts.playing ? "text-foreground" : "text-foreground/80"}`}>
                  {tts.loading
                    ? "Preparing…"
                    : tts.playing
                      ? "Playing — tap to pause"
                      : isStarted
                        ? "Resume tour"
                        : "Play full tour"}
                </p>
                {tts.playing && tts.progress > 0 && (
                  <div className="mt-1.5 w-full h-1 rounded-full bg-primary/15 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${tts.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
                {!tts.playing && !tts.loading && (
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                    {isStarted ? `${STEPS[activeStep].title} — paused` : "5 sections played continuously"}
                  </p>
                )}
              </div>
            </button>

            <button
              onClick={handleDismiss}
              data-testid="button-walkthrough-skip"
              className="w-full rounded-xl text-[12px] font-semibold py-2.5 text-muted-foreground/60 hover:text-muted-foreground flex items-center justify-center gap-1.5 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip tour
            </button>
          </motion.div>
        )}

        {/* ── Phase 3: Done ── */}
        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-5 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
              <Check className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[15px] font-bold text-foreground mb-1.5">You're ready.</p>
            <p className="text-[13px] text-muted-foreground/70 leading-relaxed mb-4">
              Whenever you're ready, just share what's on your heart. We'll take it from there.
            </p>
            <button
              onClick={handleDismiss}
              data-testid="button-walkthrough-finish"
              className="w-full rounded-xl bg-primary text-primary-foreground text-[13px] font-bold py-3 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Let's go
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
