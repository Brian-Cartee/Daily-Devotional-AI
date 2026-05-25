/** Parse visit_dates column — supports legacy string[] or { dates, freezeMonth }. */
export function parseVisitPayload(raw: string | null | undefined): {
  dates: string[];
  freezeMonth: string | null;
} {
  if (!raw) return { dates: [], freezeMonth: null };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { dates: parsed, freezeMonth: null };
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.dates)) {
      return {
        dates: parsed.dates as string[],
        freezeMonth: typeof parsed.freezeMonth === "string" ? parsed.freezeMonth : null,
      };
    }
  } catch {
    /* noop */
  }
  return { dates: [], freezeMonth: null };
}

export function serializeVisitPayload(dates: string[], freezeMonth: string | null): string {
  const trimmed = dates.slice(-14);
  if (freezeMonth) return JSON.stringify({ dates: trimmed, freezeMonth });
  return JSON.stringify(trimmed);
}

export function daysSinceLastVisit(lastVisitDate: string, today: string): number {
  const a = new Date(`${lastVisitDate}T12:00:00`).getTime();
  const b = new Date(`${today}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export function currentMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function freezeAvailable(isPro: boolean, freezeMonth: string | null, today: string): boolean {
  if (!isPro) return false;
  return freezeMonth !== currentMonthKey(today);
}

export function computeStreakAfterGap(opts: {
  lastVisitDate: string;
  currentStreak: number;
  freezeMonth: string | null;
  isPro: boolean;
  today: string;
}): { newStreak: number; freezeApplied: boolean; newFreezeMonth: string | null } {
  const gap = daysSinceLastVisit(opts.lastVisitDate, opts.today);
  const month = currentMonthKey(opts.today);

  if (gap <= 0) {
    return { newStreak: opts.currentStreak, freezeApplied: false, newFreezeMonth: opts.freezeMonth };
  }
  if (gap === 1) {
    return {
      newStreak: opts.currentStreak + 1,
      freezeApplied: false,
      newFreezeMonth: opts.freezeMonth,
    };
  }
  if (gap === 2 && freezeAvailable(opts.isPro, opts.freezeMonth, opts.today)) {
    return {
      newStreak: opts.currentStreak + 1,
      freezeApplied: true,
      newFreezeMonth: month,
    };
  }
  return { newStreak: 1, freezeApplied: false, newFreezeMonth: opts.freezeMonth };
}
