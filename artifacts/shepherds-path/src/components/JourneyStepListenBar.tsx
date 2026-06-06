import { Headphones, Loader2, Pause, Play, Square } from "lucide-react";
import type { useTTS } from "@/hooks/use-tts";

type TTSControls = ReturnType<typeof useTTS>;

type Props = {
  dayLabel: string;
  subtitle: string;
  ready: boolean;
  tts: TTSControls;
  onPlay: () => void;
  onStop: () => void;
};

/** Prominent one-tap listen — mirrors devotional "Full devotional" bar. */
export function JourneyStepListenBar({ dayLabel, subtitle, ready, tts, onPlay, onStop }: Props) {
  const { playing, loading, loadingLong, blocked, error } = tts;
  const active = playing || loading;

  const handleClick = () => {
    if (blocked) {
      tts.resumeAfterBlock();
      return;
    }
    if (active) {
      onStop();
      return;
    }
    onPlay();
  };

  return (
    <div
      className="mb-5 rounded-xl border border-primary/18 px-4 py-3 flex items-center justify-between gap-3 overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.07) 0%, hsl(var(--primary)/0.03) 100%)" }}
      data-testid="journey-step-listen-bar"
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)/0.35), transparent)" }} />
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            active ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary"
          }`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Headphones className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-none truncate">{dayLabel}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {blocked
              ? "Tap play — your device needs one tap first"
              : error
                ? "Try again in a moment"
                : loading
                  ? loadingLong
                    ? "Still preparing…"
                    : "Preparing audio…"
                  : playing
                    ? "Now playing this step"
                    : subtitle}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={!ready && !blocked && !active}
        data-testid="journey-step-listen-bar-play"
        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold transition-all flex-shrink-0 ${
          blocked
            ? "bg-amber-500 text-white shadow-sm"
            : active
              ? "bg-primary/20 text-primary"
              : ready
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground/70 cursor-not-allowed"
        }`}
      >
        {blocked ? (
          <>
            <Play className="w-3 h-3 ml-0.5" /> Tap to play
          </>
        ) : loading || playing ? (
          <>
            <Square className="w-3 h-3 fill-current" /> Stop
          </>
        ) : !ready ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" /> Preparing
          </>
        ) : (
          <>
            <Play className="w-3 h-3 ml-0.5" /> Play
          </>
        )}
      </button>
    </div>
  );
}
