import { Link } from "wouter";
import { motion } from "framer-motion";
import { Lock, MapPin, ChevronDown } from "lucide-react";
import type { Journey } from "@/data/journeys";
import { canAccessJourney } from "@/lib/journeyCatalog";

type Props = {
  pathways: Journey[];
  isPro: boolean;
  onSelect: (journey: Journey) => void;
  onLockedSelect: (journey: Journey) => void;
};

export function GuidedPathwaysSection({ pathways, isPro, onSelect, onLockedSelect }: Props) {
  return (
    <section id="pathways" className="mb-8 scroll-mt-24">
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-violet-600/80 dark:text-violet-400/80 whitespace-nowrap flex-shrink-0">
          Guided Pathways
        </span>
        <div className="flex-1 h-px bg-border/60" />
        {!isPro && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Pro
          </span>
        )}
      </div>
      <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 px-0.5">
        Seven days of Scripture for one hard season — grief, anxiety, loneliness, doubt, or anger. Curated, not generated; walk at your pace.
      </p>
      <div className="space-y-2.5">
        {pathways.map((pathway, i) => {
          const locked = !canAccessJourney(pathway, isPro);
          return (
            <motion.button
              key={pathway.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => (locked ? onLockedSelect(pathway) : onSelect(pathway))}
              data-testid={`pathway-card-${pathway.id}`}
              className={`w-full text-left rounded-2xl relative overflow-hidden border ${pathway.borderColor} bg-card p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
            >
              {pathway.image && (
                <img
                  src={pathway.image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.12] pointer-events-none"
                />
              )}
              <div className={`absolute inset-0 bg-gradient-to-br ${pathway.colorFrom} ${pathway.colorTo} pointer-events-none`} />
              <div className="relative z-10 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${pathway.pillBg} flex items-center justify-center shrink-0`}>
                  {locked ? <Lock className={`w-4 h-4 ${pathway.iconColor}`} /> : <MapPin className={`w-4 h-4 ${pathway.iconColor}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${pathway.pillText}`}>
                      7 days
                    </span>
                    {locked && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600/70">Pro</span>
                    )}
                  </div>
                  <h3 className="text-[15px] font-bold text-foreground leading-tight">{pathway.title}</h3>
                  <p className={`text-[12px] font-medium ${pathway.iconColor} mt-0.5`}>{pathway.subtitle}</p>
                </div>
                <ChevronDown className={`w-4 h-4 ${pathway.iconColor} shrink-0 -rotate-90 opacity-60`} />
              </div>
            </motion.button>
          );
        })}
      </div>
      {!isPro && (
        <p className="text-[12px] text-muted-foreground/70 mt-3 px-0.5">
          Core Bible journeys below stay free.{" "}
          <Link href="/pricing" className="font-semibold text-primary hover:underline">
            Pro unlocks these pathways
          </Link>
          {" "}and a journey shaped from your exact situation after Talk It Through.
        </p>
      )}
    </section>
  );
}
