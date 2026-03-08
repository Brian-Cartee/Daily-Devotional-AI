import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Loader2, CheckCircle2, XCircle, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

type RefundState = "idle" | "loading" | "success" | "ineligible" | "error";

export default function RefundPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<RefundState>("idle");
  const [result, setResult] = useState<{ message: string; amount?: string; currency?: string; reason?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;

    setState("loading");
    try {
      const res = await fetch("/api/stripe/request-refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setState("success");
        setResult({ message: data.message, amount: data.amount, currency: data.currency });
      } else {
        setState("ineligible");
        setResult({ message: data.message, reason: data.reason });
      }
    } catch {
      setState("error");
      setResult({ message: "Something went wrong. Please try again or contact support." });
    }
  };

  const goHome = () => setLocation("/");
  const resetForm = () => { setState("idle"); setResult(null); };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">

        {/* Back link */}
        <button
          onClick={goHome}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="link-back-home"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Shepherd's Path
        </button>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            30-Day Money-Back Guarantee
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Not the right fit? We'll refund your payment — no questions asked — within 30 days of your subscription start date.
          </p>
        </div>

        {/* Main card */}
        <div className="bg-card border border-border rounded-3xl p-7 shadow-sm">
          <AnimatePresence mode="wait">

            {/* Idle / form state */}
            {state === "idle" && (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label htmlFor="refund-email" className="text-sm font-semibold text-foreground">
                    Your subscription email
                  </label>
                  <p className="text-xs text-muted-foreground">Enter the email you used when you subscribed to Pro.</p>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="refund-email"
                      data-testid="input-refund-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <Button
                  data-testid="btn-request-refund"
                  type="submit"
                  className="w-full rounded-2xl font-bold py-5"
                  disabled={!email.includes("@")}
                >
                  Request My Refund
                </Button>

                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  By submitting, your Pro subscription will be cancelled immediately and your payment refunded. Funds typically appear in 5–10 business days.
                </p>
              </motion.form>
            )}

            {/* Loading */}
            {state === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processing your refund…</p>
              </motion.div>
            )}

            {/* Success */}
            {state === "success" && result && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 text-center py-4"
              >
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-lg text-foreground">Refund Issued</h3>
                  {result.amount && (
                    <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">
                      {result.currency} ${result.amount}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.message}</p>
                </div>
                <div className="w-full pt-2 border-t border-border mt-2">
                  <p className="text-xs text-muted-foreground">
                    We're sorry to see you go. You're always welcome back — your journal entries and spiritual journey will be here if you return.
                  </p>
                </div>
                <button
                  onClick={goHome}
                  className="text-sm font-semibold text-primary hover:underline"
                  data-testid="link-return-home"
                >
                  Return to home
                </button>
              </motion.div>
            )}

            {/* Ineligible */}
            {state === "ineligible" && result && (
              <motion.div
                key="ineligible"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 text-center py-4"
              >
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                  <XCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-lg text-foreground">Unable to Process Refund</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.message}</p>
                </div>
                {result.reason === "outside_window" && (
                  <div className="w-full bg-muted/40 rounded-2xl p-4 text-left text-xs text-muted-foreground">
                    If you have exceptional circumstances, please reach out to us and we'll do our best to help.
                  </div>
                )}
                <div className="flex gap-3 pt-1 items-center">
                  <button
                    onClick={resetForm}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="btn-try-different-email"
                  >
                    Try a different email
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    onClick={goHome}
                    className="text-sm font-semibold text-primary hover:underline"
                    data-testid="link-back-home-ineligible"
                  >
                    Back to home
                  </button>
                </div>
              </motion.div>
            )}

            {/* Error */}
            {state === "error" && result && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 text-center py-4"
              >
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                  <XCircle className="w-7 h-7 text-red-500" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-lg text-foreground">Something Went Wrong</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.message}</p>
                </div>
                <button
                  onClick={resetForm}
                  className="text-sm font-semibold text-primary hover:underline"
                  data-testid="btn-try-again"
                >
                  Try again
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Trust signals */}
        {state === "idle" && (
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: "🔒", label: "Secure", sub: "Powered by Stripe" },
              { icon: "⚡", label: "Instant", sub: "Automated process" },
              { icon: "🤝", label: "No hassle", sub: "No questions asked" },
            ].map(t => (
              <div key={t.label} className="bg-card border border-border rounded-2xl p-3">
                <div className="text-xl mb-1">{t.icon}</div>
                <p className="text-xs font-semibold text-foreground">{t.label}</p>
                <p className="text-[11px] text-muted-foreground">{t.sub}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
