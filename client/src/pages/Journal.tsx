import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookHeart, Sparkles, HandIcon, BookOpen, Trash2, Loader2, NotebookPen } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { getSessionId } from "@/lib/session";
import type { JournalEntry } from "@shared/schema";

type TabType = "prayer" | "reflection" | "verse";

const TABS: { key: TabType; label: string; icon: React.ElementType; emptyText: string }[] = [
  { key: "prayer", label: "My Prayers", icon: HandIcon, emptyText: "Your saved prayers will appear here." },
  { key: "reflection", label: "My Reflections", icon: Sparkles, emptyText: "Your saved reflections will appear here." },
  { key: "verse", label: "Saved Scriptures", icon: BookOpen, emptyText: "Verses you save will appear here." },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
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
                <p className="text-[11px] text-muted-foreground">Your saved prayers, reflections & scriptures</p>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 pb-0">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  data-testid={`tab-${key}`}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-t-lg border-b-2 transition-all ${
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
                Use the save buttons on the Daily Devotional page to add entries.
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
