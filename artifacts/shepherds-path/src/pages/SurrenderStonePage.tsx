import { useCallback, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { saveSurrenderEntry } from "@/lib/surrenderStone";
import { getSessionId } from "@/lib/session";
import { apiSessionExtras } from "@/lib/requestExtras";
import { waitMs } from "@/lib/pauseEngine";
import { markReturnToHomePaths, navigateBackToHomePaths } from "@/lib/homePathsNav";

type Step = "invite" | "hold" | "release" | "scripture" | "stillness" | "close";

const HOLD_MS = 2_500;
const STILLNESS_MS = 15_000;
const SCRIPTURE = {
  text: "Cast all your anxiety on him because he cares for you.",
  reference: "1 Peter 5:7",
};

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.45 },
};

export default function SurrenderStonePage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("invite");
  const [phrase, setPhrase] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);
  const [fadePhrase, setFadePhrase] = useState(1);
  const [stillnessProgress, setStillnessProgress] = useState(0);
  const holdingRef = useRef(false);
  const holdStartRef = useRef(0);
  const holdFrameRef = useRef<number | null>(null);

  const onHoldStart = useCallback(() => {
    if (!phrase.trim() || step !== "hold") return;
    holdingRef.current = true;
    holdStartRef.current = Date.now();
    const tick = () => {
      if (!holdingRef.current) return;
      const p = Math.min(1, (Date.now() - holdStartRef.current) / HOLD_MS);
      setHoldProgress(p);
      try {
        if (p > 0.3 && "vibrate" in navigator) navigator.vibrate(8);
      } catch {
        /* noop */
      }
      if (p >= 1) {
        holdingRef.current = false;
        setStep("release");
        runRelease();
        return;
      }
      holdFrameRef.current = requestAnimationFrame(tick);
    };
    holdFrameRef.current = requestAnimationFrame(tick);
  }, [phrase, step]);

  const onHoldEnd = useCallback(() => {
    holdingRef.current = false;
    if (holdFrameRef.current) cancelAnimationFrame(holdFrameRef.current);
    if (holdProgress < 1) setHoldProgress(0);
  }, [holdProgress]);

  const runRelease = async () => {
    saveSurrenderEntry(phrase.trim());
    try {
      await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          type: "reflection",
          title: "Entrusted to God",
          content: `I handed to God: ${phrase.trim()}`,
          reference: SCRIPTURE.reference,
          ...apiSessionExtras(),
        }),
      });
    } catch {
      /* noop */
    }

    let opacity = 1;
    const fadeInterval = setInterval(() => {
      opacity -= 0.04;
      setFadePhrase(Math.max(0, opacity));
      if (opacity <= 0) clearInterval(fadeInterval);
    }, 120);

    await waitMs(1800);
    setStep("scripture");

    await waitMs(2500);
    setStep("stillness");

    const start = Date.now();
    const stillTick = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / STILLNESS_MS);
      setStillnessProgress(p);
      if (p >= 1) {
        clearInterval(stillTick);
        setStep("close");
      }
    }, 100);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      data-testid="surrender-stone"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 45%, #1a1035 0%, #09031e 70%)",
      }}
    >
      <header className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Link
          href="/"
          onClick={() => markReturnToHomePaths()}
          className="flex items-center gap-1.5 text-[13px] text-white/45 hover:text-white/70 py-2"
        >
          Home
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
          Surrender Stone
        </span>
        <div className="w-12" />
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-16 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === "invite" && (
            <motion.div key="invite" {...fade} className="w-full text-center">
              <p
                className="text-[1.2rem] text-white/88 mb-2"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                What are you handing to God tonight?
              </p>
              <p className="text-[14px] text-white/45 mb-8">One phrase. Press and hold the stone when ready.</p>
              <input
                data-testid="input-surrender-phrase"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                maxLength={120}
                placeholder="Fear, control, bitterness…"
                className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3.5 text-[16px] text-white text-center placeholder:text-white/30 outline-none mb-6"
              />
              <button
                type="button"
                disabled={phrase.trim().length < 2}
                data-testid="btn-surrender-ready"
                onClick={() => setStep("hold")}
                className="w-full rounded-xl bg-violet-700/80 hover:bg-violet-700 disabled:opacity-40 text-white font-semibold py-4"
              >
                I&apos;m ready
              </button>
            </motion.div>
          )}

          {step === "hold" && (
            <motion.div key="hold" {...fade} className="flex flex-col items-center w-full">
              <p
                className="text-center text-[1rem] text-white/75 mb-10 max-w-[16ch] leading-relaxed"
                style={{ opacity: fadePhrase, fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                {phrase.trim()}
              </p>
              <button
                type="button"
                data-testid="btn-surrender-stone"
                onPointerDown={onHoldStart}
                onPointerUp={onHoldEnd}
                onPointerLeave={onHoldEnd}
                onPointerCancel={onHoldEnd}
                className="relative w-32 h-32 rounded-full border-2 border-violet-400/40 bg-gradient-to-b from-violet-900/50 to-slate-900/80 touch-none select-none shadow-[0_0_40px_rgba(139,92,246,0.25)]"
                aria-label="Press and hold to entrust"
              >
                <span
                  className="absolute inset-2 rounded-full bg-violet-500/20 transition-transform duration-100"
                  style={{ transform: `scale(${0.85 + holdProgress * 0.2})` }}
                />
                <span className="relative z-10 text-[12px] font-bold uppercase tracking-widest text-white/70">
                  Hold
                </span>
              </button>
              <p className="mt-8 text-[13px] text-white/40">Release when you feel the pulse complete</p>
            </motion.div>
          )}

          {(step === "release" || step === "scripture") && (
            <motion.div key="scripture" {...fade} className="text-center w-full">
              {step === "scripture" && (
                <>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Scripture</p>
                  <blockquote
                    className="text-[1.1rem] text-white/88 italic leading-relaxed"
                    style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
                  >
                    &ldquo;{SCRIPTURE.text}&rdquo;
                  </blockquote>
                  <p className="mt-3 text-[13px] text-violet-200/70">— {SCRIPTURE.reference}</p>
                </>
              )}
              {step === "release" && (
                <p className="text-white/50 text-[15px]">Entrusting…</p>
              )}
            </motion.div>
          )}

          {step === "stillness" && (
            <motion.div key="stillness" {...fade} className="text-center w-full">
              <p
                className="text-[1.05rem] text-white/75"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                Stay here. God holds what you released.
              </p>
              <div className="mt-10 mx-auto w-32 h-0.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-violet-400/60"
                  style={{ width: `${stillnessProgress * 100}%` }}
                />
              </div>
            </motion.div>
          )}

          {step === "close" && (
            <motion.div key="close" {...fade} className="text-center w-full">
              <p className="text-[1.1rem] text-white/85 leading-relaxed mb-8">
                You don&apos;t have to carry that alone anymore.
              </p>
              <button
                type="button"
                data-testid="btn-surrender-close"
                onClick={() => navigateBackToHomePaths(navigate, { replace: true })}
                className="w-full rounded-xl bg-white/10 border border-white/15 text-white font-semibold py-3.5"
              >
                Return home
              </button>
              <Link href="/lament" className="inline-block mt-5 text-[13px] text-white/45 underline">
                Walking through grief? → Lament Pathway
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
