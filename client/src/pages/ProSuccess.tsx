import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markProVerified } from "@/lib/proStatus";

export default function ProSuccess() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setLoading(false);
      return;
    }

    fetch(`/api/stripe/session-email?session_id=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.email) {
          markProVerified(data.email);
          setEmail(data.email);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-background to-amber-50/30">
      <div className="max-w-sm w-full text-center space-y-6">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Activating your Pro account…</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-3 h-3" /> Pro Activated
              </div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                Welcome to Shepherd's Path Pro!
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your subscription is active. Enjoy unlimited AI responses and all Pro features.
                {email && (
                  <span className="block mt-1 font-medium text-foreground">{email}</span>
                )}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 text-left space-y-2.5">
              {[
                "Unlimited AI responses every day",
                "Devotional history archive",
                "Beautiful PDF · custom plans",
                "Streak protection",
              ].map(f => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-foreground/80">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            <Button
              data-testid="btn-go-to-app"
              className="w-full rounded-2xl font-bold py-5 bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 transition-opacity border-0"
              onClick={() => navigate("/")}
            >
              Start Your Devotional
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <p className="text-xs text-muted-foreground">
              Manage your subscription anytime at{" "}
              <a
                href="https://billing.stripe.com/p/login/test_00g"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                billing.stripe.com
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
