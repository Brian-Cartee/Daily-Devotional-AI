import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, ChevronRight, X, Play, Square, Check } from "lucide-react";
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
    script: `This is where everything begins. Whatever you're facing, whatever weighs on you — bring it here. There are no right words. Just yours. You don't need to have it together to start.`,
  },
  {
    id: "response",
    title: "How It Responds",
    subtitle: "Personal, not generic",
    script: `When you share, we respond personally. You'll receive scripture chosen for your moment, a reflection written for exactly what you shared, and a prayer that's yours. Not copied from somewhere. Made for you.`,
  },
  {
    id: "journey",
    title: "Your Bible Journey",
    subtitle: "Something ongoing, not one-time",
    script: `After your guidance, we build something longer — a Bible journey created around what you brought. Scripture, reflection, and meaning across multiple days. You can walk it at your own pace.`,
  },
  {
    id: "listen",
    title: "Listen to Everything",
    subtitle: "Let it come to you",
    script: `Everything in this app can be listened to. Your guidance, your devotional, your prayer — all of it. Just tap the listen button. It's designed to feel like someone speaking directly to you.`,
  },
  {
    id: "journal",
    title: "Your Journal",
    subtitle: "Keep what matters",
    script: `As you go, save what matters. A prayer that moved you. A scripture you want to carry. Your journal is a record of where you've been and what God has been doing in your life.`,
  },
];

const VOICE_OPTIONS = [
  { id: "shimmer", label: "Warm & Gentle", sample: "I'm here with you." },
  { id: "onyx",   label: "Deep & Calm",   sample: "I'm here with you." },
];

interface Props {
  onDismiss: () => void;
}

export function GuidedWalkthrough({ onDismiss }: Props) {
  const [phase, setPhase] = useState<"voice" | "steps" | "done">("voice");
  const [selectedVoice, setSelectedVoice] = useState<string>(getUserVoice());
  const [step, setStep] = useState(0);
  const tts = useTTS();
  const sampleTts = useTTS();
  const samplingVoice = useRef<string | null>(null);

  const currentStep = STEPS[step];

  const handleVoiceConfirm = () => {
    setUserVoice(selectedVoice);
    sampleTts.stop();
    setPhase("steps");
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

  const playStep = () => {
    if (tts.playing) { tts.stop(); return; }
    tts.play(currentStep.script, selectedVoice);
  };

  const handleNext = () => {
    tts.stop();
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      setPhase("done");
      dismissWalkthrough();
    }
  };

  const handleDismiss = () => {
    tts.stop();
    sampleTts.stop();
    dismissWalkthrough();
    onDismiss();
  };

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
            {phase === "voice" ? "Choose Your Voice" : phase === "done" ? "You're All Set" : `Step ${step + 1} of ${STEPS.length}`}
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
              Let us walk you through how the app works. First — pick the voice you'd like to guide you.
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
              Start the tour
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ── Phase 2: Steps ── */}
        {phase === "steps" && (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="px-4 py-4"
          >
            {/* Step progress dots */}
            <div className="flex gap-1.5 mb-4">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === step ? "w-5 bg-primary" : i < step ? "w-2.5 bg-primary/40" : "w-2.5 bg-muted/60"
                  }`}
                />
              ))}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
              {currentStep.subtitle}
            </p>
            <h3 className="text-[18px] font-bold text-foreground mb-3 leading-snug">
              {currentStep.title}
            </h3>

            {/* Listen button */}
            <button
              onClick={playStep}
              data-testid={`button-walkthrough-play-${currentStep.id}`}
              className={`w-full rounded-xl border px-4 py-3 flex items-center gap-3 transition-all mb-4 ${
                tts.playing
                  ? "border-primary/40 bg-primary/8"
                  : "border-border/50 bg-muted/30 hover:border-primary/30 hover:bg-muted/50"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                tts.playing ? "bg-primary" : "bg-primary/15"
              }`}>
                {tts.loading
                  ? <div className="w-3 h-3 rounded-full border-2 border-primary/50 border-t-primary animate-spin" />
                  : tts.playing
                    ? <Square className="w-3 h-3 text-white" />
                    : <Play className="w-3 h-3 text-primary" />
                }
              </div>
              <div className="flex-1 text-left">
                <p className={`text-[13px] font-semibold ${tts.playing ? "text-foreground" : "text-foreground/80"}`}>
                  {tts.loading ? "Preparing…" : tts.playing ? "Playing — tap to stop" : "Listen to this step"}
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
                  <p className="text-[11px] text-muted-foreground/55 mt-0.5">~15 seconds</p>
                )}
              </div>
            </button>

            <button
              onClick={handleNext}
              data-testid="button-walkthrough-next"
              className="w-full rounded-xl bg-primary text-primary-foreground text-[13px] font-bold py-3 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {step < STEPS.length - 1 ? "Next" : "Finish"}
              <ChevronRight className="w-4 h-4" />
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
