import { motion } from "framer-motion";
import { Flame, Pin } from "lucide-react";
import { ClosetPrayerChair } from "@/components/ClosetPrayerChair";
import { ClosetPrayerRug } from "@/components/ClosetPrayerRug";
import { CLOSET_BACKGROUNDS, type ClosetBackgroundId } from "@/lib/prayerCloset";

type WallVerse = { text: string; reference: string };

type Props = {
  title: string;
  wallArtSrc: string;
  wallArtPosition?: string;
  wallVerse: WallVerse;
  candleLevel: number;
  draftNote?: string;
  lastPrayerSnippet?: string | null;
  dailyArtThumb?: string | null;
  canPinVerse?: boolean;
  onPinVerse?: () => void;
  showIntroLine?: boolean;
  onIntroDismiss?: () => void;
  visionBoardEmphasis?: boolean;
};

/** Corner-view prayer closet — shared 3D perspective (walls + floor plane) */
export function PrayerClosetRoom({
  title,
  wallArtSrc,
  wallArtPosition = "center 42%",
  wallVerse,
  candleLevel,
  draftNote,
  lastPrayerSnippet,
  dailyArtThumb,
  canPinVerse,
  onPinVerse,
  showIntroLine,
  onIntroDismiss,
  visionBoardEmphasis = true,
}: Props) {
  const glow = 0.35 + candleLevel * 0.55;
  const roomBrightness = 0.72 + candleLevel * 0.22;

  return (
    <div
      className="relative mx-auto w-full rounded-2xl overflow-hidden border border-violet-500/20 shadow-2xl shadow-black/60"
      data-testid="prayer-closet-room"
    >
      <div className="closet-room-viewport">
        {/* Candle wash — follows room-light slider */}
        <div
          className="absolute inset-0 pointer-events-none z-[8]"
          style={{
            background: `radial-gradient(ellipse 65% 50% at 72% 32%, rgba(251,191,36,${0.08 * glow}) 0%, transparent 55%)`,
          }}
        />

        <div className="closet-room-scene">
          {/* Back wall + framed art */}
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
                    minHeight: 120,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="closet-room-left" aria-hidden />
          <div className="closet-room-right" aria-hidden />

          {/* Floor plane — rug & chair sit on same surface */}
          <div className="closet-room-floor">
            <div className="closet-room-rug">
              <ClosetPrayerRug onFloor />
            </div>
            <div className="closet-room-chair">
              <div className="scale-[0.72] origin-bottom">
                <ClosetPrayerChair />
              </div>
              <p className="text-[7px] tracking-[0.12em] uppercase text-white/30 text-center -mt-2">
                Rest
              </p>
            </div>
          </div>

          {/* Vision board — mounted on left wall */}
          <div
            className={`closet-room-vision rounded-lg border border-white/10 backdrop-blur-sm transition-all duration-500 ${
              visionBoardEmphasis ? "opacity-100" : "opacity-45 scale-[0.92]"
            }`}
            style={{
              background:
                "linear-gradient(160deg, rgba(35,28,48,0.94) 0%, rgba(22,16,32,0.98) 100%)",
              boxShadow: "4px 10px 28px rgba(0,0,0,0.4)",
            }}
            data-testid="closet-vision-board"
          >
            <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-violet-300/50 px-2 pt-1.5 pb-0.5">
              Vision board
            </p>
            <div className="px-1.5 pb-1.5 space-y-1">
              <div className="rounded border border-violet-400/20 bg-black/35 px-1.5 py-1">
                <Pin className="w-2 h-2 text-amber-400/70 mb-0.5" />
                <p className="path-reminder-quote text-[9px] leading-snug text-white/85 line-clamp-3">
                  &ldquo;{wallVerse.text.length > 72 ? `${wallVerse.text.slice(0, 72)}…` : wallVerse.text}&rdquo;
                </p>
                <p className="text-[7px] text-violet-200/60">— {wallVerse.reference}</p>
              </div>
              {dailyArtThumb && (
                <div className="rounded overflow-hidden border border-white/15 h-8">
                  <img src={dailyArtThumb} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {draftNote?.trim() && (
                <p className="text-[7px] text-white/45 line-clamp-2 italic px-0.5">{draftNote.trim()}</p>
              )}
              {lastPrayerSnippet && (
                <p className="text-[7px] text-white/40 line-clamp-2 px-0.5">{lastPrayerSnippet}</p>
              )}
              {canPinVerse && onPinVerse && (
                <button
                  type="button"
                  onClick={onPinVerse}
                  data-testid="button-pin-verse-closet"
                  className="w-full text-[7px] font-semibold text-violet-300/80 hover:text-white py-0.5"
                >
                  Pin today&apos;s verse
                </button>
              )}
            </div>
          </div>

          {/* Candle — right wall shelf */}
          <div className="closet-room-candle flex flex-col items-center pointer-events-none">
            <div className="w-10 h-0.5 rounded-full bg-white/10 mb-0.5" />
            <Flame
              className="w-5 h-5 text-amber-400"
              style={{
                opacity: 0.35 + candleLevel * 0.65,
                filter: `drop-shadow(0 0 ${6 + candleLevel * 12}px rgba(251,191,36,${0.5 * glow}))`,
              }}
            />
          </div>
        </div>

        <div className="closet-room-ceiling" />
        <div className="closet-room-vignette" />

        {/* Title — overlay, not floating in scene depth */}
        <div className="closet-room-header">
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-violet-200/45">
            A room set apart
          </p>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="manifesto-line text-white/95 text-[1.25rem] sm:text-[1.4rem] mt-0.5 leading-tight"
          >
            {title}
          </motion.h1>
          {showIntroLine && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[11px] text-white/55 leading-snug mt-1.5 max-w-[26ch] mx-auto"
            >
              This room is yours. Nothing here is shared unless you choose.
              {onIntroDismiss && (
                <button
                  type="button"
                  onClick={onIntroDismiss}
                  className="block mx-auto mt-1.5 text-[10px] font-semibold text-violet-200/80 underline underline-offset-2"
                  data-testid="button-dismiss-closet-intro"
                >
                  Enter quietly
                </button>
              )}
            </motion.p>
          )}
        </div>

        {/* Floor label — subtle, at bottom of viewport */}
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 text-[7px] tracking-[0.14em] uppercase text-amber-200/40 font-medium pointer-events-none">
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
