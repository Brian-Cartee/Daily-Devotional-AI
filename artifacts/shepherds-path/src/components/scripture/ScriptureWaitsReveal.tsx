import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { scriptureSearchDelayMs, waitMs } from "@/lib/pauseEngine";

export interface ScriptureWaitsPayload {
  reference: string;
  text: string;
  rationale: string;
}

interface ScriptureWaitsRevealProps {
  situation: string;
  payload: ScriptureWaitsPayload | null;
  loading: boolean;
  onRevealComplete?: () => void;
}

/** Honest delay + line-by-line verse reveal — not instant chatbot delivery. */
export function ScriptureWaitsReveal({
  situation,
  payload,
  loading,
  onRevealComplete,
}: ScriptureWaitsRevealProps) {
  const [phase, setPhase] = useState<"waiting" | "revealing" | "done">("waiting");
  const [visibleLines, setVisibleLines] = useState(0);
  const [showRationale, setShowRationale] = useState(false);

  useEffect(() => {
    if (!loading && !payload) return;
    if (loading) {
      setPhase("waiting");
      setVisibleLines(0);
      setShowRationale(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const delay = scriptureSearchDelayMs(situation.length);
      await waitMs(delay);
      if (cancelled || !payload) return;
      setPhase("revealing");
      const lines = payload.text.split(/\n+/).filter(Boolean);
      const lineCount = Math.max(1, lines.length);
      for (let i = 1; i <= lineCount; i++) {
        if (cancelled) return;
        setVisibleLines(i);
        await waitMs(320);
      }
      await waitMs(400);
      if (cancelled) return;
      setShowRationale(true);
      setPhase("done");
      onRevealComplete?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, payload, situation.length, onRevealComplete]);

  const displayText = payload?.text ?? "";
  const lines = displayText.split(/\n+/).filter(Boolean);
  const shownText =
    lines.length > 1
      ? lines.slice(0, visibleLines).join(" ")
      : displayText.slice(0, Math.ceil((displayText.length * visibleLines) / Math.max(1, lines.length || 1)));

  return (
    <div className="w-full" data-testid="scripture-waits-reveal">
      <AnimatePresence mode="wait">
        {(loading || phase === "waiting") && (
          <motion.p
            key="wait"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[14px] text-violet-200/70 italic text-center py-6"
          >
            Searching Scripture for where you are…
          </motion.p>
        )}
      </AnimatePresence>

      {payload && phase !== "waiting" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-violet-400/20 bg-black/25 backdrop-blur-sm px-5 py-5"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/60 mb-3">
            Scripture
          </p>
          <blockquote
            className="text-[1.05rem] sm:text-[1.1rem] leading-relaxed text-white/90"
            style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontStyle: "italic" }}
          >
            &ldquo;{shownText}
            {phase === "revealing" && shownText.length < displayText.length ? "…" : ""}&rdquo;
          </blockquote>
          <p className="mt-3 text-[13px] font-semibold text-violet-200/85">— {payload.reference}</p>
          {showRationale && payload.rationale && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-[14px] text-white/65 leading-relaxed border-t border-white/10 pt-4"
            >
              {payload.rationale}
            </motion.p>
          )}
        </motion.div>
      )}
    </div>
  );
}
