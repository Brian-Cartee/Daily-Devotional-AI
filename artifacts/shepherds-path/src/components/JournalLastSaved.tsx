import { motion } from "framer-motion";
import { ChevronRight, Clock } from "lucide-react";
import type { JournalEntry } from "@shared/schema";
export type JournalTabType = "prayer" | "reflection" | "verse" | "note" | "memory";

const TYPE_LABEL: Record<string, string> = {
  prayer: "Prayer",
  reflection: "Reflection",
  verse: "Scripture",
  note: "Sermon note",
  guidance_memory: "Guidance",
};

function tabForEntry(type: string): JournalTabType | null {
  if (type === "prayer" || type === "reflection" || type === "verse" || type === "note") return type;
  if (type === "guidance_memory") return "reflection";
  return null;
}

type Props = {
  entry: JournalEntry;
  onOpenTab: (tab: JournalTabType) => void;
};

export function JournalLastSaved({ entry, onOpenTab }: Props) {
  const tab = tabForEntry(entry.type);
  const label = TYPE_LABEL[entry.type] ?? "Entry";
  const when = entry.createdAt
    ? new Date(entry.createdAt.toString()).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";
  const preview = entry.content.replace(/\s+/g, " ").trim().slice(0, 140);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={() => tab && onOpenTab(tab)}
      disabled={!tab}
      data-testid="card-journal-last-saved"
      className="w-full text-left mb-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 to-card px-4 py-3.5 hover:border-primary/35 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/80">Last saved</span>
        </div>
        {when && <span className="text-[11px] text-muted-foreground">{when}</span>}
      </div>
      <p className="text-[12px] font-semibold text-foreground mb-1">
        {label}
        {entry.reference ? ` · ${entry.reference}` : ""}
      </p>
      <p className={`text-[13px] leading-relaxed text-foreground/75 line-clamp-2 ${entry.type === "prayer" ? "italic" : ""}`}>
        {preview}
        {entry.content.length > 140 ? "…" : ""}
      </p>
      {tab && (
        <span className="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold text-primary">
          View in {label}s
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      )}
    </motion.button>
  );
}
