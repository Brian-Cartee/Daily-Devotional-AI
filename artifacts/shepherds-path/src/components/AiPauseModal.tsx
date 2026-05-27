import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

const PAUSE_MESSAGES = [
  {
    heading: "Pause here with God.",
    body: "You've received enough for one sitting. Let today's Scripture keep working in you — there's no rush.",
  },
  {
    heading: "The Word doesn't need to be rushed.",
    body: "Sit with what you already heard. Come back tomorrow, or open today's verse again when you're ready.",
  },
  {
    heading: "This is a gentle limit, not a wall.",
    body: "We pause so the app doesn't replace prayer. Scripture, your closet, and quiet are always here.",
  },
];

interface AiPauseModalProps {
  onClose: () => void;
}

export function AiPauseModal({ onClose }: AiPauseModalProps) {
  const [, setLocation] = useLocation();
  const [msg] = useState(() => PAUSE_MESSAGES[Math.floor(Math.random() * PAUSE_MESSAGES.length)]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm bg-background rounded-3xl px-7 py-8 pb-10 mb-safe shadow-2xl space-y-6"
        >
          <div className="flex justify-center">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-[20px]"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))",
              }}
            >
              🕊
            </div>
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-[20px] font-bold text-foreground leading-snug">{msg.heading}</h2>
            <p className="text-[15px] leading-[1.75] text-foreground/60">{msg.body}</p>
          </div>

          <div className="space-y-3 pt-1">
            <button
              data-testid="button-ai-pause-devotional"
              onClick={() => {
                onClose();
                setLocation("/devotional");
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-[15px] text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
            >
              Sit with today&apos;s verse
            </button>
            <button
              data-testid="button-ai-pause-dismiss"
              onClick={onClose}
              className="w-full py-3 rounded-2xl font-semibold text-[14px] text-foreground/75 bg-foreground/6 hover:bg-foreground/10 transition-colors"
            >
              I&apos;ll come back later
            </button>
            <button
              data-testid="button-ai-pause-continue"
              onClick={() => {
                onClose();
                setLocation("/pricing");
              }}
              className="w-full py-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Need more depth today? See Pro →
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                setLocation("/safety");
              }}
              className="w-full py-1 text-[11px] text-muted-foreground/70 hover:text-muted-foreground"
            >
              Safety & boundaries
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
