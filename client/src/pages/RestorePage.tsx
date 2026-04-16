import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Zap } from "lucide-react";
import { checkProWithServer } from "@/lib/proStatus";

type Stage = "idle" | "loading" | "success" | "error" | "not-found";

export default function RestorePage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return;

    setStage("loading");
    try {
      const isPro = await checkProWithServer(trimmed);
      if (isPro) {
        setStage("success");
        setTimeout(() => navigate("/"), 2200);
      } else {
        setStage("not-found");
      }
    } catch {
      setStage("error");
      setErrorMsg("Trouble connecting — check your signal and we can try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Hero strip — matches app design language */}
      <div
        className="relative pt-14 pb-10 px-6 text-center overflow-hidden"
        style={{ background: "linear-gradient(160deg, hsl(265 60% 8%) 0%, hsl(258 50% 5%) 60%, hsl(var(--background)) 100%)" }}
      >
        {/* Purple radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(120,60,220,0.18) 0%, transparent 70%)" }}
        />
        {/* Bottom accent line */}
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-primary via-violet-400 to-amber-400 opacity-50" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/40 hover:text-white/70 transition-colors mb-8 uppercase tracking-widest"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </Link>

          {/* App icon */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/10">
              <img src="/sp-icon.png" alt="Shepherd's Path" className="w-full h-full object-cover" />
            </div>
          </div>

          <h1
            className="text-[2rem] leading-[1.2] text-white mb-3"
            style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
          >
            Restore Pro Access
          </h1>
          <p className="text-[13px] text-white/50 max-w-xs mx-auto leading-relaxed">
            Already a subscriber? Enter the email you used to subscribe and we'll restore your access on this device.
          </p>
        </motion.div>
      </div>

      {/* Form card */}
      <div className="flex-1 flex flex-col items-center px-5 pt-8 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <AnimatePresence mode="wait">

            {/* ── IDLE / LOADING ── */}
            {(stage === "idle" || stage === "loading") && (
              <motion.form
                key="form"
                onSubmit={handleRestore}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <label htmlFor="restore-email" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Subscription Email
                  </label>
                  <input
                    id="restore-email"
                    data-testid="input-restore-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={stage === "loading"}
                    className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  data-testid="btn-restore-submit"
                  type="submit"
                  disabled={stage === "loading" || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-[14px] font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(38 95% 55%) 100%)" }}
                >
                  {stage === "loading" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Restore My Pro Access</>
                  )}
                </button>

                <p className="text-center text-[11px] text-muted-foreground/50 pt-1">
                  We check your email against your active Stripe subscription.
                  No password needed.
                </p>
              </motion.form>
            )}

            {/* ── SUCCESS ── */}
            {stage === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center gap-5 py-6"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[18px] font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
                    Pro access restored.
                  </p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Welcome back. Taking you home…
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── NOT FOUND ── */}
            {stage === "not-found" && (
              <motion.div
                key="not-found"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/6 px-5 py-4 flex gap-3 items-start">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-foreground mb-1">No active subscription found</p>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      We couldn't find a Pro subscription for <span className="font-semibold text-foreground">{email}</span>.
                      Please check it's the same email you used to subscribe.
                    </p>
                  </div>
                </div>

                <button
                  data-testid="btn-restore-retry"
                  onClick={() => { setStage("idle"); }}
                  className="w-full rounded-2xl border border-border py-3.5 text-[13px] font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  Try a different email
                </button>

                <div className="text-center pt-1">
                  <p className="text-[12px] text-muted-foreground mb-3">Subscribed but still not working?</p>
                  <a
                    href="mailto:support@shepherdspathai.com?subject=Pro%20Restore%20Issue"
                    className="text-[12px] font-semibold text-primary hover:underline"
                  >
                    Contact support →
                  </a>
                </div>
              </motion.div>
            )}

            {/* ── ERROR ── */}
            {stage === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-rose-500/25 bg-rose-500/6 px-5 py-4 flex gap-3 items-start">
                  <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-foreground leading-relaxed">{errorMsg}</p>
                </div>

                <button
                  data-testid="btn-restore-retry-error"
                  onClick={() => { setStage("idle"); setErrorMsg(""); }}
                  className="w-full rounded-2xl border border-border py-3.5 text-[13px] font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  Try again
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Divider + new subscriber CTA */}
          {(stage === "idle" || stage === "loading") && (
            <div className="mt-10 pt-6 border-t border-border/40 text-center space-y-2">
              <p className="text-[12px] text-muted-foreground">Not a Pro subscriber yet?</p>
              <Link
                href="/pricing"
                data-testid="link-restore-to-pricing"
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline"
              >
                See Pro plans
                <Zap className="w-3 h-3" />
              </Link>
            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}
