import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Minus, AlertCircle } from "lucide-react";

const TODAY = new Date().toISOString().slice(0, 10);
const STORAGE_KEY = `sp_walk_${TODAY}`;

type Response = "yes" | "struggled" | "not-yet" | null;

interface DimensionData {
  id: string;
  title: string;
  description: string;
  scripture: string;
}

const DIMENSIONS: DimensionData[] = [
  {
    id: "faith",
    title: "Faith",
    description: "Did I trust God or try to control everything?",
    scripture: "Proverbs 3:5–6",
  },
  {
    id: "obedience",
    title: "Obedience",
    description: "Did I act on truth or just hear it?",
    scripture: "James 1:22",
  },
  {
    id: "love",
    title: "Love",
    description: "Did I respond with love, even when it was hard?",
    scripture: "John 13:34",
  },
  {
    id: "surrender",
    title: "Surrender",
    description: "Did I release control where I needed to?",
    scripture: "Matthew 16:24",
  },
  {
    id: "endurance",
    title: "Endurance",
    description: "Did I keep going when it wasn't easy?",
    scripture: "Galatians 6:9",
  },
];

type Responses = Record<string, Response>;

function loadSaved(): { responses: Responses; reflection: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { responses: {}, reflection: "" };
}

function saveTodo(responses: Responses, reflection: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ responses, reflection }));
  } catch {}
}

// ── Visual path indicator ─────────────────────────────────────────────────────

function PathDot({ response }: { response: Response }) {
  if (response === "yes") {
    return (
      <div
        className="w-3 h-3 rounded-full bg-amber-400 flex-shrink-0"
        style={{ boxShadow: "0 0 8px 2px rgba(251,191,36,0.55)" }}
      />
    );
  }
  if (response === "struggled") {
    return (
      <div
        className="w-2.5 h-2.5 rounded-full bg-amber-500/60 flex-shrink-0"
        style={{ boxShadow: "0 0 5px 1px rgba(251,191,36,0.25)" }}
      />
    );
  }
  if (response === "not-yet") {
    return (
      <div className="w-2.5 h-2.5 rounded-full bg-amber-700/30 flex-shrink-0" />
    );
  }
  return <div className="w-2 h-2 rounded-full bg-muted-foreground/18 flex-shrink-0" />;
}

