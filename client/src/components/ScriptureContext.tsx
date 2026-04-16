import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Scroll, X, Send, Loader2 } from "lucide-react";
import { canUseAi, recordAiUsage } from "@/lib/aiUsage";
import { useLocation } from "wouter";
import { isProVerifiedLocally } from "@/lib/proStatus";
import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";

interface ScriptureContextProps {
  reference: string;
  text: string;
  verseId?: number;
}

interface ContextData {
  whoAndWhen: string;
  whatWasHappening: string;
  whyItMatters: string;
  bridge: string;
}

// ── Usage tracking — counts unique verse references looked up ───────────────
const CONTEXT_LIMIT = 3;
const CONTEXT_REFS_KEY = "sp_context_refs";

function getContextRefs(): string[] {
  try { return JSON.parse(localStorage.getItem(CONTEXT_REFS_KEY) || "[]"); } catch { return []; }
}

function recordContextRef(reference: string): void {
  try {
    const refs = getContextRefs();
    if (!refs.includes(reference)) {
      refs.push(reference);
      localStorage.setItem(CONTEXT_REFS_KEY, JSON.stringify(refs));
    }
  } catch {}
}

function isContextGated(reference: string): boolean {
  if (isProVerifiedLocally()) return false;
  const refs = getContextRefs();
  return refs.length >= CONTEXT_LIMIT && !refs.includes(reference);
}

