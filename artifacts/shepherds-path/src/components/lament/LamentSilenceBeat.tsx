import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const SILENCE_MS = 8_000;

interface LamentSilenceBeatProps {
  onDone: () => void;
}

export function LamentSilenceBeat({ onDone }: LamentSilenceBeatProps) {
  const [progress, setProgress] = useState(0);
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const minWait = setTimeout(() => setCanContinue(true), 5000);
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / SILENCE_MS);
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
    <div className="flex flex-col items-center text-center py-6" data-testid="lament-silence">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-4">
        Silence
      </p>
      <p
        className="text-[1rem] text-white/75 max-w-xs leading-relaxed"
        style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
      >
        God does not need you to fill this moment.
      </p>
      <div className="mt-8 w-28 h-0.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-slate-400/60 transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      {canContinue && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          type="button"
          data-testid="btn-lament-silence-done"
          onClick={onDone}
          className="mt-8 text-[14px] font-semibold text-white/65 hover:text-white px-6 py-2.5 rounded-full border border-white/15"
        >
          Continue
        </motion.button>
      )}
    </div>
  );
}
