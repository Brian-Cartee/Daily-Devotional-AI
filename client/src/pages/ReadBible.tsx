import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight, Sparkles, Loader2, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { BIBLE_BOOKS } from "@/data/bibleBooks";

type AIPanel = "explain" | "context" | "apply" | "crossref" | "chat" | null;

function useChapterText(bookName: string, chapter: number) {
  const ref = `${bookName.toLowerCase().replace(/ /g, "+")}+${chapter}`;
  const url = `/api/bible?ref=${encodeURIComponent(ref)}`;
  return useQuery<{ text: string; reference: string }>({
    queryKey: [url],
    enabled: !!bookName && chapter > 0,
  });
}

function usePassageAI() {
  return useMutation({
    mutationFn: (data: { passageRef: string; passageText: string; messages: Array<{ role: string; content: string }> }) =>
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

  const book = BIBLE_BOOKS.find((b) => b.name === selectedBook);
  const chapterText = useChapterText(selectedBook ?? "", selectedChapter);
  const passageAI = usePassageAI();

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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

  const handleAI = async (type: Exclude<AIPanel, "chat" | null>) => {
    if (!chapterText.data) return;
    setActivePanel(type);
    setAiResult("");
    const prompt = AI_PROMPTS[type];
    const res = await passageAI.mutateAsync({
      passageRef: `${selectedBook} ${selectedChapter}`,
      passageText: chapterText.data.text,
      messages: [{ role: "user", content: prompt }],
    });
    setAiResult(res.content);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !chapterText.data) return;
    const newMessages = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");
    const res = await passageAI.mutateAsync({
      passageRef: `${selectedBook} ${selectedChapter}`,
      passageText: chapterText.data.text,
      messages: newMessages,
    });
    setChatMessages([...newMessages, { role: "assistant", content: res.content }]);
  };

  const OT = BIBLE_BOOKS.filter((b) => b.testament === "OT");
  const NT = BIBLE_BOOKS.filter((b) => b.testament === "NT");

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-background pt-14">
        <div className="max-w-4xl mx-auto">
          {!selectedBook ? (
            // Book picker
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="px-5 py-10"
            >
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-4">
                  <BookOpen className="w-4 h-4" />
                  Full Bible
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground mb-2">
                  Read the Bible
                </h1>
                <p className="text-muted-foreground text-sm">
                  Choose a book to begin reading
                </p>
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
                        className="bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700/30 rounded-xl px-3 py-3 text-left hover:bg-white/80 dark:hover:bg-slate-700/60 hover:shadow-sm transition-all"
                      >
                        <p className="text-xs font-semibold text-foreground leading-tight">{b.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.chapters} ch</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            // Reading view
            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px)]">
              {/* Main reading pane */}
              <div className="flex-1 flex flex-col">
                {/* Chapter navigation bar */}
                <div className="sticky top-14 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-white/20 dark:border-slate-700/30 px-4 py-3 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Books</span>
                  </button>

                  <div className="flex-1 text-center">
                    <span className="font-semibold text-foreground">{selectedBook}</span>
                    <span className="text-muted-foreground ml-2 text-sm">Chapter {selectedChapter}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigateChapter(-1)}
                      disabled={selectedChapter <= 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent/50 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Chapter selector */}
                    <select
                      value={selectedChapter}
                      onChange={(e) => { setSelectedChapter(Number(e.target.value)); setActivePanel(null); setAiResult(""); setChatMessages([]); }}
                      className="bg-transparent text-sm font-medium text-foreground w-16 text-center outline-none cursor-pointer"
                      data-testid="select-chapter"
                    >
                      {Array.from({ length: book?.chapters ?? 1 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => navigateChapter(1)}
                      disabled={!book || selectedChapter >= book.chapters}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent/50 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chapter text */}
                <div className="flex-1 px-5 sm:px-8 py-8 max-w-2xl mx-auto w-full">
                  {chapterText.isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-sm">Loading {selectedBook} {selectedChapter}...</span>
                    </div>
                  )}
                  {chapterText.isError && (
                    <div className="text-center py-16 text-muted-foreground">
                      <p>Could not load this chapter. Please try again.</p>
                      <Button variant="outline" className="mt-4 rounded-full" onClick={() => chapterText.refetch()}>
                        Retry
                      </Button>
                    </div>
                  )}
                  {chapterText.data && (
                    <motion.div
                      key={`${selectedBook}-${selectedChapter}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <h2 className="text-lg font-serif font-semibold text-foreground mb-6">
                        {chapterText.data.reference}
                      </h2>
                      <div className="font-serif text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-[1.9] whitespace-pre-line">
                        {chapterText.data.text}
                      </div>

                      {/* Chapter nav at bottom */}
                      <div className="flex justify-between mt-12 pt-6 border-t border-border/40">
                        <Button
                          variant="ghost"
                          onClick={() => navigateChapter(-1)}
                          disabled={selectedChapter <= 1}
                          className="rounded-full gap-2"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => navigateChapter(1)}
                          disabled={!book || selectedChapter >= book.chapters}
                          className="rounded-full gap-2"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* AI sidebar (fixed right on desktop, slide-up on mobile) */}
              {chapterText.data && (
                <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-white/20 dark:border-slate-700/30 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
                  <div className="p-4 sticky top-14">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">AI Assistance</span>
                    </div>

                    {/* Quick action buttons */}
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

                    {/* AI output */}
                    <AnimatePresence mode="wait">
                      {passageAI.isPending && activePanel !== "chat" && (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 text-sm text-muted-foreground py-4"
                        >
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Thinking...
                        </motion.div>
                      )}

                      {aiResult && activePanel && activePanel !== "chat" && !passageAI.isPending && (
                        <motion.div
                          key={activePanel}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="bg-white/60 dark:bg-slate-700/50 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2 max-h-80 overflow-y-auto"
                        >
                          {aiResult.split("\n").map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
                        </motion.div>
                      )}

                      {activePanel === "chat" && (
                        <motion.div
                          key="chat"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-2"
                        >
                          <div className="bg-white/50 dark:bg-slate-700/40 rounded-xl p-3 max-h-60 overflow-y-auto space-y-2">
                            {chatMessages.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-3">
                                Ask anything about {selectedBook} {selectedChapter}
                              </p>
                            )}
                            {chatMessages.map((m, i) => (
                              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                                  m.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-white/80 dark:bg-slate-600/80 text-slate-700 dark:text-slate-200"
                                }`}>
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
                            <Button
                              size="sm"
                              onClick={sendChat}
                              disabled={!chatInput.trim() || passageAI.isPending}
                              className="rounded-xl text-xs px-3"
                              data-testid="btn-chat-send"
                            >
                              Send
                            </Button>
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
