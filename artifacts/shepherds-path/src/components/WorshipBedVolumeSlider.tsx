import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

type Props = {
  volume: number;
  onVolumeChange: (v: number) => void;
  /** YouTube embed on iPhone — side buttons control loudness, not this slider */
  youtubeOnMobile?: boolean;
};

export function WorshipBedVolumeSlider({ volume, onVolumeChange, youtubeOnMobile }: Props) {
  const percent = Math.round(Math.min(100, Math.max(0, volume * 100)));
  const [dragPercent, setDragPercent] = useState(percent);

  useEffect(() => {
    setDragPercent(percent);
  }, [percent]);

  const apply = (raw: number) => {
    const next = Math.min(100, Math.max(0, raw));
    setDragPercent(next);
    onVolumeChange(next / 100);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 min-h-[44px]">
        {dragPercent < 5 ? (
          <VolumeX className="w-5 h-5 text-white/40 shrink-0" />
        ) : (
          <Volume2 className="w-5 h-5 text-white/50 shrink-0" />
        )}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={dragPercent}
          disabled={youtubeOnMobile}
          data-testid="worship-bed-volume"
          aria-label="Worship bed volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={dragPercent}
          aria-disabled={youtubeOnMobile}
          onInput={(e) => apply(Number(e.currentTarget.value))}
          onChange={(e) => apply(Number(e.currentTarget.value))}
          className={`worship-volume-slider flex-1 ${youtubeOnMobile ? "opacity-45" : ""}`}
          style={{
            touchAction: "pan-x",
            ["--worship-vol" as string]: `${dragPercent}%`,
          }}
        />
        <span className="text-[11px] tabular-nums text-white/45 w-8 text-right shrink-0">
          {dragPercent}%
        </span>
      </div>
      {youtubeOnMobile ? (
        <p className="text-[10px] text-white/50 leading-snug">
          On iPhone, use the <strong className="font-semibold text-white/65">side volume buttons</strong> for
          this mix — YouTube doesn&apos;t allow in-app volume control on mobile.
        </p>
      ) : null}
    </div>
  );
}
