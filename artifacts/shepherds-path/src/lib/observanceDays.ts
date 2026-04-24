// ── Christian high-observance day detection ──────────────────────────────────
// Returns the name of the observance for today, if any, for subtle UI display.
// Uses "For many" framing — does not assume observance.

function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function shiftDate(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export interface ObservanceDay {
  name: string;
}

export function getTodayObservance(date?: Date): ObservanceDay | null {
  const today = date ?? new Date();
  const year = today.getFullYear();
  const m = today.getMonth() + 1;
  const day = today.getDate();
  const easter = getEasterDate(year);

  if (sameDay(today, easter))               return { name: "Easter Sunday" };
  if (sameDay(today, shiftDate(easter, -2))) return { name: "Good Friday" };
  if (sameDay(today, shiftDate(easter, -1))) return { name: "Holy Saturday" };
  if (sameDay(today, shiftDate(easter, -7))) return { name: "Palm Sunday" };
  if (sameDay(today, shiftDate(easter, -46))) return { name: "Ash Wednesday" };
  if (sameDay(today, shiftDate(easter, 49))) return { name: "Pentecost" };
  if (m === 12 && day === 25) return { name: "Christmas Day" };
  if (m === 12 && day === 24) return { name: "Christmas Eve" };

  // Advent: Sunday nearest Nov 30 through Dec 23
  const christmas = new Date(year, 11, 25);
  const adventStart = shiftDate(christmas, -(christmas.getDay() === 0 ? 28 : (christmas.getDay() + 21)));
  const adventEnd = new Date(year, 11, 23);
  if (today >= adventStart && today <= adventEnd) return { name: "Advent" };

  return null;
}
