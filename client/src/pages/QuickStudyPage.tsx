import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Sparkles, HeartHandshake, ChevronDown, X, BookmarkPlus, Check, BookOpen, SendHorizonal } from "lucide-react";
import { saveBookmark, getBookmark } from "@/lib/bookmarks";
import { ResumeBar } from "@/components/ResumeBar";
import { apiRequest } from "@/lib/queryClient";
import { streamAI } from "@/lib/streamAI";
import { canUseAi, recordAiUsage } from "@/lib/aiUsage";
import { getUserName } from "@/lib/userName";
import { AiPauseModal } from "@/components/AiPauseModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { TRACKS, getTodaysPassage, getPassageIndex, type TrackId, type Track } from "@/data/trackPaths";
import { useToast } from "@/hooks/use-toast";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { ShareButton } from "@/components/ShareButton";
import { InlineSubscribeToggle } from "@/components/EmailSubscribe";
import { BiblePassageText } from "@/components/BiblePassageText";

const SUGGESTIONS = [
  "anxiety", "forgiveness", "Romans 8", "the cross", "prayer",
  "hope", "John 3:16", "grace", "Psalm 23", "faith vs works",
];

const TRACK_COLORS: Record<TrackId, { bg: string; border: string; pill: string; icon: string }> = {
  psalms:   { bg: "bg-amber-50/60",  border: "border-amber-200/60",  pill: "bg-amber-100 text-amber-700",   icon: "text-amber-500" },
  proverbs: { bg: "bg-yellow-50/60", border: "border-yellow-200/60", pill: "bg-yellow-100 text-yellow-700",  icon: "text-yellow-600" },
  gospel:   { bg: "bg-indigo-50/60", border: "border-indigo-200/60", pill: "bg-indigo-100 text-indigo-700",  icon: "text-indigo-500" },
  wisdom:   { bg: "bg-teal-50/60",   border: "border-teal-200/60",   pill: "bg-teal-100 text-teal-700",     icon: "text-teal-600" },
};

function useJournalSave() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sessionId = getSessionId();

  return useMutation({
    mutationFn: async (body: { type: string; content: string; reference?: string }) => {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, sessionId }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal", sessionId] });
      toast({ description: "Saved to your journal." });
    },
    onError: () => toast({ description: "Could not save. Please try again.", variant: "destructive" }),
  });
}

