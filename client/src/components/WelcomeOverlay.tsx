import { motion } from "framer-motion";
import { Volume2, VolumeX, Play, Square, ArrowRight, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTTS } from "@/hooks/use-tts";

const WELCOME_SCRIPT = `Welcome. I mean that with everything I have — welcome.

Wherever you are right now — whether your faith is solid as a rock, or barely holding on by a thread — you are in the right place.

Shepherd's Path exists for one reason: to help you build a daily, living relationship with Jesus Christ. Not a religion. Not a checklist. A relationship — real, honest, and transformative.

Here is what we know to be true: the single most important thing you can do with your time on this earth is draw closer to God every single day. Not weekly. Not when it feels convenient. Every. Single. Day.

This app was built to make that possible. A daily scripture. A guided reflection. A prayer rooted in God's Word. Tools to read the entire Bible with understanding. A journal to capture what He is doing in your life.

And as you show up — day after day — something begins to happen. Sin loses its grip. Peace finds its way in. And the person God created you to be starts to come forward.

We are not here to entertain you. We are here to walk with you.

Let us begin.`;

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

export function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  const { toggle, stop, playing, loading, progress } = useTTS();

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
        {/* Header band — hero image — fixed, not scrollable */}
        <div className="relative px-8 pt-6 pb-8 text-center overflow-hidden shrink-0" style={{ minHeight: 200 }}>
          <img
            src="/hero-landing.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.38) 60%, rgba(0,0,0,0.62) 100%)" }} />
          <div className="relative z-10">
            <div className="flex justify-center mb-2">
              <img
                src="/sp-logo.png"
                alt="Shepherd's Path logo"
                className="w-24 h-24"
                style={{ mixBlendMode: "screen" }}
              />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
              Shepherd's Path
            </h1>
            <p className="text-white/90 mt-1.5 leading-relaxed" style={{ fontFamily: "var(--font-decorative)", fontStyle: "italic", fontWeight: 400, fontSize: "1.15rem", letterSpacing: "0.01em" }}>
              Your daily walk with Jesus
            </p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="-mt-5 bg-background rounded-t-3xl px-6 pt-6 pb-3 space-y-4 overflow-y-auto flex-1">

          {/* Audio player — first thing they see */}
          <div className="bg-muted/40 border border-border/50 rounded-2xl px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {playing
                  ? <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                  : <VolumeX className="w-4 h-4 text-muted-foreground" />
                }
                <span className="text-[13px] font-semibold text-foreground">
                  {loading ? "Preparing…" : playing ? "Playing welcome…" : started ? "Welcome message" : "Hear a personal welcome"}
                </span>
              </div>
              <button
                data-testid="btn-toggle-audio"
                onClick={() => toggle(WELCOME_SCRIPT)}
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

            {/* Progress bar */}
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
              A personal welcome — about 90 seconds.
            </p>
          </div>

          {/* Scripture First — full-width trust statement */}
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3">
            <span className="text-lg shrink-0">📜</span>
            <div>
              <p className="text-[13px] font-bold text-foreground leading-tight">Our Commitment to Scripture</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                Every AI response is grounded in God's Word — always. We are a Bible-first app.
              </p>
            </div>
          </div>

          {/* Feature list — compact 2-per-row grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: "🌅", title: "Daily Devotional", desc: "Scripture, reflection & prayer" },
              { icon: "🧭", title: "Bible Journey", desc: "30-day guided transformation" },
              { icon: "📖", title: "Read the Bible", desc: "Every chapter with AI insight" },
              { icon: "✍️", title: "Prayer Journal", desc: "Prayers, reflections & verses" },
              { icon: "🔥", title: "Daily Streak", desc: "Track your faithfulness" },
              { icon: "📚", title: "Bible Study", desc: "Deep AI-guided study tools" },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-2 bg-muted/30 rounded-xl px-3 py-2.5">
                <span className="text-sm mt-0.5 shrink-0">{f.icon}</span>
                <div>
                  <p className="text-[12px] font-semibold text-foreground leading-tight">{f.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* CTA footer — always visible, pinned to bottom */}
        <div className="shrink-0 px-6 pb-6 pt-3 bg-background rounded-b-3xl border-t border-border/40 space-y-2">
          <Button
            data-testid="btn-start-exploring"
            className="w-full rounded-2xl font-bold py-5 text-sm bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 transition-opacity border-0"
            onClick={handleDismiss}
          >
            Start Exploring
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <button
            data-testid="btn-skip-welcome"
            onClick={handleDismiss}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1 flex items-center justify-center gap-1"
          >
            Skip voice intro
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
