const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const DEFAULT_PUSH_TIMEZONE = "America/New_York";

export function getLocalTimeInZone(
  date: Date,
  timeZone: string
): { hour: number; minute: number; dayOfWeek: number; dateKey: string } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    let hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
    const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
    return { hour, minute, dayOfWeek: WEEKDAY_MAP[weekday] ?? 0, dateKey };
  } catch {
    if (timeZone !== DEFAULT_PUSH_TIMEZONE) {
      return getLocalTimeInZone(date, DEFAULT_PUSH_TIMEZONE);
    }
    return {
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      dayOfWeek: date.getUTCDay(),
      dateKey: date.toISOString().split("T")[0],
    };
  }
}

export function parseHourFromTime(time: string): number {
  return parseInt(time.split(":")[0] ?? "7", 10);
}

export function matchesLocalTime(
  date: Date,
  timeZone: string,
  targetHour: number,
  targetMinute = 0
): boolean {
  const local = getLocalTimeInZone(date, timeZone);
  return local.hour === targetHour && local.minute === targetMinute;
}

export function resolveTimezone(timezone?: string | null): string {
  const tz = timezone?.trim();
  if (!tz) return DEFAULT_PUSH_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_PUSH_TIMEZONE;
  }
}
