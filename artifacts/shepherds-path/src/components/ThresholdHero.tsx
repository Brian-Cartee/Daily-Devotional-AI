import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Headphones } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
import { getRelationshipAge } from "@/lib/relationship";
import { useDailyVerse } from "@/hooks/use-verses";
import { getListenFirstPreference, setListenFirstPreference } from "@/lib/listenFirst";
import { canUseListenFirstAuto } from "@/lib/listenPolicy";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { apiSessionExtras } from "@/lib/requestExtras";
import { TalkItThroughHeroPrompt } from "@/components/TalkItThroughHeroPrompt";

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

  const showTalkPrompt = !thresholdLoading;

  return (
    <div
      className="relative min-h-[56vh] flex flex-col justify-end overflow-hidden"
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
      <div className="relative z-10 max-w-xl mx-auto w-full px-5 pt-14 pb-8 sm:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-200/70 mb-3">
            Shepherd&apos;s Path
          </p>
          <h1
            className="text-white font-bold leading-[1.15] mb-3 tracking-tight"
            style={{ fontSize: "clamp(1.75rem, 6vw, 2.35rem)" }}
            data-testid="text-threshold-headline"
          >
            {thresholdLoading ? "…" : threshold?.headline ?? "What's on your heart?"}
          </h1>
          <p className="text-[17px] sm:text-[18px] text-white/82 leading-relaxed max-w-md mb-4 font-medium">
            {thresholdLoading ? "…" : threshold?.subtext}
          </p>
          {threshold?.continuityLine && (
            <p
              className="text-[15px] text-violet-100/85 leading-relaxed max-w-md mb-5 pl-3.5 border-l-2 border-violet-400/40"
              data-testid="text-threshold-continuity"
            >
              {threshold.continuityLine}
            </p>
          )}

          {showTalkPrompt && !thresholdLoading && (
            <div className="mb-5">
              <TalkItThroughHeroPrompt phase={threshold?.phase} />
            </div>
          )}

          {verse && !verseLoading && (
            <Link href="/devotional">
              <div
                data-testid="card-daily-verse-threshold"
                className="mb-4 rounded-2xl border border-violet-500/25 bg-black/35 backdrop-blur-sm px-4 py-4 active:scale-[0.99] transition-transform"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-200/80 mb-2">
                  Today&apos;s verse
                </p>
                {verseFrame && (
                  <p className="text-[14px] text-white/65 mb-2.5 leading-snug">{verseFrame}</p>
                )}
                <p
                  className="text-[17px] sm:text-[18px] leading-relaxed text-white/92 mb-2"
                  style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
                >
                  &ldquo;{verse.text.length > 180 ? `${verse.text.slice(0, 180)}…` : verse.text}&rdquo;
                </p>
                <p className="text-[14px] font-semibold text-violet-200/90">— {verse.reference}</p>
              </div>
            </Link>
          )}

          {threshold?.secondaryCta && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link href={threshold.secondaryCta.href}>
                <span
                  data-testid="btn-threshold-secondary"
                  className="text-[15px] font-semibold text-violet-200/90 hover:text-white underline-offset-4 hover:underline transition-colors"
                >
                  {threshold.secondaryCta.label} →
                </span>
              </Link>
              <Link href="/devotional">
                <span className="text-[14px] text-white/50 hover:text-white/70 transition-colors">
                  Open devotional
                </span>
              </Link>
            </div>
          )}

          {(threshold?.listenFirstSuggested || listenFirst || !isProVerifiedLocally()) && (
            isProVerifiedLocally() ? (
              <button
                type="button"
                onClick={toggleListenFirst}
                data-testid="btn-listen-first-pref"
                className={`mt-5 flex items-center gap-2 text-[13px] font-medium transition-colors ${
                  listenFirst ? "text-violet-300" : "text-white/45 hover:text-white/65"
                }`}
              >
                <Headphones className="w-4 h-4" />
                {listenFirst ? "Listen-first mode on" : "Prefer to listen instead of read"}
              </button>
            ) : (
              <Link href="/pricing">
                <span
                  data-testid="btn-listen-first-pro"
                  className="mt-5 flex items-center gap-2 text-[13px] font-medium text-white/45 hover:text-white/65 transition-colors"
                >
                  <Headphones className="w-4 h-4" />
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