// ── Calm loading skeleton ────────────────────────────────────────────────────
function Calm() {
  return (
    <div className="space-y-8 pt-2">
      {["Who wrote this · When", "What was happening", "Why it matters"].map((label) => (
        <div key={label} className="space-y-3">
          <div className="h-[10px] w-36 rounded-full bg-foreground/8 animate-pulse" />
          <div className="space-y-2">
            <div className="h-3.5 w-full rounded-full bg-foreground/6 animate-pulse" />
            <div className="h-3.5 w-[90%] rounded-full bg-foreground/6 animate-pulse" />
            <div className="h-3.5 w-[78%] rounded-full bg-foreground/6 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Bridge card — shown instead of content when limit is reached ─────────────
function ContextBridgeCard({ onClose }: { onClose: () => void }) {
  const [, setLocation] = useLocation();
  return (
    <div className="space-y-6 py-2">
      <div className="space-y-4">
        <p className="text-[14px] leading-[1.85] text-foreground/75">
          You've been looking a little deeper into the Word these past few days.
          That kind of curiosity — wanting to understand not just what it says but
          where it came from and why it matters — is worth following.
        </p>
        <p className="text-[14px] leading-[1.85] text-foreground/75">
          Pro simply continues this — as far as you want to go.
        </p>
      </div>

      <div className="space-y-3">
        <button
          data-testid="button-context-go-deeper"
          onClick={() => { onClose(); setLocation("/pricing"); }}
          className="w-full py-3.5 rounded-2xl font-bold text-[15px] text-white transition-all"
          style={{ background: "linear-gradient(135deg, #92400e, #b45309)" }}
        >
          Continue deeper →
        </button>
        <button
          data-testid="button-context-not-now"
          onClick={onClose}
          className="w-full py-2.5 text-[13px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function ScriptureContext({ reference, text, verseId }: ScriptureContextProps) {
  const [open, setOpen] = useState(false);
  const [gated, setGated] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [qaLoading, setQaLoading] = useState(false);

  const handleOpen = () => {
    const limited = isContextGated(reference);
    if (!limited) {
      recordContextRef(reference);
    }
    setGated(limited);
    setOpen(true);
  };

  const handleAsk = async () => {
    if (!question.trim() || qaLoading || !verseId) return;
    if (!canUseAi()) {
      setAnswer("You've been deep in the Word today — come back tomorrow for more.");
      return;
    }
    recordAiUsage();
    const q = question.trim();
    setQaLoading(true);
    setQuestion("");
    setAnswer("");
    try {
      const res = await fetch("/api/context/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, text, question: q }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      setAnswer(json.content ?? "");
    } catch {
      setAnswer("We can try that again in a moment.");
    } finally {
      setQaLoading(false);
    }
  };

  const { data, isLoading, isError } = useQuery<ContextData>({
    queryKey: ["/api/context", reference],
    queryFn: async () => {
      const params = new URLSearchParams({ reference, text });
      const res = await fetch(`/api/context?${params.toString()}`);
      if (!res.ok) throw new Error("context fetch failed");
      return res.json();
    },
    enabled: open && !gated,
    staleTime: Infinity,
    retry: 1,
  });

  return (
    <>
      <button
        data-testid="button-scripture-context"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/30 bg-amber-400/6 hover:bg-amber-400/12 hover:border-amber-400/50 text-amber-600/80 dark:text-amber-400/80 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-200 group"
      >
        <Scroll className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[12px] font-semibold tracking-wide">Get Context</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl px-0 pb-0 max-h-[86vh] flex flex-col bg-background"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-9 h-[3.5px] rounded-full bg-foreground/12" />
          </div>

          {/* Header */}
          <div className="px-6 pb-4 shrink-0 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500/70 mb-1">
                {gated ? "Go deeper" : "Looking a little deeper at today's verse"}
              </p>
              <h2 className="text-[20px] font-bold text-foreground leading-tight">
                {reference}
              </h2>
            </div>
            <SheetClose asChild>
              <button
                data-testid="button-close-context"
                className="shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </SheetClose>
          </div>

          <div className="h-px bg-border/30 shrink-0 mx-6" />

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">

            {/* Bridge moment — gate reached */}
            {gated && <ContextBridgeCard onClose={() => setOpen(false)} />}

            {/* Graceful error */}
            {!gated && isError && (
              <div className="py-10 text-center">
                <p className="text-[15px] text-foreground/60 leading-relaxed">
                  We're having trouble loading this right now —<br />
                  we can try again in a moment.
                </p>
              </div>
            )}

            {/* Calm loading */}
            {!gated && isLoading && <Calm />}

            {/* Content */}
            {!gated && data && (
              <>
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/60">
                    Who wrote this · When
                  </p>
                  <p className="text-[15px] leading-[1.8] text-foreground/80">
                    {data.whoAndWhen}
                  </p>
                </div>

                <div className="h-px bg-border/25" />

                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/60">
                    What was happening
                  </p>
                  <p className="text-[15px] leading-[1.8] text-foreground/80">
                    {data.whatWasHappening}
                  </p>
                </div>

                <div className="h-px bg-border/25" />

                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500/60">
                    Why it matters
                  </p>
                  <p className="text-[15px] leading-[1.8] text-foreground/80">
                    {data.whyItMatters}
                  </p>
                </div>

                {data.bridge && (
                  <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-700/30 px-4 py-4">
                    <p className="text-[14px] leading-[1.75] text-amber-800/80 dark:text-amber-300/70 italic">
                      {data.bridge}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── Inline Q&A — quiet, always below content ─────────────── */}
            {!gated && !isLoading && verseId && (
              <div className="space-y-3 pt-1">
                {/* Previous answer */}
                {(answer || qaLoading) && (
                  <div className="rounded-2xl bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/30 dark:border-amber-700/20 px-4 py-4">
                    {qaLoading ? (
                      <div className="flex items-center gap-2 text-amber-600/60 dark:text-amber-400/50">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span className="text-[13px]">Looking into this…</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500/60 mb-2">Answer</p>
                        <p className="text-[14px] leading-[1.75] text-foreground/75">{answer}</p>
                      </>
                    )}
                  </div>
                )}

                {/* Input */}
                <div className="flex items-end gap-2 rounded-2xl border border-border/30 bg-foreground/[0.025] px-3.5 py-2.5">
                  <textarea
                    data-testid="input-context-question"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="If something feels unclear, you can ask…"
                    className="flex-1 resize-none bg-transparent text-[14px] leading-snug text-foreground/70 placeholder:text-muted-foreground/35 outline-none min-h-[20px] max-h-[100px]"
                    rows={1}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAsk();
                      }
                    }}
                  />
                  <button
                    data-testid="button-context-ask"
                    onClick={handleAsk}
                    disabled={!question.trim() || qaLoading}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-25 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="h-4" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
