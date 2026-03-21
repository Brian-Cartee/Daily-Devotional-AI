import { useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Play, Square, ArrowRight, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTTS } from "@/hooks/use-tts";
import { getUserVoice } from "@/lib/userName";

const WELCOME_SCRIPT = `Welcome. And we mean that — genuinely, from the bottom of our hearts — welcome.

The fact that you are here right now means something. You chose this. And wherever you are in your faith — whether it feels solid or certain, whether it's been years or it's been a while — you are in exactly the right place.

Maybe you're here because life is hard right now. A relationship. A loss. A question you can't shake. A season that doesn't make sense yet. You don't have to explain it perfectly.

Start by telling us what you're carrying. We'll find scripture for it — and walk through it with you.

We are not here to entertain you. We are here to walk with you.

Let us begin.`;

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
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="bg-background border border-border rounded-3xl shadow-2xl max-w-md w-full flex flex-col"
        style={{ maxHeight: "calc(100vh - 2.5rem)" }}
      >
        {/* Header band */}
        <div className="relative px-8 pt-6 pb-8 text-center overflow-hidden shrink-0 rounded-t-3xl" style={{ minHeight: 200 }}>
          <img
            src="/hero-landing.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.62) 100%)" }} />
          <div className="relative z-10">
            <div className="flex justify-center mb-3">
              <img
                src="/logo-mark-white.png"
                alt="Shepherd's Path logo"
                style={{ width: 112, height: 112, objectFit: "contain", filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.6))" }}
              />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
              Shepherd's Path
            </h1>
            <p className="text-white/90 mt-1.5 leading-relaxed" style={{ fontFamily: "var(--font-decorative)", fontStyle: "italic", fontWeight: 400, fontSize: "1.15rem", letterSpacing: "0.01em" }}>
              Scripture for what you're going through
            </p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="-mt-5 bg-background rounded-t-3xl px-6 pt-6 pb-3 space-y-4 overflow-y-auto flex-1">

          {/* Audio player */}
          <div className="bg-muted/40 border border-border/50 rounded-2xl px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {playing
                  ? <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                  : <VolumeX className="w-4 h-4 text-muted-foreground" />
                }
                <div className="flex items-center gap-1.5">
                  {!loading && !playing && !started && (
                    <span className="text-2xl leading-none">👂</span>
                  )}
                  <span className="text-[13px] font-semibold text-foreground">
                    {loading ? "Preparing…" : playing ? "Playing welcome…" : started ? "Welcome message" : "Hear a personal welcome"}
                  </span>
                </div>
              </div>
              <button
                data-testid="btn-toggle-audio"
                onClick={() => toggle(WELCOME_SCRIPT, getUserVoice())}
                disabled={loading}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  playing
                    ? "bg-red-100 dark:bg-red-950/50 text-red-500 hover:bg-red-200"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                } disabled:opacity-50`}
              >
                {loading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : playing
                    ? <Square className="w-3.5 h-3.5" />
                    : <Play className="w-3.5 h-3.5 translate-x-[1px]" />
                }
              </button>
            </div>

            {started && (
              <motion.div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            )}

            <p className="text-[11px] text-muted-foreground leading-snug">
              A personal welcome — about 30 seconds.
            </p>
          </div>

          {/* Core value prop — replaces feature grid */}
          <div className="rounded-2xl border border-primary/30 bg-primary/8 dark:bg-primary/12 px-5 py-4 space-y-3">
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

          {/* Scripture commitment */}
          <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl px-4 py-3">
            <span className="text-lg shrink-0">✝️</span>
            <div>
              <p className="text-[13px] font-bold text-foreground leading-tight">Scripture-first, always</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                Every response is grounded in God's Word. We never reinterpret — we illuminate.
              </p>
            </div>
          </div>

        </div>

        {/* CTA footer */}
        <div className="shrink-0 px-6 pb-6 pt-3 bg-background rounded-b-3xl border-t border-border/40 space-y-2">
          <Button
            data-testid="btn-start-exploring"
            className="w-full rounded-2xl font-bold py-5 text-sm bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 transition-opacity border-0"
            onClick={handleDismiss}
          >
            Tell us what you're going through
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <button
            data-testid="btn-skip-welcome"
            onClick={handleDismiss}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1 flex items-center justify-center gap-1"
          >
            Skip intro
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
