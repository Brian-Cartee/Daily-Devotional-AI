import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { HOME_EXPLORE_OPEN_KEY } from "@/lib/homePathsNav";
import { explorePathVariant } from "@/lib/explorePathVariants";
import { ShortcutPathIcon, type ShortcutIconVariant } from "@/components/ShortcutPathIcon";

const SHORTCUTS: {
  href: string;
  label: string;
  desc: string;
  testid: string;
  accent: string;
  iconVariant: ShortcutIconVariant;
}[] = [
  {
    href: "/guidance",
    iconVariant: "guidance",
    label: "Talk it through",
    desc: "Scripture and prayer shaped for what's on your heart",
    testid: "shortcut-guidance",
    accent: "from-violet-500/12 to-primary/8 border-primary/20",
  },
  {
    href: "/journal",
    iconVariant: "journal",
    label: "Journal",
    desc: "Hold prayers and reflections you don't want to lose",
    testid: "shortcut-journal",
    accent: "from-teal-500/10 to-emerald-500/6 border-teal-500/20",
  },
  {
    href: "/understand#pathways",
    iconVariant: "pathways",
    label: "Guided Pathways",
    desc: "7-day walks for grief, anxiety, and hard seasons",
    testid: "shortcut-journeys",
    accent: "from-indigo-500/10 to-violet-500/6 border-indigo-500/20",
  },
] as const;

/** Two discoverable paths when explore grid is not on screen (week-one collapsed). */
const PEEK_PATHS: {
  href: string;
  label: string;
  desc: string;
  testid: string;
  accent: string;
}[] = [
  {
    href: "/understand#pathways",
    label: "Guided Pathways",
    desc: "7-day walks for grief, anxiety, and hard seasons",
    testid: "peek-journeys",
    accent: "from-indigo-500/10 to-violet-500/6 border-indigo-500/20",
  },
  {
    href: "/lament",
    label: "Lament Pathway",
    desc: "Seven days for grief — no streak pressure",
    testid: "peek-lament",
    accent: "from-slate-500/12 to-slate-400/6 border-slate-500/25",
  },
];

export function HomePathsPeekRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="home-paths-peek">
      {PEEK_PATHS.map(({ href, label, desc, testid, accent }) => (
        <Link key={href} href={href}>
          <div
            data-testid={testid}
            className={`group flex items-center gap-3 rounded-xl border bg-gradient-to-br ${accent} px-4 py-3 active:scale-[0.99] transition-transform h-full`}
          >
            <ShortcutPathIcon variant={explorePathVariant(href.replace(/#.*$/, ""))} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-foreground leading-tight">{label}</p>
              <p className="text-[12px] text-muted-foreground/75 leading-snug mt-0.5">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/70 shrink-0 transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  );
}

/** First week only — hero doors are simplified; these paths help discovery. */
export function HomePathShortcuts() {
  return (
    <div className="flex flex-col gap-2" data-testid="home-path-shortcuts">
      {SHORTCUTS.map(({ href, iconVariant, label, desc, testid, accent }) => (
        <Link key={href} href={href}>
          <div
            data-testid={testid}
            className={`group flex items-center gap-3 rounded-xl border bg-gradient-to-br ${accent} px-4 py-3 active:scale-[0.99] transition-transform`}
          >
            <ShortcutPathIcon variant={iconVariant} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-foreground leading-tight">{label}</p>
              <p className="text-[12px] text-muted-foreground/75 leading-snug mt-0.5">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/70 shrink-0 transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  );
}

/** When hero doors are visible — one link instead of duplicating Talk it through. */
function scrollToExploreSection() {
  const el = document.getElementById("explore-section");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  return false;
}

export function HomeMorePathsLink() {
  const openExplore = () => {
    try {
      localStorage.setItem(HOME_EXPLORE_OPEN_KEY, "1");
    } catch {
      /* noop */
    }
    window.dispatchEvent(new Event("sp-open-home-explore"));
    requestAnimationFrame(() => {
      if (!scrollToExploreSection()) {
        window.setTimeout(scrollToExploreSection, 120);
        window.setTimeout(scrollToExploreSection, 400);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={openExplore}
      data-testid="link-more-ways-to-walk"
      className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900/35 px-4 py-3 text-[13px] font-semibold text-foreground/85 hover:bg-zinc-900/50 hover:border-white/15 transition-colors"
    >
      See all 16 paths
      <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
    </button>
  );
}
