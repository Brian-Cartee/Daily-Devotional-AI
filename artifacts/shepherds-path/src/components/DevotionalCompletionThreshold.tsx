import { motion } from "framer-motion";
import { Sun, BookOpen } from "lucide-react";

type Props = {
  onCarry: () => void;
  onStay: () => void;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function DevotionalCompletionThreshold({ onCarry, onStay }: Props) {
  return (
    <motion.div
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
      <p className="text-center text-[13px] text-muted-foreground/70 mb-6 leading-relaxed">
        Nothing else is required. When you&apos;re ready, choose what fits this moment.
      </p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          data-testid="btn-devotional-carry-day"
          onClick={onCarry}
          className="w-full rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.99] shadow-sm"
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

        <button
          type="button"
          data-testid="btn-devotional-stay-word"
          onClick={onStay}
          className="w-full rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.99]"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.2)" }}
            >
              <BookOpen className="w-5 h-5" style={{ color: "rgba(167,139,250,0.9)" }} />
            </div>
            <div>
              <p className="text-[15px] font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>
                Stay with the Word
              </p>
              <p className="text-[12px] mt-1 leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
                If you have a few more minutes — one message chosen for today.
              </p>
            </div>
          </div>
        </button>
      </div>
    </motion.div>
  );
}
