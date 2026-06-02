import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ThresholdBreath } from "@/components/threshold/ThresholdBreath";
import {
  isThresholdComplete,
  isThresholdReplay,
  markThresholdComplete,
  type ThresholdNeed,
} from "@/lib/thresholdState";
import {
  setUserNameAsync,
  markNamePrompted,
  getUserName,
  hasBeenPrompted,
  syncUserNameFromServer,
} from "@/lib/userName";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion";
import { fireHaptic } from "@/lib/haptics";
import { getThresholdInteractionProfile } from "@/lib/thresholdModePlan";

type Step = "arrive" | "promise" | "need" | "sync-name" | "name" | "breath" | "enter";

const NEED_OPTIONS: { id: ThresholdNeed; label: string; sub: string }[] = [
  { id: "peace", label: "Peace", sub: "Help me settle." },
  { id: "grief", label: "Grief", sub: "Help me carry this." },
  { id: "battle", label: "Battle", sub: "Help me stand." },
  { id: "stillness", label: "Stillness", sub: "Help me be quiet." },
  { id: "worship", label: "Worship", sub: "Help me adore." },
  { id: "deep-dive", label: "Scripture Deep Dive", sub: "Help me go deeper." },
  { id: "morning-surrender", label: "Morning Surrender", sub: "Help me begin." },
  { id: "night-prayer", label: "Night Prayer", sub: "Help me release today." },
  { id: "gratitude", label: "Gratitude", sub: "Help me remember." },
];

