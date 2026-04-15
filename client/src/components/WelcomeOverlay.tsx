import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, ChevronDown, Loader2, Square, X } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";
import { getUserVoice } from "@/lib/userName";
import { useLocation } from "wouter";
import { useState } from "react";

const WELCOME_SCRIPT = `Hey… I'm really glad you're here.

I don't know what brought you…
maybe something's been weighing on you…
or maybe you just felt a pull toward something more.

Either way… that matters.
Don't brush past it.

You don't need the right words…
and you don't have to have anything figured out.
Just be honest about where you are.
That's where God meets people… every time.

So take a breath…
and when you're ready…
you can just start sharing what's on your heart.
We'll walk through it together.`;

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

export function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  const { play, stop, toggle, playing, loading, progress } = useTTS();
  const [, navigate] = useLocation();
  const [showDetails, setShowDetails] = useState(false);

  const started = progress > 0 || playing || loading;

  const handleDismiss = () => {
    stop();
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{
        background: "linear-gradient(175deg, #1e0d50 0%, #130636 40%, #09031e 100%)",
      }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 50% 38%, rgba(110,50,220,0.4) 0%, rgba(80,20,180,0.15) 55%, transparent 75%)",
        }}
      />

      {/* Close button */}
      <button
        onClick={handleDismiss}
        data-testid="btn-close-welcome"
        className="absolute top-5 right-5 z-30 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4 text-white/70" strokeWidth={2.5} />
      </button>

      {/* Hero section — logo + title */}
      <motion.div
        className="relative z-10 flex flex-col items-center pt-16 pb-8 px-6 shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        {/* App icon */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 22,
            background: "linear-gradient(145deg, #7c3aed 0%, #5b21b6 100%)",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(255,255,255,0.14), 0 0 60px rgba(120,60,230,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img
            src="/sp-icon.png"
            alt="Shepherd's Path"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <h1 className="mt-5 text-[26px] font-extrabold text-white tracking-tight text-center leading-tight">
          Shepherd&rsquo;s Path
        </h1>
        <p className="mt-2.5 text-white/80 text-center text-[15px] leading-relaxed tracking-wide font-medium">
          Scripture for what you&rsquo;re going through
        </p>
        <p className="mt-1.5 text-white/50 text-center text-[13px] leading-snug px-4">
          Whatever you&rsquo;re carrying &mdash; you can begin here.
        </p>
      </motion.div>

      {/* Audio strip */}
      <motion.div
        className="relative z-10 px-5 shrink-0"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
      >
        <button
          data-testid="btn-toggle-audio"
          onClick={() => toggle(WELCOME_SCRIPT, getUserVoice())}
          disabled={loading}
          className="w-full rounded-2xl border transition-all active:scale-[0.98] overflow-hidden disabled:opacity-60"
          style={{
            background: playing
              ? "linear-gradient(135deg, rgba(40,15,90,0.9) 0%, rgba(60,20,120,0.85) 100%)"
              : "rgba(255,255,255,0.10)",
            borderColor: playing
              ? "rgba(140,90,255,0.35)"
              : "rgba(255,255,255,0.12)",
            backdropFilter: "blur(10px)",
            boxShadow: undefined,
          }}
        >
          <div className="flex items-center gap-4 px-5 py-3.5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
              style={{
                background: playing
                  ? "rgba(255,255,255,0.12)"
                  : "linear-gradient(135deg, #7c3aed, #a855f7)",
              }}
            >
              {loading
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : playing
                  ? <Square className="w-3.5 h-3.5 text-white" />
                  : <span className="text-white text-[15px]">▶</span>
              }
            </div>

            <div className="flex-1 text-left min-w-0">
              <p className="text-[13px] font-bold text-white leading-tight">
                {loading
                  ? "Preparing your welcome…"
                  : playing
                    ? "Playing — tap to stop"
                    : started
                      ? "Replay welcome message"
                      : "Hear Your Welcome Message"}
              </p>
              <p className="text-[11px] mt-0.5 leading-none text-white/50">
                {loading ? "Just a moment…" : started && !loading ? "" : "~15 seconds · tap to hear"}
              </p>
              {started && (
                <div className="mt-2 w-full h-1 rounded-full overflow-hidden bg-white/15">
                  <motion.div
                    className="h-full rounded-full bg-white/70"
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
      </motion.div>

      {/* Spacer — pushes CTAs toward center-bottom */}
      <div className="flex-1" />

      {/* CTAs — anchored toward bottom */}
      <motion.div
        className="relative z-10 px-5 pb-3 space-y-3 shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
      >
        <button
          data-testid="btn-start-exploring"
          className="w-full rounded-2xl font-bold py-4 text-[15px] bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 active:scale-[0.98] transition-all border-0 relative flex items-center justify-center shadow-lg"
          style={{ boxShadow: "0 4px 24px rgba(245,158,11,0.35)" }}
          onClick={handleDismiss}
        >
          <span className="text-white tracking-tight">Share What You&rsquo;re Carrying</span>
          <ArrowRight className="w-4 h-4 text-white absolute right-5" />
        </button>

        <button
          data-testid="btn-familiar-with-bible"
          className="w-full rounded-2xl font-semibold py-3.5 text-[14px] flex items-center justify-center gap-2.5 border transition-all active:scale-[0.98]"
          style={{
            background: "rgba(255,255,255,0.07)",
            borderColor: "rgba(255,255,255,0.16)",
            color: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(8px)",
          }}
          onClick={() => {
            handleDismiss();
            navigate("/bible");
          }}
        >
          <BookOpen className="w-4 h-4 opacity-70" />
          <span>I&rsquo;m Familiar With The Bible</span>
        </button>
      </motion.div>

      {/* How it works — collapsible */}
      <motion.div
        className="relative z-10 px-5 pb-8 shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <button
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-white/40 hover:text-white/60 transition-colors text-[12px] font-medium"
        >
          How it works
          <motion.div animate={{ rotate: showDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div
                className="rounded-2xl border px-5 py-4 space-y-3 mt-1"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderColor: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {[
                  { icon: "💬", bold: "Tell us what you're going through.", body: "Grief, anxiety, a hard relationship, a question about God — anything on your heart." },
                  { icon: "📖", bold: "We'll find scripture for it", body: "and give you a personalized pastoral response — grounded in God's Word, made for your moment." },
                  { icon: "🧭", bold: "Then walk a journey.", body: "We'll build you a personalized Bible journey around exactly what you shared." },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <p className="text-[13px] text-white/70 leading-relaxed">
                      <span className="font-semibold text-white/90">{item.bold}</span>{" "}{item.body}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="mt-2 rounded-xl border px-4 py-3 flex items-start gap-3"
                style={{
                  background: "rgba(255,80,80,0.07)",
                  borderColor: "rgba(255,120,120,0.18)",
                }}
              >
                <span className="text-lg shrink-0">✝️</span>
                <div>
                  <p className="text-[13px] font-bold text-white/90 leading-tight">Built to lead people to Christ</p>
                  <p className="text-[11px] text-white/50 leading-snug mt-0.5">
                    Rooted in Father, Son, and Holy Spirit. Every response is grounded in God's Word — never beside it.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
