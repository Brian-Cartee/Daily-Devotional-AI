import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

const PAUSE_MESSAGES = [
  {
    heading: "That's enough for today.",
    body: "Take some time with what you've received. The Word doesn't need to be rushed.",
  },
  {
    heading: "You've gone deep today.",
    body: "Let it rest a while. What you've read is still working in you.",
  },
  {
    heading: "Come back tomorrow.",
    body: "There's always more here when you're ready. For now, sit with what you have.",
  },
];

interface AiPauseModalProps {
  onClose: () => void;
}

export function AiPauseModal({ onClose }: AiPauseModalProps) {
  const [, setLocation] = useLocation();
  const [msg] = useState(() => PAUSE_MESSAGES[Math.floor(Math.random() * PAUSE_MESSAGES.length)]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm bg-background rounded-3xl px-7 py-8 pb-10 mb-safe shadow-2xl space-y-6"
        >
          {/* Soft ornament */}
          <div className="flex justify-center">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-[20px]"
              style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))" }}
            >
              🕊
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-3">
            <h2 className="text-[20px] font-bold text-foreground leading-snug">
              {msg.heading}
            </h2>
            <p className="text-[15px] leading-[1.75] text-foreground/60">
              {msg.body}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-1">
            <button
              data-testid="button-ai-pause-dismiss"
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-bold text-[15px] text-foreground/75 bg-foreground/6 hover:bg-foreground/10 transition-colors"
            >
              I'll come back later
            </button>
            <button
              data-testid="button-ai-pause-continue"
              onClick={() => { onClose(); setLocation("/pricing"); }}
              className="w-full py-2 text-[13px] text-amber-500/70 hover:text-amber-500 transition-colors font-medium"
            >
              If you'd like to keep going, you can continue here →
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
