import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lock, Check, X, Zap, RefreshCw, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AI_FREE_LIMIT } from "@/lib/aiUsage";
import { markProVerified } from "@/lib/proStatus";
import { useToast } from "@/hooks/use-toast";
import { getPaymentPlatform, hasDigitalGoodsAPI } from "@/lib/platform";
import { getPlayProducts, purchasePlayProduct, verifyPlayPurchase } from "@/lib/playBilling";

const PRO_FEATURES = [
  "Unlimited AI responses every day",
  "PDF export with beautiful formatting",
  "Full devotional history archive",
  "Custom Bible reading plans",
  "Multiple named prayer journals",
  "Streak protection — never lose your streak",
  "Weekly AI-powered spiritual summary email",
  "Curated video teachings — surfaced by the AI when your conversation calls for deeper guidance",
];

const PLAY_SKUS = {
  monthly: "monthly_pro",
  annual: "annual_pro",
};

interface UpgradeModalProps {
  onClose: () => void;
  onProActivated?: () => void;
}

export function UpgradeModal({ onClose, onProActivated }: UpgradeModalProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [playPrices, setPlayPrices] = useState<{ monthly?: string; annual?: string }>({});

  const platform = getPaymentPlatform();

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

  useEffect(() => {
    if (platform === "play") {
      getPlayProducts(Object.values(PLAY_SKUS)).then(products => {
        const prices: { monthly?: string; annual?: string } = {};
        for (const p of products) {
          if (p.itemId === PLAY_SKUS.monthly) prices.monthly = p.price;
          if (p.itemId === PLAY_SKUS.annual) prices.annual = p.price;
        }
        setPlayPrices(prices);
      });
    }
  }, [platform]);

  const handleStripeCheckout = async () => {
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
        toast({ description: data.message || "Checkout couldn't open — we can try again.", variant: "destructive" });
      }
    } catch {
      toast({ description: "Trouble connecting — we can try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayCheckout = async () => {
    setLoading(true);
    try {
      const sku = plan === "annual" ? PLAY_SKUS.annual : PLAY_SKUS.monthly;
      const result = await purchasePlayProduct(sku);
      if (!result) {
        toast({ title: "Purchase cancelled", description: "No purchase was completed.", variant: "destructive" });
        return;
      }
      const verified = await verifyPlayPurchase(result.purchaseToken, result.productId);
      if (verified) {
        markProVerified();
        toast({ title: "Pro Activated!", description: "Welcome to Shepherd's Path Pro." });
        onProActivated?.();
        onClose();
      } else {
        toast({ title: "Verification failed", description: "Please contact support@shepherdspathai.com with your receipt.", variant: "destructive" });
      }
    } catch {
      toast({ description: "We can try that again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = platform === "play" ? handlePlayCheckout : handleStripeCheckout;

  const priceDisplay = platform === "play"
    ? {
        annual: playPrices.annual ?? "$44.99/year",
        monthly: playPrices.monthly ?? "$5.99/month",
      }
    : {
        annual: "$44.99/year",
        monthly: "$5.99/month",
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
              <Sparkles className="w-3 h-3" /> You're Going Deep Today
            </div>

            <h2 className="text-xl font-extrabold text-white tracking-tight">
              You've used your {AI_FREE_LIMIT} free AI responses
            </h2>
            <p className="text-white/80 text-sm mt-2 leading-snug">
              That's a sign of real engagement with God's Word. Go Pro to keep the conversation going — no limits, ever.
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-3 text-white/60 text-xs">
              <RefreshCw className="w-3 h-3" />
              Free responses reset in {resetTime}
            </div>
          </div>

          {/* Pull-up card */}
          <div className="-mt-6 bg-background rounded-t-3xl px-7 pt-7 pb-6 space-y-4">

            {/* iOS standalone notice */}
            {platform === "ios" && (
              <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl px-4 py-3">
                <Smartphone className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  To subscribe on iOS, please visit{" "}
                  <a
                    href="https://daily-devotional-ai.replit.app/pricing"
                    className="font-semibold text-blue-600 dark:text-blue-400 underline"
                  >
                    shepherdspathai.com
                  </a>
                  {" "}in Safari to complete your purchase.
                </p>
              </div>
            )}

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

            {platform !== "ios" && (
              <>
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
                      <span className="text-2xl font-extrabold text-foreground">
                        {playPrices.annual ?? "$44.99"}
                      </span>
                      <span className="text-sm text-muted-foreground">{playPrices.annual ? "" : "/year"}</span>
                      {!playPrices.annual && <span className="ml-2 text-xs text-muted-foreground">($3.75/mo)</span>}
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-extrabold text-foreground">
                        {playPrices.monthly ?? "$5.99"}
                      </span>
                      <span className="text-sm text-muted-foreground">{playPrices.monthly ? "" : "/month"}</span>
                    </>
                  )}
                </div>

                {/* Subscription label */}
                <div className="text-center -mt-1 mb-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    Shepherd's Path Pro —{" "}
                    {plan === "annual" ? "Annual Subscription" : "Monthly Subscription"}
                  </span>
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
                  {loading
                    ? "Processing…"
                    : platform === "play"
                      ? "Subscribe via Google Play"
                      : "Upgrade to Pro"
                  }
                </Button>

                {/* Auto-renewal disclosure */}
                <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed -mt-1">
                  {plan === "annual"
                    ? "Shepherd's Path Pro – Annual · $44.99/year ($3.75/mo) · Auto-renews annually. Cancel anytime."
                    : "Shepherd's Path Pro – Monthly · $5.99/month · Auto-renews monthly. Cancel anytime."
                  }
                </p>

                {platform !== "play" && (
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span>
                      30-day money-back guarantee ·{" "}
                      <button
                        type="button"
                        onClick={() => { onClose(); setLocation("/refund"); }}
                        className="underline hover:text-foreground transition-colors"
                      >
                        request a refund
                      </button>
                    </span>
                  </div>
                )}
              </>
            )}

            <p className="text-center text-[11px] text-muted-foreground/50 italic -mt-1">
              Joining thousands of believers walking the path daily
            </p>

            <button
              data-testid="btn-upgrade-later"
              onClick={onClose}
              className="w-full text-center text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
            >
              Not right now
            </button>

            {/* Legal links — required by Apple */}
            <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground/50 -mt-1">
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-muted-foreground transition-colors"
              >
                Privacy Policy
              </a>
              <span>·</span>
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-muted-foreground transition-colors"
              >
                Terms of Use
              </a>
            </div>

            {/* Already have Pro */}
            <div className="border-t border-border pt-3 text-center">
              <a
                href="/restore"
                data-testid="btn-already-pro"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Already subscribed? Restore access
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
