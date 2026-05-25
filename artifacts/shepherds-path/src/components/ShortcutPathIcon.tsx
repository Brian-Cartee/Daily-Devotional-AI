import {
  BookMarked,
  BookOpen,
  Compass,
  DoorOpen,
  Gift,
  HandHeart,
  Heart,
  Lightbulb,
  Bell,
  Flame,
  Monitor,
  Moon,
  Play,
  Share2,
  Sparkles,
  Star,
  Sun,
  Swords,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";

export type ShortcutIconVariant =
  | "guidance"
  | "devotional"
  | "journal"
  | "pathways"
  | "invite"
  | "deeper"
  | "checkin"
  | "salvation"
  | "calling"
  | "community"
  | "prayer"
  | "walk"
  | "study"
  | "media"
  | "portrait"
  | "display"
  | "closet"
  | "evening"
  | "insight"
  | "reminder"
  | "streak";

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
  salvation: {
    halo: "bg-amber-400/35",
    ring: "ring-amber-300/45",
    shadow: "shadow-amber-500/35",
    bg: "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-950",
    Icon: Sunrise,
  },
  calling: {
    halo: "bg-orange-400/35",
    ring: "ring-orange-300/45",
    shadow: "shadow-orange-500/35",
    bg: "bg-gradient-to-br from-orange-500 via-amber-600 to-orange-950",
    Icon: Share2,
  },
  community: {
    halo: "bg-rose-400/35",
    ring: "ring-rose-300/45",
    shadow: "shadow-rose-500/35",
    bg: "bg-gradient-to-br from-rose-500 via-red-600 to-rose-950",
    Icon: Swords,
  },
  prayer: {
    halo: "bg-sky-400/35",
    ring: "ring-sky-300/45",
    shadow: "shadow-sky-500/35",
    bg: "bg-gradient-to-br from-sky-400 via-blue-500 to-sky-950",
    Icon: HandHeart,
  },
  walk: {
    halo: "bg-emerald-400/35",
    ring: "ring-emerald-300/45",
    shadow: "shadow-emerald-500/35",
    bg: "bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-950",
    Icon: Star,
  },
  study: {
    halo: "bg-violet-400/35",
    ring: "ring-violet-300/45",
    shadow: "shadow-violet-500/35",
    bg: "bg-gradient-to-br from-violet-500 via-purple-600 to-violet-950",
    Icon: Sparkles,
  },
  media: {
    halo: "bg-violet-400/35",
    ring: "ring-violet-300/45",
    shadow: "shadow-violet-500/35",
    bg: "bg-gradient-to-br from-violet-500 via-fuchsia-600 to-violet-950",
    Icon: Play,
  },
  portrait: {
    halo: "bg-amber-400/35",
    ring: "ring-amber-300/45",
    shadow: "shadow-amber-500/35",
    bg: "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-950",
    Icon: Heart,
  },
  display: {
    halo: "bg-indigo-400/35",
    ring: "ring-indigo-300/45",
    shadow: "shadow-indigo-500/35",
    bg: "bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-950",
    Icon: Monitor,
  },
  closet: {
    halo: "bg-violet-400/35",
    ring: "ring-violet-300/45",
    shadow: "shadow-violet-500/35",
    bg: "bg-gradient-to-br from-violet-600 via-purple-700 to-violet-950",
    Icon: DoorOpen,
  },
  evening: {
    halo: "bg-indigo-400/35",
    ring: "ring-indigo-300/45",
    shadow: "shadow-indigo-500/35",
    bg: "bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-950",
    Icon: Moon,
  },
  insight: {
    halo: "bg-indigo-400/35",
    ring: "ring-indigo-300/45",
    shadow: "shadow-indigo-500/35",
    bg: "bg-gradient-to-br from-indigo-400 via-violet-500 to-indigo-950",
    Icon: Lightbulb,
  },
  reminder: {
    halo: "bg-amber-400/35",
    ring: "ring-amber-300/45",
    shadow: "shadow-amber-500/35",
    bg: "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-950",
    Icon: Bell,
  },
  streak: {
    halo: "bg-primary/40",
    ring: "ring-violet-300/45",
    shadow: "shadow-primary/40",
    bg: "bg-gradient-to-br from-violet-500 via-primary to-indigo-950",
    Icon: Flame,
  },
};

const RETURN_TILE: Record<string, ShortcutIconVariant> = {
  plan: "walk",
  guidance: "guidance",
  "long-absence": "salvation",
  gentle: "devotional",
};

export function returnCardIconVariant(scenario: string): ShortcutIconVariant {
  return RETURN_TILE[scenario] ?? "devotional";
}

const SIZE = {
  md: { tile: 44, lucide: 22, brand: 42, rounded: 14 },
  sm: { tile: 40, lucide: 20, brand: 38, rounded: 13 },
} as const;

/** Home shortcut tile — matches Talk it through logo weight (ring, glow, rounded tile) */
export function ShortcutPathIcon({
  variant,
  size = "md",
}: {
  variant: ShortcutIconVariant;
  size?: keyof typeof SIZE;
}) {
  const tile = TILE[variant];
  const dim = SIZE[size];

  return (
    <div
      className="relative shrink-0"
      style={{ width: dim.tile, height: dim.tile }}
      aria-hidden
    >
      <span
        className={`pointer-events-none absolute -inset-1 rounded-[16px] blur-md opacity-60 ${tile.halo}`}
      />
      <div
        className={`relative flex h-full w-full items-center justify-center overflow-hidden ring-1 shadow-lg ${tile.ring} ${tile.shadow} ${tile.bg}`}
        style={{ borderRadius: dim.rounded }}
      >
        {variant === "guidance" ? (
          <BrandIcon size={dim.brand} className="drop-shadow-md" />
        ) : tile.Icon ? (
          <tile.Icon
            className="text-white drop-shadow-sm"
            style={{ width: dim.lucide, height: dim.lucide }}
            strokeWidth={2.25}
          />
        ) : null}
      </div>
    </div>
  );
}
