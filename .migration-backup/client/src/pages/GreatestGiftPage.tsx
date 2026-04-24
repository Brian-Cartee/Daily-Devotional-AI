import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { Link } from "wouter";
import { Gift, Heart, Crown, ArrowRight, Check, Clock } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const SALE_KEY = "sp_gift_sale_end";

function getSaleEnd(): Date {
  const stored = localStorage.getItem(SALE_KEY);
  if (stored) return new Date(stored);
  const end = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
  localStorage.setItem(SALE_KEY, end.toISOString());
  return end;
}

function useCountdown(target: Date) {
  const [remaining, setRemaining] = useState(() => Math.max(0, target.getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setRemaining(Math.max(0, target.getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [target]);
  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return { d, h, m, s, expired: remaining === 0 };
}

const PRO_FEATURES = [
  "No daily limits — AI guidance, reflections & prayers",
  "Full Bible journey access — every track",
  "Daily Beauty art + morning devotionals",
  "Community prayer wall access",
  "No limits on any feature",
];

const GIFT_REASONS = [
  "A birthday that matters",
  "A Christmas unlike any other",
  "Someone just came to faith",
  "A friend going through a hard season",
  "A family member you've been praying for",
  "Simply because you love them",
];

export default function GreatestGiftPage() {
  const [, navigate] = useLocation();
  const [saleEnd] = useState(() => getSaleEnd());
  const { d, h, m, s, expired } = useCountdown(saleEnd);
  const [codeCopied, setCodeCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText("PATHGIFT");
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    } catch {}
  };

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay },
  });

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-lg mx-auto px-4 pt-20 pb-28">

        {/* Back */}
        <BackButton
          onClick={() => window.history.back()}
          testId="button-back-greatest-gift"
          className="mb-5"
        />

        {/* Hero */}
        <motion.div {...fadeUp(0)} className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 via-amber-500 to-violet-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-rose-500/25">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 rounded-full px-3 py-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">
              Limited Time Offer
            </span>
          </div>
          <h1 className="text-[30px] font-bold text-foreground leading-tight mb-3">
            The Greatest Gift
          </h1>
          <p className="text-[16px] text-muted-foreground leading-relaxed">
            There is no greater gift than a daily walk with God. Give someone Shepherd's Path PRO — a full year of guidance, devotionals, and Scripture, unlocked.
          </p>
        </motion.div>

        {/* Countdown */}
        {!expired && (
          <motion.div {...fadeUp(0.05)} className="mb-7">
            <div className="rounded-2xl border border-rose-200/60 dark:border-rose-800/40 bg-rose-50/50 dark:bg-rose-950/20 p-4">
              <p className="text-[12px] font-bold uppercase tracking-wider text-rose-600/80 dark:text-rose-400/80 text-center mb-3 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Offer ends in
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[{ val: d, label: "Days" }, { val: h, label: "Hours" }, { val: m, label: "Min" }, { val: s, label: "Sec" }].map(({ val, label }) => (
                  <div key={label} className="text-center">
                    <div className="rounded-xl bg-rose-500 text-white font-bold text-[22px] py-2">
                      {String(val).padStart(2, "0")}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600/70 dark:text-rose-400/70 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* What's included */}
        <motion.div {...fadeUp(0.1)} className="mb-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 shrink-0">What's included</p>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border/60 to-transparent" />
          </div>

          <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-[15px] font-bold text-foreground leading-snug">Shepherd's Path PRO — 1 Year</p>
              </div>
              <div className="space-y-1.5">
                {PRO_FEATURES.map((point) => (
                  <div key={point} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[13px] text-foreground/70 leading-snug">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Gift code */}
        <motion.div {...fadeUp(0.15)} className="mb-7">
          <div className="relative rounded-2xl border border-amber-200/70 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/20 p-5 text-center overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-500 to-orange-500" />
            <p className="text-[12px] font-bold uppercase tracking-widest text-amber-700/80 dark:text-amber-400/80 mb-2">
              Use this code at checkout
            </p>
            <button
              data-testid="btn-copy-gift-code"
              onClick={copyCode}
              className="group relative inline-flex items-center gap-3 bg-white dark:bg-black/20 border border-amber-200/70 dark:border-amber-700/50 rounded-xl px-5 py-3 mb-3 hover:border-amber-400/70 transition-colors"
            >
              <span className="text-[20px] font-bold tracking-[0.12em] text-amber-600 dark:text-amber-400">
                PATHGIFT
              </span>
              <span className={`text-[12px] font-bold transition-colors ${codeCopied ? "text-green-600" : "text-muted-foreground group-hover:text-foreground"}`}>
                {codeCopied ? "✓ Copied!" : "Tap to copy"}
              </span>
            </button>
            <p className="text-[12px] text-amber-700/70 dark:text-amber-400/70">
              20% off a PRO annual membership — applied at checkout
            </p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div {...fadeUp(0.2)} className="space-y-3 mb-8">
          <Link href="/pricing">
            <Button
              data-testid="btn-gift-pro"
              className="w-full rounded-2xl py-5 text-[15px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 border-0 text-white shadow-lg shadow-amber-500/25"
            >
              <Crown className="w-4 h-4 mr-2" />
              Gift PRO membership
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </motion.div>

        {/* Who this is for */}
        <motion.div {...fadeUp(0.25)} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 shrink-0">Perfect for</p>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border/60 to-transparent" />
          </div>
          <div className="space-y-2">
            {GIFT_REASONS.map((reason, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-4 rounded-xl border border-border/60 bg-card">
                <Heart className="w-3.5 h-3.5 text-rose-500/70 shrink-0 fill-rose-500/30" />
                <p className="text-[14px] text-foreground/80">{reason}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Mission statement */}
        <motion.div {...fadeUp(0.3)} className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-[15px] text-foreground/80 leading-relaxed italic mb-2">
            "There is no greater gift you can give someone than a reason to open God's Word every morning — and the tools to make it real."
          </p>
          <p className="text-[13px] text-foreground/60 leading-relaxed mt-3">
            Shepherd's Path was built with one purpose: to lead people to Christ. Every feature, every devotional, every word of guidance — all of it pointing toward the only relationship that truly changes a life.
          </p>
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="text-[13px] text-foreground/60 italic">"For to us a child is born... and His name will be called Wonderful Counselor." — Isaiah 9:6</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
