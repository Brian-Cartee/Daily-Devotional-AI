import { useCallback, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SessionStillness } from "@/components/SessionStillness";
import {
  ScriptureWaitsReveal,
  type ScriptureWaitsPayload,
} from "@/components/scripture/ScriptureWaitsReveal";
import { AiPauseModal } from "@/components/AiPauseModal";
import { getGuidanceMode } from "@/lib/guidanceMode";
import { getUserName } from "@/lib/userName";
import { apiSessionExtras } from "@/lib/requestExtras";
import { listeningDelayMs, waitMs } from "@/lib/pauseEngine";
import { canStartSighSession, recordSighSessionStarted } from "@/lib/sighSession";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { canUseAi } from "@/lib/aiUsage";
import { refreshAiUsage } from "@/hooks/use-ai-usage";
import { useDailyVerse } from "@/hooks/use-verses";
import { detectCrisisClient } from "@/lib/crisisClient";
import { markSacredSessionQuiet } from "@/lib/sacredSession";
import { PrayerThatStays } from "@/components/prayer/PrayerThatStays";

type Step =
  | "invite"
  | "listening"
  | "mirror"
  | "consent"
  | "scripture"
  | "prayer"
  | "stillness"
  | "close";

type ConsentChoice = "scripture" | "prayer" | "stay";

const INVITE_PLACEHOLDERS = [
  "What I've been afraid to say out loud…",
  "The weight I carried home today…",
  "I don't know if God still sees me…",
];

