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
import { BrandIcon } from "@/components/BrandIcon";

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

/** Classic brand lines — live on the photo, like the original homepage hero */
const BRAND_TAGLINE = "Find your way back to God";
const BRAND_TAGLINE_SUB = "one moment at a time.";

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
    <div className="relative bg-[#09031e]">
      {/* ── Cinematic photo band — road & hill visible (original homepage feel) ── */}
      <div
        className="relative w-full overflow-hidden h-[46vh] min-h-[260px] max-h-[400px] sm:h-[44vh] sm:max-h-[440px]"
        aria-hidden={false}
      >
        <img
          src="/hero-landing.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_42%] sm:object-[center_38%]"
          decoding="async"
        />
        {/* Light top scrim for “Why this exists” handle legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,4,18,0.35) 0%, rgba(8,4,18,0.05) 28%, rgba(8,4,18,0.0) 50%, rgba(9,3,30,0.55) 78%, #09031e 100%)",
          }}
        />
        {/* Brand promise on the sky — matches legacy hero */}
        <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center text-center px-6 pt-[3.75rem] sm:pt-16">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-white font-bold leading-[1.2] tracking-tight max-w-[18ch] drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]"
            style={{ fontSize: "clamp(1.35rem, 5.2vw, 1.85rem)" }}
          >
            {BRAND_TAGLINE}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 text-[15px] sm:text-base text-white/90 font-medium drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]"
          >
            {BRAND_TAGLINE_SUB}
          </motion.p>
        </div>
        {/* Brand mark at base of photo */}
        <div className="absolute bottom-4 inset-x-0 z-10 flex items-center justify-center gap-2.5">
          <BrandIcon size={32} className="drop-shadow-md" />
          <span className="text-[15px] font-bold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
            Shepherd&apos;s Path
          </span>
        </div>
      </div>

      {/* ── Personal threshold + actions (dark band below the path) ── */}
      <div className="relative z-10 max-w-xl mx-auto w-full px-3 sm:px-5 pt-5 sm:pt-6 pb-8 sm:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="text-white font-bold leading-[1.15] mb-3 tracking-tight"
            style={{ fontSize: "clamp(1.65rem, 5.5vw, 2.25rem)" }}
            data-testid="text-threshold-headline"
          >
            {thresholdLoading ? "…" : threshold?.headline ?? "What's on your heart?"}
          </h1>
          <p className="text-[17px] sm:text-[18px] text-white/82 leading-relaxed mb-4 font-medium">
            {thresholdLoading ? "…" : threshold?.subtext}
          </p>
          {threshold?.continuityLine && (
            <p
              className="text-[15px] text-violet-100/85 leading-relaxed mb-5 pl-3.5 border-l-2 border-violet-400/40"
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

          {(threshold?.listenFirstSuggested || listenFirst || !isProVerifiedLocally()) &&
            (isProVerifiedLocally() ? (
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
            ))}
        </motion.div>
      </div>
    </div>
  );
}
