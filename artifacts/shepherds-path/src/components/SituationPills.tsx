import { SITUATION_TOPICS } from "@/lib/situationTopics";

type Variant = "dark" | "light";

interface SituationPillsProps {
  selectedId?: string | null;
  onSelect: (situation: string, id: string) => void;
  variant?: Variant;
  className?: string;
}

export function SituationPills({
  selectedId,
  onSelect,
  variant = "dark",
  className = "",
}: SituationPillsProps) {
  const isDark = variant === "dark";

  return (
    <div className={className} data-testid="situation-pills">
      <p
        style={
          isDark
            ? {
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                marginBottom: "10px",
                color: "rgba(255,255,255,0.55)",
              }
            : undefined
        }
        className={isDark ? undefined : "text-[11px] font-bold uppercase tracking-[0.18em] mb-2.5 text-muted-foreground"}
      >
        What are you facing?
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {SITUATION_TOPICS.map((topic) => {
          const active = selectedId === topic.id;
          return (
            <button
              key={topic.id}
              type="button"
              data-testid={`pill-situation-${topic.id}`}
              onClick={() => onSelect(topic.situation, topic.id)}
              style={
                isDark
                  ? active
                    ? {
                        padding: "8px 14px",
                        borderRadius: "9999px",
                        fontSize: "13px",
                        fontWeight: 600,
                        backgroundColor: "#ffffff",
                        color: "#1a1208",
                        border: "1px solid #ffffff",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                        cursor: "pointer",
                      }
                    : {
                        padding: "8px 14px",
                        borderRadius: "9999px",
                        fontSize: "13px",
                        fontWeight: 600,
                        backgroundColor: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.85)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        cursor: "pointer",
                      }
                  : undefined
              }
              className={
                isDark
                  ? undefined
                  : `px-3.5 py-2 rounded-full text-[13px] font-semibold transition-all border ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-foreground/80 border-border hover:border-primary/30 hover:bg-primary/5"
                    }`
              }
            >
              {topic.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
