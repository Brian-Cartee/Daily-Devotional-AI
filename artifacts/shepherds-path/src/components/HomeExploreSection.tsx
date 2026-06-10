import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ShortcutPathIcon } from "@/components/ShortcutPathIcon";
import { explorePathVariant } from "@/lib/explorePathVariants";
import { buildHomeExplorePreviewHrefs } from "@/lib/homeExplorePreview";
import { HOME_EXPLORE_OPEN_KEY } from "@/lib/homePathsNav";

const EXPLORE_ITEMS = [
  { href: "/salvation", label: "Beginning with Jesus", desc: "Meet Jesus without pressure", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-salvation" },
  { href: "/understand", label: "Bible Journeys", desc: "Scripture meets you where you are", bg: "border-indigo-500/20 bg-indigo-500/6", testid: "explore-understand" },
  { href: "/calling", label: "Our Calling", desc: "Carry the hope forward", bg: "border-orange-500/20 bg-orange-500/6", testid: "explore-calling" },
  { href: "/journal", label: "Prayer Journal", desc: "What you don't want to lose", bg: "border-teal-500/20 bg-teal-500/6", testid: "explore-journal" },
  { href: "/lament", label: "Lament Pathway", desc: "Seven days for grief — no streak", bg: "border-slate-500/25 bg-slate-500/8", testid: "explore-lament" },
  { href: "/surrender", label: "Surrender Stone", desc: "Release what you're carrying to God", bg: "border-slate-400/20 bg-slate-400/6", testid: "explore-surrender" },
  { href: "/prayer-closet", label: "Prayer closet", desc: "Your quiet room — worship & reflection", bg: "border-violet-500/20 bg-violet-500/6", testid: "explore-prayer-closet" },
  { href: "/iron-circle", label: "Iron Sharpens Iron", desc: "Walk alongside others", bg: "border-rose-500/20 bg-rose-500/6", testid: "explore-iron-circle" },
  { href: "/prayer-wall", label: "Prayer Wall", desc: "Lift someone up today", bg: "border-sky-500/20 bg-sky-500/6", testid: "explore-prayer-wall" },
  { href: "/reading-plans", label: "Your Walk", desc: "A path through Scripture for you", bg: "border-emerald-500/20 bg-emerald-500/6", testid: "explore-reading-plans" },
  { href: "/study", label: "Explore Scripture", desc: "A question or passage on your mind", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-study" },
  { href: "/read", label: "Listen to the Bible", desc: "Play any chapter — KJV, WEB, ASV", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-read" },
  { href: "/stories", label: "Stories", desc: "Real testimonies of faith", bg: "border-violet-500/20 bg-violet-500/6", testid: "explore-stories" },
  { href: "/trivia", label: "Bible Trivia", desc: "Play solo or challenge a friend", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-trivia" },
  { href: "/prayer-portrait", label: "Prayer Portrait", desc: "A prayer spoken over your life", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-prayer-portrait" },
  { href: "/display", label: "Scripture on Your TV", desc: "Ambient devotional screen", bg: "border-violet-500/20 bg-violet-500/6", testid: "explore-display-mode" },
] as const;

export const HOME_EXPLORE_PATH_COUNT = EXPLORE_ITEMS.length;

function PathCard({
  href,
  label,
  bg,
  testid,
}: (typeof EXPLORE_ITEMS)[number]) {
  return (
    <Link href={href}>
      <div
        data-testid={`card-${testid}`}
        className={`rounded-xl border ${bg} cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all h-full p-2.5 min-h-[76px] flex flex-col`}
      >
        <ShortcutPathIcon variant={explorePathVariant(href)} size="sm" />
        <p className="font-bold text-foreground leading-tight text-[12px] mt-1.5 line-clamp-2">
          {label}
        </p>
      </div>
    </Link>
  );
}

type HomeExploreSectionProps = {
  excludePreviewHrefs?: readonly string[];
};

export function HomeExploreSection({ excludePreviewHrefs = [] }: HomeExploreSectionProps) {
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(HOME_EXPLORE_OPEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  const excludeSet = useMemo(() => new Set(excludePreviewHrefs), [excludePreviewHrefs]);

  const previewItems = useMemo(() => {
    const hrefs = buildHomeExplorePreviewHrefs(excludeSet);
    return hrefs
      .map((href) => EXPLORE_ITEMS.find((item) => item.href === href))
      .filter((item): item is (typeof EXPLORE_ITEMS)[number] => !!item);
  }, [excludeSet]);

  const setExpandedPersisted = (next: boolean) => {
    setExpanded(next);
    try {
      localStorage.setItem(HOME_EXPLORE_OPEN_KEY, next ? "1" : "0");
    } catch {
      /* noop */
    }
  };

  const previewCount = previewItems.length;

  return (
    <section
      id="explore-section"
      className="scroll-mt-28 rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.07] to-card/40 p-3 shadow-sm"
      aria-label="All paths through the app"
      data-testid="home-explore-section"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/75">
            All paths
          </p>
          <p className="text-[10px] font-semibold text-muted-foreground/80 mt-0.5 tabular-nums">
            {expanded
              ? `${HOME_EXPLORE_PATH_COUNT} ways to walk`
              : `${previewCount} shown · ${HOME_EXPLORE_PATH_COUNT} total`}
          </p>
        </div>
        {expanded && (
          <button
            type="button"
            onClick={() => setExpandedPersisted(false)}
            data-testid="btn-collapse-explore"
            className="text-[12px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1"
          >
            Fewer
          </button>
        )}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {expanded ? (
          <motion.div
            key="full"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid grid-cols-2 gap-2">
              {EXPLORE_ITEMS.map((item) => (
                <PathCard key={item.href} {...item} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 gap-2">
              {previewItems.map((item) => (
                <PathCard key={item.href} {...item} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setExpandedPersisted(true)}
              data-testid="btn-expand-explore"
              className="mt-2.5 w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-primary/30 bg-primary/12 px-4 py-3 text-[14px] font-bold text-primary hover:bg-primary/18 active:scale-[0.99] transition-all"
            >
              See all {HOME_EXPLORE_PATH_COUNT} paths
              <ChevronDown className="w-4 h-4 shrink-0" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