function SaveButton({ onClick, saved, label = "Save to Journal" }: { onClick: () => void; saved: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={saved}
      data-testid="btn-save-journal"
      className={`inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-full px-3 py-1.5 transition-all ${
        saved
          ? "bg-green-100 text-green-700 cursor-default"
          : "bg-primary/10 text-primary hover:bg-primary/20"
      }`}
    >
      {saved ? <Check className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
      {saved ? "Saved!" : label}
    </button>
  );
}

function usePassageText(apiRef: string, enabled: boolean) {
  const url = `/api/bible?ref=${encodeURIComponent(apiRef)}`;
  return useQuery<{ text: string; reference: string }>({ queryKey: [url], enabled });
}

function TodaysTrackCard({ track, onClear }: { track: Track; onClear: () => void }) {
  const passage = getTodaysPassage(track);
  const index = getPassageIndex(track);
  const colors = TRACK_COLORS[track.id];
  const [open, setOpen] = useState(false);
  const textQuery = usePassageText(passage.apiRef, open);
  const [aiContent, setAiContent] = useState("");
  const [aiMode, setAiMode] = useState<"reflect" | "pray" | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [savedReflection, setSavedReflection] = useState(false);
  const [savedPrayer, setSavedPrayer] = useState(false);
  const [savedScripture, setSavedScripture] = useState(false);
  const [aiReply, setAiReply] = useState("");
  const [aiReplySaved, setAiReplySaved] = useState(false);
  const saveJournal = useJournalSave();

  const generateAI = async (type: "reflect" | "pray") => {
    setAiMode(type);
    setAiContent("");
    setIsAiLoading(true);
    setSavedReflection(false);
    setSavedPrayer(false);
    const passageText = textQuery.data?.text ?? passage.title;
    try {
      const res = await apiRequest("POST", "/api/chat/passage", {
        passageRef: passage.reference,
        passageText,
        userName: getUserName() ?? undefined,
        sessionId: getSessionId(),
        daysWithApp: getRelationshipAge(),
        messages: [{
          role: "user",
          content: type === "reflect"
            ? `Write a 2-paragraph devotional reflection on ${passage.reference} that helps someone understand why this passage matters for their life today.`
            : `Write a heartfelt prayer based on the themes of ${passage.reference} — ${passage.title}. Keep it personal, warm, and about 3 sentences.`,
        }],
      });
      const text = await res.text();
      setAiContent(text);
    } catch {
      setAiContent("Sorry, we couldn't generate a response right now. Please try again.");
    }
    setIsAiLoading(false);
  };

  const handleSaveAi = () => {
    if (!aiContent || !aiMode) return;
    saveJournal.mutate(
      { type: aiMode === "reflect" ? "reflection" : "prayer", content: aiContent, reference: passage.reference },
      {
        onSuccess: () => {
          if (aiMode === "reflect") setSavedReflection(true);
          if (aiMode === "pray") setSavedPrayer(true);
        },
      }
    );
  };

  const handleSaveScripture = () => {
    if (!textQuery.data) return;
    saveJournal.mutate(
      { type: "verse", content: textQuery.data.text, reference: passage.reference },
      { onSuccess: () => setSavedScripture(true) }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden mb-6`}
      data-testid="todays-track-card"
    >
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[11px] font-bold uppercase tracking-widest ${colors.pill} px-2 py-0.5 rounded-full`}>
            Today · Day {index + 1} of {track.passages.length}
          </span>
          <button onClick={onClear} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors" data-testid="btn-clear-track">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <h3 className="text-lg font-bold text-foreground leading-tight">{passage.title}</h3>
        <p className={`text-[12px] font-medium mt-0.5 ${colors.icon}`}>{passage.reference} · {track.name}</p>
      </div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/30 transition-colors"
        data-testid="btn-expand-track"
      >
        <span className="text-xs font-semibold text-muted-foreground">Read passage</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/30 pt-4">
              {textQuery.isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              )}
              {textQuery.data && (
                <>
                  <div className="bg-white/50 rounded-xl p-4 max-h-60 overflow-y-auto">
                    <BiblePassageText text={textQuery.data.text} className="text-sm text-slate-600 dark:text-slate-300 leading-[1.9]" />
                  </div>
                  <SaveButton
                    onClick={handleSaveScripture}
                    saved={savedScripture}
                    label="Save scripture"
                  />
                </>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => generateAI("reflect")} disabled={isAiLoading} data-testid="btn-track-reflect">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Reflect
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => generateAI("pray")} disabled={isAiLoading} data-testid="btn-track-pray">
                  <HeartHandshake className="w-3.5 h-3.5 mr-1.5" /> Prayer
                </Button>
              </div>
              {isAiLoading && !aiContent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Reflecting...
                </div>
              )}
              {aiContent && aiMode && (
                <div className="bg-white/60 rounded-xl p-4 border border-white/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {aiMode === "reflect" ? <Sparkles className="w-4 h-4 text-primary" /> : <HeartHandshake className="w-4 h-4 text-primary" />}
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">{aiMode === "reflect" ? "Reflection" : "Prayer"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShareButton
                        title={`${aiMode === "reflect" ? "Reflection" : "Prayer"} — ${passage.reference}`}
                        text={aiContent}
                      />
                      <SaveButton
                        onClick={handleSaveAi}
                        saved={aiMode === "reflect" ? savedReflection : savedPrayer}
                        label={aiMode === "reflect" ? "Save reflection" : "Save prayer"}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                    {aiContent.split("\n").map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/40">
                    <p className="text-[11px] font-semibold text-foreground/60 mb-1.5">How does this speak to you?</p>
                    <textarea
                      data-testid="textarea-track-ai-reply"
                      value={aiReply}
                      onChange={e => { setAiReply(e.target.value); setAiReplySaved(false); }}
                      placeholder="Share a thought or response…"
                      spellCheck
                      rows={2}
                      className="w-full resize-none rounded-lg border border-border/60 bg-white/60 px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <div className="flex justify-end mt-1.5">
                      {aiReplySaved ? (
                        <span className="text-[11px] font-semibold text-primary flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>
                      ) : (
                        <button
                          data-testid="btn-save-track-ai-reply"
                          disabled={!aiReply.trim()}
                          onClick={async () => {
                            if (!aiReply.trim()) return;
                            try {
                              await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ sessionId: getSessionId(), verseRef: passage.reference, verseText: "", content: aiReply.trim(), type: "reflection" }) });
                              setAiReplySaved(true);
                            } catch { setAiReplySaved(true); }
                          }}
                          className="text-[11px] font-bold rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 disabled:opacity-40 hover:bg-primary/90 transition-colors"
                        >Save to Journal</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full track list */}
      <div className="px-5 pb-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Full {track.name} Track · {track.passages.length} passages
        </p>
        <div className="space-y-2">
          {track.passages.map((p, i) => (
            <TrackPassageRow key={p.reference} passage={p} index={i} trackId={track.id} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TrackPassageRow({ passage, index, trackId }: { passage: { reference: string; apiRef: string; title: string }; index: number; trackId: TrackId }) {
  const colors = TRACK_COLORS[trackId];
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const textQuery = usePassageText(passage.apiRef, open);
  const saveJournal = useJournalSave();

  const handleSave = () => {
    if (!textQuery.data) return;
    saveJournal.mutate(
      { type: "verse", content: textQuery.data.text, reference: passage.reference },
      { onSuccess: () => setSaved(true) }
    );
  };

  return (
    <div className="bg-white/40 border border-white/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/30 transition-colors"
        data-testid={`track-passage-${index}`}
      >
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${colors.pill}`}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">{passage.title}</p>
          <p className={`text-[11px] font-medium mt-0.5 ${colors.icon}`}>{passage.reference}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4 pt-2 border-t border-white/20 space-y-3">
              {textQuery.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</div>}
              {textQuery.data && (
                <>
                  <div className="max-h-48 overflow-y-auto">
                    <BiblePassageText text={textQuery.data.text} className="text-sm text-slate-600 dark:text-slate-300 leading-[1.9]" />
                  </div>
                  <SaveButton onClick={handleSave} saved={saved} label="Save scripture" />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function QuickStudyPage() {
  const [topic, setTopic] = useState("");
  const [study, setStudy] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTopic, setActiveTopic] = useState("");
  const [savedStudy, setSavedStudy] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackId | null>(null);
  const [showAiPause, setShowAiPause] = useState(false);

  const [storyFinderOpen, setStoryFinderOpen] = useState(false);
  const [storyDescription, setStoryDescription] = useState("");
  const [storyResult, setStoryResult] = useState("");
  const [storyLoading, setStoryLoading] = useState(false);
  const [savedStory, setSavedStory] = useState(false);
  const [storyReply, setStoryReply] = useState("");
  const [storyReplySaved, setStoryReplySaved] = useState(false);
  const storyInputRef = useRef<HTMLTextAreaElement>(null);

  const saveJournal = useJournalSave();

  const [resumeDismissed, setResumeDismissed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sp_track") as TrackId | null;
    if (saved && TRACKS.find(t => t.id === saved)) setSelectedTrack(saved);
  }, []);

  const selectTrack = (id: TrackId) => {
    setSelectedTrack(id);
    localStorage.setItem("sp_track", id);
    const track = TRACKS.find(t => t.id === id);
    if (track) saveBookmark("study", { trackId: id, label: track.name });
  };

  const clearTrack = () => {
    setSelectedTrack(null);
    localStorage.removeItem("sp_track");
  };

  const activeTrack = TRACKS.find(t => t.id === selectedTrack) ?? null;

  const generate = async (e: React.FormEvent | null, overrideTopic?: string) => {
    if (e) e.preventDefault();
    const q = (overrideTopic ?? topic).trim();
    if (!q) return;
    if (!canUseAi()) { setShowAiPause(true); return; }
    recordAiUsage();
    setLoading(true);
    setStudy("");
    setSubmitted(true);
    setSavedStudy(false);
    setActiveTopic(q);
    try {
      const res = await apiRequest("POST", "/api/chat/passage", {
        passageRef: q,
        passageText: q,
        userName: getUserName() ?? undefined,
        sessionId: getSessionId(),
        daysWithApp: getRelationshipAge(),
        messages: [{
          role: "user",
          content: `Create a short, structured Bible study on: "${q}". Format it as:
1. Key Verses (2–3 relevant scriptures with brief notes)
2. Central Truth (1 paragraph on the main insight)
3. Personal Application (2–3 practical questions to reflect on)
4. Closing Prayer (2–3 sentences)
Keep it warm, accessible, and grounded in Scripture.`,
        }],
      });
      const text = await res.text();
      setStudy(text ?? "");
    } catch {
      setStudy("Sorry, we couldn't generate a study right now. Please try again.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) { setTopic(q); generate(null, q); }
  }, []);

  const reset = () => { setTopic(""); setStudy(""); setSubmitted(false); setActiveTopic(""); setSavedStudy(false); };

  const findStory = async () => {
    const desc = storyDescription.trim();
    if (!desc) return;
    if (!canUseAi()) { setShowAiPause(true); return; }
    recordAiUsage();
    setStoryLoading(true);
    setStoryResult("");
    setSavedStory(false);
    try {
      const result = await streamAI(
        "/api/chat/passage",
        {
          passageRef: "story-finder",
          passageText: desc,
          userName: getUserName() ?? undefined,
          sessionId: getSessionId(),
          daysWithApp: getRelationshipAge(),
          messages: [{
            role: "user",
            content: `A user is trying to find a Bible story or passage they remember. They described it as:

"${desc}"

Your job is to identify the scripture(s) that best match this description. For each match, provide:
- **Story/Passage Name** (the common title, e.g. "The Feeding of the Five Thousand")
- **Reference** (e.g. John 6:1–14; also note any parallel passages)
- **Why it matches** (1 sentence connecting their description to the passage)
- **Key Verse** (the single most memorable line from the passage)

Provide 1–3 matches. If you are confident it is one specific passage, give only that one. If the description is ambiguous, list up to 3 possibilities and briefly note which is the most likely fit.

Be warm, clear, and helpful. End with an encouraging sentence inviting them to read the full passage.`,
          }],
        },
        (text) => setStoryResult(text),
      );
      setStoryResult(result);
    } catch {
      setStoryResult("Sorry, we couldn't search right now. Please try again.");
    }
    setStoryLoading(false);
  };

  const handleSaveStory = () => {
    if (!storyResult) return;
    saveJournal.mutate(
      { type: "reflection", content: `Story Search: "${storyDescription}"\n\n${storyResult}`, reference: "Story Finder" },
      { onSuccess: () => setSavedStory(true) }
    );
  };

  const resetStoryFinder = () => {
    setStoryDescription("");
    setStoryResult("");
    setSavedStory(false);
  };

  const handleSaveStudy = () => {
    if (!study) return;
    saveJournal.mutate(
      { type: "reflection", content: study, reference: activeTopic },
      { onSuccess: () => setSavedStudy(true) }
    );
  };

  return (
    <>
      <NavBar />

      {/* Hero banner */}
      <div className="relative w-full overflow-hidden pt-14" style={{ height: 194 }}>
        <img
          src="/hero-study.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.20) 40%, rgba(0,0,0,0.70) 100%)" }} />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-5 text-center px-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-white/90 text-[10px] font-bold uppercase tracking-widest mb-1.5">
            <Sparkles className="w-2.5 h-2.5" />
            Scripture Study
          </div>
          <h2 className="text-white text-xl font-extrabold tracking-tight leading-tight">Explore Scripture</h2>
          <p className="text-white/70 text-[12px] mt-1">Bring a question, a passage, or what's on your mind.</p>
        </div>
      </div>

      <main className="min-h-screen bg-background pt-6 pb-28 sm:pb-16 px-4">
        <div className="max-w-2xl mx-auto">

          <AnimatePresence>
            {!resumeDismissed && (() => {
              const bm = getBookmark("study");
              return bm && !activeTrack ? (
                <ResumeBar
                  key="study-resume"
                  label={bm.label}
                  onResume={() => {
                    selectTrack(bm.trackId as TrackId);
                    setResumeDismissed(true);
                  }}
                  onDismiss={() => setResumeDismissed(true)}
                />
              ) : null;
            })()}
          </AnimatePresence>

          {/* Search card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="relative bg-card dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-2xl overflow-hidden shadow-sm mb-5"
          >
            {/* Signature top accent bar */}
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-300" />
            <div className="px-6 pt-6 pb-6">
            {!submitted ? (
              <>
                <form onSubmit={generate} className="flex gap-2.5 mb-5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/70 dark:text-amber-400/60 pointer-events-none" />
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="What are you trying to understand?"
                      data-testid="quick-study-input"
                      className="w-full bg-white dark:bg-amber-950/30 border border-amber-300/70 dark:border-amber-700/50 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground dark:text-amber-100 placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/60 transition-all shadow-sm"
                    />
                  </div>
                  <Button type="submit" disabled={!topic.trim()} className="rounded-xl font-semibold shrink-0 px-5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm" data-testid="quick-study-submit">
                    Explore
                  </Button>
                </form>
                <div>
                  <p className="text-[11px] font-bold text-amber-700/80 dark:text-amber-500/70 uppercase tracking-widest mb-3">Some places people begin…</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        data-testid={`suggestion-${s}`}
                        onClick={() => { setTopic(s); generate(null, s); }}
                        className="px-3.5 py-1.5 rounded-full bg-white dark:bg-amber-950/30 hover:bg-amber-50 dark:hover:bg-amber-900/40 border border-amber-300/60 dark:border-amber-700/40 text-[12px] font-semibold text-amber-900/80 dark:text-amber-300/90 hover:text-amber-900 hover:border-amber-400/70 transition-all active:scale-95 shadow-sm"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Finding what scripture says about "{activeTopic}"…</span>
                    </div>
                    {[1, 0.92, 0.85, 0.75, 0.9, 0.8].map((w, i) => (
                      <div key={i} className="h-3 bg-muted animate-pulse rounded-full" style={{ width: `${w * 100}%` }} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="result" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold text-primary uppercase tracking-widest">{activeTopic}</p>
                      <button onClick={reset} className="text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors underline" data-testid="quick-study-reset">
                        New study
                      </button>
                    </div>
                    <div className="text-[15px] text-foreground/80 leading-relaxed space-y-2.5">
                      {study.split("\n").map((line, i) => {
                        if (!line.trim()) return null;
                        const isHeading = /^\d+\.|^#{1,3}\s/.test(line.trim());
                        return isHeading
                          ? <p key={i} className="font-bold text-foreground mt-4 first:mt-0 text-base">{line.replace(/^#+\s/, "")}</p>
                          : <p key={i}>{line}</p>;
                      })}
                    </div>
                    {study && (
                      <div className="mt-5 pt-4 border-t border-border/40 flex items-center gap-4 flex-wrap">
                        <SaveButton
                          onClick={handleSaveStudy}
                          saved={savedStudy}
                          label="Save study to Journal"
                        />
                        <ShareButton
                          title={`Bible Study — ${activeTopic}`}
                          text={study}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            </div>
          </motion.div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-amber-200/50 dark:bg-amber-800/30" />
            <span className="text-[11px] font-semibold text-amber-700/60 dark:text-amber-500/50 uppercase tracking-widest">Paths through Scripture</span>
            <div className="flex-1 h-px bg-amber-200/50 dark:bg-amber-800/30" />
          </div>

          {/* Today's Track Reading */}
          <AnimatePresence>
            {activeTrack && (
              <TodaysTrackCard track={activeTrack} onClear={clearTrack} />
            )}
          </AnimatePresence>

          {/* Track Selector */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <p className="text-xs font-semibold text-amber-700/70 dark:text-amber-500/60 uppercase tracking-widest text-center mb-3">
              {activeTrack ? "Switch Track" : "Follow a Path"}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {TRACKS.map((track) => {
                const colors = TRACK_COLORS[track.id];
                const isActive = selectedTrack === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => isActive ? clearTrack() : selectTrack(track.id)}
                    data-testid={`track-btn-${track.id}`}
                    className={`relative rounded-2xl p-4 text-left transition-all duration-300 border ${
                      isActive
                        ? `${colors.bg} ${colors.border} shadow-md ring-2 ring-offset-1 ring-offset-background ring-current/20`
                        : "bg-[#fdf8f0] dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300/70 hover:shadow-md hover:shadow-amber-100/50"
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{track.icon}</span>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-100 leading-tight">{track.name}</p>
                    <p className="text-[11px] text-amber-700/60 dark:text-amber-400/60 mt-0.5 leading-tight">{track.description}</p>
                    {isActive && (
                      <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${colors.pill}`}>
                        Active
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Story Finder — full-width card */}
              <button
                data-testid="track-btn-story-finder"
                onClick={() => {
                  setStoryFinderOpen(!storyFinderOpen);
                  if (!storyFinderOpen) setTimeout(() => storyInputRef.current?.focus(), 300);
                }}
                className={`col-span-2 rounded-2xl p-4 text-left transition-all duration-300 border ${
                  storyFinderOpen
                    ? "bg-violet-50/70 dark:bg-violet-950/30 border-violet-300/60 dark:border-violet-700/50 shadow-sm"
                    : "bg-[#fdf8f0] dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300/70 hover:shadow-md hover:shadow-amber-100/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔍</span>
                    <div>
                      <p className="text-sm font-bold text-foreground leading-tight">Looking for something specific?</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                        A verse, a moment, or something you remember…
                      </p>
                    </div>
                  </div>
                  <motion.div animate={{ rotate: storyFinderOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                </div>
              </button>
            </div>

            {/* Story Finder expanded panel */}
            <AnimatePresence>
              {storyFinderOpen && (
                <motion.div
                  key="story-finder-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2.5 bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-700/40 rounded-2xl px-5 py-5 space-y-4">

                    {!storyResult ? (
                      <>
                        <div>
                          <p className="text-[12px] font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-widest mb-2">
                            Story, verse, or memory
                          </p>
                          <textarea
                            ref={storyInputRef}
                            value={storyDescription}
                            onChange={(e) => setStoryDescription(e.target.value)}
                            spellCheck
                            data-testid="story-finder-input"
                            placeholder={'e.g. "Someone walks on water", "all the peace verses", "Jesus near a pool", or John 3:16'}
                            rows={3}
                            className="w-full bg-white/70 dark:bg-background border border-violet-200/60 dark:border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-400/30 resize-none placeholder:text-muted-foreground/60 leading-relaxed"
                          />
                        </div>
                        <Button
                          onClick={findStory}
                          disabled={!storyDescription.trim() || storyLoading}
                          data-testid="story-finder-submit"
                          className="w-full rounded-xl font-semibold bg-violet-600 hover:bg-violet-700 text-white border-0 py-5"
                        >
                          {storyLoading
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching Scripture…</>
                            : <><BookOpen className="w-4 h-4 mr-2" /> Find the Story</>
                          }
                        </Button>
                        {storyLoading && (
                          <div className="space-y-2 pt-1">
                            {[1, 0.88, 0.75, 0.92, 0.68].map((w, i) => (
                              <div key={i} className="h-3 bg-violet-200/60 dark:bg-violet-800/40 animate-pulse rounded-full" style={{ width: `${w * 100}%` }} />
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-violet-600" />
                            <span className="text-[11px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest">Story Found</span>
                          </div>
                          <button
                            onClick={resetStoryFinder}
                            data-testid="story-finder-reset"
                            className="text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors underline"
                          >
                            Search again
                          </button>
                        </div>
                        <div className="bg-white/60 dark:bg-background/60 rounded-xl p-4 border border-violet-200/40">
                          <div className="text-[14px] text-foreground/80 leading-relaxed space-y-2.5">
                            {storyResult.split("\n").map((line, i) => {
                              if (!line.trim()) return null;
                              const isBold = /^\*\*/.test(line.trim()) || /^#{1,3}\s/.test(line.trim());
                              const clean = line.replace(/^\*\*|\*\*$/g, "").replace(/^#+\s/, "").replace(/\*\*(.*?)\*\*/g, "$1");
                              return isBold
                                ? <p key={i} className="font-bold text-foreground mt-3 first:mt-0">{clean}</p>
                                : <p key={i}>{clean}</p>;
                            })}
                          </div>
                        </div>
                        <div className="pt-3 flex items-center gap-4 flex-wrap">
                          <SaveButton
                            onClick={handleSaveStory}
                            saved={savedStory}
                            label="Save to Journal"
                          />
                          <ShareButton
                            title="Bible Story Found — Shepherd's Path"
                            text={`${storyDescription}\n\n${storyResult}`}
                          />
                        </div>
                        <div className="mt-3 pt-3 border-t border-violet-200/40">
                          <p className="text-[11px] font-semibold text-foreground/60 mb-1.5">Your reflection</p>
                          <textarea
                            data-testid="textarea-story-reply"
                            value={storyReply}
                            onChange={e => { setStoryReply(e.target.value); setStoryReplySaved(false); }}
                            placeholder="What struck you? How does this apply to your life right now?"
                            spellCheck
                            rows={3}
                            className="w-full resize-none rounded-lg border border-border/60 bg-white/60 dark:bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          <div className="flex justify-end mt-1.5">
                            {storyReplySaved ? (
                              <span className="text-[11px] font-semibold text-primary flex items-center gap-1"><Check className="w-3 h-3" /> Saved to journal</span>
                            ) : (
                              <button
                                data-testid="btn-save-story-reply"
                                disabled={!storyReply.trim()}
                                onClick={async () => {
                                  if (!storyReply.trim()) return;
                                  try {
                                    await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ sessionId: getSessionId(), verseRef: "Story Finder", verseText: storyDescription, content: storyReply.trim(), type: "reflection" }) });
                                    setStoryReplySaved(true);
                                  } catch { setStoryReplySaved(true); }
                                }}
                                className="text-[11px] font-bold rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 disabled:opacity-40 hover:bg-primary/90 transition-colors"
                              >Save to Journal</button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>

          {/* Subscribe — shown at bottom */}
          <div className="mt-6">
            <InlineSubscribeToggle />
          </div>

        </div>
      </main>

      <AnimatePresence>
        {showAiPause && <AiPauseModal onClose={() => setShowAiPause(false)} />}
      </AnimatePresence>
    </>
  );
}
