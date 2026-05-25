import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DURATION_MS = 8000;

export interface SessionStillnessProps {
  open: boolean;
  verseText: string;
  verseRef: string;
  onDone: () => void;
}

export function SessionStillness({ open, verseText, verseRef, onDone }: SessionStillnessProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      return;
    }
    const start = Date.now();
    let finished = false;
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / DURATION_MS);
      setProgress(p);
      if (p >= 1 && !finished) {
        finished = true;
        clearInterval(tick);
        onDone();
      }
    }, 80);
    return () => clearInterval(tick);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="stillness"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-8"
          style={{
            background: "linear-gradient(175deg, #1e0d50 0%, #130636 45%, #09031e 100%)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(110,50,220,0.35) 0%, transparent 70%)",
            }}
          />
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 text-[11px] font-bold uppercase tracking-[0.22em] text-white/45 mb-6"
          >
            Stay here a moment
          </motion.p>
          <motion.blockquote
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="relative z-10 text-center max-w-md"
            style={{
              fontFamily: "var(--font-serif, Georgia, serif)",
              fontStyle: "italic",
              fontSize: "clamp(1.15rem, 4.5vw, 1.45rem)",
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.88)",
            }}
          >
            "{verseText}"
          </motion.blockquote>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="relative z-10 mt-4 text-[13px] font-semibold text-violet-300/80"
          >
            — {verseRef}
          </motion.p>
          <div className="relative z-10 mt-10 w-32 h-0.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-violet-400/70 transition-all duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            type="button"
            onClick={onDone}
            data-testid="btn-stillness-done"
            className="relative z-10 mt-8 text-[14px] font-semibold text-white/70 hover:text-white px-6 py-2.5 rounded-full border border-white/15 hover:border-white/30 transition-colors"
          >
            Done
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
