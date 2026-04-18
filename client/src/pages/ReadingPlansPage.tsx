import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { Link, useLocation } from "wouter";
import {
  Check, BookOpen, ChevronDown, ArrowRight, Trophy,
  ArrowLeft, Sprout, RotateCcw, Home, Flame, Anchor, ChevronRight,
} from "lucide-react";
import {
  READING_PLANS, type ReadingPlan, type WhereAreYou, type DailyPace,
  getPlanProgress, markDayComplete, markDayIncomplete,
  getActivePlanId, setActivePlanId,
  getPersonalPath, getWalkAnswers, saveWalkAnswers, clearWalkAnswers,
} from "@/lib/readingPlans";

type Phase = "intake-where" | "intake-pace" | "recommendation" | "plan";

const WHERE_OPTIONS: { id: WhereAreYou; icon: React.ElementType; label: string; sublabel: string }[] = [
  { id: "exploring",  icon: Sprout,     label: "Just beginning to explore",      sublabel: "Curious, but I don't know much yet" },
  { id: "returning",  icon: Home,       label: "Coming back after time away",     sublabel: "I had faith before — I'm finding my way back" },
  { id: "growing",    icon: Flame,      label: "Actively growing",               sublabel: "I want to go deeper — more discipline, more depth" },
  { id: "struggling", icon: Anchor,     label: "Struggling — I need an anchor",  sublabel: "Things are hard and I need something to hold onto" },
];

