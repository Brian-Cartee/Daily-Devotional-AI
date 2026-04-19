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

const PRESET_PROMPTS = [
  { label: "I feel anxious and overwhelmed", icon: "🌿" },
  { label: "Help me understand a Bible verse", icon: "📖" },
  { label: "I have a difficult decision to make", icon: "🕊️" },
  { label: "I want to grow closer to God", icon: "✝️" },
  { label: "I'm struggling to forgive someone", icon: "🤍" },
  { label: "I need encouragement right now", icon: "🌄" },
];

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

  const handleSend = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text || isStreaming) return;
    if (!q) {} else setQuestion(q);
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

  const handlePreset = (prompt: string) => {
    setQuestion(prompt);
    handleSend(prompt);
  };

  const handleReset = () => {
    setQuestion("");
    setResponse("");
    setIsDone(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (hide) return null;

  const showingResponse = response || isStreaming;

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-[72px] right-4 z-40 flex items-center">
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
              style={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border) / 0.6)",
                maxHeight: "88vh",
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-foreground/20" />
              </div>

              {/* Header row */}
              <div className="flex items-center justify-between px-4 pt-2 pb-3">
                <div className="flex items-center gap-2.5">
                  <img src="/sp-icon.png" alt="" className="w-8 h-8 rounded-[7px]" />
                  <div>
                    <p className="text-[16px] font-bold text-foreground leading-none">Ask Path AI</p>
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

              <div
                className="overflow-y-auto"
                style={{ maxHeight: "calc(88vh - 80px)" }}
              >
                <div className="px-4 pb-6 flex flex-col gap-4">

                  {/* ── Spiritual invitation ─────────────────────────── */}
                  {!showingResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="rounded-2xl px-4 py-4"
                      style={{
                        background: "linear-gradient(160deg, rgba(124,58,237,0.10) 0%, rgba(0,0,0,0) 100%)",
                        border: "1px solid rgba(124,58,237,0.18)",
                      }}
                    >
                      {/* Verse */}
                      <p
                        className="text-[14px] leading-relaxed mb-2.5"
                        style={{
                          fontFamily: "'Georgia', serif",
                          fontStyle: "italic",
                          color: "rgba(167,139,250,0.85)",
                        }}
                      >
                        "Ask and it will be given to you; seek and you will find."
                      </p>
                      <p
                        className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
                        style={{ color: "rgba(167,139,250,0.5)" }}
                      >
                        Matthew 7:7
                      </p>

                      {/* Divider */}
                      <div
                        className="mb-3"
                        style={{ height: "1px", background: "rgba(124,58,237,0.15)" }}
                      />

                      {/* Invitation copy */}
                      <p
                        className="text-[14px] leading-[1.65]"
                        style={{ color: "rgba(255,255,255,0.72)" }}
                      >
                        Path AI is a tool — but your willingness to lean in is what opens the door. Every time you show up and ask, you're creating space for God to work.{" "}
                        <span style={{ color: "rgba(255,255,255,0.90)", fontWeight: 600 }}>
                          Consistent leaning-in is where the miracles happen.
                        </span>
                      </p>
                    </motion.div>
                  )}

                  {/* ── Response area ───────────────────────────────── */}
                  {showingResponse && (
                    <div
                      ref={responseRef}
                      className="rounded-xl bg-card/60 border border-border/50 px-4 py-3.5 overflow-y-auto text-[16px] leading-[1.7] text-foreground/95"
                      style={{ maxHeight: "42vh" }}
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

                  {/* ── Preset prompts ──────────────────────────────── */}
                  {!showingResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
                      className="space-y-2"
                    >
                      <p
                        className="text-[11px] uppercase tracking-[0.13em] px-0.5"
                        style={{ color: "rgba(255,255,255,0.52)" }}
                      >
                        Common places to start
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_PROMPTS.map((p, i) => (
                          <button
                            key={i}
                            data-testid={`btn-preset-prompt-${i}`}
                            onClick={() => handlePreset(p.label)}
                            className="text-left px-3 py-2.5 rounded-xl transition-all active:scale-[0.97]"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.09)",
                              color: "rgba(255,255,255,0.78)",
                            }}
                          >
                            <span className="text-base leading-none block mb-1.5">{p.icon}</span>
                            <span className="text-[13px] leading-snug">{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* ── Custom input ────────────────────────────────── */}
                  {!isDone && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.14, ease: "easeOut" }}
                    >
                      {!showingResponse && (
                        <p
                          className="text-[11px] uppercase tracking-[0.13em] mb-2 px-0.5"
                          style={{ color: "rgba(255,255,255,0.52)" }}
                        >
                          Or ask your own
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          ref={inputRef}
                          data-testid="input-ask-ai-question"
                          value={question}
                          onChange={e => setQuestion(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                          placeholder="What's on your heart or mind?"
                          disabled={isStreaming}
                          className="flex-1 rounded-xl border border-border bg-muted/40 px-4 py-3 text-[16px] text-foreground placeholder:text-muted-foreground/65 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all disabled:opacity-50"
                        />
                        <button
                          data-testid="button-ask-ai-send"
                          onClick={() => handleSend()}
                          disabled={!question.trim() || isStreaming}
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                        >
                          <Send className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Ask another ─────────────────────────────────── */}
                  {isDone && (
                    <button
                      data-testid="button-ask-ai-new"
                      onClick={handleReset}
                      className="w-full py-2.5 rounded-xl border border-border/60 text-[14px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                      Ask another question
                    </button>
                  )}

                  {/* ── Footer note ─────────────────────────────────── */}
                  {!showingResponse && (
                    <p
                      className="text-center text-[11px] leading-relaxed pb-1"
                      style={{ color: "rgba(255,255,255,0.28)" }}
                    >
                      Path AI guides — God transforms.{"\n"}
                      The blessings you seek are waiting on the other side of showing up.
                    </p>
                  )}

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
