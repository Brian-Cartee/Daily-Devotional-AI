import type { JournalEntry } from "@workspace/db";

/** Keep in sync with artifacts/shepherds-path/src/lib/journalArchive.ts */
export const FREE_ARCHIVE_VISIBLE_DAYS = 14;

export type DevotionalDay = {
  date: string;
  reference?: string | null;
  entryCount: number;
  preview?: string;
  locked: boolean;
};

export type ArchiveJournalEntry = {
  id: number;
  sessionId: string;
  type: string;
  title?: string | null;
  content: string;
  reference?: string | null;
  verseDate?: string | null;
  createdAt: string;
  locked: boolean;
};

export type JournalArchiveResponse = {
  isPro: boolean;
  freeVisibleDays: number;
  cutoffDate: string;
  totalCount: number;
  visibleCount: number;
  lockedCount: number;
  entries: ArchiveJournalEntry[];
  devotionalDays: DevotionalDay[];
};

function entryDay(e: JournalEntry): string {
  const raw = e.verseDate || e.createdAt;
  if (typeof raw === "string") return raw.slice(0, 10);
  return new Date(raw).toISOString().slice(0, 10);
}

function cutoffIso(days = FREE_ARCHIVE_VISIBLE_DAYS): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function isLocked(day: string, isPro: boolean, cutoff: string): boolean {
  return !isPro && day < cutoff;
}

function matchesQuery(e: JournalEntry, q: string): boolean {
  const needle = q.toLowerCase().trim();
  if (!needle) return true;
  const hay = [e.title, e.content, e.reference, e.type, e.verseDate]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

const DEVOTIONAL_TYPES = new Set(["prayer", "reflection", "verse"]);

export function buildJournalArchive(
  entries: JournalEntry[],
  opts: { isPro?: boolean; q?: string; type?: string; day?: string },
): JournalArchiveResponse {
  const isPro = opts.isPro === true;
  const cutoff = cutoffIso();
  const q = opts.q?.trim() ?? "";
  const typeFilter = opts.type?.trim();
  const dayFilter = opts.day?.trim();

  const archiveTypes = new Set([
    "prayer",
    "reflection",
    "verse",
    "note",
    "guidance_memory",
  ]);

  let pool = entries.filter((e) => archiveTypes.has(e.type));

  if (typeFilter && typeFilter !== "all") {
    pool = pool.filter((e) => e.type === typeFilter);
  }

  if (dayFilter) {
    pool = pool.filter((e) => entryDay(e) === dayFilter);
  }

  if (q) {
    pool = pool.filter((e) => matchesQuery(e, q));
  }

  const mapped: ArchiveJournalEntry[] = pool.map((e) => {
    const day = entryDay(e);
    const locked = isLocked(day, isPro, cutoff);
    return {
      id: e.id,
      sessionId: e.sessionId,
      type: e.type,
      title: e.title,
      content: locked ? "" : e.content,
      reference: e.reference,
      verseDate: e.verseDate,
      createdAt:
        typeof e.createdAt === "string"
          ? e.createdAt
          : new Date(e.createdAt).toISOString(),
      locked,
    };
  });

  const visibleCount = mapped.filter((e) => !e.locked).length;
  const lockedCount = mapped.filter((e) => e.locked).length;

  const devotionalMap = new Map<string, DevotionalDay>();
  for (const e of entries) {
    if (!DEVOTIONAL_TYPES.has(e.type)) continue;
    const date = entryDay(e);
    const existing = devotionalMap.get(date);
    const preview =
      !existing?.preview && e.content
        ? e.content.replace(/\s+/g, " ").slice(0, 72)
        : existing?.preview;
    devotionalMap.set(date, {
      date,
      reference: e.reference ?? existing?.reference ?? null,
      entryCount: (existing?.entryCount ?? 0) + 1,
      preview: preview ?? existing?.preview,
      locked: isLocked(date, isPro, cutoff),
    });
  }

  const devotionalDays = [...devotionalMap.values()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return {
    isPro,
    freeVisibleDays: FREE_ARCHIVE_VISIBLE_DAYS,
    cutoffDate: cutoff,
    totalCount: entries.filter((e) => archiveTypes.has(e.type)).length,
    visibleCount,
    lockedCount,
    entries: mapped,
    devotionalDays,
  };
}
