import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";

/** iOS App Store mark (speech bubble + cross) — not web app-icon.png (cross-path crook) */
const TALK_IT_THROUGH_ICON = "/talk-it-through-icon.png";

const PLACEHOLDERS = [
  "I can't quiet my mind tonight…",
  "Something from today is still heavy…",
  "I need Scripture for what I'm facing…",
  "Help me pray honestly about this…",
];

interface TalkItThroughHeroPromptProps {
  phase?: string;
}

export function TalkItThroughHeroPrompt({ phase }: TalkItThroughHeroPromptProps) {
  const [, navigate] = useLocation();
  const [value, setValue] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 5500);
    return () => clearInterval(t);
  }, []);

  const begin = () => {
    const text = value.trim();
    if (text) {
      navigate(`/guidance?situation=${encodeURIComponent(text)}`);
    } else {
      navigate("/guidance");
    }
  };

  return (
    <div
      className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-950/90 via-[#1a0a3e]/85 to-black/50 backdrop-blur-md p-4 sm:p-5 shadow-2xl shadow-violet-900/20"
      data-testid="card-talk-it-through-hero"
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="shrink-0 rounded-[14px] overflow-hidden ring-1 ring-violet-300/30 shadow-lg shadow-primary/35"
          style={{ width: 48, height: 48 }}
        >
          <img
            src={TALK_IT_THROUGH_ICON}
            alt=""
            width={48}
            height={48}
            className="h-full w-full object-cover"
            decoding="async"
          />
        </div>
        <div className="min-w-0 pt-0.5">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-violet-200">
              Talk It Through
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/90 bg-amber-500/15 border border-amber-400/25 rounded-full px-2 py-0.5">
              <Sparkles className="w-3 h-3" />
              AI companion
            </span>
          </div>
          <p className="text-[15px] text-white/75 leading-snug">
            Scripture-grounded conversation — prayer, clarity, and next steps shaped for{" "}
            {phase === "evening" || phase === "late-evening" ? "tonight" : "right now"}.
          </p>
        </div>
      </div>

      <label className="sr-only" htmlFor="hero-talk-input">
        What&apos;s on your heart
      </label>
      <textarea
        id="hero-talk-input"
        data-testid="input-hero-talk-through"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            begin();
          }
        }}
        rows={2}
        placeholder={PLACEHOLDERS[placeholderIdx]}
        className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3.5 text-[17px] leading-relaxed text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-400/45 focus:border-violet-400/30 transition-shadow"
      />

      <button
        type="button"
        data-testid="btn-hero-talk-through"
        onClick={begin}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[16px] font-semibold text-white bg-gradient-to-r from-primary via-violet-600 to-violet-700 shadow-lg shadow-primary/30 hover:opacity-95 active:scale-[0.99] transition-all"
      >
        Begin with Scripture
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="mt-2.5 text-center text-[12px] text-white/45 leading-relaxed">
        Private · grounded in the Bible · no perfect words required
      </p>
    </div>
  );
}
