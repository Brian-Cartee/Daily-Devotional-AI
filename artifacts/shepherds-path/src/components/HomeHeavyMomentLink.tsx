import { Link } from "wouter";
import { Heart } from "lucide-react";

type Props = {
  /** Shown inside the same section card (e.g. week-one devotional focus hint) */
  footerHint?: string;
};

/** Single calm entry when life feels heavy — avoids hunting the explore grid. */
export function HomeHeavyMomentLink({ footerHint }: Props) {
  return (
    <div
      className="max-w-xl md:max-w-4xl mx-auto px-4 sm:px-5 relative z-10 -mt-1 mb-2"
      data-testid="section-something-heavy"
    >
      <div className="rounded-2xl border border-violet-500/25 bg-violet-950/25 overflow-hidden shadow-sm shadow-violet-950/20">
        <Link
          href="/guidance"
          data-testid="link-something-heavy"
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-violet-950/45 active:scale-[0.995] transition-all"
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
        {footerHint ? (
          <p
            className="border-t border-violet-500/15 px-4 py-2.5 text-center text-[13px] text-muted-foreground/80 leading-relaxed"
            data-testid="text-sacred-first-hint"
          >
            {footerHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
