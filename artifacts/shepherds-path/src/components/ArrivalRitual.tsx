import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Wind, ArrowRight, Moon } from "lucide-react";
import { isLateNight } from "@/lib/nightMode";

const ARRIVAL_KEY = "sp_arrival_shown_v1";

type NextStep = "talk" | "scripture" | "breathe";
const CARE_PATHS = [
  "I feel alone",
  "I’m anxious",
  "I’m grieving",
  "I’m exhausted",
];

function encodeSituation(s: string): string {
  return encodeURIComponent(s.trim());
}

export function shouldShowArrivalRitual(): boolean {
  try {
    if (localStorage.getItem(ARRIVAL_KEY)) return false;
    const visits = parseInt(localStorage.getItem("sp_home_visits_after_threshold") ?? "0", 10);
    if (visits < 2) return false;
    return true;
  } catch {
    return false;
  }
}

export function markArrivalRitualShown(): void {
  try {
    localStorage.setItem(ARRIVAL_KEY, new Date().toISOString().split("T")[0]);
  } catch {
    // noop
  }
}

interface ArrivalRitualProps {
  defaultOpen?: boolean;
  onComplete?: () => void;
  className?: string;
}

/**
 * A gentle “arrive” moment that reduces activation before choices.
 * Keeps copy minimal; offers a quiet exit; routes into the three doors.
 */
export function ArrivalRitual({ defaultOpen = false, onComplete, className }: ArrivalRitualProps) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(defaultOpen);
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"in" | "out">("in");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 200);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || submitted) return;
    const t = window.setInterval(() => {
      setBreathPhase((p) => (p === "in" ? "out" : "in"));
    }, 3500);
    return () => window.clearInterval(t);
  }, [open, submitted]);

  const title = useMemo(() => (submitted ? "Where do you want to go next?" : "You’re safe here."), [submitted]);
  const subtitle = useMemo(() => {
    if (submitted) return "Choose one gentle step. You can always come back.";
    return "In one sentence—what’s heavy right now?";
  }, [submitted]);

  const go = (step: NextStep) => {
    markArrivalRitualShown();
    onComplete?.();
    if (step === "scripture") {
      navigate("/devotional");
      return;
    }
    if (step === "breathe") {
      navigate(isLateNight() ? "/night" : "/sigh");
      return;
    }
    // talk
    const q = value.trim() ? `?situation=${encodeSituation(value)}&arrive=1` : "";
    navigate(`/guidance${q}`);
  };

  const submit = () => {
    setSubmitted(true);
    markArrivalRitualShown();
    onComplete?.();
  };

  const canSubmit = value.trim().length >= 3;

  return (
    <div className={className}>
      {!open ? (
        <button
          type="button"
          data-testid="btn-arrival-open"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition-colors px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-white/80">{title}</p>
            <p className="text-[11px] text-white/45 mt-0.5 truncate">{subtitle}</p>
          </div>
          <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-white/10 bg-white/[0.03]">
            <Wind className="w-4 h-4 text-amber-200/60" aria-hidden />
          </div>
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden"
          data-testid="card-arrival-ritual"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 45% at 50% 20%, rgba(251,191,36,0.10) 0%, transparent 60%), radial-gradient(ellipse 55% 50% at 15% 80%, rgba(167,139,250,0.08) 0%, transparent 60%)",
            }}
          />

          <div className="relative px-4 pt-4 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-white/90">{title}</p>
                <p className="text-[11px] text-white/55 mt-1 leading-snug">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {!submitted && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <motion.div
                      aria-hidden="true"
                      animate={{
                        scale: breathPhase === "in" ? 1.05 : 0.92,
                        opacity: breathPhase === "in" ? 0.9 : 0.6,
                      }}
                      transition={{ duration: 3.3, ease: "easeInOut" }}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: "rgba(251,191,36,0.55)", boxShadow: "0 0 14px rgba(251,191,36,0.22)" }}
                    />
                    <p className="text-[10px] font-semibold tracking-wide text-white/40">
                      {breathPhase === "in" ? "Breathe in" : "Breathe out"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {CARE_PATHS.map((path) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => {
                        setValue(path);
                        setSubmitted(true);
                        markArrivalRitualShown();
                        onComplete?.();
                      }}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 transition-colors"
                      data-testid={`chip-care-${path.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                    >
                      {path}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (canSubmit) submit();
                      }
                    }}
                    placeholder="In one sentence…"
                    className="flex-1 rounded-xl bg-black/20 border border-white/10 px-3 py-2.5 text-[13px] text-white/85 placeholder:text-white/35 outline-none focus:border-amber-400/35 focus:ring-2 focus:ring-amber-400/10"
                    data-testid="input-arrival-sentence"
                  />
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    className="shrink-0 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold transition-all border border-amber-400/20 bg-amber-400/10 text-amber-100/90 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-400/14"
                    data-testid="btn-arrival-continue"
                  >
                    Continue
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => go("breathe")}
                    className="text-[11px] font-medium text-white/45 hover:text-white/70 transition-colors flex items-center gap-1.5"
                    data-testid="btn-arrival-not-ready"
                  >
                    <Moon className="w-3.5 h-3.5 text-white/35" aria-hidden />
                    Not ready to type
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmitted(true)}
                    className="text-[11px] font-medium text-white/40 hover:text-white/65 transition-colors"
                    data-testid="btn-arrival-skip"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2"
                  data-testid="arrival-next-steps"
                >
                  <button
                    type="button"
                    onClick={() => go("talk")}
                    className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-colors px-3 py-3 text-left"
                    data-testid="btn-arrival-next-talk"
                  >
                    <p className="text-[12px] font-semibold text-white/90">Talk it through</p>
                    <p className="text-[11px] text-white/45 mt-0.5 leading-snug">Scripture + prayer for what you wrote</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go("scripture")}
                    className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-colors px-3 py-3 text-left"
                    data-testid="btn-arrival-next-scripture"
                  >
                    <p className="text-[12px] font-semibold text-white/90">Sit in Scripture</p>
                    <p className="text-[11px] text-white/45 mt-0.5 leading-snug">Today’s verse + devotional</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => go("breathe")}
                    className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-colors px-3 py-3 text-left"
                    data-testid="btn-arrival-next-breathe"
                  >
                    <p className="text-[12px] font-semibold text-white/90">Just breathe</p>
                    <p className="text-[11px] text-white/45 mt-0.5 leading-snug flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/[0.04] border border-white/10">
                        <ArrowRight className="w-3 h-3 text-amber-200/60" aria-hidden />
                      </span>
                      A quieter room
                    </p>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}

