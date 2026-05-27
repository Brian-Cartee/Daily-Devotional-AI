import { useState } from "react";
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

/** Collapsed preview — essentials without repeating the hero shortcuts */
const PREVIEW_HREFS = new Set(["/read", "/prayer-wall", "/reading-plans", "/study"]);
const PREVIEW_ITEMS = EXPLORE_ITEMS.filter((item) => PREVIEW_HREFS.has(item.href));

type Props = {
  /** New users: hide path grid until they tap More paths */
  chapelFirstWeek?: boolean;
};

export function HomeExploreSection({ chapelFirstWeek = false }: Props) {
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(EXPLORE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setExpanded((v) => {
      const next = !v;
      try {
        localStorage.setItem(EXPLORE_KEY, next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  };

  return (
    <div id="explore-section" className="mt-4">
      <button
        type="button"
        onClick={toggle}
        data-testid="toggle-home-explore"
        aria-expanded={expanded}
        className="relative w-full min-h-[44px] py-2 mb-2 px-9 group touch-manipulation"
      >
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-primary/30" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 shrink-0 text-center group-hover:text-foreground/80 transition-colors">
            More paths
          </p>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-primary/20 to-primary/30" />
        </div>
        <ChevronDown
          className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false} mode="wait">
        {expanded ? (
          <motion.div
            key="full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid grid-cols-2 gap-2.5">
              {EXPLORE_ITEMS.map(({ href, label, desc, bg, testid }) => (
                <Link key={href} href={href}>
                  <div
                    data-testid={`card-${testid}`}
                    className={`rounded-2xl border ${bg} p-3.5 cursor-pointer hover:brightness-110 active:scale-[0.97] transition-all h-full min-h-[108px]`}
                  >
                    <div className="mb-2.5">
                      <ShortcutPathIcon variant={explorePathVariant(href)} size="sm" />
                    </div>
                    <p className="text-[13px] font-bold text-foreground leading-tight">{label}</p>
                    <p className="text-[11px] text-muted-foreground/65 mt-0.5 leading-snug">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        ) : chapelFirstWeek ? null : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 mb-2">
              {PREVIEW_ITEMS.map(({ href, label, testid }) => (
                <Link key={href} href={href}>
                  <div
                    data-testid={`preview-${testid}`}
                    className="flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 active:scale-[0.99] transition-all"
                  >
                    <ShortcutPathIcon variant={explorePathVariant(href)} size="sm" />
                    <span className="text-[13px] font-semibold text-foreground/85">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={toggle}
              data-testid="btn-expand-explore"
              className="w-full min-h-[44px] text-center text-[12px] font-semibold text-primary/70 hover:text-primary py-2"
            >
              See all paths in the app
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
