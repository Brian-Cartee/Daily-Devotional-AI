import { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { getSessionId } from "@/lib/session";
import { getUserName } from "@/lib/userName";
import { getRelationshipAge } from "@/lib/relationship";
import { isLateNight } from "@/lib/nightMode";

const HIDE_ON = ["/guidance", "/shepherd-admin", "/shepherd-admin/sermons", "/present", "/demo"];

const EXPAND_INTERVALS = [4000, 45000, 90000];

function cleanResponse(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/_(.+?)_/g, "$1");
}

export function FloatingAskAI() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandIndexRef = useRef(0);

  const hide = HIDE_ON.some(p => location.startsWith(p));

  useEffect(() => {
    if (hide || isOpen) return;

    const scheduleNext = () => {
      const delay = EXPAND_INTERVALS[expandIndexRef.current] ?? 120000;
      expandTimerRef.current = setTimeout(() => {
        setIsExpanded(true);
        setTimeout(() => setIsExpanded(false), 3200);
        expandIndexRef.current = Math.min(expandIndexRef.current + 1, EXPAND_INTERVALS.length - 1);
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => { if (expandTimerRef.current) clearTimeout(expandTimerRef.current); };
  }, [hide, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsExpanded(false);
      if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  useEffect(() => {
    if (responseRef.current && response) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  const handleSend = async () => {
    const q = question.trim();
    if (!q || isStreaming) return;
    setResponse("");
    setIsDone(false);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/guidance/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: q,
          messages: [{ role: "user", content: q }],
          userName: getUserName() ?? undefined,
          sessionId: getSessionId(),
          guidanceMode: "pastoral",
          isLateNight: isLateNight(),
          daysWithApp: getRelationshipAge(),
        }),
      });

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
    setResponse("");
    setIsDone(false);
  };

  if (hide) return null;

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-[84px] right-4 z-40 flex items-center">
        <AnimatePresence>
          {isExpanded && !isOpen && (
            <motion.span
              key="label"
              initial={{ opacity: 0, x: 8, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "auto" }}
              exit={{ opacity: 0, x: 8, width: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="mr-2 overflow-hidden whitespace-nowrap text-[13px] font-semibold text-white/90 bg-black/55 backdrop-blur-md px-3 py-1.5 rounded-full"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}
            >
              Ask Path AI
            </motion.span>
          )}
        </AnimatePresence>

        <button
          data-testid="button-floating-ask-ai"
          onClick={() => setIsOpen(true)}
          aria-label="Ask Path AI"
          className="w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
            boxShadow: "0 4px 16px rgba(109,40,217,0.55), 0 2px 6px rgba(0,0,0,0.35)",
          }}
        >
          <img
            src="/sp-icon.png"
            alt="Path AI"
            className="w-8 h-8 rounded-[7px]"
          />
        </button>
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
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
              onClick={handleClose}
            />

            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
              style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border) / 0.6)", maxHeight: "82vh" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-foreground/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 pt-1">
                <div className="flex items-center gap-2.5">
                  <img src="/sp-icon.png" alt="" className="w-7 h-7 rounded-[6px]" />
                  <div>
                    <p className="text-[15px] font-bold text-foreground leading-none">Ask Path AI</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">A quiet question deserves a faithful answer</p>
                  </div>
                </div>
                <button
                  data-testid="button-close-ask-ai"
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pb-4 flex flex-col gap-3" style={{ maxHeight: "calc(82vh - 100px)", overflow: "hidden" }}>
                {/* Response area */}
                {(response || isStreaming) && (
                  <div
                    ref={responseRef}
                    className="rounded-xl bg-card/60 border border-border/50 px-4 py-3.5 overflow-y-auto text-[16px] leading-[1.7] text-foreground/95"
                    style={{ maxHeight: "45vh" }}
                  >
                    {response}
                    {isStreaming && !response && (
                      <span className="inline-block w-1.5 h-4 bg-primary/60 rounded-sm animate-pulse align-middle" />
                    )}
                    {isStreaming && response && (
                      <span className="inline-block w-1 h-4 bg-primary/60 rounded-sm animate-pulse align-middle ml-0.5" />
                    )}
                    {isDone && (
                      <p className="text-[11px] text-muted-foreground/60 mt-3 flex items-center gap-1">
                        <span>✝</span>
                        <span>Grounded in Scripture. Guided by the Holy Spirit.</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Input */}
                {!isDone && (
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      data-testid="input-ask-ai-question"
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="What's on your heart or mind?"
                      disabled={isStreaming}
                      className="flex-1 rounded-xl border border-border bg-muted/40 px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/65 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all disabled:opacity-50"
                    />
                    <button
                      data-testid="button-ask-ai-send"
                      onClick={handleSend}
                      disabled={!question.trim() || isStreaming}
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}

                {isDone && (
                  <button
                    data-testid="button-ask-ai-new"
                    onClick={() => { setQuestion(""); setResponse(""); setIsDone(false); setTimeout(() => inputRef.current?.focus(), 50); }}
                    className="w-full py-2.5 rounded-xl border border-border/60 text-[14px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    Ask another question
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
