import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Play, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTTS } from "@/hooks/use-tts";
import { getUserVoice } from "@/lib/userName";

const WELCOME_SCRIPT = `Hey. I'm glad you found this.

I don't know where you are right now. Maybe something's weighing on you — a relationship, a loss, a season that's hard to name. Or maybe things are actually okay, and you're just hungry to go deeper in your faith than you've been able to go on your own.

Either place is exactly right for what this is.

So here's what I want to ask — and I want the real answer, not the cleaned-up version. What's actually going on with you right now? What are you looking for from God?

Because that's what this is built for. You tell us what's on your heart — your words, however they come — and we'll find scripture that speaks to your actual life. Not a verse of the day. A personalized pastoral response. And when you're ready, a Bible journey we'll build just for you.

I've seen this walk people through some of the darkest places. Marriages on the edge. Faith that's gotten hard to hold onto. Grief with no name. I've also watched it help believers who thought they knew the Bible find things in it they'd never seen before.

Wherever you are, there's more for you here. Start somewhere. We'll go from there.`;

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

export function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  const { toggle, stop, preload, playing, loading, progress } = useTTS();

  useEffect(() => {
    preload(WELCOME_SCRIPT, getUserVoice());
  }, []);

  const handleDismiss = () => {
    stop();
    onDismiss();
  };

  const started = progress > 0 || playing || loading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-5"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="bg-background border border-border rounded-3xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden"
        style={{ maxHeight: "calc(100vh - 2.5rem)" }}
      >
        {/* Hero image band */}
        <div className="relative px-8 pt-6 pb-8 text-center overflow-hidden shrink-0 rounded-t-3xl" style={{ minHeight: 190 }}>
          <img
            src="/hero-landing.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.62) 100%)" }} />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            data-testid="btn-close-welcome"
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>

          <div className="relative z-10">
            <div className="flex justify-center mb-3">
              <img
                src="/cross-transparent.png"
                alt="Shepherd's Path logo"
                style={{ width: 140, height: 140, objectFit: "contain", filter: "drop-shadow(0 4px 18px rgba(0,0,0,0.7))" }}
              />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
              Shepherd's Path
            </h1>
            <p className="text-white/90 mt-1" style={{ fontFamily: "var(--font-decorative)", fontStyle: "italic", fontWeight: 400, fontSize: "1.1rem" }}>
              Scripture for what you're going through
            </p>
          </div>
        </div>

        {/* Primary CTA — dominant, immediately visible */}
        <div className="shrink-0 px-4 pt-5 pb-3 bg-background">
          <Button
            data-testid="btn-start-exploring"
            className="w-full rounded-2xl font-bold py-5 px-8 text-sm bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 transition-opacity border-0 justify-center gap-2"
            onClick={handleDismiss}
          >
            Share what you're carrying today
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Button>
        </div>

        {/* Audio — optional gift, below the CTA */}
        <div className="shrink-0 px-4 pb-4 bg-background">
          <button
            data-testid="btn-toggle-audio"
            onClick={() => toggle(WELCOME_SCRIPT, getUserVoice())}
            disabled={loading}
            className="w-full rounded-2xl border transition-all active:scale-[0.98] overflow-hidden disabled:opacity-60"
            style={{
              background: playing
                ? "linear-gradient(135deg, #1a0a3a 0%, #2d1065 100%)"
                : "linear-gradient(135deg, #f8f4ff 0%, #ede8ff 100%)",
              borderColor: playing ? "rgba(130,80,255,0.4)" : "rgba(130,80,255,0.2)",
            }}
          >
            <div className="flex items-center gap-4 px-5 py-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                style={{
                  background: playing
                    ? "rgba(255,255,255,0.12)"
                    : "linear-gradient(135deg, #7c3aed, #a855f7)",
                }}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  : playing
                    ? <Square className="w-3.5 h-3.5 text-white" />
                    : <Play className="w-4 h-4 text-white translate-x-[1px]" />
                }
              </div>

              <div className="flex-1 text-left min-w-0">
                <p
                  className="text-[13px] font-bold leading-tight"
                  style={{ color: playing ? "rgba(255,255,255,0.95)" : "#3b1e8e" }}
                >
                  {loading ? "Preparing welcome…" : playing ? "Playing — tap to stop" : started ? "Replay welcome message" : "Or hear a personal welcome first  👂"}
                </p>
                <p
                  className="text-[11px] mt-0.5 leading-none"
                  style={{ color: playing ? "rgba(255,255,255,0.5)" : "#7c5cbf" }}
                >
                  {started && !loading ? "" : "~30 seconds · optional"}
                </p>
                {started && (
                  <div className="mt-2 w-full h-1 rounded-full overflow-hidden" style={{ background: playing ? "rgba(255,255,255,0.15)" : "rgba(124,60,237,0.15)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: playing ? "rgba(255,255,255,0.7)" : "#7c3aed" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>

              {playing && (
                <div className="flex items-end gap-0.5 shrink-0 h-5">
                  {[0.6, 1, 0.75, 0.45, 0.85].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full bg-white/60"
                      animate={{ scaleY: [h, 1, h * 0.7, 1, h] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                      style={{ height: "100%", transformOrigin: "bottom" }}
                    />
                  ))}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Scrollable context — for the curious, not required for the hurting */}
        <div className="bg-background px-5 pt-1 pb-5 space-y-3 overflow-y-auto flex-1 border-t border-border/30">
          <div className="rounded-2xl border border-primary/30 bg-primary/8 dark:bg-primary/12 px-5 py-4 space-y-3 mt-3">
            <p className="text-[13px] font-bold text-foreground leading-snug">Here's how it works</p>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">💬</span>
              <p className="text-[13px] text-foreground/80 leading-relaxed">
                <span className="font-semibold text-foreground">Tell us what you're going through.</span>{" "}
                Grief, anxiety, a hard relationship, a question about God — anything on your heart.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">📖</span>
              <p className="text-[13px] text-foreground/80 leading-relaxed">
                <span className="font-semibold text-foreground">We'll find scripture for it</span>{" "}
                and give you a personalized pastoral response — grounded in God's Word, made for your moment.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🧭</span>
              <p className="text-[13px] text-foreground/80 leading-relaxed">
                <span className="font-semibold text-foreground">Then walk a journey.</span>{" "}
                We'll build you a personalized Bible journey around exactly what you shared.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl px-4 py-3">
            <span className="text-lg shrink-0">✝️</span>
            <div>
              <p className="text-[13px] font-bold text-foreground leading-tight">Built to lead people to Christ</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                Rooted in Father, Son, and Holy Spirit. Every response is grounded in God's Word — never beside it. We remove the barriers. The Holy Spirit does the rest.
              </p>
            </div>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}
