import { useState, useEffect, useRef, useCallback } from "react";
import { Tv, Copy, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { isProVerifiedLocally, isOwnerPreviewActive, markOwnerPreview } from "@/lib/proStatus";
import { getRelationshipAge } from "@/lib/relationship";

interface LibraryEntry {
  date: string;
  imageUrl: string;
  scripture: string;
  reference: string;
}

interface Slide {
  imageUrl: string;
  content: string;
  reference: string;
}

const SLIDE_DURATION = 50_000;

const DISPLAY_URL = "shepherdspathai.com/display";

function ImageSlide({ slide }: { slide: Slide }) {
  return (
    <div className="absolute inset-0">
      <img
        src={slide.imageUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 sm:pb-28 px-8 sm:px-16 lg:px-28 text-center space-y-4">
        <blockquote className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-light text-white leading-relaxed max-w-4xl drop-shadow-lg">
          "{slide.content}"
        </blockquote>
        <p className="text-sm sm:text-base font-semibold text-amber-300/90 tracking-widest uppercase drop-shadow-md">
          {slide.reference}
        </p>
      </div>
    </div>
  );
}

// On iOS/mobile: navigator.share opens the native share sheet (AirPlay is right there).
// On desktop: show a minimal copy-link modal.
async function triggerCast(onShowModal: () => void) {
  const fullUrl = "https://" + DISPLAY_URL;
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Shepherd's Path · Display Mode",
        text: "Daily devotional art, rotating on any screen.",
        url: fullUrl,
      });
    } catch (err) {
      // AbortError = user cancelled — that's fine, no fallback needed
      if ((err as Error).name !== "AbortError") onShowModal();
    }
  } else {
    onShowModal();
  }
}

function CastModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText("https://" + DISPLAY_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { setCopied(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ background: "rgba(15,6,32,0.97)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-full bg-violet-500/15 border border-violet-400/20 flex items-center justify-center mx-auto mb-4">
          <Tv className="w-5 h-5 text-violet-300/80" />
        </div>

        <h2 className="text-white text-lg font-semibold mb-1">Cast to your screen</h2>
        <p className="text-white/50 text-sm mb-5 leading-relaxed">
          Open this link in any browser — on your TV, Mac, or Chromecast
        </p>

        {/* URL + copy */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="text-white/70 text-sm flex-1 text-left font-mono truncate">{DISPLAY_URL}</span>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: copied ? "rgba(74,222,128,0.15)" : "rgba(167,139,250,0.15)", color: copied ? "#4ade80" : "#c4b5fd" }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Desktop-only tips */}
        <div className="text-left space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Tips</p>
          {[
            { step: "Chromecast", desc: "In Chrome: menu → Cast → cast this tab to your TV" },
            { step: "Smart TV browser", desc: "Open shepherdspathai.com/display directly on your TV" },
            { step: "Second monitor", desc: "Drag the browser window to your other screen and go full screen" },
          ].map(({ step, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400/40 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-white/65 text-xs font-semibold">{step}</p>
                <p className="text-white/30 text-xs leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProGate() {
  const isOwnerMode = new URLSearchParams(window.location.search).get("owner") === "true";

  const grantOwnerAccess = () => {
    markOwnerPreview();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0d0620] text-white px-8 text-center">
      <div className="mb-6 w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      </div>
      <p className="text-amber-400 uppercase tracking-widest text-xs font-semibold mb-3">Pro Feature</p>
      <h1 className="text-3xl font-light mb-4" style={{ fontFamily: "Lora, Georgia, serif" }}>
        Scripture Display Mode
      </h1>
      <p className="text-white/60 text-base max-w-sm leading-relaxed mb-8">
        Daily AI-generated devotional art — designed to rotate on any screen in your home.
      </p>
      <Link href="/pricing">
        <button
          className="px-8 py-3 rounded-full text-sm font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors"
          data-testid="btn-display-upgrade"
        >
          Upgrade to Pro
        </button>
      </Link>
      <Link href="/">
        <p className="mt-4 text-white/30 text-xs hover:text-white/60 transition-colors cursor-pointer">
          Back to Shepherd's Path
        </p>
      </Link>
      {isOwnerMode && (
        <button
          onClick={grantOwnerAccess}
          className="mt-8 px-5 py-2 rounded-full text-xs font-semibold border border-white/10 text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
        >
          Owner Preview Access
        </button>
      )}
      <p className="absolute bottom-6 text-white/15 text-xs tracking-widest uppercase">Shepherd's Path</p>
    </div>
  );
}

export default function DisplayMode() {
  const daysWithApp = getRelationshipAge();
  const isPro = isProVerifiedLocally() || isOwnerPreviewActive();
  const isInTrial = !isPro && daysWithApp <= 14;
  const hasAccess = isPro || isInTrial;
  const trialDaysLeft = Math.max(0, 14 - daysWithApp + 1);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showCast, setShowCast] = useState(false);

  const uiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback((newSlides?: Slide[]) => {
    const list = newSlides ?? slides;
    if (!list.length) return;
    setIndex(i => (i + 1) % list.length);
    setProgress(0);
  }, [slides]);

  const resetUI = useCallback(() => {
    setShowUI(true);
    if (uiTimer.current) clearTimeout(uiTimer.current);
    uiTimer.current = setTimeout(() => setShowUI(false), 5000);
  }, []);

  useEffect(() => {
    resetUI();
    return () => { if (uiTimer.current) clearTimeout(uiTimer.current); };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resetUI);
    window.addEventListener("touchstart", resetUI);
    return () => {
      window.removeEventListener("mousemove", resetUI);
      window.removeEventListener("touchstart", resetUI);
    };
  }, [resetUI]);

  // Load art library — only image slides, newest first
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [artRes, libRes] = await Promise.all([
          fetch("/api/daily-art"),
          fetch("/api/daily-art/library"),
        ]);

        const todayDateET = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().split("T")[0];
        const allSlides: Slide[] = [];

        // Today's image first
        if (artRes.ok) {
          const art = await artRes.json();
          if (art.imageUrl) {
            allSlides.push({ imageUrl: art.imageUrl, content: art.scripture, reference: art.reference });
          }
        }

        // Past library images (newest to oldest, skip today)
        if (libRes.ok) {
          const library: LibraryEntry[] = await libRes.json();
          library
            .filter(e => e.date !== todayDateET && e.imageUrl)
            .forEach(e => allSlides.push({ imageUrl: e.imageUrl, content: e.scripture, reference: e.reference }));
        }

        if (!cancelled) {
          setSlides(allSlides);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (loading || slides.length <= 1) return;
    if (slideTimer.current) clearTimeout(slideTimer.current);
    slideTimer.current = setTimeout(() => advance(), SLIDE_DURATION);
    return () => { if (slideTimer.current) clearTimeout(slideTimer.current); };
  }, [index, loading, slides.length, advance]);

  // Progress bar
  useEffect(() => {
    if (loading || slides.length === 0) return;
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    const intervalMs = 250;
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(progressRef.current!); return 100; }
        return p + (intervalMs / SLIDE_DURATION) * 100;
      });
    }, intervalMs);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [index, loading, slides.length]);

  if (!hasAccess) return <ProGate />;

  const currentSlide = slides[index] ?? null;

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden cursor-pointer select-none"
      onClick={e => {
        if (showCast) { setShowCast(false); return; }
        advance();
        resetUI();
      }}
    >
      {/* Slides */}
      <div className="absolute inset-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            </div>
          </div>
        ) : slides.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0415] text-center px-8">
            <div>
              <p className="text-white/30 text-sm">Today's artwork is being created.</p>
              <p className="text-white/20 text-xs mt-2">Check back soon — the gallery grows daily.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {currentSlide && (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <ImageSlide slide={currentSlide} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Branding */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
        <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-white/20">
          Shepherd's Path
        </p>
      </div>

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
          {slides.length <= 8 ? (
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-500 ${
                    i === index ? "w-5 h-1.5 bg-white/60" : "w-1.5 h-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-white/30 font-semibold tabular-nums tracking-widest uppercase">
              {index + 1} / {slides.length}
            </p>
          )}
          <p className="text-[9px] text-white/15 uppercase tracking-[0.2em]">
            {slides.length} {slides.length === 1 ? "artwork" : "artworks"} · growing daily
          </p>
        </div>
      )}

      {/* Progress bar */}
      {!loading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 pointer-events-none">
          <motion.div
            className="h-full bg-white/30 origin-left"
            style={{ scaleX: progress / 100, transformOrigin: "left" }}
            transition={{ duration: 0.25 }}
          />
        </div>
      )}

      {/* UI overlay */}
      <AnimatePresence>
        {showUI && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-5">
              <Link href="/" className="pointer-events-auto">
                <span className="text-[10px] text-white/25 uppercase tracking-widest font-semibold hover:text-white/50 transition-colors">
                  ← Home
                </span>
              </Link>

              {/* Cast button */}
              <button
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
                onClick={e => { e.stopPropagation(); resetUI(); triggerCast(() => setShowCast(true)); }}
                data-testid="btn-cast-display"
              >
                <Tv className="w-3 h-3" />
                <span className="text-[10px] uppercase tracking-widest font-semibold">Cast</span>
              </button>

              {/* Trial / Pro badge */}
              {isInTrial ? (
                <Link href="/upgrade" className="pointer-events-auto">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-amber-400/20 bg-amber-400/5 text-amber-300/60 hover:text-amber-300/90 transition-colors">
                    {trialDaysLeft === 1 ? "Last free day" : `${trialDaysLeft} free days left`}
                  </span>
                </Link>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-purple-400/20 bg-purple-400/5 text-purple-300/50">
                  Pro
                </span>
              )}
            </div>

            {/* Tap hint */}
            <div className="absolute bottom-20 sm:bottom-24 right-6 sm:right-8">
              <p className="text-[10px] text-white/20 uppercase tracking-widest font-semibold">
                Tap to advance
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cast modal */}
      <AnimatePresence>
        {showCast && <CastModal onClose={() => setShowCast(false)} />}
      </AnimatePresence>
    </div>
  );
}
