import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { ShortcutPathIcon } from "@/components/ShortcutPathIcon";

/** Compact secondaries during home devotional focus — not full shortcut stack. */
export function HomeSecondaryPathsRow({ hideCloset = false }: { hideCloset?: boolean }) {
  return (
    <div
      className={`grid gap-2 ${hideCloset ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
      data-testid="home-secondary-paths"
    >
      <Link href="/guidance">
        <div
          data-testid="home-secondary-guidance"
          className="group flex items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-br from-violet-500/10 to-primary/6 px-4 py-3 active:scale-[0.99] transition-transform"
        >
          <ShortcutPathIcon variant="guidance" size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-foreground leading-tight">Talk it through</p>
            <p className="text-[12px] text-muted-foreground/75 leading-snug mt-0.5">
              When you need more than reading
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/70 shrink-0" />
        </div>
      </Link>
      {!hideCloset && (
      <Link href="/prayer-closet">
        <div
          data-testid="home-secondary-closet"
          className="group flex items-center gap-3 rounded-xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-emerald-500/6 px-4 py-3 active:scale-[0.99] transition-transform"
        >
          <ShortcutPathIcon variant="closet" size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-foreground leading-tight">Prayer closet</p>
            <p className="text-[12px] text-muted-foreground/75 leading-snug mt-0.5">
              Quiet room · worship · stillness
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-teal-500/70 shrink-0" />
        </div>
      </Link>
      )}
    </div>
  );
}
