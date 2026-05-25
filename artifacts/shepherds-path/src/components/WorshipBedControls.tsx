import { Music2, Volume2, VolumeX } from "lucide-react";
import { WORSHIP_TRACKS, type WorshipTrackId } from "@/lib/worshipTracks";

type Props = {
  enabled: boolean;
  trackId: string | null;
  volume: number;
  usingGenerated?: boolean;
  onEnabledChange: (v: boolean) => void;
  onTrackChange: (id: WorshipTrackId) => void;
  onVolumeChange: (v: number) => void;
};

export function WorshipBedControls({
  enabled,
  trackId,
  volume,
  usingGenerated,
  onEnabledChange,
  onTrackChange,
  onVolumeChange,
}: Props) {
  return (
    <div
      className="rounded-2xl border border-violet-500/25 bg-black/40 backdrop-blur-md p-4"
      data-testid="worship-bed-controls"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Music2 className="w-4 h-4 text-violet-300 shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white">Worship bed</p>
            <p className="text-[11px] text-white/50 leading-snug">
              Optional music while you pray · stays low
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          data-testid="toggle-worship-bed"
          onClick={() => onEnabledChange(!enabled)}
          className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${
            enabled ? "bg-violet-600" : "bg-white/20"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            {WORSHIP_TRACKS.map((t) => (
              <button
                key={t.id}
                type="button"
                data-testid={`worship-track-${t.id}`}
                onClick={() => onTrackChange(t.id)}
                className={`rounded-lg px-2.5 py-1.5 text-left transition-colors border ${
                  trackId === t.id
                    ? "border-violet-400/50 bg-violet-500/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <p className="text-[12px] font-semibold text-white/90">{t.title}</p>
                <p className="text-[10px] text-white/45">{t.mood}</p>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {volume < 0.05 ? (
              <VolumeX className="w-4 h-4 text-white/40 shrink-0" />
            ) : (
              <Volume2 className="w-4 h-4 text-white/50 shrink-0" />
            )}
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              data-testid="worship-bed-volume"
              onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
              className="flex-1 accent-violet-500"
              aria-label="Worship bed volume"
            />
          </div>
          {usingGenerated && (
            <p className="text-[10px] text-white/40 mt-2 leading-snug">
              Playing a quiet stillness tone — add MP3s in public/worship/ for full tracks (see README).
            </p>
          )}
        </>
      )}
    </div>
  );
}
