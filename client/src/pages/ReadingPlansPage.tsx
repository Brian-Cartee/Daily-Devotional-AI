import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { Link } from "wouter";
import { Check, BookOpen, ChevronDown, ArrowRight, Flame, Trophy, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  READING_PLANS, type ReadingPlan,
  getPlanProgress, markDayComplete, markDayIncomplete,
  getActivePlanId, setActivePlanId,
} from "@/lib/readingPlans";

function PlanCard({ plan, active, onSelect }: {
  plan: ReadingPlan;
  active: boolean;
  onSelect: () => void;
}) {
  const progress = getPlanProgress(plan.id);
  const pct = Math.round((progress.size / plan.days) * 100);

  return (
    <button
      data-testid={`card-plan-${plan.id}`}
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border overflow-hidden transition-all active:scale-[0.99] ${
        active
          ? "border-primary/40 bg-primary/5 shadow-md shadow-primary/10"
          : "border-border bg-card hover:border-primary/20"
      }`}
    >
      <div className={`h-[3px] bg-gradient-to-r ${plan.accentFrom} ${plan.accentTo}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-foreground leading-tight">{plan.title}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">{plan.subtitle}</p>
          </div>
          {active && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-primary rounded-full px-2 py-0.5 shrink-0">
              Active
            </span>
          )}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[12px] text-muted-foreground mb-1.5">
            <span>{progress.size} / {plan.days} days</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${plan.accentFrom} ${plan.accentTo}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function DayRow({ day, reading, done, onToggle, isCurrent }: {
  day: number;
  reading: { label: string };
  done: boolean;
  onToggle: () => void;
  isCurrent: boolean;
}) {
  return (
    <motion.div
      layout
      data-testid={`row-day-${day}`}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        isCurrent
          ? "bg-primary/8 border border-primary/20"
          : done
          ? "opacity-60"
          : "hover:bg-muted/40"
      }`}
    >
      <button
        data-testid={`btn-toggle-day-${day}`}
        onClick={onToggle}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          done
            ? "bg-green-500 border-green-500"
            : isCurrent
            ? "border-primary/60 hover:border-primary"
            : "border-muted-foreground/30 hover:border-primary/40"
        }`}
      >
        {done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-snug ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {reading.label}
        </p>
        {isCurrent && !done && (
          <p className="text-[11px] text-primary font-semibold mt-0.5">Today's reading</p>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground/60 shrink-0">Day {day}</span>
    </motion.div>
  );
}

export default function ReadingPlansPage() {
  const [activePlanId, setActivePlanIdState] = useState<string | null>(() => getActivePlanId());
  const [selectedPlanId, setSelectedPlanIdState] = useState<string | null>(
    () => getActivePlanId() || READING_PLANS[0].id
  );
  const [progress, setProgress] = useState<Record<string, Set<number>>>(() => {
    const result: Record<string, Set<number>> = {};
    for (const p of READING_PLANS) result[p.id] = getPlanProgress(p.id);
    return result;
  });
  const [showAll, setShowAll] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);

  const selectedPlan = READING_PLANS.find(p => p.id === selectedPlanId) ?? READING_PLANS[0];
  const planProgress = progress[selectedPlan.id] ?? new Set<number>();
  const completedCount = planProgress.size;
  const currentDay = completedCount + 1;
  const pct = Math.round((completedCount / selectedPlan.days) * 100);

  const VISIBLE_DAYS = showAll ? selectedPlan.days : Math.min(currentDay + 6, selectedPlan.days);

  const handleActivate = (planId: string) => {
    setActivePlanId(planId);
    setActivePlanIdState(planId);
  };

  const handleToggle = (planId: string, day: number) => {
    const current = progress[planId] ?? new Set<number>();
    const updated = current.has(day)
      ? markDayIncomplete(planId, day)
      : markDayComplete(planId, day);
    setProgress(prev => ({ ...prev, [planId]: updated }));
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
  });

  const isComplete = completedCount >= selectedPlan.days;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-lg mx-auto px-4 pt-20 pb-28">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Calendar className="w-4.5 h-4.5 text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-foreground">Reading Plans</h1>
          </div>
          <p className="text-[14px] text-muted-foreground leading-relaxed mt-2 pl-12">
            Read through Scripture one day at a time. Track your progress and build the discipline that transforms your faith.
          </p>
        </motion.div>

        {/* Plan cards */}
        <motion.div {...fadeUp(0.05)} className="space-y-3 mb-6">
          {READING_PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              active={activePlanId === plan.id}
              onSelect={() => setSelectedPlanIdState(plan.id)}
            />
          ))}
        </motion.div>

        {/* Selected plan detail */}
        <motion.div {...fadeUp(0.1)}>
          {/* Plan header + activate */}
          <div className={`rounded-2xl border overflow-hidden mb-4`} style={{ borderColor: "hsl(var(--border))" }}>
            <div className={`h-[3px] bg-gradient-to-r ${selectedPlan.accentFrom} ${selectedPlan.accentTo}`} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-[17px] font-bold text-foreground">{selectedPlan.title}</h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{selectedPlan.subtitle}</p>
                </div>
                {activePlanId !== selectedPlan.id && (
                  <Button
                    data-testid="btn-activate-plan"
                    size="sm"
                    onClick={() => handleActivate(selectedPlan.id)}
                    className={`shrink-0 rounded-xl text-[12px] font-bold bg-gradient-to-r ${selectedPlan.accentFrom} ${selectedPlan.accentTo} border-0 text-white hover:opacity-90`}
                  >
                    Start this plan
                  </Button>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[20px] font-bold text-foreground">{completedCount}</p>
                  <p className="text-[11px] text-muted-foreground">Days done</p>
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-bold text-foreground">{selectedPlan.days - completedCount}</p>
                  <p className="text-[11px] text-muted-foreground">Days left</p>
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-bold text-foreground">{pct}%</p>
                  <p className="text-[11px] text-muted-foreground">Complete</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${selectedPlan.accentFrom} ${selectedPlan.accentTo}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Completion celebration */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-amber-200/60 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/40 p-5 mb-4 text-center"
              >
                <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="text-[16px] font-bold text-foreground">You finished it.</p>
                <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                  That is no small thing. You walked through God's Word from beginning to end — and the Holy Spirit met you in every page.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Daily reading list */}
          {!isComplete && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                <p className="text-[13px] font-bold text-foreground">Daily Readings</p>
                <p className="text-[12px] text-muted-foreground">Tap a circle to mark complete</p>
              </div>

              <div className="p-2 space-y-0.5">
                {selectedPlan.schedule.slice(0, VISIBLE_DAYS).map(d => {
                  const done = planProgress.has(d.day);
                  const isCurrent = d.day === currentDay;
                  return (
                    <div key={d.day} ref={isCurrent ? todayRef : undefined}>
                      <DayRow
                        day={d.day}
                        reading={d}
                        done={done}
                        onToggle={() => handleToggle(selectedPlan.id, d.day)}
                        isCurrent={isCurrent && !done}
                      />
                    </div>
                  );
                })}
              </div>

              {VISIBLE_DAYS < selectedPlan.days && (
                <button
                  data-testid="btn-show-more-days"
                  onClick={() => setShowAll(true)}
                  className="w-full px-4 py-3 border-t border-border/60 flex items-center justify-center gap-2 text-[13px] font-semibold text-primary hover:bg-primary/5 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  Show all {selectedPlan.days - VISIBLE_DAYS} remaining days
                </button>
              )}
            </div>
          )}

          {/* Link to Bible reader */}
          {!isComplete && (
            <Link href="/read">
              <div
                data-testid="btn-open-bible-reader"
                className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-primary/8 transition-colors active:scale-[0.99]"
              >
                <BookOpen className="w-4 h-4 text-primary shrink-0" />
                <p className="text-[13px] font-semibold text-foreground flex-1">Open the Bible to read today's passage</p>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
              </div>
            </Link>
          )}
        </motion.div>

      </div>
    </div>
  );
}
