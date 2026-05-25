import { Link } from "wouter";
import { ArrowRight, DoorOpen, Music2 } from "lucide-react";
import { loadClosetSettings, closetDisplayName, markClosetVisit } from "@/lib/prayerCloset";

export function PrayerClosetHomeCard() {
  const settings = loadClosetSettings();
  const title = closetDisplayName(settings, "Your prayer closet");

  return (
    <Link href="/prayer-closet">
      <div
        data-testid="card-home-prayer-closet"
        onClick={() => markClosetVisit()}
        className="group relative rounded-2xl overflow-hidden border border-violet-500/25 active:scale-[0.99] transition-transform"
      >
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-violet-600 via-primary to-amber-500/80 z-10" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "url(/hero-prayer-wall-lake.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/90 via-[#1a0a3e]/88 to-black/70" />
        <div className="relative z-10 px-4 py-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center shrink-0">
            <DoorOpen className="w-5 h-5 text-violet-200" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200/80 mb-0.5">
              New · your space
            </p>
            <p className="text-[16px] font-bold text-white leading-tight">{title}</p>
            <p className="text-[12px] text-white/55 leading-snug mt-0.5 flex items-center gap-1.5">
              <Music2 className="w-3 h-3 shrink-0 opacity-70" />
              A sacred room · hill on the wall · vision board · bean bag
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-violet-300/60 group-hover:text-violet-200 shrink-0" />
        </div>
      </div>
    </Link>
  );
}
