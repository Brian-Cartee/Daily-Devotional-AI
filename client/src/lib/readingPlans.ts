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

export type WhereAreYou = "exploring" | "returning" | "growing" | "struggling";
export type DailyPace = "few" | "medium" | "full";

export interface PersonalPath {
  planId: string;
  name: string;
  reason: string;
  verse: string;
  verseRef: string;
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
    const remaining = total - idx;
    const daysLeft = totalDays - day + 1;
    const count = Math.ceil(remaining / daysLeft);
    const dayChapters = chapters.slice(idx, idx + count);
    idx += count;
    const label = buildLabel(dayChapters);
    days.push({ day, readings: dayChapters, label });
  }
  return days;
}

function buildLabel(readings: { book: string; chapter: number }[]): string {
  if (readings.length === 0) return "";
  if (readings.length === 1) return `${readings[0].book} ${readings[0].chapter}`;
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

const JOHN_CHAPTERS = Array.from({ length: 21 }, (_, i) => ({ book: "John", chapter: i + 1 }));

const PSALMS_40_CHAPTERS = [
  1, 3, 4, 6, 8, 13, 16, 18, 19, 22, 23, 24, 27, 30, 31, 32,
  34, 36, 37, 39, 40, 42, 43, 46, 51, 55, 62, 63, 73, 84, 86,
  88, 90, 91, 103, 116, 121, 130, 139, 145,
].map(ch => ({ book: "Psalms", chapter: ch }));

export const READING_PLANS: ReadingPlan[] = [
  {
    id: "john-21",
    title: "The Life of Jesus in 21 Days",
    subtitle: "One chapter of John each day. The most personal Gospel.",
    days: 21,
    color: "text-sky-600 dark:text-sky-400",
    accentFrom: "from-sky-400",
    accentTo: "to-violet-500",
    schedule: splitIntoDays(JOHN_CHAPTERS, 21),
  },
  {
    id: "psalms-40",
    title: "Psalms of the Soul",
    subtitle: "40 days. 40 prayers. Written from the same dark places.",
    days: 40,
    color: "text-violet-600 dark:text-violet-400",
    accentFrom: "from-violet-500",
    accentTo: "to-indigo-500",
    schedule: splitIntoDays(PSALMS_40_CHAPTERS, 40),
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
  {
    id: "bible-in-a-year",
    title: "The Whole Word — A Year Through Scripture",
    subtitle: "Every book. Every story. Creation to revelation.",
    days: 365,
    color: "text-amber-600 dark:text-amber-400",
    accentFrom: "from-amber-500",
    accentTo: "to-orange-500",
    schedule: splitIntoDays(ALL_CHAPTERS, 365),
  },
];

export function getPersonalPath(where: WhereAreYou, pace: DailyPace): PersonalPath {
  if (where === "struggling") {
    return {
      planId: "psalms-40",
      name: "Psalms of the Soul",
      reason: "When words fail, the Psalms speak. These 40 prayers were written from the same dark places — raw, honest, and held by God. Start here.",
      verse: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.",
      verseRef: "Psalm 34:18",
    };
  }
  if (where === "exploring") {
    if (pace === "full") {
      return {
        planId: "nt-90-days",
        name: "Starting With Jesus",
        reason: "Every path through Scripture begins somewhere. This one starts with Jesus — his life, his words, the letters written in his name. 90 days, start to finish.",
        verse: "In the beginning was the Word, and the Word was with God, and the Word was God.",
        verseRef: "John 1:1",
      };
    }
    return {
      planId: "john-21",
      name: "The Life of Jesus — 21 Days",
      reason: "One chapter of John each day. The most personal Gospel — written by the disciple closest to Jesus. This is the right place to begin.",
      verse: "In the beginning was the Word, and the Word was with God, and the Word was God.",
      verseRef: "John 1:1",
    };
  }
  if (where === "returning") {
    return {
      planId: "nt-90-days",
      name: "A Path for Coming Home",
      reason: "Something brought you back. This path through the New Testament starts with the story of Jesus — the one who saw you from a long way off and ran.",
      verse: "But while he was still a long way off, his father saw him and was filled with compassion for him; he ran to his son.",
      verseRef: "Luke 15:20",
    };
  }
  // growing
  if (pace === "few" || pace === "medium") {
    return {
      planId: "nt-90-days",
      name: "The New Testament — Start to Finish",
      reason: "A steady path through every letter, every teaching, every encounter with Jesus. 90 days to walk through the whole story of the early church.",
      verse: "Your word is a lamp for my feet, a light on my path.",
      verseRef: "Psalm 119:105",
    };
  }
  return {
    planId: "bible-in-a-year",
    name: "The Whole Word — A Year Through Scripture",
    reason: "You're ready for the full sweep. From creation to revelation — every story, every Psalm, every letter. One year to walk through all of it.",
    verse: "All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness.",
    verseRef: "2 Timothy 3:16",
  };
}

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

export function getWalkAnswers(): { where: WhereAreYou | null; pace: DailyPace | null } {
  try {
    return {
      where: (localStorage.getItem("sp_walk_where") as WhereAreYou) || null,
      pace: (localStorage.getItem("sp_walk_pace") as DailyPace) || null,
    };
  } catch {
    return { where: null, pace: null };
  }
}

export function saveWalkAnswers(where: WhereAreYou, pace: DailyPace): void {
  localStorage.setItem("sp_walk_where", where);
  localStorage.setItem("sp_walk_pace", pace);
}

export function clearWalkAnswers(): void {
  localStorage.removeItem("sp_walk_where");
  localStorage.removeItem("sp_walk_pace");
}
