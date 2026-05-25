/** Mirror of artifacts/api-server/src/journalArchive.ts */
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

export function formatArchiveDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const ARCHIVE_TYPE_LABELS: Record<string, string> = {
  prayer: "Prayer",
  reflection: "Reflection",
  verse: "Scripture",
  note: "Sermon note",
  guidance_memory: "Guidance",
  all: "All",
};
