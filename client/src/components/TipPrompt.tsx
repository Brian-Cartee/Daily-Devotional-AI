import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Loader2, Sparkles } from "lucide-react";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { useToast } from "@/hooks/use-toast";

const TIP_DISMISSED_KEY = "sp_tip_dismissed";
const TIP_COOLDOWN_DAYS = 90;

export function shouldShowTip(): boolean {
  try {
    const raw = localStorage.getItem(TIP_DISMISSED_KEY);
    if (!raw) return true;
    const ts = parseInt(raw, 10);
    const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return daysSince >= TIP_COOLDOWN_DAYS;
  } catch {
    return false;
  }
}

export function dismissTip(): void {
  try {
    localStorage.setItem(TIP_DISMISSED_KEY, String(Date.now()));
  } catch {}
}

const TIPS = [
  { amount: 300, label: "Plant a Seed", emoji: "🌱", sub: "$3 one-time" },
  { amount: 500, label: "Light a Candle", emoji: "🕯️", sub: "$5 one-time" },
  { amount: 1000, label: "Feed the Flock", emoji: "🐑", sub: "$10 one-time" },
];

interface TipPromptProps {
  streakDays: number;
  onClose: () => void;
}

export function TipPrompt({ streakDays, onClose }: TipPromptProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const { toast } = useToast();
  const isPro = isProVerifiedLocally();

  const handleTip = async (amount: number) => {
    setLoading(amount);
    try {
      const res = await fetch("/api/stripe/create-tip-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.url) {
        dismissTip();
        window.location.href = data.url;
      } else {
        toast({ title: "Error", description: "Could not start checkout.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleDismiss = () => {
    dismissTip();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-6 bg-black/40 backdrop-blur-sm"
      onClick={handleDismiss}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-background rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Warm top gradient */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

        <div className="px-6 pt-6 pb-7">
          {/* Close */}
          <button
            onClick={handleDismiss}
            data-testid="btn-tip-close"
            className="absolute top-5 right-5 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-amber-500 fill-amber-200 dark:fill-amber-800" />
          </div>

          {/* Headline */}
          <h2 className="text-[18px] font-extrabold text-foreground tracking-tight leading-tight mb-1.5">
            {streakDays >= 30
              ? `${streakDays} days walking with God.`
              : streakDays >= 7
                ? "Seven days of faithfulness."
                : "Something's growing in you."}
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
            Shepherd's Path is free — and we want it to stay that way for people who need it most. If it's meant something to you, consider leaving a small gift to keep it going.
          </p>

          {/* Tip options */}
          {isPro ? (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 mb-4">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <p className="text-[13px] text-foreground font-medium">
                You're already Pro — that support means the world. Thank you. 🙏
              </p>
            </div>
          ) : (
            <div className="flex gap-2.5 mb-4">
              {TIPS.map(({ amount, label, emoji, sub }) => (
                <button
                  key={amount}
                  onClick={() => handleTip(amount)}
                  data-testid={`btn-tip-${amount}`}
                  disabled={loading !== null}
                  className="flex-1 flex flex-col items-center gap-1 bg-muted/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-border hover:border-amber-300 dark:hover:border-amber-700 rounded-2xl px-2 py-3 transition-all disabled:opacity-60"
                >
                  {loading === amount
                    ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    : <span className="text-lg">{emoji}</span>
                  }
                  <span className="text-[11px] font-bold text-foreground leading-tight text-center">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{sub}</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleDismiss}
            data-testid="btn-tip-later"
            className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            {isPro ? "Close" : "Maybe another time"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
