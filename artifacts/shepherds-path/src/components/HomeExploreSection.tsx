import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ShortcutPathIcon } from "@/components/ShortcutPathIcon";
import { explorePathVariant } from "@/lib/explorePathVariants";

import { HOME_EXPLORE_OPEN_KEY } from "@/lib/homePathsNav";

const EXPLORE_KEY = HOME_EXPLORE_OPEN_KEY;

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
  { href: "/read", label: "Read or listen to the Bible", desc: "KJV, WEB, and ASV — play any chapter", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-read" },
  { href: "/stories", label: "Stories", desc: "Real testimonies of faith", bg: "border-violet-500/20 bg-violet-500/6", testid: "explore-stories" },
  { href: "/trivia", label: "Bible Trivia", desc: "Play solo or challenge a friend", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-trivia" },
  { href: "/prayer-portrait", label: "Prayer Portrait", desc: "A prayer spoken over your life", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-prayer-portrait" },
  { href: "/display", label: "Scripture on Your TV", desc: "Ambient devotional screen", bg: "border-violet-500/20 bg-violet-500/6", testid: "explore-display-mode" },
] as const;

const PATH_COUNT = EXPLORE_ITEMS.length;

/** Default home view — four high-intent entry points; full grid on expand */
const PREVIEW_HREFS: readonly string[] = [
  "/salvation",
  "/journal",
  "/prayer-closet",
  "/understand",
];

const PREVIEW_ITEMS = PREVIEW_HREFS.map(
  (href) => EXPLORE_ITEMS.find((item) => item.href === href)!,
).filter(Boolean);

function PathCard({
  href,
  label,
  desc,
  bg,
  testid,
  compact,
}: (typeof EXPLORE_ITEMS)[number] & { compact?: boolean }) {
  return (
    <Link href={href}>
      <div
        data-testid={`card-${testid}`}
        className={`rounded-2xl border ${bg} cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all h-full ${
          compact ? "p-3 min-h-[92px]" : "p-3.5 min-h-[108px]"
        }`}
      >
        <div className={compact ? "mb-2" : "mb-2.5"}>
          <ShortcutPathIcon variant={explorePathVariant(href)} size="sm" />
        </div>
        <p className={`font-bold text-foreground leading-tight ${compact ? "text-[12px]" : "text-[13px]"}`}>
          {label}
        </p>
        {!compact && (
          <p className="text-[11px] text-muted-foreground/65 mt-0.5 leading-snug">{desc}</p>
        )}
      </div>
    </Link>
  );
}

export function HomeExploreSection() {
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(EXPLORE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const setExpandedPersisted = (next: boolean) => {
    setExpanded(next);
    try {
      localStorage.setItem(EXPLORE_KEY, next ? "1" : "0");
    } catch {
      /* noop */
    }
  };

  const toggle = () => setExpandedPersisted(!expanded);
  const openAll = () => setExpandedPersisted(true);

  useEffect(() => {
    const onOpen = () => openAll();
    window.addEventListener("sp-open-home-explore", onOpen);
    return () => window.removeEventListener("sp-open-home-explore", onOpen);
  }, []);

  const hiddenCount = PATH_COUNT - PREVIEW_ITEMS.length;

  return (
    <section
      id="explore-section"
      className="mt-4 scroll-mt-28 rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.07] to-card/40 p-3.5 shadow-sm"
      aria-label="More paths through the app"
    >
      <button
        type="button"
        onClick={toggle}
        data-testid="toggle-home-explore"
        aria-expanded={expanded}
        className="relative w-full min-h-[44px] py-1 mb-3 px-8 group touch-manipulation"
      >
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/25 to-primary/35" />
          <div className="shrink-0 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/75 group-hover:text-foreground transition-colors">
              More paths
            </p>
            <p className="text-[10px] font-semibold text-primary/80 mt-0.5 tabular-nums">
              {expanded ? `All ${PATH_COUNT} ways to walk` : `4 of ${PATH_COUNT} · tap to expand`}
            </p>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-primary/25 to-primary/35" />
        </div>
        <ChevronDown
          className={`pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false} mode="wait">
        {expanded ? (
          <motion.div key="full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <div className="grid grid-cols-2 gap-2.5">
              {EXPLORE_ITEMS.map((item) => (
                <PathCard key={item.href} {...item} />
              ))}
            </div>
            <button
              type="button"
              onClick={toggle}
              data-testid="btn-collapse-explore"
              className="mt-3 w-full min-h-[44px] text-center text-[12px] font-semibold text-muted-foreground hover:text-foreground py-2"
            >
              Show fewer paths
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2.5">
              {PREVIEW_ITEMS.map((item) => (
                <PathCard key={item.href} {...item} compact />
              ))}
            </div>
            <button
              type="button"
              onClick={openAll}
              data-testid="btn-expand-explore"
              className="mt-3 w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-primary/30 bg-primary/12 px-4 py-3 text-[13px] font-bold text-primary shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] hover:bg-primary/18 active:scale-[0.99] transition-all"
            >
              Show all {PATH_COUNT} paths
              <span className="text-[11px] font-semibold text-primary/75 tabular-nums">
                +{hiddenCount} more
              </span>
              <ChevronDown className="w-4 h-4 shrink-0" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
