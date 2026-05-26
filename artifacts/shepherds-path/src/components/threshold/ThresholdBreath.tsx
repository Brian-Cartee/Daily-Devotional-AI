import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const BREATH_MS = 10_000;

export interface ThresholdBreathProps {
  onDone: () => void;
}

/** 10s stillness beat before entering home — no fake loading. */
export function ThresholdBreath({ onDone }: ThresholdBreathProps) {
  const [progress, setProgress] = useState(0);
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const minWait = setTimeout(() => setCanContinue(true), 8000);
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / BREATH_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(tick);
        setCanContinue(true);
      }
    }, 80);
    return () => {
      clearTimeout(minWait);
      clearInterval(tick);
    };
  }, []);

  return (
    <div className="flex flex-col items-center text-center px-6">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45 mb-6"
      >
        Stillness
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.65 }}
        className="max-w-sm text-[1.15rem] sm:text-[1.25rem] leading-relaxed text-white/88"
        style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
      >
        Take one slow breath.
        <br />
        <span className="text-white/65">God already sees you.</span>
      </motion.p>

      <div
        className="mt-10 w-24 h-24 rounded-full border border-white/15 flex items-center justify-center"
        aria-hidden
      >
        <motion.div
          className="w-14 h-14 rounded-full bg-violet-500/25"
          animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <p className="mt-8 text-[13px] font-medium text-white/40 tabular-nums">
        {Math.max(0, Math.ceil((1 - progress) * (BREATH_MS / 1000)))}s
      </p>

      <div className="mt-6 w-32 h-0.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-violet-400/70 transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {canContinue && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          type="button"
          onClick={onDone}
          data-testid="btn-threshold-breath-continue"
          className="mt-10 text-[15px] font-semibold text-white/80 hover:text-white px-8 py-3 rounded-full border border-white/20 hover:border-white/35 transition-colors"
        >
          Continue
        </motion.button>
      )}
    </div>
  );
}
