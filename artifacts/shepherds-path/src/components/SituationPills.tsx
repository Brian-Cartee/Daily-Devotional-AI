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
        className={`text-[11px] font-bold uppercase tracking-[0.18em] mb-2.5 ${
          isDark ? "text-white/55" : "text-muted-foreground"
        }`}
      >
        What are you facing?
      </p>
      <div className="flex flex-wrap gap-2">
        {SITUATION_TOPICS.map((topic) => {
          const active = selectedId === topic.id;
          return (
            <button
              key={topic.id}
              type="button"
              data-testid={`pill-situation-${topic.id}`}
              onClick={() => onSelect(topic.situation, topic.id)}
              className={`px-3.5 py-2 rounded-full text-[13px] font-semibold transition-all border ${
                active
                  ? isDark
                    ? "bg-white text-[#1a1208] border-white shadow-sm"
                    : "bg-primary text-primary-foreground border-primary"
                  : isDark
                    ? "bg-white/[0.08] text-white/85 border-white/15 hover:bg-white/[0.14] hover:border-white/25"
                    : "bg-muted/50 text-foreground/80 border-border hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              {topic.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
