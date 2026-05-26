import { Pin } from "lucide-react";
import { ClosetPrayerChair } from "@/components/ClosetPrayerChair";
import { ClosetPrayerRug } from "@/components/ClosetPrayerRug";
import { CLOSET_BACKGROUNDS, type ClosetBackgroundId } from "@/lib/prayerCloset";

type WallVerse = { text: string; reference: string };

type Props = {
  wallArtSrc: string;
  wallArtPosition?: string;
  wallVerse: WallVerse;
  candleLevel: number;
  draftNote?: string;
  lastPrayerSnippet?: string | null;
  dailyArtThumb?: string | null;
  canPinVerse?: boolean;
  onPinVerse?: () => void;
  visionBoardEmphasis?: boolean;
};

/** Corner-view prayer closet — shared 3D perspective (walls + floor plane) */
export function PrayerClosetRoom({
  wallArtSrc,
  wallArtPosition = "center 42%",
  wallVerse,
  candleLevel,
  draftNote,
  lastPrayerSnippet,
  dailyArtThumb,
  canPinVerse,
  onPinVerse,
  visionBoardEmphasis = true,
}: Props) {
  const glow = 0.35 + candleLevel * 0.55;
  const roomBrightness = 0.72 + candleLevel * 0.22;

  return (
    <div
      className="relative mx-auto w-full overflow-hidden border-y sm:border border-violet-500/20 shadow-2xl shadow-black/60 sm:rounded-2xl"
      data-testid="prayer-closet-room"
    >
      <div className="closet-room-viewport">
        <div
          className="absolute inset-0 pointer-events-none z-[8]"
          style={{
            background: `radial-gradient(ellipse 55% 45% at 78% 28%, rgba(251,191,36,${0.07 * glow}) 0%, transparent 55%)`,
          }}
        />

        <div className="closet-room-scene">
          <div className="closet-room-back" data-testid="closet-framed-art">
            <div
              className="h-full rounded-sm p-[3px]"
              style={{
                background: "linear-gradient(145deg, #3d2f52 0%, #1a1424 100%)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div className="h-full rounded-[2px] overflow-hidden border border-black/50">
                <img
                  src={wallArtSrc}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: wallArtPosition,
                    filter: `brightness(${roomBrightness}) saturate(0.95)`,
                    minHeight: 140,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="closet-room-left" aria-hidden />
          <div className="closet-room-left-board" aria-hidden />
          <div className="closet-room-right" aria-hidden />

          <div className="closet-room-floor">
            <div className="closet-room-rug">
              <ClosetPrayerRug onFloor />
            </div>
            <div className="closet-room-chair">
              <div className="scale-[0.68] origin-bottom">
                <ClosetPrayerChair />
              </div>
            </div>
          </div>

          <div
            className={`closet-room-vision rounded-xl border backdrop-blur-md transition-all duration-500 ${
              visionBoardEmphasis
                ? "opacity-100 border-violet-400/35 shadow-lg shadow-violet-950/40"
                : "opacity-70 border-white/15"
            }`}
            style={{
              background:
                "linear-gradient(165deg, rgba(48,38,64,0.97) 0%, rgba(28,20,40,0.98) 100%)",
            }}
            data-testid="closet-vision-board"
          >
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-violet-200/70 px-2.5 pt-2 pb-1">
              Vision board
            </p>
            <div className="px-2 pb-2 space-y-1.5">
              <div className="rounded-md border border-amber-500/25 bg-black/40 px-2 py-1.5 shadow-inner">
                <Pin className="w-2.5 h-2.5 text-amber-300/90 mb-0.5" />
                <p className="path-reminder-quote text-[10px] leading-snug text-white/90 line-clamp-4">
                  &ldquo;{wallVerse.text.length > 88 ? `${wallVerse.text.slice(0, 88)}…` : wallVerse.text}&rdquo;
                </p>
                <p className="text-[8px] text-amber-200/65 mt-0.5 font-medium">— {wallVerse.reference}</p>
              </div>
              {dailyArtThumb && (
                <div className="rounded-md overflow-hidden border border-white/20 h-10 shadow-sm">
                  <img src={dailyArtThumb} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {draftNote?.trim() && (
                <p className="text-[8px] text-white/50 line-clamp-2 italic px-0.5">{draftNote.trim()}</p>
              )}
              {lastPrayerSnippet && (
                <p className="text-[8px] text-white/45 line-clamp-2 px-0.5">{lastPrayerSnippet}</p>
              )}
              {canPinVerse && onPinVerse && (
                <button
                  type="button"
                  onClick={onPinVerse}
                  data-testid="button-pin-verse-closet"
                  className="w-full text-[8px] font-semibold text-violet-200/90 hover:text-white py-1 rounded-md bg-violet-500/15"
                >
                  Pin today&apos;s verse
                </button>
              )}
            </div>
          </div>

          <div className="closet-room-candle flex flex-col items-center pointer-events-none">
            <div className="w-10 h-0.5 rounded-full bg-white/10 mb-0.5" />
            <div
              className="w-2 h-2 rounded-full bg-amber-400/90"
              style={{
                boxShadow: `0 0 ${10 + candleLevel * 16}px rgba(251,191,36,${0.45 * glow})`,
                opacity: 0.5 + candleLevel * 0.5,
              }}
            />
          </div>
        </div>

        <div className="closet-room-ceiling" />
        <div className="closet-room-vignette" />

        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 text-[8px] tracking-[0.12em] uppercase text-amber-200/35 font-medium pointer-events-none">
          Kneel on the rug · face the wall
        </p>
      </div>
    </div>
  );
}

export function closetWallArtLabel(id: ClosetBackgroundId): string {
  const bg = CLOSET_BACKGROUNDS.find((b) => b.id === id);
  return bg ? `Wall art · ${bg.label}` : "Wall art";
}
