import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { ShortcutPathIcon } from "@/components/ShortcutPathIcon";
import { getBookmark } from "@/lib/bookmarks";

/** Compact secondaries during home devotional focus — not full shortcut stack. */
export function HomeSecondaryPathsRow({ hideCloset = false }: { hideCloset?: boolean }) {
  const [readLabel, setReadLabel] = useState<string | null>(() => getBookmark("read")?.label ?? null);

  useEffect(() => {
    const sync = () => setReadLabel(getBookmark("read")?.label ?? null);
    sync();
    window.addEventListener("sp-bookmark-change", sync);
    return () => window.removeEventListener("sp-bookmark-change", sync);
  }, []);

  return (
    <div className="flex flex-col gap-2" data-testid="home-secondary-paths">
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

      <Link href="/read">
        <div
          data-testid="home-secondary-read"
          className="group flex items-center gap-3 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/6 px-4 py-3 active:scale-[0.99] transition-transform"
        >
          <ShortcutPathIcon variant="media" size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-foreground leading-tight">
              {readLabel ? `Continue ${readLabel}` : "Read or listen"}
            </p>
            <p className="text-[12px] text-muted-foreground/75 leading-snug mt-0.5">
              {readLabel ? "Pick up where you left off" : "Play any chapter — KJV, WEB, ASV"}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-amber-500/70 shrink-0" />
        </div>
      </Link>
    </div>
  );
}
