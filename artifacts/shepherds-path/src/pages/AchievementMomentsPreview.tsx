import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AchievementModal } from "@/components/AchievementModal";
import { ACHIEVEMENTS } from "@/lib/achievements";
import {
  ACHIEVEMENT_MOMENT_PHOTOS,
  STORY_MOMENT_ACHIEVEMENT_IDS,
} from "@/lib/achievementMoments";

/** Dev-only gallery for story-driven completion cards */
export default function AchievementMomentsPreview() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = activeId ? ACHIEVEMENTS[activeId] : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-6 py-10 max-w-lg mx-auto">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">Dev preview</p>
      <h1 className="text-2xl mb-2" style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}>
        Completion story cards
      </h1>
      <p className="text-sm text-white/55 mb-6 leading-relaxed">
        Portrait crops (3:4) — tap to open the full modal. Not included in production builds.
      </p>

      <div className="grid grid-cols-4 gap-2 mb-8">
        {STORY_MOMENT_ACHIEVEMENT_IDS.map(id => (
          <button
            key={`thumb-${id}`}
            type="button"
            onClick={() => setActiveId(id)}
            className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/10 hover:border-white/25 transition-colors"
            title={ACHIEVEMENTS[id].title}
          >
            <img
              src={ACHIEVEMENT_MOMENT_PHOTOS[id]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {STORY_MOMENT_ACHIEVEMENT_IDS.map(id => {
          const card = ACHIEVEMENTS[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveId(id)}
              className="w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 px-5 py-4 transition-colors"
            >
              <p className="text-[15px] font-medium" style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}>
                {card.title}
              </p>
              <p className="text-[12px] text-white/50 mt-1 italic">{card.subtitle}</p>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {active && (
          <AchievementModal achievement={active} onClose={() => setActiveId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
