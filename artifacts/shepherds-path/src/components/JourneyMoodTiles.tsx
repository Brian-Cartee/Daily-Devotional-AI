import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { Journey } from "@/data/journeys";
import { canAccessJourney, getJourneyById } from "@/lib/journeyCatalog";

const MOOD_TILES = [
  {
    pathwayId: "pathway-anxiety",
    label: "Anxiety",
    className: "bg-blue-600 hover:bg-blue-500 border-blue-500/30",
  },
  {
    pathwayId: "pathway-grief",
    label: "Grief",
    className: "bg-slate-600 hover:bg-slate-500 border-slate-500/30",
  },
  {
    pathwayId: "pathway-loneliness",
    label: "Loneliness",
    className: "bg-violet-600 hover:bg-violet-500 border-violet-500/30",
  },
  {
    pathwayId: "pathway-doubt",
    label: "Doubt",
    className: "bg-teal-600 hover:bg-teal-500 border-teal-500/30",
  },
  {
    pathwayId: "pathway-anger",
    label: "Anger",
    className: "bg-rose-600 hover:bg-rose-500 border-rose-500/30",
  },
  {
    pathwayId: "pathway-anxiety",
    label: "Overwhelm",
    className: "bg-amber-600 hover:bg-amber-500 border-amber-500/30",
  },
] as const;

type Props = {
  isPro: boolean;
  onSelect: (journey: Journey) => void;
  onLockedSelect: () => void;
};

export function JourneyMoodTiles({ isPro, onSelect, onLockedSelect }: Props) {
  const handleTap = (pathwayId: string) => {
    const journey = getJourneyById(pathwayId);
    if (!journey) return;
    if (canAccessJourney(journey, isPro)) {
      onSelect(journey);
    } else {
      onLockedSelect();
    }
  };

  return (
    <section className="mb-7" data-testid="journey-mood-tiles">
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap flex-shrink-0">
          Start with how you feel
        </span>
        <div className="flex-1 h-px bg-border/60" />
      </div>
      <p className="text-[13px] text-muted-foreground leading-relaxed mb-3.5 px-0.5">
        Seven days of Scripture for one hard season — tap what matches today.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {MOOD_TILES.map((tile, i) => {
          const journey = getJourneyById(tile.pathwayId);
          const locked = journey ? !canAccessJourney(journey, isPro) : false;
          const slug = tile.label.toLowerCase().replace(/\s+/g, "-");

          return (
            <motion.button
              key={`${tile.pathwayId}-${tile.label}`}
              type="button"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => handleTap(tile.pathwayId)}
              data-testid={`journey-mood-tile-${slug}`}
              className={`relative aspect-[1.35] rounded-xl border text-left px-2.5 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] ${tile.className}`}
            >
              <span className="text-[13px] sm:text-[14px] font-extrabold text-white leading-tight tracking-tight">
                {tile.label}
              </span>
              {locked && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/25 flex items-center justify-center">
                  <Lock className="w-2.5 h-2.5 text-white/90" />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
