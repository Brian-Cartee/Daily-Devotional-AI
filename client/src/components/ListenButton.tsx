import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useTTS } from "@/hooks/use-tts";

interface ListenButtonProps {
  text: string;
  className?: string;
  label?: string;
  size?: "sm" | "md";
}

export function ListenButton({ text, className = "", label = "Listen", size = "sm" }: ListenButtonProps) {
  const { toggle, playing, loading } = useTTS();

  const iconClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textClass = size === "sm" ? "text-[12px]" : "text-sm";

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(text); }}
      disabled={loading}
      data-testid="btn-listen"
      aria-label={playing ? "Stop audio" : `Listen to ${label}`}
      className={`flex items-center gap-1.5 font-semibold transition-colors disabled:opacity-50 ${textClass} ${
        playing ? "text-primary" : "text-muted-foreground hover:text-primary"
      } ${className}`}
    >
      {loading ? (
        <Loader2 className={`${iconClass} animate-spin`} />
      ) : playing ? (
        <VolumeX className={iconClass} />
      ) : (
        <Volume2 className={iconClass} />
      )}
      <span>{loading ? "Loading…" : playing ? "Stop" : label}</span>
    </button>
  );
}
