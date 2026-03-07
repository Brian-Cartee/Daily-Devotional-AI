import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lock, Check, X, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AI_FREE_LIMIT } from "@/lib/aiUsage";

const PRO_FEATURES = [
  "Unlimited AI responses every day",
  "PDF export with beautiful formatting",
  "Full devotional history archive",
  "Custom Bible reading plans",
  "Multiple named prayer journals",
  "Streak protection — never lose your streak",
  "Weekly AI-powered spiritual summary email",
];

interface UpgradeModalProps {
  onClose: () => void;
}

export function UpgradeModal({ onClose }: UpgradeModalProps) {
  const resetTime = (() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const hours = Math.floor((midnight.getTime() - now.getTime()) / 3600000);
    const mins = Math.floor(((midnight.getTime() - now.getTime()) % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} minutes`;
  })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          onClick={e => e.stopPropagation()}
          className="bg-background border border-border rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-primary via-primary/90 to-amber-500/80 px-7 pt-8 pb-12 text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/30 transition-all"
              data-testid="btn-upgrade-modal-close"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-white fill-white/30" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-widest mb-3">
              <Lock className="w-3 h-3" /> Daily Limit Reached
            </div>

            <h2 className="text-xl font-extrabold text-white tracking-tight">
              You've used all {AI_FREE_LIMIT} free AI responses today
            </h2>
            <p className="text-white/80 text-sm mt-2 leading-snug">
              Upgrade to Pro for unlimited daily responses and the full Shepherd's Path experience.
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-3 text-white/60 text-xs">
              <RefreshCw className="w-3 h-3" />
              Free responses reset in {resetTime}
            </div>
          </div>

          {/* Pull-up card */}
          <div className="-mt-6 bg-background rounded-t-3xl px-7 pt-7 pb-7 space-y-4">
            <div className="space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground/80 leading-snug">{f}</span>
                </div>
              ))}
            </div>

            <div className="pt-1 space-y-2">
              <div className="text-center">
                <span className="text-2xl font-extrabold text-foreground">$5.99</span>
                <span className="text-sm text-muted-foreground">/mo</span>
                <span className="ml-2 text-xs text-muted-foreground">or $44.99/year</span>
              </div>

              <Button
                data-testid="btn-upgrade-pro"
                className="w-full rounded-2xl font-bold py-5 text-sm bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 transition-opacity border-0"
                onClick={() => {
                  window.open("https://shepherdspathAI.com/pro", "_blank");
                  onClose();
                }}
              >
                <Zap className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>

              <button
                data-testid="btn-upgrade-later"
                onClick={onClose}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Continue with free — responses reset in {resetTime}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
