import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MIN_STILLNESS_MS = 12_000;

interface PrayerThatStaysProps {
  /** Shown after user finishes reading/hearing prayer */
  onComplete?: () => void;
}

/** Post-prayer sacred pause — "Amen" opens stillness, not instant scroll-away. */
export function PrayerThatStays({ onComplete }: PrayerThatStaysProps) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canLeave, setCanLeave] = useState(false);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setCanLeave(false);
      return;
    }
    const start = Date.now();
    const minTimer = setTimeout(() => setCanLeave(true), MIN_STILLNESS_MS);
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / MIN_STILLNESS_MS);
      setProgress(p);
    }, 80);
    return () => {
      clearTimeout(minTimer);
      clearInterval(tick);
    };
  }, [open]);

  const finish = () => {
    setOpen(false);
    onComplete?.();
  };

  return (
    <>
      <button
        type="button"
        data-testid="btn-prayer-that-stays"
        onClick={() => setOpen(true)}
        className="mt-4 w-full rounded-xl border border-amber-400/30 bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-100 font-semibold text-[14px] py-3 transition-colors"
      >
        Amen — stay here a moment
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="prayer-stays"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] flex flex-col items-center justify-center px-8"
            style={{
              background: "linear-gradient(175deg, #1e0d50 0%, #130636 45%, #09031e 100%)",
            }}
            data-testid="prayer-that-stays-overlay"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/40 mb-6">
              After prayer
            </p>
            <p
              className="text-center max-w-sm text-[1.15rem] leading-relaxed text-white/88"
              style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
            >
              Stay here as long as you need.
              <br />
              <span className="text-white/50 text-[0.95rem]">God is not in a hurry.</span>
            </p>
            <div className="mt-10 w-32 h-0.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-violet-400/70 transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {canLeave && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                type="button"
                data-testid="btn-prayer-stays-done"
                onClick={finish}
                className="mt-10 text-[15px] font-semibold text-white/75 hover:text-white px-8 py-3 rounded-full border border-white/20 transition-colors"
              >
                Continue when ready
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
