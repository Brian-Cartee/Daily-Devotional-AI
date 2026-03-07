import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight, Sparkles, Loader2, Minus, Plus, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { BIBLE_BOOKS } from "@/data/bibleBooks";
import { capitalizeDivinePronouns } from "@/lib/divinePronouns";
import { getStoredLang, getStoredLangInfo } from "@/lib/language";
import { getHeroImage } from "@/lib/heroImage";

type AIPanel = "explain" | "context" | "apply" | "crossref" | "chat" | null;

const TRANSLATIONS = [
  { code: "kjv", label: "KJV", full: "King James Version" },
  { code: "web", label: "WEB", full: "World English Bible" },
  { code: "asv", label: "ASV", full: "American Standard Version" },
];

const LS_FONT = "sp_font_size";
const LS_TRANS = "sp_translation";

function useChapterText(bookName: string, chapter: number, translation: string) {
  const ref = `${bookName.toLowerCase().replace(/ /g, "+")}+${chapter}`;
  const url = `/api/bible?ref=${encodeURIComponent(ref)}&translation=${encodeURIComponent(translation)}`;
  return useQuery<{ text: string; reference: string }>({
    queryKey: ["/api/bible", ref, translation],
    queryFn: () => fetch(url).then((r) => r.json()),
    enabled: !!bookName && chapter > 0,
  });
}

function usePassageAI() {
  return useMutation({
    mutationFn: (data: { passageRef: string; passageText: string; messages: Array<{ role: string; content: string }>; lang?: string }) =>
      apiRequest("POST", "/api/chat/passage", data).then((r) => r.json()),
  });
}

const AI_PROMPTS: Record<string, string> = {
  explain: "Explain this chapter in simple, clear language as if talking to someone new to the Bible. Keep it to 3-4 paragraphs.",
  context: "Provide historical and cultural context for this chapter. Who wrote it, when, why, and what was happening at the time? 2-3 paragraphs.",
  apply: "Give 3 specific, practical ways a person today can apply the teachings of this chapter to their daily life.",
  crossref: "List 4-5 other Bible passages that connect to the themes of this chapter, and briefly explain each connection.",
};

