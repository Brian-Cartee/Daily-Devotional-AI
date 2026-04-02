// Bible reading plan data generator

export interface DayReading {
  day: number;
  readings: { book: string; chapter: number }[];
  label: string;
}

export interface ReadingPlan {
  id: string;
  title: string;
  subtitle: string;
  days: number;
  color: string;
  accentFrom: string;
  accentTo: string;
  schedule: DayReading[];
}

const OT_BOOKS: [string, number][] = [
  ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36],
  ["Deuteronomy", 34], ["Joshua", 24], ["Judges", 21], ["Ruth", 4],
  ["1 Samuel", 31], ["2 Samuel", 24], ["1 Kings", 22], ["2 Kings", 25],
  ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10], ["Nehemiah", 13],
  ["Esther", 10], ["Job", 42], ["Psalms", 150], ["Proverbs", 31],
  ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52],
  ["Lamentations", 5], ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14],
  ["Joel", 3], ["Amos", 9], ["Obadiah", 1], ["Jonah", 4], ["Micah", 7],
  ["Nahum", 3], ["Habakkuk", 3], ["Zephaniah", 3], ["Haggai", 2],
  ["Zechariah", 14], ["Malachi", 4],
];

const NT_BOOKS: [string, number][] = [
  ["Matthew", 28], ["Mark", 16], ["Luke", 24], ["John", 21], ["Acts", 28],
  ["Romans", 16], ["1 Corinthians", 16], ["2 Corinthians", 13], ["Galatians", 6],
  ["Ephesians", 6], ["Philippians", 4], ["Colossians", 4], ["1 Thessalonians", 5],
  ["2 Thessalonians", 3], ["1 Timothy", 6], ["2 Timothy", 4], ["Titus", 3],
  ["Philemon", 1], ["Hebrews", 13], ["James", 5], ["1 Peter", 5], ["2 Peter", 3],
  ["1 John", 5], ["2 John", 1], ["3 John", 1], ["Jude", 1], ["Revelation", 22],
];

function expandBooks(books: [string, number][]): { book: string; chapter: number }[] {
  const result: { book: string; chapter: number }[] = [];
  for (const [book, chapters] of books) {
    for (let ch = 1; ch <= chapters; ch++) {
      result.push({ book, chapter: ch });
    }
  }
  return result;
}

function splitIntoDays(
  chapters: { book: string; chapter: number }[],
  totalDays: number
): DayReading[] {
  const total = chapters.length;
  const days: DayReading[] = [];
  let idx = 0;

  for (let day = 1; day <= totalDays; day++) {
    // Distribute chapters as evenly as possible
    const remaining = total - idx;
    const daysLeft = totalDays - day + 1;
    const count = Math.ceil(remaining / daysLeft);
    const dayChapters = chapters.slice(idx, idx + count);
    idx += count;

    // Build readable label like "Genesis 1–3" or "Genesis 50, Exodus 1"
    const label = buildLabel(dayChapters);
    days.push({ day, readings: dayChapters, label });
  }

  return days;
}

function buildLabel(readings: { book: string; chapter: number }[]): string {
  if (readings.length === 0) return "";
  if (readings.length === 1) return `${readings[0].book} ${readings[0].chapter}`;

  // Group by book
  const groups: { book: string; chapters: number[] }[] = [];
  for (const r of readings) {
    const last = groups[groups.length - 1];
    if (last && last.book === r.book) {
      last.chapters.push(r.chapter);
    } else {
      groups.push({ book: r.book, chapters: [r.chapter] });
    }
  }

  return groups.map(g => {
    if (g.chapters.length === 1) return `${g.book} ${g.chapters[0]}`;
    const first = g.chapters[0];
    const last = g.chapters[g.chapters.length - 1];
    return `${g.book} ${first}–${last}`;
  }).join(", ");
}

const NT_CHAPTERS = expandBooks(NT_BOOKS);
const ALL_CHAPTERS = expandBooks([...OT_BOOKS, ...NT_BOOKS]);

export const READING_PLANS: ReadingPlan[] = [
  {
    id: "bible-in-a-year",
    title: "Bible in a Year",
    subtitle: "Every book. Every story. One year.",
    days: 365,
    color: "text-amber-600 dark:text-amber-400",
    accentFrom: "from-amber-500",
    accentTo: "to-orange-500",
    schedule: splitIntoDays(ALL_CHAPTERS, 365),
  },
  {
    id: "nt-90-days",
    title: "New Testament in 90 Days",
    subtitle: "The life and words of Jesus — in three months.",
    days: 90,
    color: "text-blue-600 dark:text-blue-400",
    accentFrom: "from-blue-500",
    accentTo: "to-violet-500",
    schedule: splitIntoDays(NT_CHAPTERS, 90),
  },
];

export function getPlanProgress(planId: string): Set<number> {
  try {
    const raw = localStorage.getItem(`sp_rp_${planId}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

export function markDayComplete(planId: string, day: number): Set<number> {
  const progress = getPlanProgress(planId);
  progress.add(day);
  localStorage.setItem(`sp_rp_${planId}`, JSON.stringify(Array.from(progress)));
  return progress;
}

export function markDayIncomplete(planId: string, day: number): Set<number> {
  const progress = getPlanProgress(planId);
  progress.delete(day);
  localStorage.setItem(`sp_rp_${planId}`, JSON.stringify(Array.from(progress)));
  return progress;
}

export function getActivePlanId(): string | null {
  return localStorage.getItem("sp_active_plan");
}

export function setActivePlanId(id: string | null): void {
  if (id) localStorage.setItem("sp_active_plan", id);
  else localStorage.removeItem("sp_active_plan");
}
