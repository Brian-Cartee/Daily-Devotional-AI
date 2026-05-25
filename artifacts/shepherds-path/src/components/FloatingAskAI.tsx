import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X,
  Send,
  ArrowRight,
  BookMarked,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { getUserName } from "@/lib/userName";
import { getRelationshipAge } from "@/lib/relationship";
import { isLateNight } from "@/lib/nightMode";
import { useAiUsage, refreshAiUsage } from "@/hooks/use-ai-usage";
import { canUseAi, shouldShowAiCounter } from "@/lib/aiUsage";
import { AiPauseModal } from "@/components/AiPauseModal";
import { ListenButton } from "@/components/ListenButton";
import { useDailyVerse } from "@/hooks/use-verses";
import { useToast } from "@/hooks/use-toast";
import {
  buildTodayWalkMessage,
  FLOATER_PEEK_SESSION_KEY,
  FLOATER_USED_KEY,
  getPathAiPageContext,
  shouldHidePathAiFloater,
} from "@/lib/pathAiFloater";

function cleanResponse(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/_(.+?)_/g, "$1");
}

/** Desktop / sm+ — bottom tab bar hidden above sm */
const FAB_BOTTOM_DESKTOP =
  "calc(1.5rem + env(safe-area-inset-bottom, 0px))";

