import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, Check, Flame, UserRound } from "lucide-react";
import { Link } from "wouter";
import { getSessionId } from "@/lib/session";
import { getUserName } from "@/lib/userName";

export const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function getCurrentWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day === 0 ? 7 : day) - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

export function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

interface StreakWidgetProps {
  onAddName?: () => void;
  variant?: "card" | "hero";
}

export function StreakWidget({ onAddName, variant = "card" }: StreakWidgetProps) {
  const sessionId = getSessionId();
  const userName = getUserName();

  const { data } = useQuery<{ currentStreak: number; longestStreak: number; visitDates: string[] }>({
    queryKey: ["/api/streak", sessionId],
    queryFn: () => fetch(`/api/streak?sessionId=${sessionId}`).then(r => r.json()),
    staleTime: 60_000,
  });

  const weekDates = getCurrentWeekDates();
  const todayIdx = getTodayIndex();
  const visitSet = new Set(data?.visitDates ?? []);
  const streak = data?.currentStreak ?? 0;
  const visitedToday = visitSet.has(weekDates[todayIdx]);

  const greeting = getTimeGreeting();
  const firstName = userName?.split(" ")[0] ?? null;

  function getSubtitle() {
    if (streak >= 7) return `${streak} days strong — keep going.`;
    if (streak > 1) return `${streak} days in a row. Don't break the momentum.`;
    if (streak === 1 && visitedToday) return "Day one — well done for showing up.";
    return "Your walk starts with one step.";
  }

  if (variant === "hero") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col items-center gap-1.5 bg-black/30 backdrop-blur-sm border border-white/15 rounded-2xl px-2.5 py-3"
        data-testid="streak-widget-hero"
      >
        {/* Streak badge */}
        {streak > 0 ? (
          <div className="flex items-center gap-1 mb-0.5">
            {streak >= 7
              ? <Flame className="w-3 h-3 text-amber-400" />
              : <Zap className="w-3 h-3 text-white/80" />
            }
            <span className="text-[11px] font-bold text-white/90">{streak}d</span>
          </div>
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 mb-0.5" />
        )}

        {/* Thin divider */}
        <div className="w-full h-px bg-white/10 mb-0.5" />

        {/* Vertical day dots */}
        {WEEK_LABELS.map((label, i) => {
          const date = weekDates[i];
          const visited = visitSet.has(date);
          const isToday = i === todayIdx;
          const isFuture = i > todayIdx;

          return (
            <div key={i} className="flex items-center gap-1.5 w-full justify-between" data-testid={`hero-day-${i}`}>
              <span className={`text-[9px] font-bold uppercase leading-none w-3 text-center ${
                isToday ? "text-white/90" : "text-white/30"
              }`}>
                {label}
              </span>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                visited && isToday
                  ? "bg-primary shadow-sm shadow-primary/50"
                  : visited
                  ? "bg-white/40"
                  : isToday
                  ? "border-2 border-white/60 bg-white/8"
                  : isFuture
                  ? "border border-white/10 bg-white/5"
                  : "border border-white/15 bg-white/5"
              }`}>
                {visited && isToday ? (
                  <Check className="w-2 h-2 text-white" strokeWidth={3} />
                ) : visited ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                ) : isToday ? (
                  <div className="w-1 h-1 rounded-full bg-white/50" />
                ) : null}
              </div>
            </div>
          );
        })}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden mb-3"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary)/0.08) 0%, hsl(var(--primary)/0.04) 100%)",
        border: "1px solid hsl(var(--primary)/0.15)",
      }}
      data-testid="streak-widget"
    >
      <div className="px-4 pt-3 pb-3">

        {/* Greeting row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className="text-[15px] font-semibold text-foreground leading-tight"
                data-testid="streak-greeting"
              >
                {greeting}{firstName ? `, ${firstName}` : ""}
              </p>
              {!firstName && onAddName && (
                <button
                  onClick={onAddName}
                  className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
                  data-testid="btn-add-name"
                >
                  <UserRound className="w-3 h-3" />
                  Add your name
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {getSubtitle()}
            </p>
          </div>

          {/* Streak badge */}
          {streak > 0 && (
            <div
              className="ml-3 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-bold shrink-0"
              style={{
                background: streak >= 7
                  ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                  : "linear-gradient(135deg, hsl(var(--primary)/0.18), hsl(var(--primary)/0.08))",
                color: streak >= 7 ? "#fff" : "hsl(var(--primary))",
                border: streak >= 7 ? "none" : "1px solid hsl(var(--primary)/0.25)",
              }}
              data-testid="streak-badge"
            >
              {streak >= 7
                ? <Flame className="w-3.5 h-3.5" />
                : <Zap className="w-3.5 h-3.5" />}
              {streak} Day{streak === 1 ? "" : "s"}
            </div>
          )}
        </div>

        {/* Weekly tracker */}
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          {WEEK_LABELS.map((label, i) => {
            const date = weekDates[i];
            const visited = visitSet.has(date);
            const isToday = i === todayIdx;
            const isFuture = i > todayIdx;

            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span
                  className={`text-[9px] font-bold uppercase tracking-widest ${isToday ? "text-primary" : "text-muted-foreground/40"}`}
                >
                  {label}
                </span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                    visited && isToday
                      ? "bg-primary shadow-md"
                      : visited
                      ? "border border-primary/25 bg-transparent"
                      : isToday
                      ? "border-2 border-primary/50 bg-primary/5"
                      : isFuture
                      ? "border border-muted-foreground/12 bg-muted/20"
                      : "border border-muted-foreground/20 bg-muted/20"
                  }`}
                  data-testid={`week-day-${i}`}
                >
                  {visited && isToday ? (
                    <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                  ) : visited ? (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  ) : isToday ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Link href="/devotional">
          <button
            className="w-full rounded-xl py-2.5 text-[13px] font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.85))" }}
            data-testid="streak-cta-devotional"
          >
            {visitedToday
              ? "Continue today's devotional →"
              : "Open today's devotional →"}
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
