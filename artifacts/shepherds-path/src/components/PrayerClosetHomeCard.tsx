import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { loadClosetSettings, closetDisplayName, markClosetVisit } from "@/lib/prayerCloset";

const CLOSET_DOORWAY_SRC = "/closet-doorway.png";

export function PrayerClosetHomeCard() {
  const settings = loadClosetSettings();
  const title = closetDisplayName(settings, "Your prayer closet");

  return (
    <Link href="/prayer-closet">
      <div
        data-testid="card-home-prayer-closet"
        onClick={() => markClosetVisit()}
        className="group relative rounded-2xl overflow-hidden border border-violet-500/30 active:scale-[0.99] transition-transform shadow-lg shadow-violet-950/30"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400/90 via-violet-500 to-primary z-20" />

        {/* Open closet doors — real doorway photo */}
        <img
          src={CLOSET_DOORWAY_SRC}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02] group-hover:scale-[1.04] transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/55 to-black/25 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/50 via-transparent to-violet-950/40 z-[1]" />
        {/* Warm fairy-light hint at the top of the frame */}
        <div
          className="absolute inset-x-0 top-0 h-16 z-[2] pointer-events-none opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(251,191,36,0.22) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 px-4 py-4 min-h-[132px] flex flex-col justify-end">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/90 mb-1">
            New · your space
          </p>
          <p className="text-[18px] font-bold text-white leading-tight drop-shadow-sm">{title}</p>
          <p className="text-[12px] text-white/70 leading-snug mt-1 max-w-[90%]">
            Step through the doorway — vision board, worship bed, honest prayer inside
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] font-semibold text-violet-200/90 uppercase tracking-wider">
              Enter closet
            </span>
            <ArrowRight className="w-5 h-5 text-amber-200/80 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
