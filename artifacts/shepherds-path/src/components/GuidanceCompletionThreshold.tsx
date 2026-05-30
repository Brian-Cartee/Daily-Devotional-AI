import { motion } from "framer-motion";
import { Sun, MessageCircle } from "lucide-react";

type Props = {
  onCarry: () => void;
  onStay: () => void;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function GuidanceCompletionThreshold({ onCarry, onStay }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, delay: 0.2, ease }}
      className="px-1 py-2 mb-6"
      data-testid="guidance-completion-threshold"
    >
      <p
        className="text-center text-[15px] leading-relaxed mb-1"
        style={{ fontFamily: "'Georgia', serif", color: "hsl(var(--foreground) / 0.88)" }}
      >
        You&apos;ve been heard.
      </p>
      <p className="text-center text-[13px] text-muted-foreground/70 mb-6 leading-relaxed">
        Nothing more is required. Choose what fits this moment.
      </p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          data-testid="btn-guidance-carry-day"
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
                A quiet send-off — then back to what&apos;s in front of you.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          data-testid="btn-guidance-stay-longer"
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
              <MessageCircle className="w-5 h-5" style={{ color: "rgba(167,139,250,0.9)" }} />
            </div>
            <div>
              <p className="text-[15px] font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>
                Stay a little longer
              </p>
              <p className="text-[12px] mt-1 leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
                A pathway, more conversation, or a gentle share — only if you want it.
              </p>
            </div>
          </div>
        </button>
      </div>
    </motion.div>
  );
}