export default function ReadBible() {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [activePanel, setActivePanel] = useState<AIPanel>(null);
  const [aiResult, setAiResult] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [fontSize, setFontSize] = useState<number>(() => {
    const stored = localStorage.getItem(LS_FONT);
    return stored ? parseInt(stored, 10) : 100;
  });

  const [translation, setTranslation] = useState<string>(() => {
    return localStorage.getItem(LS_TRANS) || "kjv";
  });

  const [showTransMenu, setShowTransMenu] = useState(false);

  useEffect(() => { localStorage.setItem(LS_FONT, String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem(LS_TRANS, translation); }, [translation]);

  const book = BIBLE_BOOKS.find((b) => b.name === selectedBook);
  const chapterText = useChapterText(selectedBook ?? "", selectedChapter, translation);
  const passageAI = usePassageAI();

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleBookSelect = (bookName: string) => {
    setSelectedBook(bookName);
    setSelectedChapter(1);
    setActivePanel(null);
    setAiResult("");
    setChatMessages([]);
  };

  const navigateChapter = (dir: -1 | 1) => {
    if (!book) return;
    const next = selectedChapter + dir;
    if (next < 1 || next > book.chapters) return;
    setSelectedChapter(next);
    setActivePanel(null);
    setAiResult("");
    setChatMessages([]);
  };

  const changeFontSize = (delta: number) => {
    setFontSize((prev) => Math.max(70, Math.min(160, prev + delta)));
  };

  const handleAI = async (type: Exclude<AIPanel, "chat" | null>) => {
    if (!chapterText.data) return;
    setActivePanel(type);
    setAiResult("");
    const lang = getStoredLang();
    const res = await passageAI.mutateAsync({
      passageRef: `${selectedBook} ${selectedChapter}`,
      passageText: chapterText.data.text,
      messages: [{ role: "user", content: AI_PROMPTS[type] }],
      lang,
    });
    setAiResult(capitalizeDivinePronouns(res.content));
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !chapterText.data) return;
    const newMessages = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");
    const lang = getStoredLang();
    const res = await passageAI.mutateAsync({
      passageRef: `${selectedBook} ${selectedChapter}`,
      passageText: chapterText.data.text,
      messages: newMessages,
      lang,
    });
    setChatMessages([...newMessages, { role: "assistant", content: capitalizeDivinePronouns(res.content) }]);
  };

  const OT = BIBLE_BOOKS.filter((b) => b.testament === "OT");
  const NT = BIBLE_BOOKS.filter((b) => b.testament === "NT");
  const currentTrans = TRANSLATIONS.find((t) => t.code === translation) ?? TRANSLATIONS[0];

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-background pt-14">
        {/* Hero */}
        <div className="relative h-44 sm:h-52 overflow-hidden">
          <img
            src={getHeroImage("read")}
            alt="Read the Bible"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/65" />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex flex-col items-center justify-end h-full pb-6 text-center px-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/25 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-widest mb-2">
              <BookOpen className="w-3 h-3" />
              Full Bible
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">Read the Bible</h1>
            <p className="text-white/90 text-xs mt-1.5 drop-shadow" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>Every book. Every chapter. With AI insight.</p>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto">
          {!selectedBook ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="px-5 py-10"
            >
              <div className="text-center mb-10">
                <p className="text-muted-foreground text-sm">Choose a book to begin reading</p>
              </div>
              {[{ label: "Old Testament", books: OT }, { label: "New Testament", books: NT }].map(({ label, books }) => (
                <div key={label} className="mb-8">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">{label}</h2>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {books.map((b) => (
                      <button
                        key={b.name}
                        onClick={() => handleBookSelect(b.name)}
                        data-testid={`book-${b.short}`}
                        className="bg-card border border-border rounded-xl px-3 py-3 text-left hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm transition-all group"
                      >
                        <p className="text-[13px] font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">{b.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{b.chapters} ch</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px)]">
              <div className="flex-1 flex flex-col">
                {/* Chapter navigation bar */}
                <div className="sticky top-14 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-3 py-2 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 transition-colors shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Books</span>
                  </button>

                  <div className="flex-1 text-center min-w-0">
                    <span className="font-semibold text-foreground text-sm">{selectedBook}</span>
                    <span className="text-muted-foreground ml-1.5 text-xs">Ch. {selectedChapter}</span>
                  </div>

                  {/* Chapter prev/next */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => navigateChapter(-1)} disabled={selectedChapter <= 1} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent/50 disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <select
                      value={selectedChapter}
                      onChange={(e) => { setSelectedChapter(Number(e.target.value)); setActivePanel(null); setAiResult(""); setChatMessages([]); }}
                      className="bg-transparent text-xs font-medium text-foreground w-12 text-center outline-none cursor-pointer"
                      data-testid="select-chapter"
                    >
                      {Array.from({ length: book?.chapters ?? 1 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <button onClick={() => navigateChapter(1)} disabled={!book || selectedChapter >= book.chapters} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent/50 disabled:opacity-30 transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Translation selector */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setShowTransMenu((v) => !v)}
                      data-testid="btn-translation"
                      className="px-2 py-1 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all flex items-center gap-1"
                    >
                      {currentTrans.label}
                    </button>
                    <AnimatePresence>
                      {showTransMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.97 }}
                          transition={{ duration: 0.12 }}
                          className="absolute right-0 top-9 z-50 bg-background border border-border rounded-xl shadow-lg py-1.5 min-w-[190px]"
                        >
                          {TRANSLATIONS.map((t) => (
                            <button
                              key={t.code}
                              data-testid={`trans-${t.code}`}
                              onClick={() => { setTranslation(t.code); setShowTransMenu(false); }}
                              className="w-full flex items-center justify-between px-3.5 py-2 text-sm hover:bg-muted/70 transition-colors"
                            >
                              <span>
                                <span className="font-semibold">{t.label}</span>
                                <span className="text-muted-foreground text-xs ml-2">{t.full}</span>
                              </span>
                              {translation === t.code && <Check className="w-3.5 h-3.5 text-primary ml-2 shrink-0" />}
                            </button>
                          ))}
                          <div className="border-t border-border/40 mt-1 pt-1 px-3.5 py-1.5 text-[10px] text-muted-foreground">
                            NKJV / Amplified coming soon
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Font size adjuster */}
                  <div className="flex items-center gap-0.5 shrink-0 border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => changeFontSize(-10)}
                      disabled={fontSize <= 70}
                      data-testid="btn-font-smaller"
                      aria-label="Decrease font size"
                      className="w-7 h-7 flex items-center justify-center hover:bg-muted/70 disabled:opacity-30 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-semibold text-muted-foreground w-8 text-center select-none">{fontSize}%</span>
                    <button
                      onClick={() => changeFontSize(10)}
                      disabled={fontSize >= 160}
                      data-testid="btn-font-larger"
                      aria-label="Increase font size"
                      className="w-7 h-7 flex items-center justify-center hover:bg-muted/70 disabled:opacity-30 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Chapter text */}
                <div className="flex-1 px-6 sm:px-10 py-10 max-w-xl mx-auto w-full">
                  {chapterText.isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-sm">Loading {selectedBook} {selectedChapter}...</span>
                    </div>
                  )}
                  {chapterText.isError && (
                    <div className="text-center py-16 text-muted-foreground">
                      <p>Could not load this chapter. Please try again.</p>
                      <Button variant="outline" className="mt-4 rounded-full" onClick={() => chapterText.refetch()}>Retry</Button>
                    </div>
                  )}
                  {chapterText.data && (
                    <motion.div
                      key={`${selectedBook}-${selectedChapter}-${translation}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <div className="mb-8">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-1">{selectedBook}</p>
                        <h2 className="reading-chapter-title text-foreground">Chapter {selectedChapter}</h2>
                        <div className="h-px bg-border mt-4" />
                      </div>

                      <div className="reading-text text-foreground/85" style={{ fontSize: `${fontSize}%` }}>
                        {chapterText.data.text
                          .split('\n')
                          .filter(line => line.trim())
                          .map((line, i) => {
                            const match = line.match(/^\[(\d+)\] (.*)/);
                            if (!match) return <span key={i}>{line} </span>;
                            const [, num, text] = match;
                            return (
                              <span key={i}>
                                <span className="reading-verse-num">{num}</span>
                                {text}{' '}
                              </span>
                            );
                          })}
                      </div>

                      <div className="flex justify-between mt-14 pt-6 border-t border-border/40">
                        <Button variant="ghost" onClick={() => navigateChapter(-1)} disabled={selectedChapter <= 1} className="rounded-xl gap-2 font-semibold text-sm">
                          <ChevronLeft className="w-4 h-4" />Previous
                        </Button>
                        <div className="text-xs text-muted-foreground self-center font-medium">{selectedBook} · Ch. {selectedChapter}</div>
                        <Button variant="ghost" onClick={() => navigateChapter(1)} disabled={!book || selectedChapter >= book.chapters} className="rounded-xl gap-2 font-semibold text-sm">
                          Next<ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* AI sidebar */}
              {chapterText.data && (
                <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-white/20 dark:border-slate-700/30 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
                  <div className="p-4 sticky top-14">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">AI Assistance</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {[
                        { key: "explain", label: "Explain simply" },
                        { key: "context", label: "Historical context" },
                        { key: "apply", label: "Life application" },
                        { key: "crossref", label: "Cross-references" },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => handleAI(key as "explain" | "context" | "apply" | "crossref")}
                          disabled={passageAI.isPending}
                          data-testid={`btn-ai-${key}`}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            activePanel === key
                              ? "bg-primary text-primary-foreground border-transparent"
                              : "bg-white/60 dark:bg-slate-700/60 text-muted-foreground hover:text-foreground border-white/30 dark:border-slate-600/40"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        onClick={() => { setActivePanel("chat"); setAiResult(""); }}
                        data-testid="btn-ai-chat"
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          activePanel === "chat"
                            ? "bg-primary text-primary-foreground border-transparent"
                            : "bg-white/60 dark:bg-slate-700/60 text-muted-foreground hover:text-foreground border-white/30 dark:border-slate-600/40"
                        }`}
                      >
                        Ask a question
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {passageAI.isPending && activePanel !== "chat" && (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                          <Loader2 className="w-4 h-4 animate-spin" />Thinking...
                        </motion.div>
                      )}
                      {aiResult && activePanel && activePanel !== "chat" && !passageAI.isPending && (
                        <motion.div key={activePanel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white/60 dark:bg-slate-700/50 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2 max-h-80 overflow-y-auto">
                          {aiResult.split("\n").map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
                        </motion.div>
                      )}
                      {activePanel === "chat" && (
                        <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                          <div className="bg-white/50 dark:bg-slate-700/40 rounded-xl p-3 max-h-60 overflow-y-auto space-y-2">
                            {chatMessages.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-3">Ask anything about {selectedBook} {selectedChapter}</p>
                            )}
                            {chatMessages.map((m, i) => (
                              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-white/80 dark:bg-slate-600/80 text-slate-700 dark:text-slate-200"}`}>
                                  {m.content}
                                </div>
                              </div>
                            ))}
                            {passageAI.isPending && (
                              <div className="flex justify-start">
                                <div className="bg-white/60 dark:bg-slate-600/60 px-3 py-2 rounded-xl">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                </div>
                              </div>
                            )}
                            <div ref={chatBottomRef} />
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                              placeholder="Ask a question..."
                              className="flex-1 bg-white/60 dark:bg-slate-700/60 border border-white/30 dark:border-slate-600/40 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                              disabled={passageAI.isPending}
                              data-testid="input-chat"
                            />
                            <Button size="sm" onClick={sendChat} disabled={!chatInput.trim() || passageAI.isPending} className="rounded-xl text-xs px-3" data-testid="btn-chat-send">Send</Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
