import { Link } from "wouter";
import { BookOpen, MessageCircle, Wind } from "lucide-react";
import { isLateNight } from "@/lib/nightMode";

export type PresenceDoorId = "scripture" | "talk" | "quiet";

interface HomePresenceDoorsProps {
  /** Highlight one door by time of day */
  emphasize?: PresenceDoorId;
  onTalkDoor?: () => void;
}

const DOORS: {
  id: PresenceDoorId;
  href: string;
  label: string;
  desc: string;
  testid: string;
  Icon: typeof BookOpen;
}[] = [
  {
    id: "scripture",
    href: "/devotional",
    label: "Sit in Scripture",
    desc: "Today's verse and devotional",
    testid: "door-sit-scripture",
    Icon: BookOpen,
  },
  {
    id: "talk",
    href: "/guidance",
    label: "Talk it through",
    desc: "Prayer and clarity for right now",
    testid: "door-talk-through",
    Icon: MessageCircle,
  },
  {
    id: "quiet",
    href: "/sigh",
    label: "Just breathe",
    desc: "A quieter room — no performance",
    testid: "door-just-breathe",
    Icon: Wind,
  },
];

function defaultEmphasis(): PresenceDoorId {
  if (isLateNight()) return "quiet";
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "scripture";
  return "talk";
}

export function HomePresenceDoors({ emphasize, onTalkDoor }: HomePresenceDoorsProps) {
  const active = emphasize ?? defaultEmphasis();
  const quietHref = isLateNight() ? "/night" : "/sigh";

  return (
    <div
      className="grid grid-cols-3 gap-2 sm:gap-2.5"
      data-testid="home-presence-doors"
      role="navigation"
      aria-label="Ways to begin"
    >
      {DOORS.map((door) => {
        const href = door.id === "quiet" ? quietHref : door.href;
        const isActive = door.id === active;
        const inner = (
          <div
            className={`flex flex-col items-center text-center rounded-xl border px-2 py-3 min-h-[88px] transition-all active:scale-[0.98] ${
              isActive
                ? "border-amber-500/35 bg-amber-500/[0.08] shadow-sm shadow-amber-900/10"
                : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/15"
            }`}
          >
            <door.Icon
              className={`w-4 h-4 mb-1.5 ${isActive ? "text-amber-200/90" : "text-white/50"}`}
              aria-hidden
            />
            <p
              className={`text-[11px] font-bold leading-tight ${
                isActive ? "text-white/92" : "text-white/75"
              }`}
            >
              {door.label}
            </p>
            <p className="text-[10px] text-white/42 leading-snug mt-0.5 line-clamp-2">
              {door.id === "quiet" && isLateNight() ? "Night Shepherd" : door.desc}
            </p>
          </div>
        );

        if (door.id === "talk" && onTalkDoor) {
          return (
            <button
              key={door.id}
              type="button"
              data-testid={door.testid}
              onClick={onTalkDoor}
              className="w-full text-left"
            >
              {inner}
            </button>
          );
        }

        return (
          <Link key={door.id} href={href} data-testid={door.testid}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
