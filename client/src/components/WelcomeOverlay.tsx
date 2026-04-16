import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Loader2, Square, X } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";
import { getUserVoice } from "@/lib/userName";
import { useState } from "react";

const WELCOME_SCRIPT = `Hey… I'm really glad you're here.

I don't know what brought you…
maybe something's been weighing on you…
or maybe you just felt a pull.

Either way… that matters.
It's worth paying attention to.

You don't need the right words…
and you don't have to have anything figured out.
Just be honest about where you are.
That's where God meets people… every time.

So take a breath…
and when you're ready…
you can just start sharing what's on your heart…
or take a moment to see how this works.`;

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

export function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  const { play, stop, toggle, playing, loading, progress } = useTTS();
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
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
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

      {/* Spacer — pushes CTAs toward the lower half */}
      <div className="flex-1" />

      {/* All three entry paths — stacked, all visible without scrolling */}
      <motion.div
        className="relative z-10 px-5 space-y-3 shrink-0"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
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
          onClick={handleDismiss}
        >
          <BookOpen className="w-4 h-4 opacity-70" />
          <span>I&rsquo;m Familiar With The Bible</span>
        </button>

        {/* Audio — tertiary, quiet third option */}
        <button
          data-testid="btn-toggle-audio"
          onClick={() => toggle(WELCOME_SCRIPT, getUserVoice())}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-40"
          style={{
            background: playing ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: playing ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.14)" }}
          >
            {loading
              ? <Loader2 className="w-3 h-3 text-white/70 animate-spin" />
              : playing
                ? <Square className="w-2.5 h-2.5 text-white/80" />
                : <span className="text-white/80 text-[11px]">▶</span>
            }
          </div>
          <div className="text-left flex-1">
            <p className="text-[12px] text-white/65 leading-tight">
              {loading ? "Preparing…" : playing ? "Playing — tap to stop" : started ? "Replay welcome message" : "Or begin by listening"}
            </p>
            {started && !playing && !loading && (
              <div className="mt-1 w-32 h-0.5 rounded-full overflow-hidden bg-white/10">
                <div className="h-full rounded-full bg-white/40" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          {playing && (
            <div className="flex items-end gap-0.5 h-3.5 flex-shrink-0">
              {[0.6, 1, 0.75, 0.45, 0.85].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-0.5 rounded-full bg-white/40"
                  animate={{ scaleY: [h, 1, h * 0.7, 1, h] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                  style={{ height: "100%", transformOrigin: "bottom" }}
                />
              ))}
            </div>
          )}
        </button>
      </motion.div>

      {/* Faith statement — small, quiet, anchored to the bottom */}
      <motion.div
        className="relative z-10 px-5 shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        style={{ paddingBottom: "max(32px, calc(20px + env(safe-area-inset-bottom, 0px)))", paddingTop: 16 }}
      >
        <p className="text-center text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.28)" }}>
          ✝ Rooted in Father, Son, and Holy Spirit — grounded in God&rsquo;s Word.
        </p>
      </motion.div>
    </motion.div>
  );
}
