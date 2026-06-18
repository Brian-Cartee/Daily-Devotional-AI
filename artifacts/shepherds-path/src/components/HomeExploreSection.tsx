import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Pin } from "lucide-react";
import { ShortcutPathIcon } from "@/components/ShortcutPathIcon";
import { explorePathVariant } from "@/lib/explorePathVariants";
import { buildHomeExplorePreviewHrefs, getPinnedPaths, togglePinnedPath } from "@/lib/homeExplorePreview";
import { HOME_EXPLORE_OPEN_KEY } from "@/lib/homePathsNav";
import {
  NATIVE_PRIMARY,
  NATIVE_PRIMARY_FAINT,
  NATIVE_PRIMARY_SOFT,
  NATIVE_TEXT,
  NATIVE_TEXT_MUTED,
  NATIVE_TEXT_SOFT,
} from "@/lib/nativeColors";

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

const EXPLORE_CARD_STYLES: Record<string, { border: string; background: string }> = {
  "border-amber-500/20 bg-amber-500/6": { border: "rgba(245,158,11,0.20)", background: "rgba(245,158,11,0.06)" },
  "border-indigo-500/20 bg-indigo-500/6": { border: "rgba(99,102,241,0.20)", background: "rgba(99,102,241,0.06)" },
  "border-orange-500/20 bg-orange-500/6": { border: "rgba(249,115,22,0.20)", background: "rgba(249,115,22,0.06)" },
  "border-teal-500/20 bg-teal-500/6": { border: "rgba(20,184,166,0.20)", background: "rgba(20,184,166,0.06)" },
  "border-slate-500/25 bg-slate-500/8": { border: "rgba(100,116,139,0.25)", background: "rgba(100,116,139,0.08)" },
  "border-slate-400/20 bg-slate-400/6": { border: "rgba(148,163,184,0.20)", background: "rgba(148,163,184,0.06)" },
  "border-violet-500/20 bg-violet-500/6": { border: "rgba(139,92,246,0.20)", background: "rgba(139,92,246,0.06)" },
  "border-rose-500/20 bg-rose-500/6": { border: "rgba(244,63,94,0.20)", background: "rgba(244,63,94,0.06)" },
  "border-sky-500/20 bg-sky-500/6": { border: "rgba(14,165,233,0.20)", background: "rgba(14,165,233,0.06)" },
  "border-emerald-500/20 bg-emerald-500/6": { border: "rgba(16,185,129,0.20)", background: "rgba(16,185,129,0.06)" },
};

function PathCard({
  href,
  label,
  bg,
  testid,
  pinned,
  onTogglePin,
}: (typeof EXPLORE_ITEMS)[number] & { pinned: boolean; onTogglePin: (href: string) => void }) {
  const colors = EXPLORE_CARD_STYLES[bg] ?? { border: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" };
  return (
    <div style={{ position: "relative" }}>
      <Link href={href} className="sp-native-card-link">
        <div
          data-testid={`card-${testid}`}
          style={{
            borderRadius: "12px",
            border: `1px solid ${pinned ? "rgba(196,78,224,0.45)" : colors.border}`,
            backgroundColor: pinned ? "rgba(196,78,224,0.10)" : colors.background,
            cursor: "pointer",
            height: "100%",
            minHeight: "76px",
            padding: "10px",
            paddingTop: "22px",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          <ShortcutPathIcon variant={explorePathVariant(href)} size="sm" />
          <p
            style={{
              fontWeight: 700,
              color: NATIVE_TEXT,
              lineHeight: 1.25,
              fontSize: "12px",
              marginTop: "6px",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {label}
          </p>
        </div>
      </Link>
      <button
        type="button"
        aria-label={pinned ? "Unpin from home" : "Pin to home"}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(href); }}
        style={{
          position: "absolute",
          top: "5px",
          right: "5px",
          padding: "4px",
          borderRadius: "6px",
          background: pinned ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.10)",
          border: `1px solid ${pinned ? "rgba(34,197,94,0.50)" : "rgba(34,197,94,0.25)"}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: pinned ? "rgb(74,222,128)" : "rgba(74,222,128,0.60)",
        }}
      >
        <Pin style={{ width: "10px", height: "10px", fill: pinned ? "rgb(74,222,128)" : "none" }} />
      </button>
    </div>
  );
}

type HomeExploreSectionProps = {
  excludePreviewHrefs?: readonly string[];
};

export function HomeExploreSection({ excludePreviewHrefs = [] }: HomeExploreSectionProps) {
  const [pinnedPaths, setPinnedPaths] = useState<string[]>(() => getPinnedPaths());
  const [currentStreak, setCurrentStreak] = useState<number>(0);

  useEffect(() => {
    fetch("/api/streak")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.currentStreak) setCurrentStreak(data.currentStreak); })
      .catch(() => {});
  }, []);

  const handleTogglePin = useCallback((href: string) => {
    const next = togglePinnedPath(href);
    setPinnedPaths(next);
  }, []);

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
  }, [excludeSet, pinnedPaths]);

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
      aria-label="All paths through the app"
      data-testid="home-explore-section"
      style={{
        scrollMarginTop: "7rem",
        borderRadius: "16px",
        border: `1px solid ${NATIVE_PRIMARY_SOFT}`,
        background: `linear-gradient(to bottom, rgba(196, 78, 224, 0.07), rgba(26, 21, 32, 0.40))`,
        padding: "12px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "10px",
          paddingLeft: "2px",
          paddingRight: "2px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: NATIVE_TEXT_SOFT,
            }}
          >
            More ways in
          </p>
          <p
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: NATIVE_TEXT_MUTED,
              marginTop: "2px",
            }}
          >
            {expanded ? "Every path, all at once" : "A few places to start"}
          </p>
          {currentStreak >= 2 && (
            <p
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: NATIVE_TEXT_MUTED,
                marginTop: "4px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>🔥</span>
              <span>{currentStreak} days</span>
            </p>
          )}
        </div>
        {expanded && (
          <button
            type="button"
            onClick={() => setExpandedPersisted(false)}
            data-testid="btn-collapse-explore"
            className="text-[12px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1"
          >
            Show less
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
              {EXPLORE_ITEMS.map((item) => (
                <PathCard key={item.href} {...item} pinned={pinnedPaths.includes(item.href)} onTogglePin={handleTogglePin} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
              {previewItems.map((item) => (
                <PathCard key={item.href} {...item} pinned={pinnedPaths.includes(item.href)} onTogglePin={handleTogglePin} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setExpandedPersisted(true)}
              data-testid="btn-expand-explore"
              style={{
                marginTop: "10px",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minHeight: "48px",
                borderRadius: "12px",
                border: `1px solid ${NATIVE_PRIMARY_SOFT}`,
                backgroundColor: NATIVE_PRIMARY_FAINT,
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: 700,
                color: NATIVE_PRIMARY,
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              See all paths
              <ChevronDown className="w-4 h-4 shrink-0" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
