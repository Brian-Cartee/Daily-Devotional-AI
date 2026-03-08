import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lock, Check, X, Zap, RefreshCw, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AI_FREE_LIMIT } from "@/lib/aiUsage";
import { checkProWithServer, markProVerified } from "@/lib/proStatus";
import { useToast } from "@/hooks/use-toast";

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
  onProActivated?: () => void;
}

export function UpgradeModal({ onClose, onProActivated }: UpgradeModalProps) {
  const { toast } = useToast();
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [showActivate, setShowActivate] = useState(false);
  const [activateEmail, setActivateEmail] = useState("");
  const [activating, setActivating] = useState(false);

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

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Error", description: data.message || "Could not start checkout.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePro = async () => {
    if (!activateEmail.includes("@")) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setActivating(true);
    const isPro = await checkProWithServer(activateEmail);
    setActivating(false);
    if (isPro) {
      toast({ title: "Pro Activated!", description: "Welcome to Shepherd's Path Pro. Enjoy unlimited AI.", });
      onProActivated?.();
      onClose();
    } else {
      toast({
        title: "No active subscription found",
        description: "Make sure you use the same email you used to purchase. Contact support if you need help.",
        variant: "destructive",
      });
    }
  };

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
          className="bg-background border border-border rounded-3xl shadow-2xl max-w-sm w-full overflow-y-auto max-h-[92vh]"
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
          <div className="-mt-6 bg-background rounded-t-3xl px-7 pt-7 pb-6 space-y-4">
            {/* Feature list */}
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

            {/* Plan toggle */}
            <div className="flex rounded-xl border border-border overflow-hidden text-sm font-semibold">
              <button
                data-testid="btn-plan-annual"
                onClick={() => setPlan("annual")}
                className={`flex-1 py-2.5 text-center transition-colors relative ${
                  plan === "annual"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Annual
                {plan === "annual" && (
                  <span className="ml-1.5 text-[10px] font-bold bg-amber-400 text-amber-900 rounded px-1">
                    SAVE 37%
                  </span>
                )}
              </button>
              <button
                data-testid="btn-plan-monthly"
                onClick={() => setPlan("monthly")}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  plan === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Monthly
              </button>
            </div>

            {/* Price display */}
            <div className="text-center -mt-1">
              {plan === "annual" ? (
                <>
                  <span className="text-2xl font-extrabold text-foreground">$44.99</span>
                  <span className="text-sm text-muted-foreground">/year</span>
                  <span className="ml-2 text-xs text-muted-foreground">($3.75/mo)</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-extrabold text-foreground">$5.99</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </>
              )}
            </div>

            {/* Checkout button */}
            <Button
              data-testid="btn-upgrade-pro"
              className="w-full rounded-2xl font-bold py-5 text-sm bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 transition-opacity border-0"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {loading ? "Redirecting…" : "Upgrade to Pro"}
            </Button>

            <button
              data-testid="btn-upgrade-later"
              onClick={onClose}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Continue with free — responses reset in {resetTime}
            </button>

            {/* Already have Pro */}
            <div className="border-t border-border pt-3">
              <button
                data-testid="btn-already-pro"
                onClick={() => setShowActivate(v => !v)}
                className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Already subscribed?
                {showActivate ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <AnimatePresence>
                {showActivate && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 flex gap-2">
                      <Input
                        data-testid="input-pro-email"
                        type="email"
                        placeholder="Enter your Pro email"
                        value={activateEmail}
                        onChange={e => setActivateEmail(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleActivatePro()}
                        className="text-sm h-9 rounded-xl"
                      />
                      <Button
                        data-testid="btn-activate-pro"
                        size="sm"
                        onClick={handleActivatePro}
                        disabled={activating}
                        className="rounded-xl shrink-0 h-9 px-3"
                      >
                        {activating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Activate"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
