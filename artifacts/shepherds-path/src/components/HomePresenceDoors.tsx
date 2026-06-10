import { BookOpen, MessageCircle, Wind } from "lucide-react";
import { isLateNight } from "@/lib/nightMode";

export type PresenceDoorId = "scripture" | "talk" | "quiet";

interface HomePresenceDoorsProps {
  /** Which door matches the hero panel above */
  selected: PresenceDoorId;
  onSelect: (id: PresenceDoorId) => void;
  panelId?: string;
}

/** Left → right: signature guidance, daily Word, quiet room */
const DOORS: {
  id: PresenceDoorId;
  label: string;
  desc: string;
  testid: string;
  Icon: typeof BookOpen;
}[] = [
  {
    id: "talk",
    label: "Talk it through",
    desc: "Prayer & clarity now",
    testid: "door-talk-through",
    Icon: MessageCircle,
  },
  {
    id: "scripture",
    label: "Sit in Scripture",
    desc: "Verse & devotional",
    testid: "door-sit-scripture",
    Icon: BookOpen,
  },
  {
    id: "quiet",
    label: "Just breathe",
    desc: "Quieter room",
    testid: "door-just-breathe",
    Icon: Wind,
  },
];

/** Default tab — Talk hero + devotional card below (avoids duplicating Scripture in two panels) */
export function defaultPresenceDoor(): PresenceDoorId {
  if (isLateNight()) return "quiet";
  return "talk";
}

export function HomePresenceDoors({ selected, onSelect }: HomePresenceDoorsProps) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <p
        style={{
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.40)",
          marginBottom: "8px",
          paddingLeft: "2px",
          paddingRight: "2px",
        }}
      >
        How do you want to begin?
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "8px",
        }}
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
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                borderRadius: "12px",
                outline: isActive ? "2px solid rgba(251,191,36,0.50)" : "none",
                outlineOffset: "2px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  borderRadius: "12px",
                  border: isActive
                    ? "1px solid rgba(245,158,11,0.40)"
                    : "1px solid rgba(255,255,255,0.10)",
                  backgroundColor: isActive
                    ? "rgba(245,158,11,0.12)"
                    : "rgba(255,255,255,0.04)",
                  padding: "12px 8px",
                  minHeight: "84px",
                  boxSizing: "border-box",
                }}
              >
                <door.Icon
                  style={{
                    width: "16px",
                    height: "16px",
                    marginBottom: "6px",
                    color: isActive ? "rgba(253,230,138,0.90)" : "rgba(255,255,255,0.50)",
                  }}
                  aria-hidden
                />
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    lineHeight: 1.25,
                    color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)",
                  }}
                >
                  {door.label}
                </p>
                <p
                  style={{
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.42)",
                    lineHeight: 1.375,
                    marginTop: "2px",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
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
