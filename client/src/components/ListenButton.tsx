import { Volume2, VolumeX, Loader2, RotateCcw } from "lucide-react";
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
  const { toggle, playing, loading, error } = useTTS();

  const iconClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textClass = size === "sm" ? "text-[12px]" : "text-sm";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(text, voice);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      data-testid="btn-listen"
      aria-label={playing ? "Stop audio" : error ? "Retry audio" : `Listen to ${label}`}
      className={`${vertical ? "flex flex-col items-center gap-1.5" : "flex items-center gap-1.5"} font-semibold transition-colors disabled:opacity-50 ${vertical ? "text-[11px]" : textClass} ${
        error
          ? "text-destructive hover:text-destructive/80"
          : playing
          ? "text-primary"
          : "text-muted-foreground hover:text-primary"
      } ${className}`}
    >
      {loading ? (
        <Loader2 className={`${vertical ? "w-4 h-4" : iconClass} animate-spin`} />
      ) : error ? (
        <RotateCcw className={vertical ? "w-4 h-4" : iconClass} />
      ) : playing ? (
        <VolumeX className={vertical ? "w-4 h-4" : iconClass} />
      ) : (
        <Volume2 className={vertical ? "w-4 h-4" : iconClass} />
      )}
      <span className="leading-none">
        {loading ? "Loading…" : error ? "Try again" : playing ? "Stop" : label}
      </span>
    </button>
  );
}
