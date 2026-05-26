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

/** Enclosed prayer closet — framed wall art, vision board, chair, candle glow */
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
      className="relative mx-auto w-full"
      data-testid="prayer-closet-room"
      style={{ perspective: "960px" }}
    >
      <div
        className="relative rounded-2xl overflow-hidden border border-violet-500/20 shadow-2xl shadow-black/60"
        style={{
          minHeight: "min(96vw, 580px)",
          background: "linear-gradient(180deg, #1a1228 0%, #0f0a18 100%)",
        }}
      >
        {/* Ceiling + sacred hush */}
        <div
          className="absolute inset-x-0 top-0 h-16 z-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 50% 28%, rgba(251,191,36,${0.06 * glow}) 0%, transparent 55%)`,
          }}
        />

        {/* Left wall */}
        <div
          className="absolute left-0 top-8 bottom-12 w-[14%] z-[2] pointer-events-none"
          style={{
            background: "linear-gradient(90deg, #0a0612 0%, #15101f 100%)",
            transform: "rotateY(14deg)",
            transformOrigin: "left center",
            filter: "brightness(0.55)",
          }}
        />
        {/* Right wall */}
        <div
          className="absolute right-0 top-8 bottom-12 w-[14%] z-[2] pointer-events-none"
          style={{
            background: "linear-gradient(270deg, #0a0612 0%, #15101f 100%)",
            transform: "rotateY(-14deg)",
            transformOrigin: "right center",
            filter: "brightness(0.55)",
          }}
        />

        {/* Back wall */}
        <div
          className="absolute inset-x-[10%] top-10 bottom-16 z-[3] rounded-sm"
          style={{
            background:
              "linear-gradient(165deg, #221a32 0%, #14101f 48%, #100c16 100%)",
            boxShadow: "inset 0 0 80px rgba(0,0,0,0.45)",
          }}
        />

        {/* Framed wall art */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[6]"
          style={{ top: "10%", width: "min(82%, 300px)" }}
          data-testid="closet-framed-art"
        >
          <div
            className="rounded-sm p-[3px]"
            style={{
              background: "linear-gradient(145deg, #3d2f52 0%, #1a1424 100%)",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className="rounded-[2px] overflow-hidden border border-black/40">
              <img
                src={wallArtSrc}
                alt=""
                className="w-full aspect-[4/3] object-cover"
                style={{
                  objectPosition: wallArtPosition,
                  filter: `brightness(${roomBrightness}) saturate(0.95)`,
                }}
              />
            </div>
          </div>
          <p className="text-center text-[9px] tracking-[0.2em] uppercase text-white/30 mt-2 font-medium">
            The path · on your wall
          </p>
        </div>

        {/* Vision board — quieter until something is pinned or added */}
        <div
          className="absolute z-[7] rounded-lg border border-white/10 backdrop-blur-sm transition-all duration-500"
          style={{
            left: visionBoardEmphasis ? "11%" : "9%",
            top: visionBoardEmphasis ? "18%" : "20%",
            width: visionBoardEmphasis ? "30%" : "24%",
            minWidth: visionBoardEmphasis ? "96px" : "72px",
            opacity: visionBoardEmphasis ? 1 : 0.42,
            background:
              "linear-gradient(160deg, rgba(35,28,48,0.92) 0%, rgba(22,16,32,0.95) 100%)",
            boxShadow: visionBoardEmphasis
              ? "4px 8px 24px rgba(0,0,0,0.35)"
              : "2px 4px 12px rgba(0,0,0,0.2)",
            transform: visionBoardEmphasis ? "rotate(-2.5deg)" : "rotate(-1.5deg) scale(0.94)",
          }}
          data-testid="closet-vision-board"
        >
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-violet-300/50 px-2 pt-2 pb-1">
            Vision board
          </p>
          <div className="px-2 pb-2 space-y-1.5">
            <div
              className="rounded-md border border-violet-400/20 bg-black/30 px-2 py-1.5 shadow-sm"
              style={{ transform: "rotate(1deg)" }}
            >
              <Pin className="w-2.5 h-2.5 text-amber-400/70 mb-0.5" />
              <p className="path-reminder-quote text-[10px] leading-snug text-white/85 line-clamp-4">
                &ldquo;{wallVerse.text.length > 100 ? `${wallVerse.text.slice(0, 100)}…` : wallVerse.text}&rdquo;
              </p>
              <p className="text-[8px] text-violet-200/60 mt-0.5">— {wallVerse.reference}</p>
            </div>
            {dailyArtThumb && (
              <div
                className="rounded-md overflow-hidden border border-white/15 h-10"
                style={{ transform: "rotate(-1.5deg)" }}
              >
                <img src={dailyArtThumb} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            {draftNote?.trim() && (
              <div
                className="rounded-md border border-amber-400/15 bg-amber-950/30 px-2 py-1"
                style={{ transform: "rotate(0.8deg)" }}
              >
                <p className="text-[8px] text-white/50 line-clamp-2 italic">{draftNote.trim()}</p>
              </div>
            )}
            {lastPrayerSnippet && (
              <div
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1"
                style={{ transform: "rotate(-0.5deg)" }}
              >
                <p className="text-[8px] text-white/45 line-clamp-2">{lastPrayerSnippet}</p>
              </div>
            )}
            {canPinVerse && onPinVerse && (
              <button
                type="button"
                onClick={onPinVerse}
                data-testid="button-pin-verse-closet"
                className="w-full text-[8px] font-semibold text-violet-300/80 hover:text-white py-0.5"
              >
                Pin today&apos;s verse
              </button>
            )}
          </div>
        </div>

        {/* Candle — upper left, away from worship controls below */}
        <div
          className="absolute z-[7] flex flex-col items-center pointer-events-none"
          style={{ left: "10%", top: "18%" }}
        >
          <div
            className="w-12 h-1 rounded-full bg-white/10 mb-1"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
          />
          <div className="relative">
            <Flame
              className="w-6 h-6 text-amber-400 transition-opacity"
              style={{
                opacity: 0.35 + candleLevel * 0.65,
                filter: `drop-shadow(0 0 ${8 + candleLevel * 14}px rgba(251,191,36,${0.5 * glow}))`,
              }}
            />
          </div>
        </div>

        {/* Floor + rug — extra depth for chair + “your spot” */}
        <div
          className="absolute inset-x-0 bottom-0 h-[32%] z-[4] pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, #08060e 0%, #12101a 40%, transparent 100%)",
          }}
        />
        {/* Floor glow under rug */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-[6%] w-[78%] h-16 rounded-[100%] z-[4] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(251,191,36,0.14) 0%, rgba(88,60,120,0.2) 45%, transparent 72%)",
          }}
        />

        {/* Prayer rug — kneeling spot (center) */}
        <div
          className="absolute left-1/2 z-[7] flex justify-center"
          style={{ bottom: "7%", transform: "translateX(-50%) scale(0.92)" }}
        >
          <ClosetPrayerRug />
        </div>

        {/* Chair — off to the side for reading / resting */}
        <div
          className="absolute z-[8] flex flex-col items-center opacity-95"
          style={{ right: "8%", bottom: "10%" }}
        >
          <div style={{ transform: "scale(0.82)" }}>
            <ClosetPrayerChair />
          </div>
          <p className="text-[7px] tracking-[0.14em] uppercase text-white/22 -mt-1 font-medium">
            Rest
          </p>
        </div>

        {/* In-room title */}
        <div className="absolute inset-x-0 top-3 z-20 text-center px-4 pointer-events-none">
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-violet-200/45">
            A room set apart
          </p>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="manifesto-line text-white/95 text-[1.35rem] sm:text-[1.5rem] mt-1 leading-tight"
          >
            {title}
          </motion.h1>
          {showIntroLine && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-[12px] text-white/55 leading-snug mt-2 max-w-[28ch] mx-auto"
            >
              This room is yours. Nothing here is shared unless you choose.
              {onIntroDismiss && (
                <button
                  type="button"
                  onClick={onIntroDismiss}
                  className="block mx-auto mt-2 text-[11px] font-semibold text-violet-200/80 underline underline-offset-2"
                  data-testid="button-dismiss-closet-intro"
                >
                  Enter quietly
                </button>
              )}
            </motion.p>
          )}
        </div>

        {/* Clear floor zone — keeps worship UI / nav from covering the seat */}
        <div
          className="absolute inset-x-[8%] bottom-0 h-[22%] z-[9] pointer-events-none"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function closetWallArtLabel(id: ClosetBackgroundId): string {
  const bg = CLOSET_BACKGROUNDS.find((b) => b.id === id);
  return bg ? `Wall art · ${bg.label}` : "Wall art";
}
