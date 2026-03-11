import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, Check, Flame } from "lucide-react";
import { Link } from "wouter";
import { getSessionId } from "@/lib/session";
import { getUserName } from "@/lib/userName";

const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getCurrentWeekDates(): string[] {
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

function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

export function StreakWidget() {
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

  const greeting = getTimeGreeting();
  const firstName = userName?.split(" ")[0] ?? null;

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
      <div className="px-5 pt-4 pb-4">
        {/* Greeting row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p
              className="text-[15px] font-semibold text-foreground leading-tight"
              data-testid="streak-greeting"
            >
              {greeting}{firstName ? `, ${firstName}` : ""}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {streak > 0
                ? `You've shown up ${streak} day${streak === 1 ? "" : "s"} in a row.`
                : "Start your walk today — day one counts."}
            </p>
          </div>

          {/* Streak badge */}
          {streak > 0 && (
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-bold"
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
        <div className="flex items-center justify-between mb-3.5 px-0.5">
          {WEEK_LABELS.map((label, i) => {
            const date = weekDates[i];
            const visited = visitSet.has(date);
            const isToday = i === todayIdx;
            const isFuture = i > todayIdx;

            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? "text-primary" : "text-muted-foreground/50"}`}
                >
                  {label}
                </span>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                    visited
                      ? "bg-primary shadow-sm"
                      : isToday
                      ? "border-2 border-primary/60 bg-primary/5"
                      : isFuture
                      ? "border border-muted-foreground/15 bg-muted/30"
                      : "border border-muted-foreground/20 bg-muted/20"
                  }`}
                  data-testid={`week-day-${i}`}
                >
                  {visited ? (
                    <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                  ) : isToday ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
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
            {visitSet.has(weekDates[todayIdx])
              ? "Continue today's devotional →"
              : "Open today's devotional →"}
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
