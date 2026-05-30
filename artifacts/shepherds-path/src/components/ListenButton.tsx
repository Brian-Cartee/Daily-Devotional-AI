import { Volume2, VolumeX, RotateCcw, Play } from "lucide-react";
import { useTTS, type ListenScope } from "@/hooks/use-tts";
import { getUserVoice, setUserVoice } from "@/lib/userName";
import { truncateForListen } from "@/lib/listenText";

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

  const iconClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textClass = size === "sm" ? "text-[12px]" : "text-sm";
  const listenText = truncateForListen(text, scope);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!listenText) return;
    if (blocked) {
      resumeAfterBlock();
      return;
    }
    const selectedVoice = voice ?? getUserVoice();
    try {
      if (!localStorage.getItem("sp_voice")) setUserVoice(selectedVoice);
    } catch {
      /* noop */
    }
    toggle(listenText, selectedVoice, { scope });
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

  const duration = !playing && !loading && !error && !blocked && listenText
    ? estimateDuration(listenText)
    : null;

  return (
    <div className={`inline-flex ${vertical ? "flex-col items-center gap-1.5" : "items-center gap-2"}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !listenText}
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
  );
}
