import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, History, Lock, Sparkles, X, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";
import {
  ARCHIVE_TYPE_LABELS,
  formatArchiveDate,
  FREE_ARCHIVE_VISIBLE_DAYS,
  type ArchiveJournalEntry,
  type JournalArchiveResponse,
} from "@/lib/journalArchive";

type Props = {
  onSelectDay: (date: string | null) => void;
  selectedDay: string | null;
  onUpgrade: () => void;
};

function LockedArchiveCard({ entry, onUpgrade }: { entry: ArchiveJournalEntry; onUpgrade: () => void }) {
  const day = entry.verseDate?.slice(0, 10) || entry.createdAt.slice(0, 10);
  return (
    <div
      className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/20 to-background p-4"
      data-testid={`archive-locked-${entry.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300/80">
          {ARCHIVE_TYPE_LABELS[entry.type] ?? entry.type} · {formatArchiveDate(day)}
        </span>
      </div>
      <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
        This entry is part of your sacred archive. Pro unlocks your full walk — every prayer and reflection you&apos;ve saved.
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        className="text-[12px] font-semibold text-primary hover:underline"
        data-testid="btn-archive-upgrade"
      >
        Unlock full archive →
      </button>
    </div>
  );
}

function ArchiveResultCard({
  entry,
  onUpgrade,
}: {
  entry: ArchiveJournalEntry;
  onUpgrade: () => void;
}) {
  if (entry.locked) return <LockedArchiveCard entry={entry} onUpgrade={onUpgrade} />;
  const day = entry.verseDate?.slice(0, 10) || entry.createdAt.slice(0, 10);
  return (
    <div
      className="rounded-2xl border border-border/60 bg-card p-4"
      data-testid={`archive-entry-${entry.id}`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/10">
          {ARCHIVE_TYPE_LABELS[entry.type] ?? entry.type}
        </span>
        {entry.reference && (
          <span className="text-[11px] font-semibold text-muted-foreground">{entry.reference}</span>
        )}
        <span className="text-[11px] text-muted-foreground">{formatArchiveDate(day)}</span>
      </div>
      {entry.title && <p className="text-[14px] font-semibold text-foreground mb-1">{entry.title}</p>}
      <p
        className={`text-[14px] leading-relaxed text-foreground/80 line-clamp-4 ${
          entry.type === "prayer" ? "italic" : ""
        }`}
      >
        {entry.content}
      </p>
    </div>
  );
}

export function JournalArchiveSection({ onSelectDay, selectedDay, onUpgrade }: Props) {
  const sessionId = getSessionId();
  const isPro = isProVerifiedLocally();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (selectedDay) setExpanded(true);
  }, [selectedDay]);

  const { data: archive, isLoading } = useQuery<JournalArchiveResponse>({
    queryKey: ["/api/journal/archive", sessionId, isPro, search, typeFilter, selectedDay],
    queryFn: async () => {
      const params = new URLSearchParams({
        sessionId,
        isPro: String(isPro),
      });
      if (search.trim()) params.set("q", search.trim());
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (selectedDay) params.set("day", selectedDay);
      const res = await fetch(`/api/journal/archive?${params}`);
      if (!res.ok) throw new Error("archive failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const showResults = search.trim().length > 0 || selectedDay !== null || typeFilter !== "all";
  const days = archive?.devotionalDays ?? [];
  const hasOlderLocked = !isPro && (archive?.lockedCount ?? 0) > 0;

  useEffect(() => {
    if (days.length >= 7) setExpanded(true);
  }, [days.length]);

  return (
    <div className="mb-6" data-testid="section-journal-archive">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 mb-3"
        data-testid="btn-toggle-archive"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-bold text-foreground">Search past entries</span>
          {!isPro && (
            <span className="text-[10px] text-muted-foreground">
              Last {FREE_ARCHIVE_VISIBLE_DAYS} days free
            </span>
          )}
          {isPro && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
              <Sparkles className="w-2.5 h-2.5" />
              Pro
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">{expanded ? "Hide" : "Open"}</span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {!isPro && hasOlderLocked && (
              <div
                className="rounded-xl border border-violet-500/15 bg-violet-500/5 px-4 py-3 text-[12px] text-muted-foreground leading-relaxed"
                data-testid="banner-archive-free"
              >
                You have{" "}
                <strong className="text-foreground">{archive?.lockedCount ?? 0} older entries</strong>{" "}
                waiting in your archive. Pro opens your full devotional history and search across every season
                you&apos;ve walked.
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="block mt-2 font-semibold text-primary text-[12px]"
                >
                  See Pro archive →
                </button>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isPro ? "Search your whole archive…" : "Search recent entries…"}
                data-testid="input-archive-search"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-background text-[14px] outline-none focus:ring-2 focus:ring-primary/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {(["all", "prayer", "reflection", "verse", "note", "guidance_memory"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  data-testid={`filter-archive-${t}`}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    typeFilter === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground"
                  }`}
                >
                  {ARCHIVE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {days.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70 mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Devotional days
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {selectedDay && (
                    <button
                      type="button"
                      onClick={() => onSelectDay(null)}
                      className="shrink-0 px-3 py-2 rounded-xl border border-primary/30 bg-primary/10 text-[11px] font-semibold text-primary"
                    >
                      All days ×
                    </button>
                  )}
                  {days.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      disabled={d.locked && !isPro}
                      onClick={() => {
                        if (d.locked && !isPro) {
                          onUpgrade();
                          return;
                        }
                        onSelectDay(selectedDay === d.date ? null : d.date);
                      }}
                      data-testid={`archive-day-${d.date}`}
                      className={`shrink-0 min-w-[88px] px-3 py-2 rounded-xl border text-left transition-colors ${
                        selectedDay === d.date
                          ? "border-primary bg-primary/10"
                          : d.locked
                            ? "border-border/40 opacity-60"
                            : "border-border/60 hover:border-primary/30"
                      }`}
                    >
                      <p className="text-[10px] font-bold text-foreground">
                        {new Date(d.date + "T12:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {d.reference && (
                        <p className="text-[9px] text-primary truncate max-w-[80px]">{d.reference}</p>
                      )}
                      <p className="text-[9px] text-muted-foreground">
                        {d.entryCount} saved{d.locked ? " · Pro" : ""}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showResults && (
              <div className="space-y-3">
                {isLoading && (
                  <p className="text-[13px] text-muted-foreground text-center py-4">Searching your archive…</p>
                )}
                {!isLoading && archive?.entries.length === 0 && (
                  <p className="text-[13px] text-muted-foreground text-center py-4">
                    Nothing matched — try another word or day.
                  </p>
                )}
                {!isLoading &&
                  archive?.entries.map((e) => (
                    <ArchiveResultCard key={e.id} entry={e} onUpgrade={onUpgrade} />
                  ))}
              </div>
            )}

            {!showResults && !isLoading && archive && archive.totalCount > 0 && (
              <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
                {archive.totalCount} entries saved
                {isPro ? "" : ` · ${archive.visibleCount} visible on free`}
                . Search or pick a devotional day to revisit your walk.
              </p>
            )}

            {!showResults && !isLoading && archive && archive.totalCount === 0 && (
              <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
                When you save from For You or Guidance, entries appear here for search and revisit.
              </p>
            )}

            {!isPro && (
              <Link href="/pricing">
                <span className="block text-center text-[11px] text-muted-foreground/80 hover:text-primary transition-colors">
                  Pro: full history, search, and print/save as PDF →
                </span>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
