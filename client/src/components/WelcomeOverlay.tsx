import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Loader2, Square, X } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";
import { getUserVoice } from "@/lib/userName";
import { useLocation } from "wouter";

const WELCOME_SCRIPT = `Hey. I'm glad you're here.

I don't know what brought you — maybe something's been weighing on you, or maybe you just felt the pull toward something more. Either way, that pull matters. Don't dismiss it.

You don't have to have the right words. You don't have to know what you're looking for. All you have to do is be honest about where you actually are. That's the only place God ever meets anyone anyway.

So take a breath. And when you're ready — just tell us what's on your heart. Your words, however they come. We'll go from there.`;

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

export function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  const { play, stop, toggle, playing, loading, progress } = useTTS();
  const [, navigate] = useLocation();

  // No auto-play — browsers silently block audio without a direct user tap.
  // The button below invites the tap instead.

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
        {/* Hero band — dark purple gradient with centered icon (matches Figma Onboarding 1) */}
        <div
          className="relative px-8 pt-7 pb-6 text-center overflow-hidden shrink-0 rounded-t-3xl"
          style={{ background: "linear-gradient(160deg, #2a1060 0%, #1a0848 50%, #0d0820 100%)" }}
        >
          {/* Subtle radial glow behind icon */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(120,60,220,0.35) 0%, transparent 70%)" }}
          />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            data-testid="btn-close-welcome"
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>

          <div className="relative z-10">
            {/* App icon — lighter purple box on dark purple background */}
            <div className="flex justify-center mb-4">
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 20,
                  background: "linear-gradient(145deg, #7c3aed 0%, #5b21b6 100%)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src="/sp-cross-logo.png"
                  alt="Shepherd's Path"
                  style={{
                    width: "82%",
                    height: "82%",
                    objectFit: "contain",
                    objectPosition: "50% 35%",
                  }}
                />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
              Shepherd's Path
            </h1>
            <p className="text-white/80 mt-1.5" style={{ fontFamily: "var(--font-decorative)", fontStyle: "italic", fontWeight: 400, fontSize: "1.05rem" }}>
              Scripture for what you're going through
            </p>
          </div>
        </div>

        {/* Audio strip — tap to play */}
        <div className="shrink-0 px-4 pt-4 pb-3 bg-background">
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
              boxShadow: (!playing && !loading && progress === 0)
                ? "0 0 0 3px rgba(124,60,237,0.15), 0 0 0 6px rgba(124,60,237,0.07)"
                : undefined,
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
                    : <span className="text-white text-[15px]">▶</span>
                }
              </div>

              <div className="flex-1 text-left min-w-0">
                <p
                  className="text-[13px] font-bold leading-tight"
                  style={{ color: playing ? "rgba(255,255,255,0.95)" : "#3b1e8e" }}
                >
                  {loading
                    ? "Preparing your welcome…"
                    : playing
                      ? "Playing — tap to stop"
                      : started
                        ? "Replay welcome message"
                        : "Hear your welcome message"}
                </p>
                <p
                  className="text-[11px] mt-0.5 leading-none"
                  style={{ color: playing ? "rgba(255,255,255,0.5)" : "#7c5cbf" }}
                >
                  {loading ? "Just a moment…" : started && !loading ? "" : "~15 seconds · tap to hear"}
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

        {/* CTAs */}
        <div className="shrink-0 px-4 pb-4 bg-background space-y-2.5">
          <button
            data-testid="btn-start-exploring"
            className="w-full rounded-2xl font-bold py-4 text-sm bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 active:scale-[0.98] transition-all border-0 relative flex items-center justify-center"
            onClick={handleDismiss}
          >
            <span className="text-white text-[15px] font-bold tracking-tight">Share what you&rsquo;re carrying today</span>
            <ArrowRight className="w-4 h-4 text-white absolute right-5" />
          </button>
          <button
            data-testid="btn-familiar-with-bible"
            className="w-full rounded-2xl font-semibold py-3.5 text-[14px] flex items-center justify-center gap-2.5 border border-border/60 bg-muted/40 hover:bg-muted/70 active:scale-[0.98] transition-all"
            onClick={() => {
              handleDismiss();
              navigate("/bible");
            }}
          >
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground/80">I&rsquo;m familiar with the Bible</span>
          </button>
        </div>

        {/* Scrollable context — for the curious */}
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