export default function ThresholdArrivalPage() {
  const [, navigate] = useLocation();
  const reduceMotion = useReducedMotionPreference();
  const [step, setStep] = useState<Step>("arrive");
  const [need, setNeed] = useState<ThresholdNeed | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [arriveReady, setArriveReady] = useState(false);
  const [showAllModes, setShowAllModes] = useState(false);
  const [nameKnown, setNameKnown] = useState(() => !!getUserName() || hasBeenPrompted());
  const [nameHydrated, setNameHydrated] = useState(() => !!getUserName() || hasBeenPrompted());
  const interaction = getThresholdInteractionProfile(need);

  useEffect(() => {
    if (!isThresholdReplay() && isThresholdComplete()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    void syncUserNameFromServer().then((name) => {
      if (!active) return;
      if (name || hasBeenPrompted()) setNameKnown(true);
      setNameHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (step !== "sync-name" || !nameHydrated) return;
    setStep(nameKnown ? "breath" : "name");
  }, [step, nameHydrated, nameKnown]);

  useEffect(() => {
    if (step !== "arrive") return;
    const readyTimer = setTimeout(() => setArriveReady(true), 1400);
    const autoTimer = setTimeout(() => setStep("promise"), 12_000);
    return () => {
      clearTimeout(readyTimer);
      clearTimeout(autoTimer);
    };
  }, [step]);

  const finish = useCallback(() => {
    fireHaptic("medium");
    markThresholdComplete(need ?? undefined);
    navigate("/", { replace: true });
  }, [navigate, need]);

  const handleNeed = (n: ThresholdNeed) => {
    fireHaptic("soft");
    setNeed(n);
    if (nameKnown) {
      setStep("breath");
      return;
    }
    if (!nameHydrated) {
      setStep("sync-name");
      return;
    }
    setStep("name");
  };

  const modeLine = (() => {
    switch (need) {
      case "peace":
        return "Let your shoulders drop. We'll move softly.";
      case "grief":
        return "You don't have to carry this by yourself.";
      case "battle":
        return "You are not weak for needing help.";
      case "worship":
        return "Let's turn our attention toward God.";
      case "gratitude":
        return "Let's remember goodness and give thanks.";
      case "stillness":
        return "The quiet is enough. You can just breathe here.";
      case "deep-dive":
        return "Let's sit with Scripture until it speaks.";
      case "morning-surrender":
        return "A small yes is enough to begin the day.";
      case "night-prayer":
        return "You can release today into God's care.";
      case "honesty":
        return "Honesty is not failure. It's the door.";
      case "hope":
        return "Hope can be small. It still counts.";
      default:
        return "You're welcome here - exactly as you are.";
    }
  })();

  const visibleModes = showAllModes ? NEED_OPTIONS : NEED_OPTIONS.slice(0, 5);

  const handleNameContinue = async () => {
    const trimmed = nameInput.trim();
    fireHaptic("soft");
    if (trimmed) {
      await setUserNameAsync(trimmed);
      setNameKnown(true);
    } else {
      markNamePrompted();
      setNameKnown(true);
    }
    setStep("breath");
  };

  const fade = {
    initial: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 },
    transition: {
      duration: reduceMotion ? 0.12 : interaction.settleFadeSeconds,
      ease: [0.22, 1, 0.36, 1],
    },
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col"
      data-testid="threshold-arrival"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Shepherd's Path"
      style={{
        background: "linear-gradient(175deg, #1e0d50 0%, #130636 45%, #09031e 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 38%, rgba(110,50,220,0.32) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-[max(2.75rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <p className="sr-only" aria-live="polite">
          {step === "arrive"
            ? "Arrival screen. You don't have to be okay to come in."
            : step === "promise"
              ? "Gentle promise screen."
              : step === "need"
                ? "Choose what you need right now."
                : step === "name"
                  ? "Optional name screen."
                  : step === "breath"
                    ? "Stillness screen."
                    : "Final welcome screen."}
        </p>
        <AnimatePresence mode="wait">
          {step === "arrive" && (
            <motion.div
              key="arrive"
              {...fade}
              className="flex flex-col items-center text-center max-w-md"
            >
              <p
                className="text-[1.35rem] sm:text-[1.5rem] leading-snug text-white/90 font-medium"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                You don&apos;t have to be okay to come in.
              </p>
              <p className="mt-4 text-[14px] text-white/52 leading-relaxed">
                This is a quiet place. Nothing to prove.
              </p>
              {arriveReady && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  type="button"
                  data-testid="btn-threshold-arrive-continue"
                  onClick={() => {
                    fireHaptic("soft");
                    setStep("promise");
                  }}
                  className="mt-12 min-h-[44px] text-[14px] font-semibold text-white/65 hover:text-white px-6 py-2.5 rounded-full border border-white/15 hover:border-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70"
                >
                  Come in
                </motion.button>
              )}
            </motion.div>
          )}

          {step === "promise" && (
            <motion.div
              key="promise"
              {...fade}
              className="flex flex-col items-center text-center max-w-md"
            >
              <p
                className="text-[1.2rem] sm:text-[1.3rem] leading-snug text-white/90 font-medium"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                We&apos;ll go gently.
              </p>
              <p className="mt-4 text-[14px] text-white/56 leading-relaxed">
                No noise. No shame. No pressure.
              </p>
              <button
                type="button"
                data-testid="btn-threshold-promise-continue"
                onClick={() => {
                  fireHaptic("soft");
                  setStep("need");
                }}
                className="mt-10 min-h-[44px] text-[14px] font-semibold text-white/70 hover:text-white px-6 py-2.5 rounded-full border border-white/15 hover:border-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70"
              >
                Okay
              </button>
            </motion.div>
          )}

          {step === "need" && (
            <motion.div key="need" {...fade} className="w-full max-w-sm">
              <p className="text-center text-[1.1rem] text-white/88 font-medium mb-2">
                What do you need right now?
              </p>
              <p className="text-center text-[13px] text-white/48 mb-7">
                Just for today. You can change this anytime.
              </p>
              <div className="flex flex-col gap-3">
                {visibleModes.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`btn-threshold-need-${opt.id}`}
                    aria-label={`${opt.label}: ${opt.sub}`}
                    onClick={() => handleNeed(opt.id)}
                    className="w-full min-h-[56px] text-left rounded-2xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/22 px-5 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70"
                  >
                    <span className="block text-[16px] font-semibold text-white/92">{opt.label}</span>
                    <span className="block text-[13px] text-white/50 mt-0.5">{opt.sub}</span>
                  </button>
                ))}
                {!showAllModes && (
                  <button
                    type="button"
                    data-testid="btn-threshold-show-more-modes"
                    onClick={() => {
                      fireHaptic("soft");
                      setShowAllModes(true);
                    }}
                    className="min-h-[44px] text-[13px] font-semibold text-white/56 hover:text-white/80 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70 rounded-lg"
                  >
                    More modes
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === "name" && (
            <motion.div key="name" {...fade} className="w-full max-w-sm text-center">
              <p className="text-[1.1rem] text-white/88 font-medium mb-2">How should we greet you?</p>
              <p className="text-[13px] text-white/45 mb-6">Only if it helps this feel personal.</p>
              <input
                data-testid="input-threshold-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleNameContinue()}
                placeholder="Your first name"
                autoComplete="given-name"
                aria-label="Your first name"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[16px] text-white placeholder:text-white/35 outline-none focus:border-violet-400/50"
              />
              <button
                type="button"
                data-testid="btn-threshold-name-continue"
                onClick={() => void handleNameContinue()}
                className="mt-6 w-full min-h-[48px] rounded-xl bg-violet-600/90 hover:bg-violet-600 text-white font-semibold py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80"
              >
                Continue
              </button>
              <button
                type="button"
                data-testid="btn-threshold-name-skip"
                onClick={() => {
                  fireHaptic("soft");
                  markNamePrompted();
                  setStep("breath");
                }}
                className="mt-4 min-h-[44px] px-3 text-[13px] text-white/45 hover:text-white/65 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70"
              >
                Skip
              </button>
            </motion.div>
          )}

          {step === "sync-name" && (
            <motion.div key="sync-name" {...fade} className="w-full max-w-sm text-center">
              <p className="text-[1.05rem] text-white/82 font-medium mb-2">
                Setting this up for you...
              </p>
              <p className="text-[13px] text-white/50 leading-relaxed">
                We&apos;re checking your saved profile so we don&apos;t ask twice.
              </p>
            </motion.div>
          )}

          {step === "breath" && (
            <motion.div key="breath" {...fade} className="w-full">
              <ThresholdBreath mode={need} onDone={() => setStep("enter")} />
            </motion.div>
          )}

          {step === "enter" && (
            <motion.div key="enter" {...fade} className="flex flex-col items-center text-center max-w-md">
              <p
                className="text-[1.2rem] text-white/88 leading-relaxed"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                {modeLine}
              </p>
              <button
                type="button"
                data-testid="btn-threshold-enter"
                onClick={finish}
                className="mt-12 w-full max-w-xs min-h-[50px] rounded-xl bg-white text-[#130636] font-bold text-[16px] py-4 hover:bg-white/95 transition-colors shadow-lg shadow-violet-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-100"
              >
                Step inside
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
