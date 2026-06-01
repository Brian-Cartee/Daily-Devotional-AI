import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Gift, Heart, Crown, ArrowRight, Check, Clock } from "lucide-react";
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
    <div className="min-h-screen relative overflow-x-hidden bg-[#0a0618]">
      {/* Layered atmosphere — warm gift glow over a soft path image */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        <img
          src="/hero-landing.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.2]"
          style={{ objectPosition: "center 35%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(30,8,45,0.92) 0%, rgba(12,6,24,0.88) 38%, rgba(8,4,18,0.95) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 55% at 50% 12%, rgba(244,114,182,0.22) 0%, rgba(245,158,11,0.08) 45%, transparent 72%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 80% 70%, rgba(139,92,246,0.14) 0%, transparent 60%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 pb-28 sp-app-top-clearance pt-[calc(env(safe-area-inset-top,0px)+3.75rem)]">

        {/* Hero */}
        <motion.div {...fadeUp(0)} className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 via-amber-500 to-violet-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-rose-500/30 ring-1 ring-white/10">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-400/25 rounded-full px-3 py-1 mb-4 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-rose-300/90">
              Limited Time Offer
            </span>
          </div>
          <h1 className="text-[30px] font-bold text-white leading-tight mb-3">
            The Greatest Gift
          </h1>
          <p className="text-[16px] text-white/65 leading-relaxed">
            There is no greater gift than a daily walk with God. Give someone Shepherd's Path PRO — a full year of guidance, devotionals, and Scripture, unlocked.
          </p>
        </motion.div>

        {/* Countdown */}
        {!expired && (
          <motion.div {...fadeUp(0.05)} className="mb-7">
            <div className="rounded-2xl border border-rose-400/20 bg-rose-950/35 backdrop-blur-md p-4">
              <p className="text-[12px] font-bold uppercase tracking-wider text-rose-300/80 text-center mb-3 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Offer ends in
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[{ val: d, label: "Days" }, { val: h, label: "Hours" }, { val: m, label: "Min" }, { val: s, label: "Sec" }].map(({ val, label }) => (
                  <div key={label} className="text-center">
                    <div className="rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 text-white font-bold text-[22px] py-2 shadow-md shadow-rose-900/30">
                      {String(val).padStart(2, "0")}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300/60 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* What's included */}
        <motion.div {...fadeUp(0.1)} className="mb-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 shrink-0">What's included</p>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/15 to-transparent" />
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-950/30 backdrop-blur-md overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 ring-1 ring-amber-400/20">
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-[15px] font-bold text-white leading-snug">Shepherd's Path PRO — 1 Year</p>
              </div>
              <div className="space-y-1.5">
                {PRO_FEATURES.map((point) => (
                  <div key={point} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[13px] text-white/65 leading-snug">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Gift code */}
        <motion.div {...fadeUp(0.15)} className="mb-7">
          <div className="relative rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-950/40 to-orange-950/30 backdrop-blur-md p-5 text-center overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-500 to-orange-500" />
            <p className="text-[12px] font-bold uppercase tracking-widest text-amber-300/80 mb-2">
              Use this code at checkout
            </p>
            <button
              data-testid="btn-copy-gift-code"
              onClick={copyCode}
              className="group relative inline-flex items-center gap-3 bg-black/25 border border-amber-400/30 rounded-xl px-5 py-3 mb-3 hover:border-amber-400/60 transition-colors"
            >
              <span className="text-[20px] font-bold tracking-[0.12em] text-amber-300">
                PATHGIFT
              </span>
              <span className={`text-[12px] font-bold transition-colors ${codeCopied ? "text-green-400" : "text-white/50 group-hover:text-white/75"}`}>
                {codeCopied ? "✓ Copied!" : "Tap to copy"}
              </span>
            </button>
            <p className="text-[12px] text-amber-300/65">
              20% off a PRO annual membership — applied at checkout
            </p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div {...fadeUp(0.2)} className="space-y-3 mb-8">
          <Link href="/pricing">
            <Button
              data-testid="btn-gift-pro"
              className="w-full rounded-2xl py-5 text-[15px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 border-0 text-white shadow-lg shadow-amber-500/30"
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
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 shrink-0">Perfect for</p>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/15 to-transparent" />
          </div>
          <div className="space-y-2">
            {GIFT_REASONS.map((reason, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 px-4 rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-sm"
              >
                <Heart className="w-3.5 h-3.5 text-rose-400/80 shrink-0 fill-rose-500/25" />
                <p className="text-[14px] text-white/75">{reason}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Mission statement */}
        <motion.div {...fadeUp(0.3)} className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5 text-center">
          <p className="text-[15px] text-white/75 leading-relaxed italic mb-2">
            "There is no greater gift you can give someone than a reason to open God's Word every morning — and the tools to make it real."
          </p>
          <p className="text-[13px] text-white/55 leading-relaxed mt-3">
            Shepherd's Path was built with one purpose: to lead people to Christ. Every feature, every devotional, every word of guidance — all of it pointing toward the only relationship that truly changes a life.
          </p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-[13px] text-white/50 italic">"For to us a child is born... and His name will be called Wonderful Counselor." — Isaiah 9:6</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
