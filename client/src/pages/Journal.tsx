import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { getTodayFramework } from "@/lib/faithFramework";
import { saveBookmark, getBookmark } from "@/lib/bookmarks";
import { ResumeBar } from "@/components/ResumeBar";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookHeart, Sparkles, HandIcon, BookOpen, Trash2, Loader2,
  NotebookPen, PenLine, Plus, X, ChevronDown, Church, User, BookMarked, Calendar,
  Download, FileText, FileType2, Lock, Star, Check,
  Mic, Square, ChevronRight, ListChecks, BookText, Lightbulb, MessageCircle, Feather,
} from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareButton";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { UpgradeModal } from "@/components/UpgradeModal";
import type { JournalEntry, MemoryVerse } from "@shared/schema";

const SERMON_USAGE_KEY = "sp_sermon_recordings";

function getSermonMonth() { return new Date().toISOString().slice(0, 7); }

function canRecordSermon() {
  if (isProVerifiedLocally()) return true;
  try {
    const raw = localStorage.getItem(SERMON_USAGE_KEY);
    if (!raw) return true;
    const data = JSON.parse(raw);
    return data.month !== getSermonMonth() || data.count < 1;
  } catch { return true; }
}

function recordSermonUsage() {
  if (isProVerifiedLocally()) return;
  const month = getSermonMonth();
  let count = 0;
  try {
    const raw = localStorage.getItem(SERMON_USAGE_KEY);
    if (raw) { const d = JSON.parse(raw); if (d.month === month) count = d.count; }
  } catch {}
  localStorage.setItem(SERMON_USAGE_KEY, JSON.stringify({ month, count: count + 1 }));
}

interface TranscriptResult {
  transcript: string;
  title: string;
  keyPoints: string[];
  scriptures: string[];
  application: string;
}

type TabType = "prayer" | "reflection" | "verse" | "note" | "memory";

