import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Sun, BookOpen, Lock } from "lucide-react";
import { isProVerifiedLocally } from "@/lib/proStatus";

type Props = {
  onCarry: () => void;
  onStay: () => void;
  onUpgrade?: () => void;
};

const ease = [0.22, 1, 0.36, 1] as const;

export const DevotionalCompletionThreshold = forwardRef<HTMLDivElement, Props>(function DevotionalCompletionThreshold(
  { onCarry, onStay, onUpgrade },
  ref,
) {
  const isPro = isProVerifiedLocally();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, delay: 0.35, ease }}
      className="px-1 py-2"
      data-testid="devotional-completion-threshold"
    >
      <p
        className="text-center text-[15px] leading-relaxed mb-1"
        style={{ fontFamily: "'Georgia', serif", color: "hsl(var(--foreground) / 0.88)" }}
      >
        You&apos;re done for today.
      </p>
      <p className="text-center text-[13px] text-muted-foreground/70 mb-5 leading-relaxed">
        Nothing else is required. Carry this into your day when you&apos;re ready.
      </p>

      <button
        type="button"
        data-testid="btn-devotional-carry-day"
        onClick={onCarry}
        className="w-full rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.99] shadow-sm mb-3"
        style={{
          background: "linear-gradient(145deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--card)) 100%)",
          border: "1px solid hsl(var(--primary) / 0.22)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--primary) / 0.15)" }}
          >
            <Sun className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-foreground">Carry this into your day</p>
            <p className="text-[12px] text-muted-foreground/75 mt-1 leading-snug">
              A quiet send-off — then back to work, family, or rest.
            </p>
          </div>
        </div>
      </button>

      {isPro ? (
        <button
          type="button"
          data-testid="btn-devotional-stay-word"
          onClick={onStay}
          className="w-full rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.99] shadow-sm"
          style={{
            background: "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)",
            border: "1px solid hsl(var(--border) / 0.6)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--muted) / 0.5)" }}
            >
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Go Deeper — Stay with the Word</p>
              <p className="text-[12px] text-muted-foreground/75 mt-1 leading-snug">
                Pastor message, guided reflection, and more.
              </p>
            </div>
          </div>
        </button>
      ) : (
        <button
          type="button"
          data-testid="btn-devotional-stay-word-upgrade"
          onClick={onUpgrade}
          className="w-full rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.99] shadow-sm"
          style={{
            background: "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)",
            border: "1px solid hsl(var(--border) / 0.6)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--muted) / 0.5)" }}
            >
              <Lock className="w-5 h-5 text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">Go Deeper — Stay with the Word</p>
              <p className="text-[12px] text-muted-foreground/75 mt-1 leading-snug">
                Pastor message, guided reflection, and more. <span className="text-primary font-semibold">Pro</span>
              </p>
            </div>
          </div>
        </button>
      )}
    </motion.div>
  );
});