function PathBar({ responses }: { responses: Responses }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {DIMENSIONS.map((d, i) => (
        <div key={d.id} className="flex items-center flex-1 last:flex-none">
          <PathDot response={responses[d.id] ?? null} />
          {i < DIMENSIONS.length - 1 && (
            <div className="flex-1 h-px bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/8 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Response option button ────────────────────────────────────────────────────

function OptionButton({
  value,
  selected,
  onSelect,
  testid,
}: {
  value: Response;
  selected: boolean;
  onSelect: () => void;
  testid: string;
}) {
  const configs: Record<NonNullable<Response>, { label: string; activeClass: string; icon: React.ReactNode }> = {
    yes: {
      label: "Yes",
      activeClass: "bg-amber-400/20 border-amber-400/70 text-amber-300",
      icon: <Check className="w-3 h-3" strokeWidth={2.5} />,
    },
    struggled: {
      label: "I struggled",
      activeClass: "bg-amber-800/25 border-amber-600/50 text-amber-500/90",
      icon: <AlertCircle className="w-3 h-3" />,
    },
    "not-yet": {
      label: "Not yet",
      activeClass: "bg-muted/60 border-muted-foreground/30 text-muted-foreground",
      icon: <Minus className="w-3 h-3" />,
    },
  };

  const config = configs[value!];

  return (
    <button
      data-testid={testid}
      onClick={onSelect}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all active:scale-[0.96] ${
        selected
          ? config.activeClass
          : "border-border/40 text-muted-foreground/60 hover:border-border hover:text-muted-foreground"
      }`}
    >
      {selected && config.icon}
      {config.label}
    </button>
  );
}

// ── Dimension card ────────────────────────────────────────────────────────────

function DimensionCard({
  dimension,
  response,
  onSelect,
}: {
  dimension: DimensionData;
  response: Response;
  onSelect: (v: Response) => void;
}) {
  const cardClass =
    response === "yes"
      ? "border-amber-400/40 bg-gradient-to-br from-amber-900/18 to-amber-700/8"
      : response === "struggled"
      ? "border-amber-700/30 bg-gradient-to-br from-amber-900/10 to-amber-800/5"
      : response === "not-yet"
      ? "border-border/30 bg-gradient-to-br from-muted/30 to-transparent"
      : "border-border/25 bg-card/40";

  return (
    <div
      className={`rounded-2xl border px-5 py-4 transition-all duration-300 ${cardClass}`}
      data-testid={`card-dimension-${dimension.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <p className="text-[16px] font-bold text-foreground">{dimension.title}</p>
          <p className="text-[13px] text-muted-foreground/75 mt-0.5 leading-snug">
            {dimension.description}
          </p>
        </div>
        {response && (
          <div className="pt-0.5">
            <PathDot response={response} />
          </div>
        )}
      </div>

      {/* Scripture */}
      <p className="text-[11px] font-medium text-amber-600/55 dark:text-amber-400/45 mb-3.5">
        — {dimension.scripture}
      </p>

      {/* Tap options */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["yes", "struggled", "not-yet"] as NonNullable<Response>[]).map(v => (
          <OptionButton
            key={v}
            value={v}
            selected={response === v}
            onSelect={() => onSelect(response === v ? null : v)}
            testid={`button-${dimension.id}-${v}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScripturalAlignment() {
  const saved = loadSaved();
  const [responses, setResponses] = useState<Responses>(saved.responses);
  const [reflection, setReflection] = useState(saved.reflection);
  const [saved_, setSaved_] = useState(false);

  useEffect(() => {
    saveTodo(responses, reflection);
  }, [responses, reflection]);

  const answered = Object.values(responses).filter(Boolean).length;
  const allAnswered = answered === DIMENSIONS.length;

  const handleSelect = (id: string, value: Response) => {
    setSaved_(false);
    setResponses(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveReflection = () => {
    saveTodo(responses, reflection);
    setSaved_(true);
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, hsl(240 20% 7%), hsl(240 15% 10%), hsl(30 15% 9%))" }}
    >
      {/* Nav */}
      <div className="sticky top-0 z-20 px-4 pt-safe-top pt-4 pb-3 flex items-center gap-3"
        style={{ background: "linear-gradient(to bottom, hsl(240 20% 7%) 70%, transparent)" }}
      >
        <Link href="/">
          <button
            data-testid="button-back"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/8 active:bg-white/15 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
        </Link>
      </div>

      <div className="px-5 pb-24">
        {/* Header */}
        <div className="mb-6 mt-1">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-400/60 mb-1.5">
            End of day
          </p>
          <h1 className="text-[28px] font-bold text-white leading-tight">
            Your Walk Today
          </h1>
          <p className="text-[14px] text-white/45 mt-1">
            Not perfection. Alignment.
          </p>
        </div>

        {/* Path progress bar */}
        <PathBar responses={responses} />

        {/* Dimension cards */}
        <div className="space-y-3 mb-10">
          {DIMENSIONS.map(d => (
            <DimensionCard
              key={d.id}
              dimension={d}
              response={responses[d.id] ?? null}
              onSelect={v => handleSelect(d.id, v)}
            />
          ))}
        </div>

        {/* Reflection prompt */}
        <div
          className="rounded-2xl border border-white/10 bg-white/4 px-5 py-5 mb-6"
          data-testid="section-reflection"
        >
          <p className="text-[14px] font-semibold text-white/80 mb-1">
            Where did you feel closest to God today?
          </p>
          <p className="text-[12px] text-white/35 mb-3">
            Optional. This is just for you.
          </p>
          <textarea
            value={reflection}
            onChange={e => { setReflection(e.target.value); setSaved_(false); }}
            placeholder="A moment, a word, a feeling…"
            rows={3}
            data-testid="input-reflection"
            className="w-full bg-transparent text-[15px] text-white/80 placeholder:text-white/22 outline-none resize-none leading-relaxed"
            style={{ minHeight: "76px" }}
          />
          {reflection.trim() && (
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveReflection}
                data-testid="button-save-reflection"
                className={`text-[12px] font-bold px-4 py-1.5 rounded-full transition-all ${
                  saved_
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                    : "bg-amber-400/15 text-amber-400 border border-amber-400/30 active:scale-[0.97]"
                }`}
              >
                {saved_ ? "Saved ✓" : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Closing word */}
        {allAnswered && (
          <div className="text-center py-4 space-y-1">
            <p className="text-[13px] text-white/40 leading-relaxed">
              This is between you and God.
            </p>
            <p className="text-[13px] text-white/30 leading-relaxed">
              He sees the whole of your day — not just the highlights.
            </p>
          </div>
        )}

        {!allAnswered && answered > 0 && (
          <p className="text-center text-[12px] text-white/25 mt-2">
            {DIMENSIONS.length - answered} more to reflect on
          </p>
        )}
      </div>
    </div>
  );
}