const PACE_OPTIONS: { id: DailyPace; label: string; sublabel: string; time: string }[] = [
  { id: "few",    label: "Whatever I can manage",  sublabel: "A few minutes — consistency over length",  time: "~5 min" },
  { id: "medium", label: "A steady practice",       sublabel: "About 10 minutes each day",                time: "~10 min" },
  { id: "full",   label: "I'm committed",           sublabel: "20 minutes or more — I want full immersion", time: "20+ min" },
];

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
          ? "opacity-55"
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
  const [, navigate] = useLocation();

  const [phase, setPhase] = useState<Phase>(() => {
    const activePlan = getActivePlanId();
    if (activePlan) {
      const progress = getPlanProgress(activePlan);
      if (progress.size > 0) return "plan";
    }
    const { where, pace } = getWalkAnswers();
    if (where && pace) return "recommendation";
    return "intake-where";
  });

  const [whereAnswer, setWhereAnswer] = useState<WhereAreYou | null>(() => getWalkAnswers().where);
  const [paceAnswer, setPaceAnswer] = useState<DailyPace | null>(() => getWalkAnswers().pace);
  const [activePlanId, setActivePlanIdState] = useState<string | null>(() => getActivePlanId());
  const [progress, setProgress] = useState<Record<string, Set<number>>>(() => {
    const result: Record<string, Set<number>> = {};
    for (const p of READING_PLANS) result[p.id] = getPlanProgress(p.id);
    return result;
  });
  const [showAll, setShowAll] = useState(false);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);

  const personalPath = whereAnswer && paceAnswer ? getPersonalPath(whereAnswer, paceAnswer) : null;
  const activePlan = READING_PLANS.find(p => p.id === activePlanId) ?? READING_PLANS[0];
  const planProgress = progress[activePlan.id] ?? new Set<number>();
  const completedCount = planProgress.size;
  const currentDay = completedCount + 1;
  const pct = Math.round((completedCount / activePlan.days) * 100);
  const VISIBLE_DAYS = showAll ? activePlan.days : Math.min(currentDay + 6, activePlan.days);
  const isComplete = completedCount >= activePlan.days;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [phase]);

  const handleWhereSelect = (answer: WhereAreYou) => {
    setWhereAnswer(answer);
    setPhase("intake-pace");
  };

  const handlePaceSelect = (answer: DailyPace) => {
    setPaceAnswer(answer);
    if (whereAnswer) saveWalkAnswers(whereAnswer, answer);
    setPhase("recommendation");
  };

  const handleBeginPath = () => {
    if (!personalPath) return;
    setActivePlanId(personalPath.planId);
    setActivePlanIdState(personalPath.planId);
    setPhase("plan");
  };

  const handleToggle = (planId: string, day: number) => {
    const current = progress[planId] ?? new Set<number>();
    const updated = current.has(day)
      ? markDayIncomplete(planId, day)
      : markDayComplete(planId, day);
    setProgress(prev => ({ ...prev, [planId]: updated }));
  };

  const handleReset = () => {
    clearWalkAnswers();
    setWhereAnswer(null);
    setPaceAnswer(null);
    setPhase("intake-where");
  };

  const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-lg mx-auto px-4 pt-20 pb-28">

        {/* Back */}
        <button
          data-testid="button-back-reading-plans"
          onClick={() => { sessionStorage.setItem("scrollToExplore", "1"); navigate("/"); }}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <AnimatePresence mode="wait">

          {/* ── PHASE 1a: Where are you? ── */}
          {phase === "intake-where" && (
            <motion.div key="intake-where" {...fadeUp}>
              <div className="mb-8 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/60 mb-3">Your Walk</p>
                <h1 className="text-[28px] font-bold text-foreground leading-tight mb-3">
                  Where are you right now?
                </h1>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  Be honest. There's no wrong answer — your path is built around where you actually are.
                </p>
              </div>

              <div className="space-y-2.5">
                {WHERE_OPTIONS.map(({ id, icon: Icon, label, sublabel }) => (
                  <motion.button
                    key={id}
                    data-testid={`btn-where-${id}`}
                    onClick={() => handleWhereSelect(id)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-left flex items-center gap-4 px-5 py-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-primary/4 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/8 group-hover:bg-primary/14 flex items-center justify-center shrink-0 transition-colors">
                      <Icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground leading-snug">{label}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{sublabel}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/50 transition-colors shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── PHASE 1b: Daily pace ── */}
          {phase === "intake-pace" && (
            <motion.div key="intake-pace" {...fadeUp}>
              <button
                onClick={() => setPhase("intake-where")}
                className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-7"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <div className="mb-8 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/60 mb-3">Your Walk</p>
                <h1 className="text-[28px] font-bold text-foreground leading-tight mb-3">
                  How much can you give each day?
                </h1>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  Be realistic, not aspirational. The path that fits your life is the one you'll actually walk.
                </p>
              </div>

              <div className="space-y-2.5">
                {PACE_OPTIONS.map(({ id, label, sublabel, time }) => (
                  <motion.button
                    key={id}
                    data-testid={`btn-pace-${id}`}
                    onClick={() => handlePaceSelect(id)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-left flex items-center gap-4 px-5 py-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-primary/4 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground leading-snug">{label}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{sublabel}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-primary/60 bg-primary/8 px-2 py-0.5 rounded-full">{time}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/50 transition-colors" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── PHASE 2: Personalized recommendation ── */}
          {phase === "recommendation" && personalPath && (() => {
            const recPlan = READING_PLANS.find(p => p.id === personalPath.planId)!;
            return (
              <motion.div key="recommendation" {...fadeUp}>
                <div className="mb-6 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/60 mb-1">Your Walk</p>
                  <p className="text-[14px] text-muted-foreground">Here's the path made for where you are.</p>
                </div>

                {/* Path card */}
                <div
                  className="rounded-3xl overflow-hidden mb-5"
                  style={{
                    background: "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(258 35% 10% / 0.7) 100%)",
                    border: "1px solid hsl(258 45% 55% / 0.2)",
                    boxShadow: "0 8px 32px rgba(122,1,141,0.10)",
                  }}
                >
                  <div className={`h-[3px] bg-gradient-to-r ${recPlan.accentFrom} ${recPlan.accentTo}`} />
                  <div className="px-6 pt-7 pb-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/55 mb-3">
                      Your path — {recPlan.days} days
                    </p>
                    <h2 className="text-[22px] font-bold text-foreground leading-tight mb-4">
                      {personalPath.name}
                    </h2>
                    <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
                      {personalPath.reason}
                    </p>

                    {/* Verse */}
                    <div
                      className="rounded-xl px-4 py-4 mb-6"
                      style={{ background: "hsl(258 45% 55% / 0.08)", border: "1px solid hsl(258 45% 55% / 0.15)" }}
                    >
                      <p className="text-[14px] text-foreground/85 leading-relaxed mb-1.5">
                        "{personalPath.verse}"
                      </p>
                      <p className="text-[11px] text-primary/60 font-semibold tracking-wide">
                        — {personalPath.verseRef}
                      </p>
                    </div>

                    {/* Schedule preview */}
                    <div className="flex items-center gap-3 text-[12px] text-muted-foreground mb-6">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>{recPlan.subtitle}</span>
                    </div>

                    <motion.button
                      data-testid="btn-begin-path"
                      onClick={handleBeginPath}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full py-4 rounded-2xl text-white font-bold text-[15px] bg-gradient-to-r ${recPlan.accentFrom} ${recPlan.accentTo} shadow-md transition-opacity hover:opacity-90`}
                    >
                      Begin this path
                    </motion.button>
                  </div>
                </div>

                {/* Other paths */}
                <button
                  onClick={() => setShowAllPlans(v => !v)}
                  className="w-full text-center text-[13px] text-muted-foreground hover:text-foreground transition-colors py-2"
                  data-testid="btn-toggle-other-plans"
                >
                  {showAllPlans ? "Hide other paths" : "Explore other paths"}
                </button>

                <AnimatePresence>
                  {showAllPlans && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden mt-3 space-y-2.5"
                    >
                      {READING_PLANS.filter(p => p.id !== personalPath.planId).map(plan => {
                        const pp = getPlanProgress(plan.id);
                        const ppct = Math.round((pp.size / plan.days) * 100);
                        return (
                          <button
                            key={plan.id}
                            data-testid={`btn-other-plan-${plan.id}`}
                            onClick={() => {
                              setActivePlanId(plan.id);
                              setActivePlanIdState(plan.id);
                              setPhase("plan");
                            }}
                            className="w-full text-left rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary/20 hover:bg-primary/3 transition-all"
                          >
                            <div className={`h-[2px] w-10 rounded-full bg-gradient-to-r ${plan.accentFrom} ${plan.accentTo} mb-3`} />
                            <p className="text-[14px] font-semibold text-foreground leading-snug">{plan.title}</p>
                            <p className="text-[12px] text-muted-foreground mt-0.5 mb-2">{plan.subtitle}</p>
                            {pp.size > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full bg-gradient-to-r ${plan.accentFrom} ${plan.accentTo}`}
                                    style={{ width: `${ppct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-muted-foreground">{ppct}%</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition-colors py-3 mt-2"
                  data-testid="btn-reset-walk"
                >
                  <RotateCcw className="w-3 h-3" />
                  Start over
                </button>
              </motion.div>
            );
          })()}

          {/* ── PHASE 3: Active plan view ── */}
          {phase === "plan" && (
            <motion.div key="plan" {...fadeUp}>
              {/* Plan identity header */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/55 mb-0.5">Your Walk</p>
                    <h1 className="text-[20px] font-bold text-foreground leading-tight">
                      {personalPath?.planId === activePlanId ? personalPath.name : activePlan.title}
                    </h1>
                  </div>
                  <button
                    onClick={handleReset}
                    data-testid="btn-change-path"
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Change
                  </button>
                </div>
                <p className="text-[13px] text-muted-foreground">{activePlan.subtitle}</p>
              </div>

              {/* Progress card */}
              <div
                className="rounded-2xl overflow-hidden mb-4"
                style={{ border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              >
                <div className={`h-[3px] bg-gradient-to-r ${activePlan.accentFrom} ${activePlan.accentTo}`} />
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-[22px] font-bold text-foreground">{completedCount}</p>
                      <p className="text-[11px] text-muted-foreground">Days done</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[22px] font-bold text-foreground">{activePlan.days - completedCount}</p>
                      <p className="text-[11px] text-muted-foreground">Days left</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[22px] font-bold text-foreground">{pct}%</p>
                      <p className="text-[11px] text-muted-foreground">Complete</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${activePlan.accentFrom} ${activePlan.accentTo}`}
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
                      That's no small thing. You walked through God's Word — and the Spirit met you on every step of it.
                    </p>
                    <button
                      onClick={handleReset}
                      className="mt-4 text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Begin a new path →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Daily reading list */}
              {!isComplete && (
                <>
                  <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
                    <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
                      <p className="text-[13px] font-bold text-foreground">Daily Readings</p>
                      <p className="text-[12px] text-muted-foreground">Tap circle to mark done</p>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {activePlan.schedule.slice(0, VISIBLE_DAYS).map(d => {
                        const done = planProgress.has(d.day);
                        const isCurrent = d.day === currentDay;
                        return (
                          <div key={d.day} ref={isCurrent ? todayRef : undefined}>
                            <DayRow
                              day={d.day}
                              reading={d}
                              done={done}
                              onToggle={() => handleToggle(activePlan.id, d.day)}
                              isCurrent={isCurrent && !done}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {VISIBLE_DAYS < activePlan.days && (
                      <button
                        data-testid="btn-show-more-days"
                        onClick={() => setShowAll(true)}
                        className="w-full px-4 py-3 border-t border-border/60 flex items-center justify-center gap-2 text-[13px] font-semibold text-primary hover:bg-primary/5 transition-colors"
                      >
                        <ChevronDown className="w-4 h-4" />
                        Show all {activePlan.days - VISIBLE_DAYS} remaining days
                      </button>
                    )}
                  </div>

                  <Link href="/read">
                    <div
                      data-testid="btn-open-bible-reader"
                      className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-primary/8 transition-colors active:scale-[0.99]"
                    >
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-[13px] font-semibold text-foreground flex-1">Open the Bible to read today's passage</p>
                      <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                    </div>
                  </Link>
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
