import { motion, AnimatePresence } from "framer-motion";

export interface SessionStillnessProps {
  open: boolean;
  verseText: string;
  verseRef: string;
  onDone: () => void;
}

export function SessionStillness({ open, verseText, verseRef, onDone }: SessionStillnessProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="stillness"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-8"
          style={{
            background: "linear-gradient(175deg, #1e0d50 0%, #130636 45%, #09031e 100%)",
          }}
        >
          {/* Static ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(110,50,220,0.35) 0%, transparent 70%)",
            }}
          />
          {/* Breathing glow — slow pulse inviting stillness */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0, 0.18, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "radial-gradient(ellipse 50% 40% at 50% 42%, rgba(139,92,246,0.6) 0%, transparent 70%)",
            }}
          />

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative z-10 text-[11px] font-bold uppercase tracking-[0.22em] text-white/40 mb-6"
          >
            Stay here a moment
          </motion.p>
          <motion.blockquote
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
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
            transition={{ delay: 0.6 }}
            className="relative z-10 mt-4 text-[13px] font-semibold text-violet-300/75"
          >
            — {verseRef}
          </motion.p>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            type="button"
            onClick={onDone}
            data-testid="btn-stillness-done"
            className="relative z-10 mt-12 text-[14px] font-semibold text-white/60 hover:text-white px-6 py-2.5 rounded-full border border-white/12 hover:border-white/28 transition-colors"
          >
            I'm ready
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
