import { BookMarked, BookOpen, Compass, Gift, Heart, Sun, type LucideIcon } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";

export type ShortcutIconVariant =
  | "guidance"
  | "devotional"
  | "journal"
  | "pathways"
  | "invite"
  | "deeper"
  | "checkin";

const TILE: Record<
  ShortcutIconVariant,
  {
    halo: string;
    ring: string;
    shadow: string;
    bg: string;
    Icon?: LucideIcon;
  }
> = {
  guidance: {
    halo: "bg-primary/40",
    ring: "ring-violet-300/35",
    shadow: "shadow-primary/40",
    bg: "bg-black/25",
  },
  devotional: {
    halo: "bg-teal-400/35",
    ring: "ring-teal-300/45",
    shadow: "shadow-teal-500/35",
    bg: "bg-gradient-to-br from-teal-400 via-emerald-500 to-teal-950",
    Icon: Sun,
  },
  journal: {
    halo: "bg-teal-400/35",
    ring: "ring-teal-300/45",
    shadow: "shadow-teal-500/35",
    bg: "bg-gradient-to-br from-teal-500 via-emerald-600 to-teal-950",
    Icon: BookMarked,
  },
  pathways: {
    halo: "bg-indigo-400/35",
    ring: "ring-indigo-300/45",
    shadow: "shadow-indigo-500/35",
    bg: "bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-950",
    Icon: Compass,
  },
  invite: {
    halo: "bg-amber-400/35",
    ring: "ring-amber-300/45",
    shadow: "shadow-amber-500/35",
    bg: "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-950",
    Icon: Gift,
  },
  deeper: {
    halo: "bg-yellow-400/35",
    ring: "ring-amber-200/50",
    shadow: "shadow-amber-500/40",
    bg: "bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-950",
    Icon: BookOpen,
  },
  checkin: {
    halo: "bg-rose-400/35",
    ring: "ring-rose-300/45",
    shadow: "shadow-rose-500/35",
    bg: "bg-gradient-to-br from-rose-400 via-pink-500 to-rose-950",
    Icon: Heart,
  },
};

const TILE_PX = 44;
/** Talk it through PNG — slightly larger so it matches lucide tiles visually */
const BRAND_ICON_PX = 42;

/** Home shortcut tile — matches Talk it through logo weight (ring, glow, rounded tile) */
export function ShortcutPathIcon({ variant }: { variant: ShortcutIconVariant }) {
  const tile = TILE[variant];

  return (
    <div
      className="relative shrink-0"
      style={{ width: TILE_PX, height: TILE_PX }}
      aria-hidden
    >
      <span
        className={`pointer-events-none absolute -inset-1 rounded-[16px] blur-md opacity-60 ${tile.halo}`}
      />
      <div
        className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-[14px] ring-1 shadow-lg ${tile.ring} ${tile.shadow} ${tile.bg}`}
      >
        {variant === "guidance" ? (
          <BrandIcon size={BRAND_ICON_PX} className="drop-shadow-md" />
        ) : tile.Icon ? (
          <tile.Icon className="w-[22px] h-[22px] text-white drop-shadow-sm" strokeWidth={2.25} />
        ) : null}
      </div>
    </div>
  );
}
