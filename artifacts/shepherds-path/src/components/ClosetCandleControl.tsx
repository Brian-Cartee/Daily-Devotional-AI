import { Flame } from "lucide-react";

type Props = {
  level: number;
  onChange: (level: number) => void;
  showHint?: boolean;
  onHintDismiss?: () => void;
};

/** Room light — separate from worship bed volume styling */
export function ClosetCandleControl({ level, onChange, showHint, onHintDismiss }: Props) {
  const pct = Math.round(level * 100);

  const handleChange = (v: number) => {
    onChange(v);
    onHintDismiss?.();
  };

  return (
    <div className="space-y-1.5" data-testid="closet-candle-control">
      {showHint && (
        <p className="text-[11px] text-amber-200/70 leading-snug px-1">
          Dim or brighten the room — the candle changes the light around you.
        </p>
      )}
    <div
      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm px-3 py-2.5 min-h-[44px]"
    >
      <Flame className="w-4 h-4 text-amber-400/90 shrink-0" aria-hidden />
      <span className="text-[11px] font-semibold text-amber-200/80 uppercase tracking-wide shrink-0">
        Room light
      </span>
      <input
        type="range"
        min={10}
        max={100}
        step={1}
        value={pct}
        data-testid="closet-candle"
        onInput={(e) => handleChange(Number(e.currentTarget.value) / 100)}
        onChange={(e) => handleChange(Number(e.currentTarget.value) / 100)}
        className="closet-candle-slider flex-1"
        style={{
          touchAction: "pan-x",
          ["--candle-level" as string]: `${pct}%`,
        }}
        aria-label="Room light"
      />
      <span className="text-[10px] font-mono text-white/45 w-8 text-right shrink-0">{pct}%</span>
    </div>
    </div>
  );
}
