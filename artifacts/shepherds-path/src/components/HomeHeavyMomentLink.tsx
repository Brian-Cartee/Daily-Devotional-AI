import { Link } from "wouter";
import { Heart } from "lucide-react";

/** Single calm entry when life feels heavy — avoids hunting the explore grid. */
export function HomeHeavyMomentLink() {
  return (
    <div className="max-w-xl md:max-w-4xl mx-auto px-4 sm:px-5 relative z-10 -mt-1 mb-2">
      <Link
        href="/guidance"
        data-testid="link-something-heavy"
        className="flex items-center gap-3 rounded-xl border border-violet-500/25 bg-violet-950/35 px-4 py-3 hover:bg-violet-950/50 hover:border-violet-400/35 active:scale-[0.99] transition-all"
      >
        <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
          <Heart className="w-4 h-4 text-violet-300/90" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[14px] font-semibold text-foreground leading-tight">
            Something feels heavy
          </p>
          <p className="text-[12px] text-muted-foreground/75 mt-0.5 leading-snug">
            Scripture and prayer for what you&apos;re carrying — no performance
          </p>
        </div>
      </Link>
    </div>
  );
}
