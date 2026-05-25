import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Headphones } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { useDailyVerse } from "@/hooks/use-verses";
import { getListenFirstPreference, setListenFirstPreference } from "@/lib/listenFirst";
import { canUseListenFirstAuto } from "@/lib/listenPolicy";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { apiSessionExtras } from "@/lib/requestExtras";

export type ThresholdData = {
  headline: string;
  subtext: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  phase: string;
  daysWithApp: number;
  streak: number;
  listenFirstSuggested: boolean;
  continuityLine?: string;
};

export function ThresholdHero() {
  const sessionId = getSessionId();
  const daysWithApp = getRelationshipAge();
  const { data: verse, isLoading: verseLoading } = useDailyVerse();
  const [verseFrame, setVerseFrame] = useState<string | null>(null);
  const [listenFirst, setListenFirst] = useState(() => getListenFirstPreference());

  const isPro = isProVerifiedLocally();

  const { data: thresholdRes, isLoading: thresholdLoading } = useQuery<{ threshold: ThresholdData }>({
    queryKey: ["/api/home/threshold", sessionId, daysWithApp, isPro],
    queryFn: async () => {
      const res = await fetch(
        `/api/home/threshold?sessionId=${encodeURIComponent(sessionId)}&daysWithApp=${daysWithApp}&isPro=${isPro}`,
      );
      if (!res.ok) throw new Error("threshold failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const threshold = thresholdRes?.threshold;

  useEffect(() => {
    if (!verse?.reference || !verse?.text) return;
    const key = `sp_verse_frame_${verse.date}`;
    const cached = sessionStorage.getItem(key);
    if (cached) {
      setVerseFrame(cached);
      return;
    }
    fetch(
      `/api/home/verse-frame?reference=${encodeURIComponent(verse.reference)}&text=${encodeURIComponent(verse.text.slice(0, 300))}&sessionId=${encodeURIComponent(apiSessionExtras().sessionId)}&isPro=${apiSessionExtras().isPro}`,
    )
      .then((r) => r.json())
      .then((d: { frame?: string }) => {
        const frame = d.frame || "One word for today — let it walk with you.";
        sessionStorage.setItem(key, frame);
        setVerseFrame(frame);
      })
      .catch(() => setVerseFrame("One word for today — let it walk with you."));
  }, [verse?.reference, verse?.text, verse?.date]);

  const toggleListenFirst = () => {
    if (!canUseListenFirstAuto()) return;
    const next = !listenFirst;
    setListenFirst(next);
    setListenFirstPreference(next);
  };

  return (
    <div
      className="relative min-h-[52vh] flex flex-col justify-end overflow-hidden"
      style={{
        background: "linear-gradient(175deg, #1e0d50 0%, #130636 38%, #09031e 88%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "url('/hero-landing.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
          filter: "blur(2px)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(120,60,220,0.25) 0%, transparent 65%), linear-gradient(to top, #09031e 0%, transparent 55%)",
        }}
      />
      <div className="relative z-10 max-w-xl mx-auto w-full px-5 pt-16 pb-8 sm:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300/55 mb-3">
            Shepherd&apos;s Path
          </p>
          <h1
            className="text-white font-bold leading-tight mb-3"
            style={{ fontSize: "clamp(1.5rem, 5.5vw, 2rem)" }}
            data-testid="text-threshold-headline"
          >
            {thresholdLoading ? "…" : threshold?.headline ?? "What's on your heart?"}
          </h1>
          <p className="text-[15px] text-white/65 leading-relaxed max-w-md mb-3">
            {thresholdLoading ? "…" : threshold?.subtext}
          </p>
          {threshold?.continuityLine && (
            <p
              className="text-[13px] text-violet-200/70 leading-relaxed max-w-md mb-5 pl-3 border-l border-violet-400/30"
              data-testid="text-threshold-continuity"
            >
              {threshold.continuityLine}
            </p>
          )}
          {!threshold?.continuityLine && <div className="mb-2" />}

          {verse && !verseLoading && (
            <Link href="/devotional">
              <div
                data-testid="card-daily-verse-threshold"
                className="mb-5 rounded-2xl border border-violet-500/20 bg-black/25 backdrop-blur-sm px-4 py-3.5 active:scale-[0.99] transition-transform"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/70 mb-1.5">
                  Today&apos;s verse
                </p>
                {verseFrame && (
                  <p className="text-[12px] text-white/50 mb-2 leading-snug">{verseFrame}</p>
                )}
                <p
                  className="text-[15px] leading-relaxed text-white/88 mb-1"
                  style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
                >
                  &ldquo;{verse.text.length > 160 ? `${verse.text.slice(0, 160)}…` : verse.text}&rdquo;
                </p>
                <p className="text-[12px] font-semibold text-violet-300/85">— {verse.reference}</p>
              </div>
            </Link>
          )}

          <div className="flex flex-col gap-2.5">
            {threshold?.primaryCta && (
              <Link href={threshold.primaryCta.href}>
                <span
                  data-testid="btn-threshold-primary"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-[15px] text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-colors"
                >
                  {threshold.primaryCta.label}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            )}
            {threshold?.secondaryCta && (
              <Link href={threshold.secondaryCta.href}>
                <span
                  data-testid="btn-threshold-secondary"
                  className="flex items-center justify-center w-full py-3 rounded-xl font-semibold text-[14px] text-white/75 border border-white/15 hover:bg-white/5 transition-colors"
                >
                  {threshold.secondaryCta.label}
                </span>
              </Link>
            )}
          </div>

          {(threshold?.listenFirstSuggested || listenFirst || !isProVerifiedLocally()) && (
            isProVerifiedLocally() ? (
              <button
                type="button"
                onClick={toggleListenFirst}
                data-testid="btn-listen-first-pref"
                className={`mt-4 flex items-center gap-2 text-[12px] font-medium transition-colors ${
                  listenFirst ? "text-violet-300" : "text-white/40 hover:text-white/60"
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                {listenFirst ? "Listen-first mode on" : "Prefer to listen instead of read"}
              </button>
            ) : (
              <Link href="/pricing">
                <span
                  data-testid="btn-listen-first-pro"
                  className="mt-4 flex items-center gap-2 text-[12px] font-medium text-white/40 hover:text-white/60 transition-colors"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  Pro: mornings start with listen
                </span>
              </Link>
            )
          )}
        </motion.div>
      </div>
    </div>
  );
}
