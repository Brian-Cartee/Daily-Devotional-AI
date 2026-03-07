import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookHeart, Sparkles, HandIcon, BookOpen, Trash2, Loader2,
  NotebookPen, PenLine, Plus, X, ChevronDown, Church, User, BookMarked, Calendar,
} from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import type { JournalEntry } from "@shared/schema";

type TabType = "prayer" | "reflection" | "verse" | "note";

const TABS: { key: TabType; label: string; icon: React.ElementType; emptyText: string }[] = [
  { key: "prayer",      label: "Prayers",     icon: HandIcon,     emptyText: "Your saved prayers will appear here." },
  { key: "reflection",  label: "Reflections", icon: Sparkles,     emptyText: "Your saved reflections will appear here." },
  { key: "verse",       label: "Scriptures",  icon: BookOpen,     emptyText: "Verses you save will appear here." },
  { key: "note",        label: "Sermon Notes",icon: PenLine,      emptyText: "Your sermon notes will appear here." },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function NoteCard({ entry, onDelete }: { entry: JournalEntry; onDelete: (id: number) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const lines = entry.content.split("\n");
  const speakerLine = lines[0].startsWith("Speaker:") ? lines[0].replace("Speaker:", "").trim() : null;
  const noteBody = speakerLine ? lines.slice(2).join("\n") : entry.content;
  const preview = noteBody.slice(0, 120) + (noteBody.length > 120 ? "…" : "");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-2xl overflow-hidden relative group"
      data-testid={`journal-entry-${entry.id}`}
    >
      <div className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            {entry.title && (
              <h3 className="font-bold text-foreground text-[16px] leading-tight mb-1">{entry.title}</h3>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {speakerLine && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <User className="w-3 h-3" /> {speakerLine}
                </span>
              )}
              {entry.reference && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                  <BookMarked className="w-3 h-3" /> {entry.reference}
                </span>
              )}
              {entry.createdAt && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="w-3 h-3" /> {formatDate(entry.createdAt.toString())}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </button>
        </div>

        {/* Preview / Full notes */}
        <AnimatePresence initial={false}>
          {!expanded ? (
            <p className="text-[14px] text-foreground/70 leading-relaxed">{preview}</p>
          ) : (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-[14px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{noteBody}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete */}
        <div className="flex justify-end mt-4">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              data-testid={`delete-entry-${entry.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-muted-foreground">Remove?</span>
              <button onClick={() => onDelete(entry.id)} className="font-semibold text-destructive hover:underline">Yes</button>
              <button onClick={() => setConfirming(false)} className="font-semibold text-muted-foreground hover:underline">No</button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EntryCard({ entry, onDelete }: { entry: JournalEntry; onDelete: (id: number) => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-2xl p-5 relative group"
      data-testid={`journal-entry-${entry.id}`}
    >
      {entry.reference && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/8 rounded-full">
            {entry.reference}
          </span>
          {entry.verseDate && (
            <span className="text-[11px] text-muted-foreground">{formatDate(entry.verseDate + "T12:00:00")}</span>
          )}
        </div>
      )}
      {!entry.reference && entry.verseDate && (
        <p className="text-[11px] text-muted-foreground mb-2">{formatDate(entry.verseDate + "T12:00:00")}</p>
      )}
      <p className={`text-[15px] leading-relaxed text-foreground/80 ${entry.type === "prayer" ? "italic" : ""}`}>
        {entry.content}
      </p>
      <div className="flex justify-end mt-4">
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            data-testid={`delete-entry-${entry.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-muted-foreground">Remove?</span>
            <button onClick={() => onDelete(entry.id)} className="font-semibold text-destructive hover:underline">Yes</button>
            <button onClick={() => setConfirming(false)} className="font-semibold text-muted-foreground hover:underline">No</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SermonNoteForm({ onSave }: { onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [scripture, setScripture] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const content = speaker.trim()
        ? `Speaker: ${speaker.trim()}\n\n${notes.trim()}`
        : notes.trim();
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          type: "note",
          title: title.trim() || undefined,
          content,
          reference: scripture.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal", sessionId] });
      toast({ description: "Sermon notes saved." });
      setTitle(""); setSpeaker(""); setScripture(""); setNotes("");
      setOpen(false);
      onSave();
    },
    onError: () => toast({ description: "Could not save. Please try again.", variant: "destructive" }),
  });

  const canSave = notes.trim().length > 0;

  return (
    <div className="mb-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          data-testid="btn-new-sermon-note"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          New Sermon Note
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Form header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Church className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground text-sm">New Sermon Note</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Sermon title */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                Sermon Title
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Walking in the Light"
                data-testid="input-sermon-title"
                className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>

            {/* Speaker + Scripture in a row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                  Speaker
                </label>
                <input
                  value={speaker}
                  onChange={e => setSpeaker(e.target.value)}
                  placeholder="Pastor / speaker"
                  data-testid="input-sermon-speaker"
                  className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                  Scripture
                </label>
                <input
                  value={scripture}
                  onChange={e => setScripture(e.target.value)}
                  placeholder="e.g. John 8:12"
                  data-testid="input-sermon-scripture"
                  className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>

            {/* Notes textarea */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Write your notes here — key points, quotes, questions, what stood out to you..."
                data-testid="textarea-sermon-notes"
                rows={8}
                className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!canSave || saveMutation.isPending}
                data-testid="btn-save-sermon-note"
                className="rounded-xl px-6 font-semibold"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Note"}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function Journal() {
  const [activeTab, setActiveTab] = useState<TabType>("prayer");
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/journal?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) throw new Error("Failed to load journal");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/journal/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Failed to delete entry");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/journal", sessionId] }),
  });

  const filtered = entries.filter(e => e.type === activeTab);
  const activeTabConfig = TABS.find(t => t.key === activeTab)!;

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background pt-14">
        {/* Header */}
        <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-14 z-30">
          <div className="max-w-xl mx-auto px-5">
            <div className="flex items-center gap-3 py-4 mb-1">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <NotebookPen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground tracking-tight">Prayer Journal</h1>
                <p className="text-[11px] text-muted-foreground">Prayers, reflections, scriptures & sermon notes</p>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex gap-0.5 pb-0 overflow-x-auto">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  data-testid={`tab-${key}`}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                    activeTab === key
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-xl mx-auto px-5 py-6 pb-24">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
              <p className="text-sm text-muted-foreground">Loading your journal...</p>
            </div>
          ) : activeTab === "note" ? (
            <>
              <SermonNoteForm onSave={() => {}} />
              {filtered.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    {filtered.length} Saved {filtered.length === 1 ? "Note" : "Notes"}
                  </p>
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-3">
                      {filtered.map(entry => (
                        <NoteCard
                          key={entry.id}
                          entry={entry}
                          onDelete={(id) => deleteMutation.mutate(id)}
                        />
                      ))}
                    </div>
                  </AnimatePresence>
                </>
              )}
              {filtered.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <PenLine className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground max-w-[220px]">
                    Take notes during a sermon and save them here to revisit later.
                  </p>
                </motion.div>
              )}
            </>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <activeTabConfig.icon className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground max-w-[220px]">{activeTabConfig.emptyText}</p>
              <p className="text-xs text-muted-foreground/60 mt-2 max-w-[240px]">
                Use the save buttons on the Devotional or Study pages to add entries.
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {filtered.map(entry => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </>
  );
}
