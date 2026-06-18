import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Moon } from "lucide-react";
import { SessionStillness } from "@/components/SessionStillness";
import { NightSilenceTimer } from "@/components/night/NightSilenceTimer";
import {
  ScriptureWaitsReveal,
  type ScriptureWaitsPayload,
} from "@/components/scripture/ScriptureWaitsReveal";
import { AiPauseModal } from "@/components/AiPauseModal";
import { getUserName } from "@/lib/userName";
import { apiSessionExtras } from "@/lib/requestExtras";
import {
  buildNightSituation,
  canStartNightShepherd,
  NIGHT_NEED_LABELS,
  recordNightShepherdStarted,
  setNightOptOut,
  skipNightRedirectThisSession,
  type NightNeed,
} from "@/lib/nightShepherdState";
import { getNightGreeting, getNightTimeLabel, isLateNight } from "@/lib/nightMode";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { canUseAi } from "@/lib/aiUsage";
import { refreshAiUsage } from "@/hooks/use-ai-usage";
import { markSacredSessionQuiet } from "@/lib/sacredSession";
import { useDailyVerse } from "@/hooks/use-verses";
import { PrayerThatStays } from "@/components/prayer/PrayerThatStays";

type Step = "greet" | "need" | "silence" | "scripture" | "prayer" | "stillness" | "sleep";

const NEED_OPTIONS: NightNeed[] = ["anxiety", "loneliness", "grief", "fear", "unknown"];

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

