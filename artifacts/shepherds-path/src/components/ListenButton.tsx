import { useState } from "react";
import { Volume2, VolumeX, RotateCcw, Play } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTTS, type ListenScope } from "@/hooks/use-tts";
import { getUserVoice, setUserVoice } from "@/lib/userName";

/** Returns true only if the user has explicitly chosen a voice. */
function hasVoicePreference(): boolean {
  try {
    const v = localStorage.getItem("sp_voice");
    return v === "onyx" || v === "shimmer";
  } catch {
    return false;
  }
}

function estimateDuration(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const seconds = Math.round((words / 140) * 60);
  if (seconds < 60) return `~${seconds}s`;
  const mins = Math.round(seconds / 60);
  return `~${mins}m`;
}

interface ListenButtonProps {
  text: string;
  voice?: string;
  className?: string;
  label?: string;
  size?: "sm" | "md";
  vertical?: boolean;
  /** verse = today's short scripture (always free); snippet = reflection/prayer chunks */
  scope?: ListenScope;
}

export function ListenButton({
  text,
  voice,
  className = "",
  label = "Listen",
  size = "sm",
  vertical = false,
  scope = "snippet",
}: ListenButtonProps) {
  const { toggle, resumeAfterBlock, playing, loading, loadingLong, error, blocked } = useTTS();
  const [showPicker, setShowPicker] = useState(false);

  const iconClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textClass = size === "sm" ? "text-[12px]" : "text-sm";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (blocked) {
      resumeAfterBlock();
      return;
    }
    const opts = { scope };
    if (playing || loading) {
      toggle(text, voice ?? getUserVoice(), opts);
      return;
    }
    // First-time: show voice picker so they choose before hearing anything
    if (!hasVoicePreference()) {
      setShowPicker(true);
      return;
    }
    toggle(text, voice ?? getUserVoice(), opts);
  };

  const pickVoice = (picked: "onyx" | "shimmer") => {
    setUserVoice(picked);
    setShowPicker(false);
    toggle(text, voice ?? picked, { scope });
  };

  const displayLabel = () => {
    if (blocked) return "Tap to play";
    if (loading && loadingLong) return "Still on its way…";
    if (loading) return "Preparing…";
    if (error) return "Try again";
    if (playing) return "Stop";
    return label;
  };

  const displayIcon = () => {
    const cls = `${vertical ? "w-4 h-4" : iconClass}`;
    if (blocked) return <Play className={cls} />;
    if (loading) return <Volume2 className={`${cls} animate-pulse`} />;
    if (error) return <RotateCcw className={cls} />;
    if (playing) return <VolumeX className={cls} />;
    return <Volume2 className={cls} />;
  };

  const duration = !playing && !loading && !error && !blocked ? estimateDuration(text) : null;

  return (
    <>
      <div className={`inline-flex ${vertical ? "flex-col items-center gap-1.5" : "items-center gap-2"}`}>
        <button
          onClick={handleClick}
          disabled={loading}
          data-testid="btn-listen"
          aria-label={playing ? "Stop audio" : error ? "Retry audio" : blocked ? "Tap to play" : `Listen to ${label}`}
          className={`${vertical ? "flex flex-col items-center gap-1.5" : "flex items-center gap-1.5"} font-semibold transition-colors disabled:opacity-50 ${vertical ? "text-[11px]" : textClass} ${
            error
              ? "text-destructive hover:text-destructive/80"
              : blocked
              ? "text-amber-500 hover:text-amber-400"
              : playing
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          } ${className}`}
        >
          {displayIcon()}
          <span className="leading-none">{displayLabel()}</span>
        </button>
        {duration && (
          <span className={`${vertical ? "text-[11px]" : "text-[12px]"} text-muted-foreground/70 leading-none`}>
            {duration}
          </span>
        )}
      </div>

      {/* ── First-time voice picker ─────────────────────────────────────── */}
      <AnimatePresence>
        {showPicker && (
          <>
            <motion.div
              key="voice-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setShowPicker(false)}
            />
            <motion.div
              key="voice-picker"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 32 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card border-t border-border px-6 pt-5 pb-10 shadow-xl"
            >
              <div className="w-8 h-1 rounded-full bg-border mx-auto mb-4" />
              <p className="text-[16px] font-bold text-foreground text-center mb-1">
                How would you like to hear this?
              </p>
              <p className="text-[12px] text-muted-foreground text-center mb-6">
                You can change this anytime in the menu (⋯) above.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <button
                  onClick={() => pickVoice("shimmer")}
                  data-testid="button-voice-female"
                  className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-muted/40 py-5 hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-[0.97]"
                >
                  <span className="text-2xl select-none">♀</span>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-foreground leading-tight">Female</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Warm &amp; gentle</p>
                  </div>
                </button>
                <button
                  onClick={() => pickVoice("onyx")}
                  data-testid="button-voice-male"
                  className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-muted/40 py-5 hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-[0.97]"
                >
                  <span className="text-2xl select-none">♂</span>
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-foreground leading-tight">Male</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Deep &amp; steady</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
