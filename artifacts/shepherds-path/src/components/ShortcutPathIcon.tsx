import { BookMarked, Compass, Gift, type LucideIcon } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";

export type ShortcutIconVariant = "guidance" | "journal" | "pathways" | "invite";

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
};

const TILE_PX = 44;

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
          <BrandIcon size={40} className="drop-shadow-md" />
        ) : tile.Icon ? (
          <tile.Icon className="w-[22px] h-[22px] text-white drop-shadow-sm" strokeWidth={2.25} />
        ) : null}
      </div>
    </div>
  );
}
