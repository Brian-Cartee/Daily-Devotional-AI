import { useState, useRef, useEffect } from "react";
import { saveBookmark, getBookmark } from "@/lib/bookmarks";
import { ResumeBar } from "@/components/ResumeBar";
import journalHero from "@assets/REV1001_S_P_(1400_x_600_px)-2_1773097642649.png";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookHeart, Sparkles, HandIcon, BookOpen, Trash2, Loader2,
  NotebookPen, PenLine, Plus, X, ChevronDown, Church, User, BookMarked, Calendar,
  Download, FileText, FileType2, Lock, Star, Check,
  Mic, Square, ChevronRight, ListChecks, BookText, Lightbulb,
} from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareButton";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { UpgradeModal } from "@/components/UpgradeModal";
import type { JournalEntry } from "@shared/schema";

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

type TabType = "prayer" | "reflection" | "verse" | "note";

const TABS: { key: TabType; label: string; icon: React.ElementType; emptyText: string }[] = [
  { key: "prayer",      label: "Prayers",      icon: HandIcon,   emptyText: "Your saved prayers will appear here." },
  { key: "reflection",  label: "Reflections",  icon: Sparkles,   emptyText: "Your saved reflections will appear here." },
  { key: "verse",       label: "Scriptures",   icon: BookOpen,   emptyText: "Verses you save will appear here." },
  { key: "note",        label: "Sermon Notes", icon: PenLine,    emptyText: "Your sermon notes will appear here." },
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
                window.open("mailto:hello@shepherdspathAI.com?subject=Pro%20Waitlist", "_blank");
                onClose();
              }}
              data-testid="btn-join-waitlist"
            >
              Join the Pro Waitlist
            </Button>
            <button
              onClick={onClose}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Continue with free version
            </button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/60 pt-1">
            Launching soon. No payment required to join waitlist.
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
            <span className="text-muted-foreground">Remove?</span>
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
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Write your notes here — key points, quotes, questions, what stood out to you..." data-testid="textarea-sermon-notes" rows={8} className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 resize-none leading-relaxed" />
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

export default function Journal() {
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

  const filtered = entries.filter(e => e.type === activeTab);
  const activeTabConfig = TABS.find(t => t.key === activeTab)!;

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background pt-14" onClick={() => exportOpen && setExportOpen(false)}>

        {/* Hero banner */}
        <div className="relative w-full overflow-hidden" style={{ height: 300 }}>
          <img
            src={journalHero}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center center" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.72) 100%)" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-7 text-center px-6">
            <h2 className="text-white text-lg font-extrabold tracking-tight leading-snug drop-shadow-md">
              Prayer Journal
            </h2>
            <p
              style={{
                fontFamily: "var(--font-decorative)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "1.15rem",
                color: "rgba(255,255,255,0.92)",
                textShadow: "0 1px 8px rgba(0,0,0,0.65)",
                marginTop: "3px",
              }}
            >
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
                  <p className="text-[11px] text-muted-foreground">Prayers, reflections, scriptures & sermon notes</p>
                </div>
              </div>

              {/* Export button */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  data-testid="btn-export-journal"
                  onClick={() => setExportOpen(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12px] font-semibold transition-all ${
                    exportOpen
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
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
