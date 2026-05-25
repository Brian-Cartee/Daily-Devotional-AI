import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sunrise, Compass, Share2, BookMarked, Swords, HandHeart, Star, Sparkles,
  BookOpen, Play, Heart, Monitor, ChevronDown,
} from "lucide-react";

const EXPLORE_KEY = "sp_home_explore_open";

const EXPLORE_ITEMS = [
  { href: "/salvation", Icon: Sunrise, label: "Beginning with Jesus", desc: "Meet Jesus without pressure", color: "text-amber-400", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-salvation" },
  { href: "/understand", Icon: Compass, label: "Bible Journeys", desc: "Scripture meets you where you are", color: "text-indigo-400", bg: "border-indigo-500/20 bg-indigo-500/6", testid: "explore-understand" },
  { href: "/calling", Icon: Share2, label: "Our Calling", desc: "Carry the hope forward", color: "text-orange-400", bg: "border-orange-500/20 bg-orange-500/6", testid: "explore-calling" },
  { href: "/journal", Icon: BookMarked, label: "Prayer Journal", desc: "What you don't want to lose", color: "text-teal-400", bg: "border-teal-500/20 bg-teal-500/6", testid: "explore-journal" },
  { href: "/iron-circle", Icon: Swords, label: "Iron Sharpens Iron", desc: "Walk alongside others", color: "text-rose-400", bg: "border-rose-500/20 bg-rose-500/6", testid: "explore-iron-circle" },
  { href: "/prayer-wall", Icon: HandHeart, label: "Prayer Wall", desc: "Lift someone up today", color: "text-sky-400", bg: "border-sky-500/20 bg-sky-500/6", testid: "explore-prayer-wall" },
  { href: "/reading-plans", Icon: Star, label: "Your Walk", desc: "A path through Scripture for you", color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-500/6", testid: "explore-reading-plans" },
  { href: "/study", Icon: Sparkles, label: "Explore Scripture", desc: "A question or passage on your mind", color: "text-amber-400", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-study" },
  { href: "/read", Icon: BookOpen, label: "Read the Bible", desc: "KJV, WEB, and ASV", color: "text-amber-400", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-read" },
  { href: "/stories", Icon: Play, label: "Stories", desc: "Real testimonies of faith", color: "text-violet-400", bg: "border-violet-500/20 bg-violet-500/6", testid: "explore-stories" },
  { href: "/prayer-portrait", Icon: Heart, label: "Prayer Portrait", desc: "A prayer spoken over your life", color: "text-amber-400", bg: "border-amber-500/20 bg-amber-500/6", testid: "explore-prayer-portrait" },
  { href: "/display", Icon: Monitor, label: "Scripture on Your TV", desc: "Ambient devotional screen", color: "text-violet-400", bg: "border-violet-500/20 bg-violet-500/6", testid: "explore-display-mode" },
] as const;

/** Collapsed preview — essentials without repeating the hero shortcuts */
const PREVIEW_HREFS = new Set(["/read", "/prayer-wall", "/reading-plans", "/study"]);
const PREVIEW_ITEMS = EXPLORE_ITEMS.filter((item) => PREVIEW_HREFS.has(item.href));

function readExpandedDefault(): boolean {
  try {
    return localStorage.getItem(EXPLORE_KEY) === "1";
  } catch {
    return false;
  }
}

export function HomeExploreSection() {
  const [expanded, setExpanded] = useState(readExpandedDefault);

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
        className="w-full flex items-center justify-between gap-3 px-0.5 py-1 mb-2 text-left group"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-primary/30" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 shrink-0 group-hover:text-foreground/80 transition-colors">
            More paths
          </p>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-primary/20 to-primary/30" />
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground/50 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false} mode="wait">
        {!expanded ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 mb-2">
              {PREVIEW_ITEMS.map(({ href, Icon, label, testid }) => (
                <Link key={href} href={href}>
                  <div
                    data-testid={`preview-${testid}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 active:scale-[0.99] transition-all"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                    <span className="text-[13px] font-semibold text-foreground/85">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={toggle}
              data-testid="btn-expand-explore"
              className="w-full text-center text-[12px] font-semibold text-primary/70 hover:text-primary py-2"
            >
              See all paths in the app
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid grid-cols-2 gap-2.5">
              {EXPLORE_ITEMS.map(({ href, Icon, label, desc, color, bg, testid }) => (
                <Link key={href} href={href}>
                  <div
                    data-testid={`card-${testid}`}
                    className={`rounded-2xl border ${bg} p-3.5 cursor-pointer hover:brightness-110 active:scale-[0.97] transition-all h-full`}
                  >
                    <Icon className={`w-5 h-5 ${color} mb-2`} />
                    <p className="text-[13px] font-bold text-foreground leading-tight">{label}</p>
                    <p className="text-[11px] text-muted-foreground/65 mt-0.5 leading-snug">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
