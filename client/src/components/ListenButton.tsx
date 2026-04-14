import { Volume2, VolumeX, Loader2, RotateCcw, Play } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";

interface ListenButtonProps {
  text: string;
  voice?: string;
  className?: string;
  label?: string;
  size?: "sm" | "md";
  vertical?: boolean;
}

export function ListenButton({
  text,
  voice,
  className = "",
  label = "Listen",
  size = "sm",
  vertical = false,
}: ListenButtonProps) {
  const { toggle, resumeAfterBlock, playing, loading, loadingLong, error, blocked } = useTTS();

  const iconClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textClass = size === "sm" ? "text-[12px]" : "text-sm";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (blocked) {
      resumeAfterBlock();
    } else {
      toggle(text, voice);
    }
  };

  const displayLabel = () => {
    if (blocked) return "Tap to play";
    if (loading && loadingLong) return "Still on its way…";
    if (loading) return "Loading…";
    if (error) return "Try again";
    if (playing) return "Stop";
    return label;
  };

  const displayIcon = () => {
    const cls = `${vertical ? "w-4 h-4" : iconClass}`;
    if (blocked) return <Play className={cls} />;
    if (loading) return <Loader2 className={`${cls} animate-spin`} />;
    if (error) return <RotateCcw className={cls} />;
    if (playing) return <VolumeX className={cls} />;
    return <Volume2 className={cls} />;
  };

  return (
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
  );
}
