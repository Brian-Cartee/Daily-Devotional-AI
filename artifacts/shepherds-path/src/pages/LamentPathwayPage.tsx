import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { LAMENT_DAYS } from "@/data/lamentDays";
import { LamentSilenceBeat } from "@/components/lament/LamentSilenceBeat";
import {
  canDoLamentToday,
  completeLamentDay,
  endLamentSeason,
  getLamentCurrentDay,
  isLamentSeasonActive,
  startLamentPathway,
} from "@/lib/lamentPathway";
import { getSessionId } from "@/lib/session";
import { markReturnToHomePaths, navigateBackToHomePaths } from "@/lib/homePathsNav";
import { apiSessionExtras } from "@/lib/requestExtras";

type Step = "intro" | "wait" | "psalm" | "question" | "write" | "silence" | "companion" | "done";

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.4 },
};

export default function LamentPathwayPage() {
  const [, navigate] = useLocation();
  const [active, setActive] = useState(() => isLamentSeasonActive());
  const [day, setDay] = useState(() => getLamentCurrentDay());
  const [step, setStep] = useState<Step>(() => {
    if (!isLamentSeasonActive()) return "intro";
    if (!canDoLamentToday()) return "wait";
    return "psalm";
  });
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  const content = LAMENT_DAYS[day - 1];

  useEffect(() => {
    if (!active) return;
    const current = getLamentCurrentDay();
    setDay(current);
    if (canDoLamentToday() && step === "wait") setStep("psalm");
  }, [active, step]);

  const begin = () => {
    startLamentPathway();
    setActive(true);
    setDay(1);
    setStep("psalm");
  };

  const saveResponse = async () => {
    const text = response.trim();
    if (text.length < 3) return;
    setSaving(true);
    try {
      await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          type: "reflection",
          title: `Lament — Day ${day}`,
          content: text,
          reference: content.reference,
          ...apiSessionExtras(),
        }),
      });
    } catch {
      /* local season still advances */
    } finally {
      setSaving(false);
    }
  };

  const finishDay = async () => {
    if (response.trim().length >= 3) await saveResponse();
    completeLamentDay(day);
    if (day >= 7) {
      setStep("done");
      return;
    }
    setDay(getLamentCurrentDay());
    setResponse("");
    setStep("wait");
  };

  const exitSeason = () => {
    endLamentSeason();
    navigateBackToHomePaths(navigate, { replace: true });
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      data-testid="lament-pathway"
      style={{
        background: "linear-gradient(180deg, #0c0a14 0%, #1a1528 50%, #0a0812 100%)",
      }}
    >
      <header className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Link
          href="/"
          onClick={() => markReturnToHomePaths()}
          className="flex items-center gap-1.5 text-[13px] text-white/45 hover:text-white/75 py-2"
        >
          Home
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400/60">
          Lament Pathway
        </span>
        <div className="w-12" />
      </header>

      <main className="relative z-10 flex-1 flex flex-col px-5 pb-12 max-w-lg mx-auto w-full">
        {active && step !== "intro" && step !== "done" && (
          <p className="text-center text-[12px] text-white/35 mb-6 tabular-nums">
            Day {day} of 7
          </p>
        )}

        <AnimatePresence mode="wait">
          {step === "wait" && (
            <motion.div key="wait" {...fade} className="flex-1 flex flex-col justify-center text-center">
              <p className="text-[15px] text-white/70 leading-relaxed mb-6">
                You&apos;ve sat with today&apos;s lament. Return tomorrow — grief is not rushed here.
              </p>
              <p className="text-[13px] text-white/45 mb-8">Day {day} of 7</p>
              <Link
                href="/surrender"
                className="inline-block rounded-xl border border-white/15 px-6 py-3 text-[14px] text-white/80"
              >
                Surrender Stone →
              </Link>
              <Link href="/" onClick={() => markReturnToHomePaths()} className="block mt-6 text-[13px] text-white/40">
                Home
              </Link>
            </motion.div>
          )}

          {step === "intro" && (
            <motion.div key="intro" {...fade} className="flex-1 flex flex-col justify-center text-center">
              <h1
                className="text-[1.35rem] font-medium text-white/90 leading-snug mb-4"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                A season for grief
              </h1>
              <p className="text-[15px] text-white/55 leading-relaxed mb-8 max-w-sm mx-auto">
                Seven days. No streaks. No fixing. Psalm, one honest question, silence, and space to
                write to God if you choose.
              </p>
              <button
                type="button"
                data-testid="btn-lament-begin"
                onClick={begin}
                className="w-full max-w-xs mx-auto rounded-xl bg-slate-600/80 hover:bg-slate-600 text-white font-semibold py-4"
              >
                Enter this season
              </button>
              <Link href="/sigh" className="mt-6 text-[13px] text-white/40 hover:text-white/60">
                Not ready for seven days? → Sigh Room
              </Link>
            </motion.div>
          )}

          {content && step === "psalm" && (
            <motion.div key="psalm" {...fade} className="flex-1 flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/70 mb-4 text-center">
                Psalm for today
              </p>
              <blockquote
                className="text-[1.05rem] leading-relaxed text-white/88 text-center"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontStyle: "italic" }}
              >
                &ldquo;{content.psalmFragment}&rdquo;
              </blockquote>
              <p className="text-center text-[13px] text-slate-300/70 mt-4 mb-8">— {content.reference}</p>
              <button
                type="button"
                data-testid="btn-lament-psalm-continue"
                onClick={() => setStep("question")}
                className="w-full rounded-xl border border-white/15 text-white/85 font-semibold py-3.5"
              >
                Continue
              </button>
            </motion.div>
          )}

          {content && step === "question" && (
            <motion.div key="question" {...fade} className="flex-1 flex flex-col justify-center">
              <p className="text-[15px] text-white/80 leading-relaxed text-center mb-8">
                {content.question}
              </p>
              <button
                type="button"
                data-testid="btn-lament-to-write"
                onClick={() => setStep("write")}
                className="w-full rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold py-3.5 mb-3"
              >
                Write to God
              </button>
              <button
                type="button"
                data-testid="btn-lament-skip-write"
                onClick={() => setStep("silence")}
                className="w-full text-[13px] text-white/45 py-2"
              >
                Skip writing — sit in silence
              </button>
            </motion.div>
          )}

          {content && step === "write" && (
            <motion.div key="write" {...fade} className="flex-1 flex flex-col justify-center">
              <p className="text-[13px] text-white/45 text-center mb-4">Only God needs to read this.</p>
              <textarea
                data-testid="input-lament-response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={5}
                placeholder="Write honestly…"
                className="w-full rounded-xl border border-white/12 bg-white/[0.05] px-4 py-4 text-[16px] text-white placeholder:text-white/30 outline-none resize-none"
              />
              <button
                type="button"
                disabled={saving}
                data-testid="btn-lament-save-continue"
                onClick={() => setStep("silence")}
                className="mt-4 w-full rounded-xl bg-slate-600/90 text-white font-semibold py-3.5 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Continue to silence"}
              </button>
            </motion.div>
          )}

          {content && step === "silence" && (
            <motion.div key="silence" {...fade} className="flex-1 flex flex-col justify-center">
              <LamentSilenceBeat
                onDone={() => {
                  if (day === 7 && content.companion) setStep("companion");
                  else void finishDay();
                }}
              />
            </motion.div>
          )}

          {content && step === "companion" && content.companion && (
            <motion.div key="companion" {...fade} className="flex-1 flex flex-col justify-center text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/60 mb-4">
                For the road ahead
              </p>
              <blockquote
                className="text-[1.1rem] text-white/88 leading-relaxed"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontStyle: "italic" }}
              >
                &ldquo;{content.companion.text}&rdquo;
              </blockquote>
              <p className="mt-3 text-[13px] text-slate-300/70 mb-8">— {content.companion.reference}</p>
              <button
                type="button"
                data-testid="btn-lament-finish-week"
                onClick={() => void finishDay()}
                className="w-full rounded-xl bg-white text-slate-900 font-bold py-4"
              >
                Close this season
              </button>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" {...fade} className="flex-1 flex flex-col justify-center text-center">
              <p
                className="text-[1.15rem] text-white/88 leading-relaxed mb-6"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                You walked seven days without performing healing.
                <br />
                <span className="text-white/50">That is faithfulness.</span>
              </p>
              <button
                type="button"
                onClick={exitSeason}
                data-testid="btn-lament-exit"
                className="w-full max-w-xs mx-auto rounded-xl border border-white/20 text-white font-semibold py-3.5"
              >
                Return home
              </button>
              <Link href="/journal" className="mt-4 text-[13px] text-violet-300/70 underline">
                View journal entries
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
