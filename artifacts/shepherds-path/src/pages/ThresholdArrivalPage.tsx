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
import { setUserName, markNamePrompted } from "@/lib/userName";

type Step = "arrive" | "need" | "name" | "breath" | "enter";

const NEED_OPTIONS: { id: ThresholdNeed; label: string; sub: string }[] = [
  { id: "comfort", label: "Comfort", sub: "I need gentleness" },
  { id: "honesty", label: "Honesty", sub: "I need to tell the truth" },
  { id: "hope", label: "Hope", sub: "I need to believe again" },
];

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

export default function ThresholdArrivalPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("arrive");
  const [need, setNeed] = useState<ThresholdNeed | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [arriveReady, setArriveReady] = useState(false);

  useEffect(() => {
    if (!isThresholdReplay() && isThresholdComplete()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (step !== "arrive") return;
    const readyTimer = setTimeout(() => setArriveReady(true), 2500);
    const autoTimer = setTimeout(() => setStep("need"), 10_000);
    return () => {
      clearTimeout(readyTimer);
      clearTimeout(autoTimer);
    };
  }, [step]);

  const finish = useCallback(() => {
    markThresholdComplete(need ?? undefined);
    if (need === "honesty") {
      navigate("/sigh", { replace: true });
      return;
    }
    navigate("/", { replace: true });
  }, [navigate, need]);

  const handleNeed = (n: ThresholdNeed) => {
    setNeed(n);
    setStep("name");
  };

  const handleNameContinue = () => {
    const trimmed = nameInput.trim();
    if (trimmed) setUserName(trimmed);
    else markNamePrompted();
    setStep("breath");
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col"
      data-testid="threshold-arrival"
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

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
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
              {arriveReady && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  type="button"
                  data-testid="btn-threshold-arrive-continue"
                  onClick={() => setStep("need")}
                  className="mt-12 text-[14px] font-semibold text-white/65 hover:text-white px-6 py-2.5 rounded-full border border-white/15 hover:border-white/30 transition-colors"
                >
                  When you&apos;re ready
                </motion.button>
              )}
            </motion.div>
          )}

          {step === "need" && (
            <motion.div key="need" {...fade} className="w-full max-w-sm">
              <p className="text-center text-[1.1rem] text-white/88 font-medium mb-8">
                What brought you here?
              </p>
              <div className="flex flex-col gap-3">
                {NEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`btn-threshold-need-${opt.id}`}
                    onClick={() => handleNeed(opt.id)}
                    className="w-full text-left rounded-2xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/22 px-5 py-4 transition-colors"
                  >
                    <span className="block text-[16px] font-semibold text-white/92">{opt.label}</span>
                    <span className="block text-[13px] text-white/50 mt-0.5">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "name" && (
            <motion.div key="name" {...fade} className="w-full max-w-sm text-center">
              <p className="text-[1.1rem] text-white/88 font-medium mb-2">What may we call you?</p>
              <p className="text-[13px] text-white/45 mb-6">Optional — only to greet you gently.</p>
              <input
                data-testid="input-threshold-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameContinue()}
                placeholder="Your first name"
                autoComplete="given-name"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[16px] text-white placeholder:text-white/35 outline-none focus:border-violet-400/50"
              />
              <button
                type="button"
                data-testid="btn-threshold-name-continue"
                onClick={handleNameContinue}
                className="mt-6 w-full rounded-xl bg-violet-600/90 hover:bg-violet-600 text-white font-semibold py-3.5 transition-colors"
              >
                Continue
              </button>
              <button
                type="button"
                data-testid="btn-threshold-name-skip"
                onClick={() => {
                  markNamePrompted();
                  setStep("breath");
                }}
                className="mt-4 text-[13px] text-white/45 hover:text-white/65 transition-colors"
              >
                Not now
              </button>
            </motion.div>
          )}

          {step === "breath" && (
            <motion.div key="breath" {...fade} className="w-full">
              <ThresholdBreath onDone={() => setStep("enter")} />
            </motion.div>
          )}

          {step === "enter" && (
            <motion.div key="enter" {...fade} className="flex flex-col items-center text-center max-w-md">
              <p
                className="text-[1.2rem] text-white/88 leading-relaxed"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                {need === "honesty"
                  ? "Honesty is not failure. It\u2019s the door."
                  : need === "hope"
                    ? "Hope can be small. It still counts."
                    : "You\u2019re welcome here\u2014exactly as you are."}
              </p>
              <button
                type="button"
                data-testid="btn-threshold-enter"
                onClick={finish}
                className="mt-12 w-full max-w-xs rounded-xl bg-white text-[#130636] font-bold text-[16px] py-4 hover:bg-white/95 transition-colors shadow-lg shadow-violet-900/30"
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
