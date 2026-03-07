import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, ChevronDown, Sparkles, HeartHandshake, Loader2, BookMarked, BookOpen, X, Search } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { GUIDED_PATH, type GuidedChapter } from "@/data/guidedPath";
import { TRACKS, getTodaysPassage, getPassageIndex, type TrackId, type Track } from "@/data/trackPaths";
import { useQuery } from "@tanstack/react-query";

function QuickStudy() {
  const [topic, setTopic] = useState("");
  const [study, setStudy] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setStudy("");
    setSubmitted(true);
    try {
      const res = await apiRequest("POST", "/api/chat/passage", {
        passageRef: topic.trim(),
        passageText: topic.trim(),
        messages: [{
          role: "user",
          content: `Create a short, structured Bible study on: "${topic.trim()}". Format it as:
1. Key Verses (2–3 relevant scriptures with brief notes)
2. Central Truth (1 paragraph on the main insight)
3. Personal Application (2–3 practical questions to reflect on)
4. Closing Prayer (2–3 sentences)
Keep it warm, accessible, and grounded in Scripture.`,
        }],
      });
      const data = await res.json();
      setStudy(data.content ?? "");
    } catch {
      setStudy("Sorry, we couldn't generate a study right now. Please try again.");
    }
    setLoading(false);
  };

  const reset = () => { setTopic(""); setStudy(""); setSubmitted(false); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.6 }}
      className="bg-card border border-border/60 rounded-2xl px-6 py-5 shadow-sm mb-7"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <Search className="w-4 h-4 text-primary shrink-0" />
        <div>
          <p className="text-[13px] font-bold text-foreground">Quick Bible Study</p>
          <p className="text-[11px] text-muted-foreground">Any topic, passage, or question</p>
        </div>
      </div>

      {!submitted ? (
        <form onSubmit={generate} className="flex gap-2.5">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder='e.g. "anxiety", "Romans 8", "forgiveness"'
            data-testid="quick-study-input"
            className="flex-1 bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25 min-w-0"
          />
          <Button type="submit" size="sm" disabled={!topic.trim()} className="rounded-xl font-semibold shrink-0" data-testid="quick-study-submit">
            Study
          </Button>
        </form>
      ) : (
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5 py-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Preparing your study on "{topic}"...</span>
              </div>
              {[1, 0.9, 0.8, 0.7].map((w, i) => (
                <div key={i} className="h-3 bg-muted animate-pulse rounded-full" style={{ width: `${w * 100}%` }} />
              ))}
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">{topic}</p>
                <button onClick={reset} className="text-[11px] text-muted-foreground hover:text-foreground underline" data-testid="quick-study-reset">New study</button>
              </div>
              <div className="text-sm text-foreground/80 leading-relaxed space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {study.split("\n").map((line, i) => {
                  if (!line.trim()) return null;
                  const isHeading = /^\d+\.|^#{1,3}\s/.test(line.trim());
                  return isHeading
                    ? <p key={i} className="font-bold text-foreground mt-3 first:mt-0">{line.replace(/^#+\s/, "")}</p>
                    : <p key={i}>{line}</p>;
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

const TRACK_COLORS: Record<TrackId, { bg: string; border: string; pill: string; icon: string }> = {
  psalms:   { bg: "bg-amber-50/60",  border: "border-amber-200/60",  pill: "bg-amber-100 text-amber-700",   icon: "text-amber-500" },
  proverbs: { bg: "bg-yellow-50/60", border: "border-yellow-200/60", pill: "bg-yellow-100 text-yellow-700",  icon: "text-yellow-600" },
  gospel:   { bg: "bg-indigo-50/60", border: "border-indigo-200/60", pill: "bg-indigo-100 text-indigo-700",  icon: "text-indigo-500" },
  wisdom:   { bg: "bg-teal-50/60",   border: "border-teal-200/60",   pill: "bg-teal-100 text-teal-700",     icon: "text-teal-600" },
};

function usePassageChat() {
  return useMutation({
    mutationFn: (data: { passageRef: string; passageText: string; messages: Array<{ role: string; content: string }> }) =>
      apiRequest("POST", "/api/chat/passage", data).then((r) => r.json()),
  });
}

function usePassageText(apiRef: string, enabled: boolean) {
  const url = `/api/bible?ref=${encodeURIComponent(apiRef)}`;
  return useQuery<{ text: string; reference: string }>({ queryKey: [url], enabled });
}

function TodaysTrackCard({ track }: { track: Track }) {
  const passage = getTodaysPassage(track);
  const index = getPassageIndex(track);
  const colors = TRACK_COLORS[track.id];
  const [open, setOpen] = useState(false);
  const textQuery = usePassageText(passage.apiRef, open);
  const [aiContent, setAiContent] = useState("");
  const [aiMode, setAiMode] = useState<"reflect" | "pray" | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const generateAI = async (type: "reflect" | "pray") => {
    setAiMode(type);
    setAiContent("");
    setIsAiLoading(true);
    const passageText = textQuery.data?.text ?? passage.title;
    try {
      const res = await apiRequest("POST", "/api/chat/passage", {
        passageRef: passage.reference,
        passageText,
        messages: [{
          role: "user",
          content: type === "reflect"
            ? `Write a 2-paragraph devotional reflection on ${passage.reference} that helps someone understand why this passage matters for their life today.`
            : `Write a heartfelt prayer based on the themes of ${passage.reference} — ${passage.title}. Keep it personal, warm, and about 3 sentences.`,
        }],
      });
      const data = await res.json();
      setAiContent(data.content);
    } catch {
      setAiContent("Sorry, we couldn't generate a response right now. Please try again.");
    }
    setIsAiLoading(false);
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
        </div>
        <h3 className="text-lg font-bold text-foreground leading-tight">{passage.title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5 mb-4">{passage.reference}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(!open)}
          className="rounded-full text-xs"
          data-testid="btn-open-today-passage"
        >
          <BookOpen className="w-3.5 h-3.5 mr-1.5" />
          {open ? "Close" : "Open Passage"}
        </Button>
      </div>

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
                <div className="bg-white/50 rounded-xl p-4 max-h-60 overflow-y-auto">
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{textQuery.data.text}</p>
                </div>
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
                  <div className="flex items-center gap-2 mb-2">
                    {aiMode === "reflect" ? <Sparkles className="w-4 h-4 text-primary" /> : <HeartHandshake className="w-4 h-4 text-primary" />}
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">{aiMode === "reflect" ? "Reflection" : "Prayer"}</span>
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                    {aiContent.split("\n").map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TrackPassageRow({ passage, index, trackId }: { passage: { reference: string; apiRef: string; title: string }; index: number; trackId: TrackId }) {
  const colors = TRACK_COLORS[trackId];
  const [open, setOpen] = useState(false);
  const textQuery = usePassageText(passage.apiRef, open);

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
            <div className="px-4 pb-4 pt-2 border-t border-white/20">
              {textQuery.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</div>}
              {textQuery.data && (
                <p className="text-sm text-slate-600 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">{textQuery.data.text}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChapterCard({ chapter }: { chapter: GuidedChapter }) {
  const [open, setOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"reflect" | "pray" | "chat" | null>(null);
  const [aiContent, setAiContent] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const textQuery = usePassageText(chapter.apiRef, open);
  const passageChat = usePassageChat();

  const generateAI = async (type: "reflect" | "pray") => {
    setAiMode(type);
    setAiContent("");
    setIsAiLoading(true);
    const passageText = textQuery.data?.text ?? chapter.summary;
    try {
      const res = await apiRequest("POST", "/api/chat/passage", {
        passageRef: chapter.reference,
        passageText,
        messages: [{
          role: "user",
          content: type === "reflect"
            ? `Write a 2-paragraph devotional reflection on ${chapter.reference} that helps someone understand why this passage matters for their life today.`
            : `Write a heartfelt prayer based on the themes of ${chapter.reference} — ${chapter.title}. Keep it personal, warm, and about 3 sentences.`,
        }],
      });
      const data = await res.json();
      setAiContent(data.content);
    } catch {
      setAiContent("Sorry, we couldn't generate a response right now. Please try again.");
    }
    setIsAiLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const newMessages = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");
    setIsAiLoading(true);
    const passageText = textQuery.data?.text ?? chapter.summary;
    try {
      const res = await apiRequest("POST", "/api/chat/passage", { passageRef: chapter.reference, passageText, messages: newMessages });
      const data = await res.json();
      setChatMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "Sorry, I couldn't respond. Please try again." }]);
    }
    setIsAiLoading(false);
  };

  return (
    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/30 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-white/30 dark:hover:bg-slate-700/20 transition-colors"
        data-testid={`chapter-toggle-${chapter.id}`}
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
          {chapter.order}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-primary uppercase tracking-wide">{chapter.reference}</span>
          </div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base leading-tight">{chapter.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{chapter.summary}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="px-5 pb-5 space-y-4 border-t border-white/20 dark:border-slate-700/30 pt-4">
              <div className="bg-primary/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookMarked className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">Why it matters</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{chapter.whyItMatters}</p>
              </div>
              {textQuery.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading passage...</div>}
              {textQuery.data && (
                <div className="bg-white/40 dark:bg-slate-700/30 rounded-xl p-4 max-h-56 overflow-y-auto">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{textQuery.data.text}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => generateAI("reflect")} disabled={isAiLoading} data-testid={`btn-reflect-${chapter.id}`}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI Reflection
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => generateAI("pray")} disabled={isAiLoading} data-testid={`btn-pray-${chapter.id}`}>
                  <HeartHandshake className="w-3.5 h-3.5 mr-1.5" /> Prayer
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" onClick={() => { setAiMode("chat"); setChatMessages([]); }} disabled={isAiLoading}>
                  Ask a question
                </Button>
              </div>
              {isAiLoading && !aiContent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin" /> Reflecting on {chapter.reference}...</div>
              )}
              {aiContent && (aiMode === "reflect" || aiMode === "pray") && (
                <div className="bg-white/50 dark:bg-slate-700/40 rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-3">
                    {aiMode === "reflect" ? <Sparkles className="w-4 h-4 text-primary" /> : <HeartHandshake className="w-4 h-4 text-primary" />}
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">{aiMode === "reflect" ? "Reflection" : "Prayer"}</span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                    {aiContent.split("\n").map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
                  </div>
                </div>
              )}
              {aiMode === "chat" && (
                <div className="space-y-3">
                  <div className="bg-white/40 dark:bg-slate-700/30 rounded-xl p-3 max-h-52 overflow-y-auto space-y-2">
                    {chatMessages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Ask anything about {chapter.reference}</p>}
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-white/60 dark:bg-slate-600/60 text-slate-700 dark:text-slate-200"}`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {isAiLoading && <div className="flex justify-start"><div className="bg-white/60 dark:bg-slate-600/60 px-3 py-2 rounded-xl"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div></div>}
                  </div>
                  <div className="flex gap-2">
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="Ask a question..." className="flex-1 bg-white/60 dark:bg-slate-700/60 border border-white/30 dark:border-slate-600/40 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" disabled={isAiLoading} />
                    <Button size="sm" onClick={sendChat} disabled={!chatInput.trim() || isAiLoading} className="rounded-xl">Send</Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const THEMES = Array.from(new Set(GUIDED_PATH.map((c) => c.theme)));

export default function UnderstandBible() {
  const [selectedTrack, setSelectedTrack] = useState<TrackId | null>(null);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sp_track") as TrackId | null;
    if (saved && TRACKS.find(t => t.id === saved)) setSelectedTrack(saved);
  }, []);

  const selectTrack = (id: TrackId) => {
    setSelectedTrack(id);
    localStorage.setItem("sp_track", id);
  };

  const clearTrack = () => {
    setSelectedTrack(null);
    localStorage.removeItem("sp_track");
  };

  const activeTrack = TRACKS.find(t => t.id === selectedTrack) ?? null;
  const filtered = activeTheme ? GUIDED_PATH.filter((c) => c.theme === activeTheme) : GUIDED_PATH;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-background pt-20 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Hero header */}
          <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden mb-8">
            <img src="/hero-understand.png" alt="Guided path" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative z-10 flex flex-col items-center justify-end h-full pb-6 text-center px-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-white/70 text-[11px] font-bold uppercase tracking-widest mb-2">
                <Compass className="w-3 h-3" />
                Guided Path
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">Bible Journey</h1>
              <p className="text-white/60 text-xs mt-1.5 max-w-xs">Choose a track. Follow it daily.</p>
            </motion.div>
          </div>

          {/* Quick Bible Study */}
          <QuickStudy />

          {/* Track Selector */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mb-6"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-3">Choose Your Track</p>
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
                        : "bg-white/40 border-border/40 hover:bg-white/60 hover:shadow-sm"
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{track.icon}</span>
                    <p className="text-sm font-bold text-foreground leading-tight">{track.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{track.description}</p>
                    {isActive && (
                      <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${colors.pill}`}>
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Today's Track Reading */}
          <AnimatePresence>
            {activeTrack && (
              <motion.div
                key={activeTrack.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Today's Reading</p>
                  <button onClick={clearTrack} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors" data-testid="btn-clear-track">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <TodaysTrackCard track={activeTrack} />

                {/* Full track list */}
                <div className="mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Full {activeTrack.name} Track · {activeTrack.passages.length} passages
                  </p>
                  <div className="space-y-2">
                    {activeTrack.passages.map((passage, i) => (
                      <TrackPassageRow key={passage.reference} passage={passage} index={i} trackId={activeTrack.id} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider to full journey */}
          {activeTrack && (
            <div className="flex items-center gap-3 my-8">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Full Guided Journey</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
          )}

          {/* Theme filter pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2 justify-center mb-6"
          >
            <button
              onClick={() => setActiveTheme(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeTheme === null ? "bg-primary text-primary-foreground" : "bg-white/50 dark:bg-slate-700/50 text-muted-foreground hover:text-foreground border border-white/30"}`}
            >
              All
            </button>
            {THEMES.map((theme) => (
              <button
                key={theme}
                onClick={() => setActiveTheme(activeTheme === theme ? null : theme)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeTheme === theme ? "bg-primary text-primary-foreground" : "bg-white/50 dark:bg-slate-700/50 text-muted-foreground hover:text-foreground border border-white/30"}`}
              >
                {theme}
              </button>
            ))}
          </motion.div>

          {/* Chapter cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="space-y-3"
          >
            {filtered.map((chapter) => (
              <ChapterCard key={chapter.id} chapter={chapter} />
            ))}
          </motion.div>
        </div>
      </main>
    </>
  );
}
