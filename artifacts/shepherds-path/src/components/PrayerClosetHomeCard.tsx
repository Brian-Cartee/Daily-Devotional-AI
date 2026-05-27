import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import {
  loadClosetSettings,
  closetDisplayName,
  closetHomeStatus,
  markClosetVisit,
  hasVisitedCloset,
} from "@/lib/prayerCloset";

const CLOSET_DOORWAY_SRC = "/closet-doorway.png";

export function PrayerClosetHomeCard() {
  const settings = loadClosetSettings();
  const title = closetDisplayName(settings, "Your prayer closet");
  const [visited] = useState(hasVisitedCloset);
  const statusLine = closetHomeStatus(settings);

  return (
    <Link href="/prayer-closet">
      <div
        data-testid="card-home-prayer-closet"
        onClick={() => markClosetVisit()}
        className="group relative rounded-2xl overflow-hidden border border-violet-500/30 active:scale-[0.99] transition-transform shadow-lg shadow-violet-950/30 min-h-[132px] md:min-h-[212px]"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400/90 via-violet-500 to-primary z-20" />

        {/* Doorway — mobile: full-bleed banner crop; desktop: right panel */}
        <img
          src={CLOSET_DOORWAY_SRC}
          alt=""
          className="absolute inset-0 w-full h-[115%] object-cover object-[center_22%] scale-[1.06] group-hover:scale-[1.08] transition-transform duration-500 md:inset-y-0 md:left-[40%] md:right-0 md:w-auto md:h-full md:object-[center_38%] md:scale-100 group-hover:md:scale-[1.04]"
        />

        {/* Mobile overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/55 to-black/25 z-[1] md:hidden" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/50 via-transparent to-violet-950/40 z-[1] md:hidden" />

        {/* Desktop overlays — readable copy left, doorway visible right */}
        <div className="absolute inset-0 z-[1] hidden md:block bg-gradient-to-r from-[#0a0514]/97 via-[#0d0618]/88 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-[48%] z-[1] hidden md:block bg-gradient-to-l from-black/55 via-black/20 to-transparent" />

        <div
          className="absolute inset-x-0 top-0 h-16 z-[2] pointer-events-none opacity-70 md:h-24 md:w-[55%]"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(251,191,36,0.22) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 px-4 py-4 min-h-[132px] flex flex-col justify-end md:min-h-[212px] md:max-w-[56%] md:px-8 md:py-7 md:justify-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/90 mb-1 md:text-[11px] md:mb-2">
            {visited ? "Your space" : "New · your space"}
          </p>
          <p className="text-[18px] font-bold text-white leading-tight drop-shadow-sm md:text-[22px] md:leading-snug">
            {title}
          </p>
          <p className="text-[12px] text-white/70 leading-snug mt-1 max-w-[90%] md:text-[14px] md:leading-relaxed md:max-w-[95%] md:mt-2">
            {statusLine ?? "Worship, vision board, and honest prayer inside"}
          </p>
          <div className="flex items-center justify-between mt-3 md:mt-5 md:max-w-[280px]">
            <span className="text-[11px] font-semibold text-violet-200/90 uppercase tracking-wider md:text-[12px]">
              Enter closet
            </span>
            <ArrowRight className="w-5 h-5 text-amber-200/80 group-hover:translate-x-0.5 transition-transform md:w-6 md:h-6" />
          </div>
        </div>
      </div>
    </Link>
  );
}
