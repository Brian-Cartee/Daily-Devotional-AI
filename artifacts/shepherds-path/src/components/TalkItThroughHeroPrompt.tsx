import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { waitMs } from "@/lib/pauseEngine";
import { CRISIS_LIFELINE_DISPLAY, CRISIS_LIFELINE_TEL } from "@/lib/crisisResources";
import type { ThresholdNeed } from "@/lib/thresholdState";

const PLACEHOLDERS = [
  "I can't quiet my mind tonight…",
  "Something from today is still heavy…",
  "I need Scripture for what I'm facing…",
  "Help me pray honestly about this…",
];

const NEED_PLACEHOLDERS: Record<ThresholdNeed, string> = {
  comfort: "I'm tired and need gentleness…",
  honesty: "I haven't said this out loud yet…",
  hope: "I'm afraid hope is running out…",
};

interface TalkItThroughHeroPromptProps {
  phase?: string;
  thresholdNeed?: ThresholdNeed | null;
}

export function TalkItThroughHeroPrompt({ phase, thresholdNeed }: TalkItThroughHeroPromptProps) {
  const [, navigate] = useLocation();
  const [value, setValue] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [beginning, setBeginning] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const placeholders = thresholdNeed
    ? [NEED_PLACEHOLDERS[thresholdNeed], ...PLACEHOLDERS]
    : PLACEHOLDERS;

  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholders.length);
    }, 5500);
    return () => clearInterval(t);
  }, [placeholders.length]);

  const begin = async () => {
    if (beginning) return;
    setBeginning(true);
    try {
      if ("vibrate" in navigator) navigator.vibrate(12);
    } catch {
      /* noop */
    }
    await waitMs(420);
    const text = value.trim();
    if (text) {
      navigate(`/guidance?situation=${encodeURIComponent(text)}`);
    } else {
      navigate("/guidance");
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div
      className="w-full rounded-2xl border border-white/12 bg-[#12101a]/95 backdrop-blur-sm p-4 sm:p-5 shadow-lg shadow-black/25 max-sm:rounded-[1.125rem]"
      data-testid="card-talk-it-through-hero"
    >
      <div className="mb-4">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/55 mb-1">
          Talk it through
        </p>
        <p className="text-[15px] text-white/82 leading-snug">
          Scripture and prayer shaped for{" "}
          {phase === "evening" || phase === "late-evening" ? "tonight" : "right now"} — not generic
          advice.
        </p>
      </div>

      <label className="sr-only" htmlFor="hero-talk-input">
        What&apos;s on your heart
      </label>
      <div className="relative">
        <textarea
          id="hero-talk-input"
          ref={inputRef}
          data-testid="input-hero-talk-through"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void begin();
            }
          }}
          rows={2}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-3.5 sm:px-4 py-3.5 text-[17px] leading-relaxed text-white placeholder:text-transparent focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-500/25 transition-shadow"
        />
        <div
          className="pointer-events-none absolute inset-0 px-3.5 sm:px-4 py-3.5 text-[17px] leading-relaxed overflow-hidden"
          aria-hidden
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={placeholders[placeholderIdx]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="block text-white/38"
            >
              {placeholders[placeholderIdx]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <button
        type="button"
        data-testid="btn-hero-talk-through"
        onClick={() => void begin()}
        disabled={beginning}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-semibold text-[#1a1208] bg-gradient-to-r from-amber-100/95 via-amber-200/90 to-amber-100/95 shadow-md shadow-black/20 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-70"
      >
        {beginning ? "One breath…" : "Talk it through"}
        {!beginning && <ArrowRight className="w-4 h-4" />}
      </button>

      <p className="mt-2.5 text-center text-[11px] text-white/40 leading-relaxed">
        Private · grounded in the Bible · conversational guidance when you&apos;re ready
      </p>

      <p className="mt-2 text-center text-[10px] text-white/32 leading-relaxed px-1">
        Not a substitute for church, counseling, or emergency care.{" "}
        <a href={CRISIS_LIFELINE_TEL} className="underline underline-offset-2 text-white/45 hover:text-white/65">
          {CRISIS_LIFELINE_DISPLAY}
        </a>
        {" · "}
        <Link href="/support" className="underline underline-offset-2 text-white/45 hover:text-white/65">
          Support
        </Link>
      </p>

      <p className="mt-2 text-center text-[12px] text-white/38 leading-relaxed">
        <Link
          href="/sigh"
          className="text-white/50 underline underline-offset-2 hover:text-white/70"
          data-testid="link-hero-sigh-room"
        >
          Need a quieter room?
        </Link>
      </p>
    </div>
  );
}

/** Scroll/focus hero input — used by “Talk it through” door */
export function focusHeroTalkInput(): void {
  const el = document.getElementById("hero-talk-input") as HTMLTextAreaElement | null;
  el?.focus();
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}