export function FloatingAskAI() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: dailyVerse } = useDailyVerse();

  const [isOpen, setIsOpen] = useState(false);
  const [showPeek, setShowPeek] = useState(false);
  const [showMorePrompts, setShowMorePrompts] = useState(false);
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showAiPause, setShowAiPause] = useState(false);
  const [savingJournal, setSavingJournal] = useState(false);
  const { usage } = useAiUsage();
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const pendingPrefillRef = useRef<string | null>(null);

  const todayWalkMsg = useMemo(() => buildTodayWalkMessage(), [isOpen]);
  const pageContext = useMemo(
    () =>
      getPathAiPageContext(location, {
        verseReference: dailyVerse?.reference ?? null,
      }),
    [location, dailyVerse?.reference],
  );

  const hide = shouldHidePathAiFloater(location);
  const showingResponse = !!(response || isStreaming);

  const openSheet = useCallback(() => {
    localStorage.setItem(FLOATER_USED_KEY, "1");
    setShowPeek(false);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (hide || isOpen) return;
    if (sessionStorage.getItem(FLOATER_PEEK_SESSION_KEY)) return;
    if (localStorage.getItem(FLOATER_USED_KEY)) return;

    let hidePeek: ReturnType<typeof setTimeout> | undefined;
    const showTimer = setTimeout(() => {
      setShowPeek(true);
      sessionStorage.setItem(FLOATER_PEEK_SESSION_KEY, "1");
      hidePeek = setTimeout(() => setShowPeek(false), 4000);
    }, 5000);

    return () => {
      clearTimeout(showTimer);
      if (hidePeek) clearTimeout(hidePeek);
    };
  }, [hide, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 320);
    } else {
      setShowMorePrompts(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const prefill = localStorage.getItem("sp_ask_ai_prefill");
    if (prefill) {
      localStorage.removeItem("sp_ask_ai_prefill");
      pendingPrefillRef.current = prefill;
      openSheet();
    }
  }, [openSheet]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ prefill?: string }>).detail;
      if (detail?.prefill) pendingPrefillRef.current = detail.prefill;
      openSheet();
    };
    window.addEventListener("sp-open-path-ai", onOpen);
    return () => window.removeEventListener("sp-open-path-ai", onOpen);
  }, [openSheet]);

  useEffect(() => {
    if (isOpen && pendingPrefillRef.current) {
      const msg = pendingPrefillRef.current;
      pendingPrefillRef.current = null;
      setTimeout(() => handleSend(msg), 400);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (responseRef.current && response) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  const handleSend = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text || isStreaming) return;
    if (!canUseAi()) {
      setShowAiPause(true);
      return;
    }
    if (!q) setQuestion(text);
    setSubmittedQuestion(text);
    setResponse("");
    setIsDone(false);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/guidance/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: text,
          messages: [{ role: "user", content: text }],
          userName: getUserName() ?? undefined,
          sessionId: getSessionId(),
          guidanceMode: "pastoral",
          isLateNight: isLateNight(),
          daysWithApp: getRelationshipAge(),
          isPro: isProVerifiedLocally(),
        }),
      });

      if (res.status === 429) {
        setShowAiPause(true);
        setIsStreaming(false);
        void refreshAiUsage();
        return;
      }
      if (!res.ok || !res.body) {
        setResponse("Having trouble connecting right now. Please try again.");
        setIsDone(true);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setResponse(cleanResponse(accumulated));
      }
      setIsDone(true);
      refreshAiUsage();
    } catch {
      setResponse("Something went wrong. Please try again.");
      setIsDone(true);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuestion("");
    setSubmittedQuestion("");
    setResponse("");
    setIsDone(false);
  };

  const handlePreset = (prompt: string) => {
    setQuestion(prompt);
    handleSend(prompt);
  };

  const handleReset = () => {
    setQuestion("");
    setSubmittedQuestion("");
    setResponse("");
    setIsDone(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSaveJournal = async () => {
    if (!response || savingJournal) return;
    setSavingJournal(true);
    const sessionId = getSessionId();
    const content = `Path AI\n\nQ: ${submittedQuestion}\n\n${response}`;
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          type: "reflection",
          content,
          reference: pageContext.chipLabel,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      queryClient.invalidateQueries({ queryKey: ["/api/journal", sessionId] });
      toast({ title: "Saved to journal", description: "This conversation is in your reflections." });
    } catch {
      toast({
        title: "Could not save",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSavingJournal(false);
    }
  };

  const goToGuidance = () => {
    const encoded = encodeURIComponent(submittedQuestion);
    handleClose();
    navigate(`/guidance?situation=${encoded}`);
  };

  if (hide) return null;

  const primaryPrompts = pageContext.prompts.slice(0, 4);
  const extraPrompts = pageContext.prompts.slice(4);

  return (
    <>
      {/* FAB */}
      <div
        className="fixed z-[45] flex items-center gap-2 right-2.5 bottom-[calc(60px+env(safe-area-inset-bottom,0px)+6px)] sm:right-4 sm:bottom-[var(--fab-bottom-desktop)]"
        style={{ ["--fab-bottom-desktop" as string]: FAB_BOTTOM_DESKTOP }}
      >
        <AnimatePresence>
          {showPeek && !isOpen && (
            <motion.button
              type="button"
              key="peek"
              initial={{ opacity: 0, x: 12, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 8, scale: 0.96 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={openSheet}
              className="mr-1 max-w-[min(200px,55vw)] sm:max-w-[200px] text-left rounded-full pl-3.5 pr-4 py-2 shadow-lg border border-primary/25 bg-background/95 backdrop-blur-md"
            >
              <p className="text-[12px] font-bold text-foreground leading-tight">
                {pageContext.greeting}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                Tap for a faithful answer
              </p>
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          data-testid="button-floating-ask-ai"
          onClick={openSheet}
          aria-label="Ask Path AI"
          whileTap={{ scale: 0.94 }}
          className="relative flex h-[46px] w-[46px] sm:h-14 sm:w-14 items-center justify-center rounded-2xl border-0 p-0 bg-transparent"
        >
          {/* Soft halo — breathes without flashing the whole control */}
          <span
            className="pointer-events-none absolute -inset-1 sm:-inset-1.5 rounded-[16px] sm:rounded-[18px] bg-primary/45 blur-lg sm:blur-xl opacity-70"
            style={{ animation: "pathAiHalo 3.5s ease-in-out infinite" }}
            aria-hidden
          />
          <span
            className="relative flex h-full w-full items-center justify-center rounded-[14px] sm:rounded-2xl bg-gradient-to-br from-violet-600 via-primary to-violet-800 shadow-lg shadow-primary/40 ring-1 ring-white/15"
            aria-hidden
          >
            <img
              src="/sp-icon-nobg.png"
              alt=""
              className="h-7 w-7 sm:h-9 sm:w-9 object-contain drop-shadow-md"
            />
          </span>
        </motion.button>
      </div>

      {/* Sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[48] bg-black/55 backdrop-blur-sm"
              onClick={handleClose}
            />

            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              className="fixed bottom-0 left-0 right-0 z-[50] flex flex-col rounded-t-3xl overflow-hidden bg-background border border-border/60 shadow-2xl"
              style={{
                maxHeight: "min(92vh, 720px)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-foreground/25" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-4 pt-1 pb-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img src="/sp-icon.png" alt="" className="w-10 h-10 rounded-xl ring-2 ring-primary/30" />
                    <Sparkles className="absolute -bottom-1 -right-1 w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[17px] font-bold text-foreground leading-tight">Path AI</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                      {pageContext.subline}
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/90 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                      {pageContext.chipLabel}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {usage && shouldShowAiCounter() && (
                    <div
                      data-testid="text-ai-usage-counter"
                      className={`px-2 py-1 rounded-full text-[10px] font-semibold tabular-nums border ${
                        usage.remaining <= 2
                          ? "bg-destructive/10 border-destructive/25 text-destructive"
                          : usage.remaining <= 4
                            ? "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400"
                            : "bg-primary/10 border-primary/25 text-primary"
                      }`}
                    >
                      {usage.remaining}/{usage.limit}
                    </div>
                  )}
                  <button
                    data-testid="button-close-ask-ai"
                    onClick={handleClose}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto min-h-0 px-4">
                {!showingResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl px-4 py-3.5 mb-4 bg-gradient-to-br from-primary/8 via-violet-500/5 to-transparent border border-primary/15"
                  >
                    <p className="text-[15px] font-semibold text-foreground leading-snug">
                      {pageContext.greeting}
                    </p>
                    <p
                      className="text-[13px] text-muted-foreground mt-2 leading-relaxed italic"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      &ldquo;Ask and it will be given to you; seek and you will find.&rdquo;
                      <span className="block not-italic text-[10px] font-semibold uppercase tracking-widest text-primary/60 mt-1.5">
                        Matthew 7:7
                      </span>
                    </p>
                  </motion.div>
                )}

                {showingResponse && (
                  <div className="space-y-3 mb-4">
                    <div className="rounded-xl bg-muted/50 border border-border/50 px-3.5 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        You asked
                      </p>
                      <p className="text-[14px] text-foreground leading-snug">{submittedQuestion}</p>
                    </div>
                    <div
                      ref={responseRef}
                      className="rounded-xl bg-card border border-border/60 px-4 py-3.5 overflow-y-auto text-[16px] leading-[1.7] text-foreground/95"
                      style={{ maxHeight: "min(38vh, 280px)" }}
                    >
                      {response}
                      {isStreaming && !response && (
                        <span className="inline-block w-1.5 h-4 bg-primary/60 rounded-sm animate-pulse align-middle" />
                      )}
                      {isStreaming && response && (
                        <span className="inline-block w-1 h-4 bg-primary/60 rounded-sm animate-pulse align-middle ml-0.5" />
                      )}
                      {isDone && (
                        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/40">
                          <ListenButton
                            text={response}
                            label="Listen"
                            size="sm"
                            scope="snippet"
                          />
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <span>✝</span>
                            <span>Grounded in Scripture</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!showingResponse && (
                  <div className="space-y-2 pb-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
                      Suggested for here
                    </p>

                    {todayWalkMsg && (
                      <button
                        data-testid="btn-preset-walk-today"
                        onClick={() => handlePreset(todayWalkMsg)}
                        className="w-full text-left px-4 py-3 rounded-xl transition-all active:scale-[0.98] flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/15"
                      >
                        <span className="text-lg leading-none flex-shrink-0">🌅</span>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">
                            From Walk Today
                          </p>
                          <p className="text-[13px] text-foreground leading-snug">
                            Continue where you left off
                          </p>
                        </div>
                      </button>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {primaryPrompts.map((p, i) => (
                        <button
                          key={p.testId ?? i}
                          data-testid={p.testId ? `btn-preset-${p.testId}` : `btn-preset-prompt-${i}`}
                          onClick={() => handlePreset(p.label)}
                          className="text-left px-3.5 py-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/50 active:scale-[0.98] transition-all"
                        >
                          <span className="text-base leading-none block mb-1.5">{p.icon}</span>
                          <span className="text-[13px] text-foreground/90 leading-snug">{p.label}</span>
                        </button>
                      ))}
                    </div>

                    {extraPrompts.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowMorePrompts((v) => !v)}
                          className="w-full flex items-center justify-center gap-1 text-[12px] font-semibold text-muted-foreground py-1"
                        >
                          {showMorePrompts ? (
                            <>
                              Fewer starters <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              More starters <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                        {showMorePrompts && (
                          <div className="grid grid-cols-1 gap-2">
                            {extraPrompts.map((p, i) => (
                              <button
                                key={`extra-${i}`}
                                onClick={() => handlePreset(p.label)}
                                className="text-left px-3.5 py-2.5 rounded-xl border border-border/50 bg-muted/20 text-[13px] text-foreground/85"
                              >
                                {p.icon} {p.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {isDone && (
                  <div className="flex flex-col gap-2 pb-4">
                    <button
                      data-testid="button-ask-ai-guidance"
                      onClick={goToGuidance}
                      className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-[15px] font-semibold bg-gradient-to-r from-primary to-violet-600 text-primary-foreground shadow-md shadow-primary/20 active:scale-[0.98] transition-transform"
                    >
                      Go deeper in Talk It Through
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      data-testid="button-ask-ai-save-journal"
                      onClick={handleSaveJournal}
                      disabled={savingJournal}
                      className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold border border-border bg-muted/40 hover:bg-muted/60 transition-colors disabled:opacity-50"
                    >
                      <BookMarked className="w-4 h-4" />
                      {savingJournal ? "Saving…" : "Save to journal"}
                    </button>
                    <button
                      data-testid="button-ask-ai-new"
                      onClick={handleReset}
                      className="w-full py-2.5 rounded-xl text-[14px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      Ask something else
                    </button>
                  </div>
                )}
              </div>

              {/* Sticky input */}
              {!isDone && (
                <div className="shrink-0 px-4 pt-2 pb-4 border-t border-border/50 bg-background/95 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      data-testid="input-ask-ai-question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={
                        showingResponse ? "Follow up…" : "What's on your heart or mind?"
                      }
                      disabled={isStreaming}
                      className="flex-1 rounded-xl border border-border bg-muted/40 px-4 py-3 text-[16px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/35 disabled:opacity-50"
                    />
                    <button
                      data-testid="button-ask-ai-send"
                      onClick={() => handleSend()}
                      disabled={!question.trim() || isStreaming}
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  {!showingResponse && (
                    <p className="text-center text-[10px] text-muted-foreground/70 mt-2 leading-relaxed">
                      Path AI guides — God transforms. For full prayer chains, use Talk It Through.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {showAiPause && <AiPauseModal onClose={() => setShowAiPause(false)} />}
    </>
  );
}