function cleanResponse(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#+\s*/gm, "");
}

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export default function SighRoomPage() {
  const [, navigate] = useLocation();
  const { data: dailyVerse } = useDailyVerse();
  const isPro = isProVerifiedLocally();
  const [step, setStep] = useState<Step>("invite");
  const [shareText, setShareText] = useState("");
  const [mirrorText, setMirrorText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [scripture, setScripture] = useState<ScriptureWaitsPayload | null>(null);
  const [scriptureLoading, setScriptureLoading] = useState(false);
  const [prayer, setPrayer] = useState<string | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [showStillness, setShowStillness] = useState(false);
  const [showAiPause, setShowAiPause] = useState(false);
  const [limitBlocked, setLimitBlocked] = useState(() => !canStartSighSession(isPro));
  const startedRef = useRef(false);

  const stillnessVerse = scripture
    ? { text: scripture.text, ref: scripture.reference }
    : dailyVerse
      ? { text: dailyVerse.text, ref: dailyVerse.reference }
      : {
          text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.",
          ref: "Psalm 34:18",
        };

  const streamMirror = useCallback(async (situation: string) => {
    setStreaming(true);
    setMirrorText("");
    try {
      const res = await fetch("/api/guidance/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation,
          messages: [{ role: "user", content: situation }],
          userName: getUserName() ?? undefined,
          guidanceMode: getGuidanceMode(),
          presenceMode: "sigh",
          ...apiSessionExtras(),
        }),
      });
      if (res.status === 429) {
        setShowAiPause(true);
        setStreaming(false);
        void refreshAiUsage();
        return;
      }
      if (!res.ok || !res.body) {
        setMirrorText(
          "What you shared carries weight. I want to respond carefully — when you're ready, we can try again.",
        );
        setStreaming(false);
        setStep("consent");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMirrorText(cleanResponse(accumulated));
      }
      setMirrorText(cleanResponse(accumulated.trim() || "I'm here with you in this."));
      void refreshAiUsage();
    } catch {
      setMirrorText("I'm here with you. We can stay with what you shared.");
    } finally {
      setStreaming(false);
      setStep("consent");
    }
  }, []);

  const handleShare = async () => {
    const text = shareText.trim();
    if (text.length < 12) return;

    if (detectCrisisClient(text)) {
      navigate("/guidance?situation=" + encodeURIComponent(text));
      return;
    }

    if (!canUseAi()) {
      setShowAiPause(true);
      return;
    }

    if (!startedRef.current) {
      if (!canStartSighSession(isPro)) {
        setLimitBlocked(true);
        return;
      }
      recordSighSessionStarted();
      startedRef.current = true;
    }

    setStep("listening");
    await waitMs(listeningDelayMs());
    setStep("mirror");
    await streamMirror(text);
  };

  const fetchScripture = async () => {
    setScriptureLoading(true);
    setScripture(null);
    try {
      const res = await fetch("/api/guidance/verse-and-prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: shareText.trim(),
          userName: getUserName() ?? undefined,
          presenceMode: "sigh",
          fields: "verse",
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
            data.rationale ??
            "This isn't random — it's for what you named.",
        });
      }
      void refreshAiUsage();
    } catch {
      /* stillness fallback */
    } finally {
      setScriptureLoading(false);
    }
  };

  const fetchPrayer = async () => {
    setPrayerLoading(true);
    try {
      const res = await fetch("/api/guidance/verse-and-prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: shareText.trim(),
          userName: getUserName() ?? undefined,
          presenceMode: "sigh",
          fields: "prayer",
          ...apiSessionExtras(),
        }),
      });
      if (res.status === 429) {
        setShowAiPause(true);
        return;
      }
      const data = await res.json();
      if (data.prayer) setPrayer(data.prayer);
      void refreshAiUsage();
    } catch {
      setPrayer("God, You see what I brought here. Meet me in it. Amen.");
    } finally {
      setPrayerLoading(false);
    }
  };

  const handleConsent = async (choice: ConsentChoice) => {
    if (choice === "scripture") {
      setStep("scripture");
      await fetchScripture();
      return;
    }
    if (choice === "prayer") {
      setStep("prayer");
      await fetchPrayer();
      return;
    }
    setStep("stillness");
    setShowStillness(true);
  };

  const goToStillness = () => {
    setStep("stillness");
    setShowStillness(true);
  };

  const afterStillness = () => {
    setShowStillness(false);
    markSacredSessionQuiet();
    setStep("close");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      data-testid="sigh-room"
      style={{
        background: "linear-gradient(175deg, #1e0d50 0%, #130636 45%, #09031e 100%)",
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
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[13px] font-medium text-white/50 hover:text-white/80 transition-colors py-2"
          data-testid="link-sigh-exit"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
          Sigh Room
        </span>
        <div className="w-14" />
      </header>

      <main className="relative z-10 flex-1 flex flex-col px-5 pb-10 max-w-lg mx-auto w-full">
        {limitBlocked && step === "invite" && (
          <p className="text-center text-[13px] text-violet-200/70 mb-4 px-2">
            You&apos;ve had quiet rooms for today.{" "}
            {isPro ? "" : (
              <Link href="/pricing" className="underline text-violet-200">
                Go deeper with Pro
              </Link>
            )}
          </p>
        )}

        <AnimatePresence mode="wait">
          {step === "invite" && (
            <motion.div key="invite" {...fade} className="flex-1 flex flex-col justify-center">
              <p
                className="text-[1.2rem] sm:text-[1.35rem] text-white/90 leading-snug text-center mb-2"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                Say what you&apos;ve been carrying.
              </p>
              <p className="text-center text-[14px] text-white/45 mb-8">
                One sentence is enough. This room is quiet on purpose.
              </p>
              <textarea
                data-testid="input-sigh-share"
                value={shareText}
                onChange={(e) => setShareText(e.target.value)}
                placeholder={INVITE_PLACEHOLDERS[0]}
                rows={4}
                className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-4 text-[16px] text-white placeholder:text-white/30 outline-none focus:border-violet-400/40 resize-none"
              />
              <button
                type="button"
                data-testid="btn-sigh-share"
                disabled={shareText.trim().length < 12 || limitBlocked}
                onClick={() => void handleShare()}
                className="mt-5 w-full rounded-xl bg-violet-600/90 hover:bg-violet-600 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold py-4 transition-colors"
              >
                Share with care
              </button>
              <p className="mt-6 text-center text-[12px] text-white/35">
                No rush. No performance.{" "}
                <Link href="/lament" className="text-violet-300/60 underline">
                  Grief season (7 days)
                </Link>
                {" · "}
                <Link href="/surrender" className="text-white/50 underline">
                  Surrender Stone
                </Link>
              </p>
            </motion.div>
          )}

          {step === "listening" && (
            <motion.div
              key="listening"
              {...fade}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <p className="text-[1.15rem] text-white/80 font-medium">I&apos;m listening.</p>
              <Loader2 className="w-6 h-6 text-violet-300/50 animate-spin mt-8" />
            </motion.div>
          )}

          {step === "mirror" && (
            <motion.div key="mirror" {...fade} className="flex-1 flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-4 text-center">
                Held with care
              </p>
              <div
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5"
                data-testid="text-sigh-mirror"
              >
                <p className="text-[16px] leading-relaxed text-white/88">
                  {mirrorText}
                  {streaming && (
                    <span className="inline-block w-0.5 h-4 bg-violet-300/80 ml-0.5 animate-pulse align-middle" />
                  )}
                </p>
              </div>
              {!streaming && (
                <p className="text-center text-[13px] text-white/40 mt-6">…</p>
              )}
            </motion.div>
          )}

          {step === "consent" && (
            <motion.div key="consent" {...fade} className="flex-1 flex flex-col justify-center">
              <p className="text-center text-[1.05rem] text-white/85 mb-6">
                Would you like…
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  data-testid="btn-sigh-consent-scripture"
                  onClick={() => void handleConsent("scripture")}
                  className="w-full rounded-2xl border border-violet-400/25 bg-violet-500/10 hover:bg-violet-500/15 px-5 py-4 text-left transition-colors"
                >
                  <span className="block text-[16px] font-semibold text-white">Scripture</span>
                  <span className="block text-[13px] text-white/50 mt-0.5">
                    One passage for where you are
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="btn-sigh-consent-prayer"
                  onClick={() => void handleConsent("prayer")}
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] px-5 py-4 text-left transition-colors"
                >
                  <span className="block text-[16px] font-semibold text-white">Prayer</span>
                  <span className="block text-[13px] text-white/50 mt-0.5">
                    Shaped from what you shared
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="btn-sigh-consent-stay"
                  onClick={() => void handleConsent("stay")}
                  className="w-full rounded-2xl border border-white/10 bg-transparent hover:bg-white/[0.04] px-5 py-4 text-left transition-colors"
                >
                  <span className="block text-[16px] font-semibold text-white/90">
                    Just stay here
                  </span>
                  <span className="block text-[13px] text-white/45 mt-0.5">
                    Silence before anything else
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {step === "scripture" && (
            <motion.div key="scripture" {...fade} className="flex-1 flex flex-col justify-center gap-6">
              <ScriptureWaitsReveal
                situation={shareText}
                payload={scripture}
                loading={scriptureLoading}
              />
              {!scriptureLoading && (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    data-testid="btn-sigh-after-scripture-stillness"
                    onClick={goToStillness}
                    className="w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold py-3.5"
                  >
                    Sit with this a moment
                  </button>
                  <button
                    type="button"
                    data-testid="btn-sigh-after-scripture-prayer"
                    onClick={async () => {
                      setStep("prayer");
                      await fetchPrayer();
                    }}
                    className="text-[13px] text-white/45 hover:text-white/65 text-center py-2"
                  >
                    Or receive a prayer
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === "prayer" && (
            <motion.div key="prayer" {...fade} className="flex-1 flex flex-col justify-center gap-6">
              {prayerLoading ? (
                <div className="text-center py-12">
                  <p className="text-[14px] text-violet-200/60 italic">Forming your prayer…</p>
                  <Loader2 className="w-6 h-6 text-violet-300/50 animate-spin mx-auto mt-6" />
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 text-center">
                    Prayer
                  </p>
                  <div
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5"
                    data-testid="text-sigh-prayer"
                  >
                    <p
                      className="text-[1.05rem] leading-relaxed text-white/88 whitespace-pre-wrap"
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

          {step === "close" && (
            <motion.div key="close" {...fade} className="flex-1 flex flex-col justify-center text-center">
              <p
                className="text-[1.15rem] text-white/88 leading-relaxed mb-8"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                You can leave whenever you need.
                <br />
                <span className="text-white/55">What you shared mattered.</span>
              </p>
              <Link
                href="/"
                data-testid="btn-sigh-close-home"
                className="inline-flex justify-center rounded-xl bg-white text-[#130636] font-bold px-8 py-3.5"
              >
                Return home
              </Link>
              <Link
                href="/journal"
                className="mt-4 text-[13px] text-white/45 hover:text-white/65"
              >
                Save to journal
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
