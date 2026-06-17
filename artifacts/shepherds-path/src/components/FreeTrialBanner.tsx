import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { getCachedFreeTrial } from "@/lib/freeTrialState";
import { isProVerifiedLocally } from "@/lib/proStatus";

export function FreeTrialBanner() {
  const trial = getCachedFreeTrial();
  if (!trial?.active || !trial.label || isProVerifiedLocally()) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 mt-2 rounded-xl border border-primary/25 bg-primary/8 px-4 py-3"
      data-testid="free-trial-banner"
    >
      <div className="flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-snug">
            You have free Pro access to {trial.label.toLowerCase()}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">
            for {trial.daysRemaining} more day{trial.daysRemaining === 1 ? "" : "s"}.{" "}
            <Link href="/pricing" className="text-primary font-semibold hover:underline">
              Upgrade to keep it
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function FreeTrialBannerDismissible({ onDismiss }: { onDismiss: () => void }) {
  const trial = getCachedFreeTrial();
  if (!trial?.active || !trial.label || isProVerifiedLocally()) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 mt-2 rounded-xl border border-primary/25 bg-primary/8 px-4 py-3 relative"
      data-testid="free-trial-banner"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2 right-2 text-muted-foreground/50 hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <FreeTrialBanner />
    </motion.div>
  );
}