export default function NightShepherdPage() {
  const [, navigate] = useLocation();
  const { data: dailyVerse } = useDailyVerse();
  const isPro = isProVerifiedLocally();
  const name = getUserName();

  const [step, setStep] = useState<Step>("greet");
  const [need, setNeed] = useState<NightNeed | null>(null);
  const [scripture, setScripture] = useState<ScriptureWaitsPayload | null>(null);
  const [scriptureLoading, setScriptureLoading] = useState(false);
  const [prayer, setPrayer] = useState<string | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [showStillness, setShowStillness] = useState(false);
  const [showAiPause, setShowAiPause] = useState(false);
  const [limitBlocked, setLimitBlocked] = useState(() => !canStartNightShepherd(isPro));
  const startedRef = useRef(false);

  useEffect(() => {
    const forceNight =
      import.meta.env.DEV ||
      new URLSearchParams(window.location.search).get("night") === "1";
    if (!isLateNight() && !forceNight) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const situation = need ? buildNightSituation(need) : "";

  const stillnessVerse = scripture
    ? { text: scripture.text, ref: scripture.reference }
    : dailyVerse
      ? { text: dailyVerse.text, ref: dailyVerse.reference }
      : {
          text: "Be still, and know that I am God.",
          ref: "Psalm 46:10",
        };

  const ensureSession = useCallback(() => {
    if (startedRef.current) return true;
    if (!canUseAi()) {
      setShowAiPause(true);
      return false;
    }
    if (!canStartNightShepherd(isPro)) {
      setLimitBlocked(true);
      return false;
    }
    recordNightShepherdStarted();
    startedRef.current = true;
    return true;
  }, [isPro]);

  const fetchScripture = useCallback(async (nightNeed: NightNeed) => {
    setScriptureLoading(true);
    setScripture(null);
    const sit = buildNightSituation(nightNeed);
    try {
      const res = await fetch("/api/guidance/verse-and-prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: sit,
          userName: name ?? undefined,
          presenceMode: "night",
          fields: "verse",
          isLateNight: true,
          ...apiSessionExtras(),
        }),
      });
      if (res.status === 429) {
        setShowAiPause(true);
        return;
      }
      const data = await res.json();
      if (data.verse?.reference && data.verse?.text) {
        setScripture({
          reference: data.verse.reference,
          text: data.verse.text,
          rationale:
            data.rationale ?? "For the hour you are in — not a random verse.",
        });
      }
      void refreshAiUsage();
    } catch {
      /* stillness fallback */
    } finally {
      setScriptureLoading(false);
    }
  }, [name]);

  const fetchPrayer = useCallback(async (nightNeed: NightNeed) => {
    setPrayerLoading(true);
    const sit = buildNightSituation(nightNeed);
    try {
      const res = await fetch("/api/guidance/verse-and-prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: sit,
          userName: name ?? undefined,
          presenceMode: "night",
          fields: "prayer",
          isLateNight: true,
          ...apiSessionExtras(),
        }),
      });
      if (res.status === 429) {
        setShowAiPause(true);
        return;
      }
      const data = await res.json();
      setPrayer(
        data.prayer ??
          "God, the night is long. Meet me here. I do not have to hold this alone. Amen.",
      );
      void refreshAiUsage();
    } catch {
      setPrayer("God, meet me in this quiet hour. Amen.");
    } finally {
      setPrayerLoading(false);
    }
  }, [name]);

  const handleNeed = async (n: NightNeed) => {
    if (!ensureSession()) return;
    setNeed(n);
    setStep("silence");
  };

  const afterSilence = async () => {
    if (!need) return;
    setStep("scripture");
    await fetchScripture(need);
  };

  const afterScripture = async () => {
    if (!need) return;
    setStep("prayer");
    await fetchPrayer(need);
  };

  const goToStillness = () => {
    setStep("stillness");
    setShowStillness(true);
  };

  const afterStillness = () => {
    setShowStillness(false);
    markSacredSessionQuiet();
    setStep("sleep");
  };

  const goHome = () => {
    skipNightRedirectThisSession();
    navigate("/?home=1", { replace: true });
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      data-testid="night-shepherd"
      style={{
        background: "linear-gradient(180deg, #0a0618 0%, #12082a 40%, #09031e 100%)",
      }}
    >
      <SessionStillness
        open={showStillness}
        verseText={stillnessVerse.text}
        verseRef={stillnessVerse.ref}
        onDone={afterStillness}
      />

      {showAiPause && <AiPauseModal onClose={() => setShowAiPause(false)} />}

      <header className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-1.5 text-[13px] font-medium text-white/45 hover:text-white/75 transition-colors py-2"
          data-testid="link-night-home"
        >
          Home
        </button>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300/50">
          <Moon className="w-3 h-3" />
          Night Shepherd
        </div>
        <div className="w-14" />
      </header>

      <main className="relative z-10 flex-1 flex flex-col px-5 pb-10 max-w-lg mx-auto w-full">
        {limitBlocked && step === "greet" && (
          <p className="text-center text-[13px] text-indigo-200/60 mb-4">
            You&apos;ve walked with Night Shepherd tonight.{" "}
            {!isPro && (
              <Link href="/pricing" className="underline text-indigo-200/80">
                Pro
              </Link>
            )}{" "}
            {!isPro && "offers unlimited nights."}
          </p>
        )}

        <AnimatePresence mode="wait">
          {step === "greet" && (
            <motion.div key="greet" {...fade} className="flex-1 flex flex-col justify-center text-center">
              <p className="text-[11px] font-semibold text-indigo-300/50 tabular-nums tracking-wide uppercase mb-3">
                {getNightTimeLabel()}
              </p>
              <h1
                className="text-[1.4rem] sm:text-[1.55rem] text-white/92 font-medium leading-snug"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                {getNightGreeting(name)}
              </h1>
              <p className="mt-4 text-[15px] text-white/50 leading-relaxed max-w-xs mx-auto">
                What&apos;s keeping you awake?
              </p>
              <button
                type="button"
                data-testid="btn-night-continue-greet"
                disabled={limitBlocked}
                onClick={() => setStep("need")}
                className="mt-10 w-full max-w-xs mx-auto rounded-xl bg-indigo-600/80 hover:bg-indigo-600 disabled:opacity-40 text-white font-semibold py-4 transition-colors"
              >
                I&apos;m ready
              </button>
              <button
                type="button"
                data-testid="btn-night-opt-out"
                onClick={() => {
                  setNightOptOut(true);
                  skipNightRedirectThisSession();
                  navigate("/?home=1", { replace: true });
                }}
                className="mt-4 text-[12px] text-white/30 hover:text-white/50"
              >
                Always show full home at night
              </button>
            </motion.div>
          )}

          {step === "need" && (
            <motion.div key="need" {...fade} className="flex-1 flex flex-col justify-center">
              <p className="text-center text-[1.05rem] text-white/80 mb-8">
                Name it gently — or choose the closest fit.
              </p>
              <div className="flex flex-col gap-2.5">
                {NEED_OPTIONS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`btn-night-need-${id}`}
                    disabled={limitBlocked}
                    onClick={() => void handleNeed(id)}
                    className="w-full rounded-2xl border border-indigo-400/15 bg-indigo-950/30 hover:bg-indigo-900/35 px-5 py-4 text-left transition-colors disabled:opacity-40"
                  >
                    <span className="text-[16px] font-semibold text-white/90">
                      {NIGHT_NEED_LABELS[id]}
                    </span>
                  </button>
                ))}
              </div>
              <Link
                href="/sigh"
                className="mt-8 text-center text-[13px] text-white/40 hover:text-white/60"
              >
                Need to say more first? → Sigh Room
              </Link>
            </motion.div>
          )}

          {step === "silence" && (
            <motion.div key="silence" {...fade} className="flex-1 flex flex-col justify-center">
              <NightSilenceTimer onDone={() => void afterSilence()} />
            </motion.div>
          )}

          {step === "scripture" && (
            <motion.div key="scripture" {...fade} className="flex-1 flex flex-col justify-center gap-6">
              <ScriptureWaitsReveal
                situation={situation}
                payload={scripture}
                loading={scriptureLoading}
              />
              {!scriptureLoading && (
                <button
                  type="button"
                  data-testid="btn-night-after-scripture"
                  onClick={() => void afterScripture()}
                  className="w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold py-3.5"
                >
                  Continue
                </button>
              )}
            </motion.div>
          )}

          {step === "prayer" && (
            <motion.div key="prayer" {...fade} className="flex-1 flex flex-col justify-center gap-6">
              {prayerLoading ? (
                <div className="text-center py-10">
                  <p className="text-[14px] text-indigo-200/55 italic">A quiet prayer…</p>
                  <Loader2 className="w-6 h-6 text-indigo-300/40 animate-spin mx-auto mt-6" />
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 text-center">
                    Whisper prayer
                  </p>
                  <div
                    className="rounded-2xl border border-indigo-400/15 bg-black/20 px-5 py-5"
                    data-testid="text-night-prayer"
                  >
                    <p
                      className="text-[1.05rem] leading-[1.75] text-white/82 whitespace-pre-wrap"
                      style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
                    >
                      {prayer}
                    </p>
                  </div>
                  <PrayerThatStays onComplete={goToStillness} />
                </>
              )}
            </motion.div>
          )}

          {step === "sleep" && (
            <motion.div key="sleep" {...fade} className="flex-1 flex flex-col justify-center text-center">
              <p
                className="text-[1.15rem] text-white/85 leading-relaxed"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                Rest if you can.
                <br />
                <span className="text-white/50">We&apos;re still here.</span>
              </p>
              <p className="mt-4 text-[14px] text-white/40 leading-relaxed max-w-xs mx-auto">
                God hasn&apos;t abandoned you in this hour.
              </p>
              <div className="mt-10 flex flex-col gap-3 max-w-xs mx-auto w-full">
                {need === "grief" && (
                  <Link
                    href="/lament"
                    data-testid="btn-night-lament"
                    className="rounded-xl border border-slate-400/25 bg-slate-900/30 text-white/85 font-medium py-3 text-center"
                  >
                    Enter Lament Pathway (7 days)
                  </Link>
                )}
                <Link
                  href="/surrender"
                  data-testid="btn-night-surrender"
                  className="rounded-xl border border-white/12 text-white/75 font-medium py-3 text-center hover:bg-white/5"
                >
                  Surrender Stone
                </Link>
                <Link
                  href="/devotional"
                  data-testid="btn-night-devotional"
                  className="rounded-xl border border-white/12 text-white/60 font-medium py-3 text-center hover:bg-white/5"
                >
                  Tonight&apos;s devotional
                </Link>
                <button
                  type="button"
                  onClick={goHome}
                  data-testid="btn-night-sleep-home"
                  className="text-[13px] text-white/40 hover:text-white/60 py-2"
                >
                  Return home
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
