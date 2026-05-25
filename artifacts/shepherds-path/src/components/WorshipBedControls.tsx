import { Music2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { WorshipBedVolumeSlider } from "@/components/WorshipBedVolumeSlider";
import type { WorshipBedSource } from "@/lib/worshipBedSource";
import { isYoutubeSideVolumeDevice } from "@/lib/device";
import { WORSHIP_TRACKS, type WorshipTrackId } from "@/lib/worshipTracks";
import {
  WORSHIP_YOUTUBE_MIXES,
  type WorshipYoutubeMixId,
} from "@/lib/worshipYouTubeMixes";

export const WORSHIP_YOUTUBE_PLAYER_ID = "sp-worship-youtube-player";

type Props = {
  enabled: boolean;
  source: WorshipBedSource;
  trackId: string | null;
  youtubeMixId: WorshipYoutubeMixId;
  volume: number;
  usingGenerated?: boolean;
  youtubeReady?: boolean;
  youtubeError?: boolean;
  onEnabledChange: (v: boolean) => void;
  onSourceChange: (source: WorshipBedSource) => void;
  onTrackChange: (id: WorshipTrackId) => void;
  onYoutubeMixChange: (id: WorshipYoutubeMixId) => void;
  onVolumeChange: (v: number) => void;
};

export function WorshipBedControls({
  enabled,
  source,
  trackId,
  youtubeMixId,
  volume,
  usingGenerated,
  youtubeReady,
  youtubeError,
  onEnabledChange,
  onSourceChange,
  onTrackChange,
  onYoutubeMixChange,
  onVolumeChange,
}: Props) {
  const isYoutube = source === "youtube";
  const youtubeOnMobile = isYoutube && isYoutubeSideVolumeDevice();

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
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          data-testid="toggle-worship-bed"
          className="shrink-0 data-[state=checked]:bg-violet-600 data-[state=unchecked]:bg-white/20"
        />
      </div>

      {enabled && (
        <>
          <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10 mb-3">
            <button
              type="button"
              data-testid="worship-source-youtube"
              onClick={() => onSourceChange("youtube")}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                isYoutube ? "bg-violet-600/80 text-white" : "text-white/50 hover:text-white/70"
              }`}
            >
              YouTube mixes
            </button>
            <button
              type="button"
              data-testid="worship-source-local"
              onClick={() => onSourceChange("local")}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                !isYoutube ? "bg-violet-600/80 text-white" : "text-white/50 hover:text-white/70"
              }`}
            >
              Stillness (local)
            </button>
          </div>

          {isYoutube ? (
            <div className="flex flex-col gap-2 mb-3">
              {WORSHIP_YOUTUBE_MIXES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  data-testid={`worship-youtube-${m.id}`}
                  onClick={() => onYoutubeMixChange(m.id)}
                  className={`rounded-lg px-2.5 py-2 text-left transition-colors border w-full ${
                    youtubeMixId === m.id
                      ? "border-violet-400/50 bg-violet-500/20"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <p className="text-[12px] font-semibold text-white/90 leading-snug">{m.title}</p>
                  <p className="text-[10px] text-white/45">
                    {m.channel} · {m.durationLabel} · {m.mood}
                  </p>
                </button>
              ))}
              <div
                id={WORSHIP_YOUTUBE_PLAYER_ID}
                className={`w-full rounded-xl overflow-hidden bg-black/60 ${
                  enabled ? "min-h-[52px]" : "h-0 min-h-0"
                }`}
                data-testid="worship-youtube-player"
              />
              {youtubeError && (
                <p className="text-[10px] text-amber-200/80 leading-snug">
                  This mix may not allow embedding — try another or use Stillness (local).
                </p>
              )}
              {!youtubeError && enabled && !youtubeReady && (
                <p className="text-[10px] text-white/40 leading-snug">
                  Loading player… On phone, tap play inside the bar if music doesn&apos;t start.
                </p>
              )}
            </div>
          ) : (
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
          )}

          <WorshipBedVolumeSlider
            volume={volume}
            onVolumeChange={onVolumeChange}
            youtubeOnMobile={youtubeOnMobile}
          />
          {!isYoutube && usingGenerated && (
            <p className="text-[10px] text-white/40 mt-2 leading-snug">
              Playing a quiet stillness tone — add MP3s in public/worship/ for full tracks (see README).
            </p>
          )}
        </>
      )}
    </div>
  );
}
