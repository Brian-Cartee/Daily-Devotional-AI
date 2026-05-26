import { BookOpen, MessageCircle, Wind } from "lucide-react";
import { isLateNight } from "@/lib/nightMode";

export type PresenceDoorId = "scripture" | "talk" | "quiet";

interface HomePresenceDoorsProps {
  /** Which door matches the hero panel above */
  selected: PresenceDoorId;
  onSelect: (id: PresenceDoorId) => void;
}

const DOORS: {
  id: PresenceDoorId;
  label: string;
  desc: string;
  testid: string;
  Icon: typeof BookOpen;
}[] = [
  {
    id: "scripture",
    label: "Sit in Scripture",
    desc: "Verse & devotional",
    testid: "door-sit-scripture",
    Icon: BookOpen,
  },
  {
    id: "talk",
    label: "Talk it through",
    desc: "Prayer & clarity now",
    testid: "door-talk-through",
    Icon: MessageCircle,
  },
  {
    id: "quiet",
    label: "Just breathe",
    desc: "Quieter room",
    testid: "door-just-breathe",
    Icon: Wind,
  },
];

export function defaultPresenceDoor(): PresenceDoorId {
  if (isLateNight()) return "quiet";
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "scripture";
  return "talk";
}

export function HomePresenceDoors({ selected, onSelect }: HomePresenceDoorsProps) {
  return (
    <div className="mb-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-2 px-0.5">
        Choose your step
      </p>
      <div
        className="grid grid-cols-3 gap-2 sm:gap-2.5"
        data-testid="home-presence-doors"
        role="tablist"
        aria-label="Ways to begin"
      >
        {DOORS.map((door) => {
          const isActive = door.id === selected;
          const desc =
            door.id === "quiet" && isLateNight() ? "Night Shepherd" : door.desc;

          return (
            <button
              key={door.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={door.testid}
              onClick={() => onSelect(door.id)}
              className={`w-full text-left transition-all active:scale-[0.98] ${
                isActive ? "ring-2 ring-amber-400/50 ring-offset-2 ring-offset-[#09031e] rounded-xl" : ""
              }`}
            >
              <div
                className={`flex flex-col items-center text-center rounded-xl border px-2 py-3 min-h-[84px] ${
                  isActive
                    ? "border-amber-500/40 bg-amber-500/[0.12] shadow-sm shadow-amber-900/15"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/15"
                }`}
              >
                <door.Icon
                  className={`w-4 h-4 mb-1.5 ${isActive ? "text-amber-200/90" : "text-white/50"}`}
                  aria-hidden
                />
                <p
                  className={`text-[11px] font-bold leading-tight ${
                    isActive ? "text-white/95" : "text-white/75"
                  }`}
                >
                  {door.label}
                </p>
                <p className="text-[10px] text-white/42 leading-snug mt-0.5 line-clamp-2">
                  {desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