const TABS: { key: TabType; label: string; icon: React.ElementType; emptyText: string; emptyHint: string; actionLabel?: string; actionPath?: string }[] = [
  { key: "prayer",      label: "Prayers",      icon: HandIcon,   emptyText: "This is where your prayers will live.",        emptyHint: "When you're ready, bring something to God.",                                                                          actionLabel: "Open today's devotional",  actionPath: "/devotional" },
  { key: "reflection",  label: "Reflections",  icon: Sparkles,   emptyText: "Your reflections will gather here.",            emptyHint: "Moments where something spoke to you… you'll find them again.",                                                      actionLabel: "Open today's devotional",  actionPath: "/devotional" },
  { key: "verse",       label: "Scriptures",   icon: BookOpen,   emptyText: "The words that stay with you will be here.",    emptyHint: "Save the ones you don't want to forget.",                                                                            actionLabel: "Browse the Bible",         actionPath: "/read" },
  { key: "note",        label: "Sermon Notes", icon: PenLine,    emptyText: "A place to hold what you heard.",               emptyHint: "So it doesn't fade.",                                                                                                actionLabel: undefined,                  actionPath: undefined },
  { key: "memory",      label: "Memory",       icon: Star,       emptyText: "What you carry with you will grow here.",       emptyHint: "Come back to what you're learning by heart.",                                                                        actionLabel: "Open today's devotional",  actionPath: "/devotional" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function exportAsText(entries: JournalEntry[]) {
  const sections: Record<string, JournalEntry[]> = { prayer: [], reflection: [], verse: [], note: [] };
  entries.forEach(e => sections[e.type]?.push(e));

  const header = `SHEPHERD'S PATH — PRAYER JOURNAL EXPORT\n${"=".repeat(45)}\nExported: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n\n`;

  const sectionLabels: Record<string, string> = {
    prayer: "PRAYERS", reflection: "REFLECTIONS", verse: "SCRIPTURES", note: "SERMON NOTES",
  };

  let body = "";
  for (const key of ["prayer", "reflection", "verse", "note"]) {
    const group = sections[key];
    if (!group?.length) continue;
    body += `\n${"─".repeat(45)}\n${sectionLabels[key]} (${group.length})\n${"─".repeat(45)}\n\n`;
    group.forEach((e, i) => {
      if (e.title) body += `  Title: ${e.title}\n`;
      if (e.reference) body += `  Reference: ${e.reference}\n`;
      if (e.verseDate) body += `  Date: ${formatDate(e.verseDate + "T12:00:00")}\n`;
      if (e.createdAt) body += `  Saved: ${formatDate(e.createdAt.toString())}\n`;
      body += `\n  ${e.content.split("\n").join("\n  ")}\n`;
      if (i < group.length - 1) body += "\n  · · ·\n\n";
    });
  }

  const blob = new Blob([header + body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `shepherds-path-journal-${todayISO()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function PremiumModal({ onClose }: { onClose: () => void }) {
  const PRO_FEATURES = [
    "PDF export with beautiful formatting",
    "Cloud backup & sync across devices",
    "Unlimited journal entries",
    "Printable weekly devotional summaries",
    "Priority AI responses",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 16 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        className="bg-background border border-border rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
      >
        {/* Header gradient */}
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-amber-500/80 px-7 pt-8 pb-10 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/30 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Star className="w-7 h-7 text-white fill-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-widest mb-3">
            <Lock className="w-3 h-3" /> Pro Feature
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Shepherd's Path Pro</h2>
          <p className="text-white/80 text-sm mt-1.5">Unlock the full spiritual growth experience</p>
        </div>

        {/* Pull-up card with feature list */}
        <div className="-mt-5 bg-background rounded-t-3xl px-7 pt-7 pb-7 space-y-4">
          <div className="space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm text-foreground/80 leading-snug">{f}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 space-y-2.5">
            <Button
              className="w-full rounded-2xl font-bold py-5 text-sm bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 transition-opacity border-0"
              onClick={() => {
                window.location.href = "/pricing";
                onClose();
              }}
              data-testid="btn-upgrade-pro"
            >
              Unlock Pro
            </Button>
            <button
              onClick={onClose}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Continue with free version
            </button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/60 pt-1">
            $5.99/month or $44.99/year · Cancel anytime
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ExportMenu({ entries, onClose }: { entries: JournalEntry[]; onClose: () => void }) {
  const [showPremium, setShowPremium] = useState(false);
  const { toast } = useToast();

  const handleTextExport = () => {
    if (entries.length === 0) {
      toast({ description: "No journal entries to export yet." });
      onClose();
      return;
    }
    exportAsText(entries);
    toast({ description: `Exported ${entries.length} entries as text.` });
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.97 }}
        transition={{ duration: 0.14 }}
        className="absolute right-0 top-10 z-50 bg-background border border-border rounded-2xl shadow-xl py-2 min-w-[220px]"
      >
        <div className="px-4 py-2 border-b border-border/40 mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Export Journal</p>
        </div>

        {/* Free: text download */}
        <button
          data-testid="btn-export-text"
          onClick={handleTextExport}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-foreground/70" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Download as Text</p>
            <p className="text-[11px] text-muted-foreground">All entries · .txt file</p>
          </div>
          <span className="ml-auto text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400 px-2 py-0.5 rounded-full">Free</span>
        </button>

        {/* Premium: PDF */}
        <button
          data-testid="btn-export-pdf"
          onClick={() => setShowPremium(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FileType2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Export as PDF</p>
            <p className="text-[11px] text-muted-foreground">Beautifully formatted</p>
          </div>
          <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <Lock className="w-2.5 h-2.5" /> Pro
          </span>
        </button>
      </motion.div>

      <AnimatePresence>
        {showPremium && <PremiumModal onClose={() => { setShowPremium(false); onClose(); }} />}
      </AnimatePresence>
    </>
  );
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

        <div className="flex items-center justify-between mt-4">
          <ShareButton
            title={entry.title || (entry.reference ? `Notes — ${entry.reference}` : "Sermon Notes")}
            text={noteBody}
            className="text-[12px] font-semibold"
          />
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
              <span className="text-muted-foreground">Remove this entry?</span>
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
      className="bg-[#fdf8f0] dark:bg-amber-950/15 border border-amber-200/60 dark:border-amber-800/30 rounded-2xl p-5 relative group"
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
      <div className="flex items-center justify-between mt-4">
        <ShareButton
          title={entry.reference ? `${entry.type === "prayer" ? "Prayer" : "Reflection"} — ${entry.reference}` : "Shepherd's Path"}
          text={entry.content}
          className="text-[12px] font-semibold"
        />
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
            <span className="text-muted-foreground">Remove this entry?</span>
            <button onClick={() => onDelete(entry.id)} className="font-semibold text-destructive hover:underline">Yes</button>
            <button onClick={() => setConfirming(false)} className="font-semibold text-muted-foreground hover:underline">No</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SermonRecorder({ onSave }: { onSave: () => void }) {
  const [state, setState] = useState<"idle" | "requesting" | "recording" | "processing" | "review">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  useEffect(() => {
    if (state === "recording") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (state === "idle") setElapsed(0);
    }
  }, [state]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const startRecording = async () => {
    if (!canRecordSermon()) { setShowUpgrade(true); return; }
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => processAudio();
      recorder.start(1000);
      setState("recording");
    } catch {
      setState("idle");
      toast({ description: "Could not access microphone. Please check your browser permissions.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setState("processing");
  };

  const processAudio = async () => {
    recordSermonUsage();
    const mimeType = recorderRef.current?.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const formData = new FormData();
    formData.append("audio", blob, `sermon.${ext}`);
    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!res.ok) throw new Error("failed");
      const data: TranscriptResult = await res.json();
      setResult(data);
      setEditTitle(data.title || "Sermon Notes");
      setState("review");
    } catch {
      setState("idle");
      toast({ description: "Transcription failed. Please try again.", variant: "destructive" });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error("No result");
      const sections = [
        result.keyPoints.length > 0
          ? `KEY POINTS\n${result.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
          : null,
        result.scriptures.length > 0 ? `SCRIPTURES MENTIONED\n${result.scriptures.join(", ")}` : null,
        result.application ? `APPLICATION\n${result.application}` : null,
        `FULL TRANSCRIPT\n${result.transcript}`,
      ].filter(Boolean).join("\n\n");
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type: "note", title: editTitle.trim() || "Sermon Notes", content: sections }),
      });
      if (!res.ok) throw new Error("save failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal", sessionId] });
      toast({ description: "Sermon saved to your journal." });
      setState("idle"); setResult(null); setEditTitle(""); setShowTranscript(false);
      onSave();
    },
    onError: () => toast({ description: "Could not save. Please try again.", variant: "destructive" }),
  });

  if (state === "idle") return (
    <div className="mb-4">
      <AnimatePresence>{showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}</AnimatePresence>
      <button
        onClick={startRecording}
        data-testid="btn-record-sermon"
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 text-primary hover:bg-primary/15 hover:border-primary/40 transition-all text-sm font-semibold"
      >
        <Mic className="w-4 h-4" />
        Record a Sermon
        <span className="text-[10px] font-bold text-primary/60 bg-primary/10 px-1.5 py-0.5 rounded-full ml-1">
          {isProVerifiedLocally() ? "Pro" : canRecordSermon() ? "1 free/mo" : "Upgrade"}
        </span>
      </button>
    </div>
  );

  if (state === "requesting") return (
    <div className="mb-4 flex items-center justify-center gap-3 py-5 rounded-2xl border border-border/50 bg-muted/30">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Requesting microphone access…</span>
    </div>
  );

  if (state === "recording") return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-2xl border-2 border-red-400/30 bg-red-50/50 dark:bg-red-950/20 p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-sm font-bold text-red-600 dark:text-red-400">Recording</span>
          <span className="font-mono text-sm font-semibold text-foreground">{fmt(elapsed)}</span>
        </div>
        <button
          onClick={stopRecording}
          data-testid="btn-stop-recording"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
        >
          <Square className="w-3.5 h-3.5 fill-white" />
          Stop
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2.5">Noise suppression is active. Stop when the sermon ends.</p>
    </motion.div>
  );

  if (state === "processing") return (
    <div className="mb-4 flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border border-border/50 bg-muted/20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Transcribing your sermon…</p>
        <p className="text-xs text-muted-foreground mt-1">This takes about 30–60 seconds depending on length.</p>
      </div>
    </div>
  );

  if (state === "review" && result) return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <span className="font-bold text-foreground text-sm">Sermon Recorded</span>
        </div>
        <button onClick={() => { setState("idle"); setResult(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Sermon Title</label>
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            data-testid="input-sermon-title-ai"
            className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>

        {result.keyPoints.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ListChecks className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Key Points</span>
            </div>
            <ul className="space-y-1.5">
              {result.keyPoints.map((pt, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground leading-snug">
                  <span className="text-primary font-bold mt-px shrink-0">{i + 1}.</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.scriptures.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BookText className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Scriptures Referenced</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.scriptures.map((s, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{s}</span>
              ))}
            </div>
          </div>
        )}

        {result.application && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Application</span>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-snug">{result.application}</p>
          </div>
        )}

        <button
          onClick={() => setShowTranscript(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="btn-toggle-transcript"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showTranscript ? "rotate-90" : ""}`} />
          {showTranscript ? "Hide" : "View"} full transcript ({Math.round(result.transcript.split(" ").length / 130)} min read)
        </button>

        {showTranscript && (
          <div className="bg-muted/30 rounded-xl px-4 py-3 max-h-48 overflow-y-auto">
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{result.transcript}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { setState("idle"); setResult(null); setEditTitle(""); setShowTranscript(false); }}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Discard
          </button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="btn-save-sermon-recording"
            className="flex-1 rounded-xl font-semibold"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save to Journal"}
          </Button>
        </div>
      </div>
    </motion.div>
  );

  return null;
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
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Sermon Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Walking in the Light" data-testid="input-sermon-title" className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Speaker</label>
                <input value={speaker} onChange={e => setSpeaker(e.target.value)} placeholder="Pastor / speaker" data-testid="input-sermon-speaker" className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Scripture</label>
                <input value={scripture} onChange={e => setScripture(e.target.value)} placeholder="e.g. John 8:12" data-testid="input-sermon-scripture" className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Write your notes here — key points, quotes, questions, what stood out to you..." spellCheck data-testid="textarea-sermon-notes" rows={8} className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 resize-none leading-relaxed" />
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending} data-testid="btn-save-sermon-note" className="rounded-xl px-6 font-semibold">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Note"}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function MemoryVerseCard({ verse, onDelete, onReview }: { verse: MemoryVerse; onDelete: () => void; onReview: () => void }) {
  const [mode, setMode] = useState<"idle" | "recall" | "revealed">("idle");
  const [attempt, setAttempt] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const isDue = !verse.lastReviewedAt ||
    new Date(today).getTime() - new Date(verse.lastReviewedAt).getTime() > 7 * 86400000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-bold text-foreground">{verse.reference}</span>
          {isDue && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
              Due for review
            </span>
          )}
          {verse.reviewCount > 0 && (
            <span className="text-[10px] text-muted-foreground/60">
              Reviewed {verse.reviewCount}×
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          className="text-muted-foreground/30 hover:text-rose-400 transition-colors flex-shrink-0"
          title="Remove from memory"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {mode === "idle" && (
        <div>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-3 line-clamp-2 italic">
            "{verse.text.length > 80 ? verse.text.slice(0, 80) + "…" : verse.text}"
          </p>
          <button
            onClick={() => setMode("recall")}
            className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {verse.reviewCount === 0 ? "Start learning →" : "Practice recall →"}
          </button>
        </div>
      )}

      {mode === "recall" && (
        <div className="space-y-3">
          <p className="text-[12px] text-muted-foreground italic">Type this verse from memory:</p>
          <textarea
            value={attempt}
            onChange={e => setAttempt(e.target.value)}
            placeholder="Begin typing the verse…"
            spellCheck
            className="w-full text-[13px] leading-relaxed rounded-xl border border-border bg-background px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[70px]"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setMode("revealed"); onReview(); }}
              className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Reveal verse
            </button>
            <button
              onClick={() => { setMode("idle"); setAttempt(""); }}
              className="text-[12px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "revealed" && (
        <div className="space-y-3">
          {attempt.trim() && (
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">Your attempt</p>
              <p className="text-[13px] text-foreground/70 leading-relaxed italic">"{attempt}"</p>
            </div>
          )}
          <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/50 mb-1">Actual verse</p>
            <p className="text-[13px] text-foreground leading-relaxed">"{verse.text}"</p>
            <p className="text-[11px] text-primary/60 font-semibold mt-1">— {verse.reference}</p>
          </div>
          <button
            onClick={() => { setMode("idle"); setAttempt(""); }}
            className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Practice again next time →
          </button>
        </div>
      )}
    </motion.div>
  );
}

function MemoryTab({ verses, isLoading, onDelete, onReview }: { verses: MemoryVerse[]; isLoading: boolean; onDelete: (id: number) => void; onReview: (id: number) => void }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
        <p className="text-sm text-muted-foreground">Loading memory verses…</p>
      </div>
    );
  }

  if (verses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center mb-4">
          <Star className="w-6 h-6 text-amber-400/60" />
        </div>
        <p className="text-sm font-semibold text-foreground max-w-[220px]">No memory verses yet.</p>
        <p className="text-[12px] text-muted-foreground mt-2 max-w-[260px] leading-relaxed">
          While reading today's devotional, tap the ☆ star next to a verse to commit it to memory — then come back here to practice it.
        </p>
        <Link href="/devotional">
          <button
            data-testid="btn-empty-action-memory"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            Open today's devotional →
          </button>
        </Link>
      </motion.div>
    );
  }

  const due = verses.filter(v => !v.lastReviewedAt || new Date().getTime() - new Date(v.lastReviewedAt).getTime() > 7 * 86400000);

  return (
    <div className="space-y-3">
      {due.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1">
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          {due.length} verse{due.length !== 1 ? "s" : ""} ready to practice
        </div>
      )}
      <AnimatePresence mode="popLayout">
        {verses.map(v => (
          <MemoryVerseCard
            key={v.id}
            verse={v}
            onDelete={() => onDelete(v.id)}
            onReview={() => onReview(v.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function Journal() {
  const [, navigate] = useLocation();
  const framework = getTodayFramework();
  const [frameworkPromptDismissed, setFrameworkPromptDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const bm = getBookmark("journal");
    return (bm?.tab as TabType) ?? "prayer";
  });
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const label = TABS.find(t => t.key === activeTab)?.label ?? activeTab;
    saveBookmark("journal", { tab: activeTab, label });
  }, [activeTab]);

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

  const { data: memoryVerses = [], isLoading: memoryLoading } = useQuery<MemoryVerse[]>({
    queryKey: ["/api/memory-verses", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/memory-verses?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) throw new Error("Failed to load memory verses");
      return res.json();
    },
    enabled: activeTab === "memory",
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/memory-verses/${id}?sessionId=${encodeURIComponent(sessionId)}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/memory-verses", sessionId] }),
  });

  const reviewMemoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/memory-verses/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/memory-verses", sessionId] }),
  });

  const filtered = entries.filter(e => e.type === activeTab);
  const activeTabConfig = TABS.find(t => t.key === activeTab)!;

  const textEntryCount = entries.filter(e => e.type !== "note").length;
  const [letter, setLetter] = useState<string | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterDismissed, setLetterDismissed] = useState(() => !!localStorage.getItem("sp_letter_dismissed"));
  const [letterGenerated, setLetterGenerated] = useState(false);

  const [flashbackDismissed, setFlashbackDismissed] = useState(false);
  const { data: flashbackEntry } = useQuery<{
    id: number; type: string; title?: string; content: string; createdAt: string;
  } | null>({
    queryKey: ["/api/journal/flashback", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/journal/flashback?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const generateLetter = async () => {
    setLetterLoading(true);
    try {
      const res = await fetch("/api/journal/spiritual-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) { setLetterLoading(false); return; }
      const data = await res.json();
      if (data.letter) { setLetter(data.letter); setLetterGenerated(true); }
    } catch { }
    setLetterLoading(false);
  };

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background pt-14" onClick={() => exportOpen && setExportOpen(false)}>

        {/* Hero banner */}
        <div className="relative w-full overflow-hidden" style={{ height: 300 }}>
          <img
            src="/journal-hero.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center center" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.68) 100%)" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 text-center px-6">
            <h2
              style={{
                fontFamily: "var(--font-decorative)",
                fontStyle: "italic",
                fontSize: "2.4rem",
                fontWeight: 700,
                color: "rgba(255,255,255,0.97)",
                textShadow: "0 2px 18px rgba(0,0,0,0.6)",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              Prayer Journal
            </h2>
            <p style={{
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.7)",
              marginTop: "8px",
              textShadow: "0 1px 6px rgba(0,0,0,0.5)",
              letterSpacing: "0.04em",
            }}>
              A record of your walk with Jesus.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-14 z-30">
          <div className="max-w-xl mx-auto px-5">
            <div className="flex items-center justify-between gap-3 py-4 mb-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <NotebookPen className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-foreground tracking-tight">Prayer Journal</h1>
                  <p className="text-[11px] text-muted-foreground">A place to remember your walk with Jesus.</p>
                </div>
              </div>

              {/* Export button */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  data-testid="btn-export-journal"
                  onClick={() => setExportOpen(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
                    exportOpen
                      ? "bg-primary/8 border-primary/20 text-primary/80"
                      : "border-border/50 text-muted-foreground/60 hover:text-muted-foreground hover:border-border"
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                <AnimatePresence>
                  {exportOpen && (
                    <ExportMenu entries={entries} onClose={() => setExportOpen(false)} />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Tabs — 2 rows so nothing clips on mobile */}
            <div className="flex flex-col gap-0">
              <div className="flex">
                {TABS.slice(0, 3).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    data-testid={`tab-${key}`}
                    onClick={() => setActiveTab(key)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11.5px] font-semibold border-b-2 transition-all ${
                      activeTab === key
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex">
                {TABS.slice(3).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    data-testid={`tab-${key}`}
                    onClick={() => setActiveTab(key)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11.5px] font-semibold border-b-2 transition-all ${
                      activeTab === key
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-xl mx-auto px-5 py-6 pb-24">

          {/* ── 7-Day Framework: Today's Journal Prompt ── */}
          <AnimatePresence>
            {!frameworkPromptDismissed && (
              <motion.div
                key="framework-journal-prompt"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                data-testid="card-framework-journal-prompt"
                className={`relative mb-5 rounded-2xl border overflow-hidden shadow-sm ${framework.color.border} ${framework.color.bg}`}
              >
                <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${framework.color.gradient}`} />
                <button
                  onClick={() => setFrameworkPromptDismissed(true)}
                  aria-label="Dismiss"
                  data-testid="button-dismiss-framework-journal"
                  className={`absolute top-3 right-3 transition-colors opacity-60 hover:opacity-100 ${framework.color.text}`}
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="px-5 pt-4 pb-4 pr-10">
                  <p className={`text-[10px] font-black uppercase tracking-[0.18em] mb-1 ${framework.color.text}`}>
                    Today's Reflection · {framework.name}
                  </p>
                  <p className="text-[15px] font-bold text-foreground leading-snug mb-3">
                    {framework.journalPrompt}
                  </p>
                  <button
                    onClick={() => navigate(`/guidance?situation=${encodeURIComponent(framework.journalPrompt)}`)}
                    data-testid="button-framework-journal-cta"
                    className={`inline-flex items-center gap-1.5 text-[12px] font-bold transition-colors ${framework.color.text}`}
                  >
                    Bring this to God <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Spiritual Letter — AI reflection on journal history ── */}
          <AnimatePresence>
            {!isLoading && textEntryCount >= 3 && !letterDismissed && (
              <motion.div
                key="spiritual-letter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                data-testid="card-spiritual-letter"
                className="relative mb-6 rounded-2xl overflow-hidden border border-indigo-200/60 dark:border-indigo-800/40 bg-gradient-to-br from-indigo-50/80 via-violet-50/50 to-background dark:from-indigo-950/20 dark:via-violet-950/10 dark:to-background"
              >
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-400" />
                <button
                  onClick={() => { localStorage.setItem("sp_letter_dismissed", "1"); setLetterDismissed(true); }}
                  className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-600 transition-colors"
                  aria-label="Dismiss"
                  data-testid="button-dismiss-spiritual-letter"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="px-5 pt-5 pb-5">
                  {!letterGenerated ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                          <Feather className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                          A reflection on your journey
                        </p>
                      </div>
                      <p className="text-[15px] font-bold text-foreground leading-snug mb-1.5">
                        {textEntryCount >= 10 ? "Something beautiful is taking shape." : "You've been showing up… there's something here for you."}
                      </p>
                      <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                        A quiet reflection on what your prayers and reflections reveal — what you might be learning, where God seems to be moving, what you may not yet see in yourself.
                      </p>
                      <button
                        onClick={generateLetter}
                        disabled={letterLoading}
                        data-testid="button-generate-spiritual-letter"
                        className="flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold px-5 py-2 transition-colors disabled:opacity-70 shadow-sm"
                      >
                        {letterLoading ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reflecting…</>
                        ) : (
                          <><Feather className="w-3.5 h-3.5" /> See what's been growing</>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                          <Feather className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                          Your reflection
                        </p>
                      </div>
                      {letter?.split("\n\n").filter(p => p.trim()).map((para, i) => (
                        <p key={i} className="text-[14px] leading-relaxed text-foreground/90 mb-3 last:mb-0">
                          {para}
                        </p>
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Looking Back — journal flashback from ~1–6 months ago ── */}
          <AnimatePresence>
            {!flashbackDismissed && flashbackEntry && (
              <motion.div
                key="flashback-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                data-testid="card-journal-flashback"
                className="relative mb-6 rounded-2xl overflow-hidden border border-teal-200/60 dark:border-teal-800/40 bg-gradient-to-br from-teal-50/70 via-emerald-50/40 to-background dark:from-teal-950/20 dark:via-emerald-950/10 dark:to-background"
              >
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400" />
                <button
                  onClick={() => setFlashbackDismissed(true)}
                  className="absolute top-3 right-3 text-teal-400 hover:text-teal-600 transition-colors"
                  aria-label="Dismiss"
                  data-testid="button-dismiss-flashback"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="px-5 pt-5 pb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
                      From a little while ago…
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    {new Date(flashbackEntry.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    {flashbackEntry.type === "prayer" ? " · Prayer" : " · Reflection"}
                  </p>
                  {flashbackEntry.title && (
                    <p className="text-[13px] font-bold text-foreground mb-1.5">{flashbackEntry.title}</p>
                  )}
                  <p className="text-[14px] leading-relaxed text-foreground/85 line-clamp-5">
                    {flashbackEntry.content}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* First-time guide — shown only when there are zero entries across all tabs */}
          {!isLoading && entries.length === 0 && activeTab !== "note" && activeTab !== "memory" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-6 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-amber-50/60 dark:from-primary/10 dark:to-amber-950/20 overflow-hidden"
            >
              <div className="px-5 pt-4 pb-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary/60 mb-1">Your Prayer Journal</p>
                <p className="text-[15px] font-bold text-foreground leading-snug">Over time, this becomes a record of your walk.</p>
                <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">Prayers, reflections, scriptures — gathered here as you go.</p>
              </div>
              <div className="px-5 pb-4 pt-2 space-y-2">
                {[
                  { icon: HandIcon,  color: "text-violet-500 bg-violet-500/10", label: "Prayers",      desc: "Written or spoken in the Pray section" },
                  { icon: Sparkles,  color: "text-amber-500 bg-amber-500/10",   label: "Reflections",  desc: "Saved while reading a devotional or journey" },
                  { icon: BookOpen,  color: "text-blue-500 bg-blue-500/10",     label: "Scriptures",   desc: "Bookmarked chapters from the Bible section" },
                  { icon: PenLine,   color: "text-green-600 bg-green-500/10",   label: "Sermon Notes", desc: "Recorded or typed during a message" },
                  { icon: Star,      color: "text-yellow-500 bg-yellow-500/10", label: "Memory",       desc: "Verses starred for memorization" },
                ].map(({ icon: Ic, color, label, desc }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                      <Ic className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[12px] font-semibold text-foreground">{label} </span>
                      <span className="text-[12px] text-muted-foreground">— {desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
              <p className="text-sm text-muted-foreground">Loading your journal...</p>
            </div>
          ) : activeTab === "note" ? (
            <>
              <SermonRecorder onSave={() => {}} />
              <SermonNoteForm onSave={() => {}} />
              {filtered.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    {filtered.length} Saved {filtered.length === 1 ? "Note" : "Notes"}
                  </p>
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-3">
                      {filtered.map(entry => (
                        <NoteCard key={entry.id} entry={entry} onDelete={(id) => deleteMutation.mutate(id)} />
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
                  <p className="text-sm font-semibold text-foreground max-w-[220px]">A place to hold what you heard.</p>
                  <p className="text-[12px] text-muted-foreground mt-1.5 max-w-[220px]">So it doesn't fade.</p>
                </motion.div>
              )}
            </>
          ) : activeTab === "memory" ? (
            <MemoryTab
              verses={memoryVerses}
              isLoading={memoryLoading}
              onDelete={(id) => deleteMemoryMutation.mutate(id)}
              onReview={(id) => reviewMemoryMutation.mutate(id)}
            />
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <activeTabConfig.icon className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-foreground max-w-[220px]">{activeTabConfig.emptyText}</p>
              <p className="text-[12px] text-muted-foreground mt-2 max-w-[260px] leading-relaxed">
                {activeTabConfig.emptyHint}
              </p>
              {activeTabConfig.actionLabel && activeTabConfig.actionPath && (
                <Link href={activeTabConfig.actionPath}>
                  <button
                    data-testid={`btn-empty-action-${activeTabConfig.key}`}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-sm"
                  >
                    {activeTabConfig.actionLabel} →
                  </button>
                </Link>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {filtered.map(entry => (
                  <EntryCard key={entry.id} entry={entry} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </>
  );
}
