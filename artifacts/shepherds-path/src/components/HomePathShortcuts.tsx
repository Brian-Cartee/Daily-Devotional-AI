import { Link } from "wouter";
import { MessageCircle, BookMarked, Compass, Gift, ArrowRight } from "lucide-react";

const SHORTCUTS = [
  {
    href: "/guidance",
    Icon: MessageCircle,
    label: "Talk it through",
    desc: "Scripture and prayer shaped for what's on your heart",
    testid: "shortcut-guidance",
    accent: "from-violet-500/12 to-primary/8 border-primary/20",
    iconColor: "text-primary",
  },
  {
    href: "/journal",
    Icon: BookMarked,
    label: "Journal",
    desc: "Hold prayers and reflections you don't want to lose",
    testid: "shortcut-journal",
    accent: "from-teal-500/10 to-emerald-500/6 border-teal-500/20",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  {
    href: "/understand#pathways",
    Icon: Compass,
    label: "Guided Pathways",
    desc: "7-day walks for grief, anxiety, and hard seasons",
    testid: "shortcut-journeys",
    accent: "from-indigo-500/10 to-violet-500/6 border-indigo-500/20",
    iconColor: "text-indigo-500",
  },
  {
    href: "/invite",
    Icon: Gift,
    label: "Invite & earn Pro",
    desc: "Friends get a trial; you stack bonus Pro days",
    testid: "shortcut-invite",
    accent: "from-amber-500/12 to-orange-500/8 border-amber-500/25",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
] as const;

export function HomePathShortcuts() {
  return (
    <div className="flex flex-col gap-2" data-testid="home-path-shortcuts">
      {SHORTCUTS.map(({ href, Icon, label, desc, testid, accent, iconColor }) => (
        <Link key={href} href={href}>
          <div
            data-testid={testid}
            className={`group flex items-center gap-3 rounded-xl border bg-gradient-to-br ${accent} px-4 py-3 active:scale-[0.99] transition-transform`}
          >
            <div className="w-9 h-9 rounded-lg bg-card/80 flex items-center justify-center shrink-0 shadow-sm">
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
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
