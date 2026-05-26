import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  canDoLamentToday,
  getLamentCurrentDay,
  isLamentSeasonActive,
} from "@/lib/lamentPathway";

export function LamentSeasonHomeCard() {
  if (!isLamentSeasonActive()) return null;

  const day = getLamentCurrentDay();
  const canToday = canDoLamentToday();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-400/25 bg-gradient-to-br from-slate-900/40 via-card to-card overflow-hidden mb-3"
      data-testid="card-lament-season"
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-slate-400/40 to-transparent" />
      <div className="px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-1">
          Lament season · Day {day} of 7
        </p>
        <p className="text-[15px] text-foreground/85 leading-relaxed">
          {canToday
            ? "Today's psalm and question are ready — no rush, no streak."
            : "You've sat with today. Return tomorrow when you're ready."}
        </p>
        <div className="flex flex-wrap gap-3 mt-3">
          <Link
            href="/lament"
            data-testid="link-lament-continue"
            className="text-[13px] font-semibold text-primary hover:underline"
          >
            {canToday ? "Continue today's lament →" : "Open Lament Pathway →"}
          </Link>
          <Link href="/surrender" className="text-[13px] text-muted-foreground hover:text-foreground">
            Surrender Stone →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
