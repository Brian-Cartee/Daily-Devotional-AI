import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const TOTAL_MS = 90_000;
const SKIP_AFTER_MS = 30_000;

export interface NightSilenceTimerProps {
  onDone: () => void;
}

/** 90s sacred silence — skip allowed after 30s. */
export function NightSilenceTimer({ onDone }: NightSilenceTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const skipTimer = setTimeout(() => setCanSkip(true), SKIP_AFTER_MS);
    const tick = setInterval(() => {
      const ms = Date.now() - start;
      setElapsed(ms);
      if (ms >= TOTAL_MS) {
        clearInterval(tick);
        onDone();
      }
    }, 200);
    return () => {
      clearTimeout(skipTimer);
      clearInterval(tick);
    };
  }, [onDone]);

  const remainingSec = Math.max(0, Math.ceil((TOTAL_MS - elapsed) / 1000));
  const progress = Math.min(1, elapsed / TOTAL_MS);

  return (
    <div className="flex flex-col items-center text-center px-4" data-testid="night-silence-timer">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/40 mb-4">
        Stillness
      </p>
      <p
        className="text-[1.1rem] sm:text-[1.2rem] leading-relaxed text-white/85 max-w-sm"
        style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
      >
        Sit with God.
        <br />
        <span className="text-white/50 text-[0.95rem]">No words needed.</span>
      </p>

      <div className="mt-10 relative w-28 h-28 flex items-center justify-center" aria-hidden>
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="rgba(167,139,250,0.55)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
            style={{ transition: "stroke-dashoffset 0.2s linear" }}
          />
        </svg>
        <motion.div
          className="w-10 h-10 rounded-full bg-indigo-500/20"
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <p className="mt-8 text-[13px] font-medium text-white/45 tabular-nums">
        Stillness · {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, "0")}
      </p>

      {canSkip && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          type="button"
          data-testid="btn-night-silence-skip"
          onClick={onDone}
          className="mt-8 text-[14px] font-semibold text-white/55 hover:text-white/80 px-6 py-2.5 rounded-full border border-white/12 hover:border-white/25 transition-colors"
        >
          Continue when ready
        </motion.button>
      )}
    </div>
  );
}
