import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
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
  {
    href: "/invite",
    iconVariant: "invite",
    label: "Invite & earn Pro",
    desc: "Friends get a trial; you stack bonus Pro days",
    testid: "shortcut-invite",
    accent: "from-amber-500/12 to-orange-500/8 border-amber-500/25",
  },
] as const;

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
