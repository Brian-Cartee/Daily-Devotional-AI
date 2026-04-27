import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { isProVerifiedLocally, isOwnerPreviewActive, markOwnerPreview } from "@/lib/proStatus";
import { getRelationshipAge } from "@/lib/relationship";

interface DailyArt {
  imageUrl: string | null;
  scripture: string;
  reference: string;
  reflection: string;
}

interface LibraryEntry {
  date: string;
  imageUrl: string;
  scripture: string;
  reference: string;
  reflection?: string;
}

type SlideType = "verse" | "reflection" | "prayer" | "image";

interface Slide {
  type: SlideType;
  content: string;
  reference?: string;
  imageUrl?: string | null;
}

const SLIDE_DURATION = 50_000;


const FALLBACK_PRAYER =
  "Lord, let Your Word take root in my heart today. Where I am weary, be my strength. Where I am lost, be my way. May this day be lived in the quiet awareness of Your presence. Amen.";

const FALLBACK_DATA: DailyArt = {
  imageUrl: null,
  scripture: "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.",
  reference: "Psalm 23:1–3",
  reflection:
    "God's care for you is not distant or uncertain. He tends to you the way a good shepherd tends his flock — attentively, gently, with full knowledge of where you need to go.",
};

function buildSlides(art: DailyArt, prayer: string): Slide[] {
  const slides: Slide[] = [];
  // Image first — immediate wow moment when the screen lights up
  if (art.imageUrl) {
    slides.push({
      type: "image",
      content: art.scripture,
      reference: art.reference,
      imageUrl: art.imageUrl,
    });
  }
  slides.push(
    { type: "verse", content: art.scripture, reference: art.reference },
    { type: "reflection", content: art.reflection, reference: art.reference },
    { type: "prayer", content: prayer },
  );
  return slides;
}

function VerseSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 sm:px-16 lg:px-28 text-center space-y-8">
      <div className="space-y-1">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-amber-300/60">
          Today's Scripture
        </p>
      </div>
      <blockquote className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-light text-white leading-relaxed tracking-wide max-w-5xl">
        "{slide.content}"
      </blockquote>
      <p className="text-base sm:text-lg lg:text-xl font-semibold text-amber-300/80 tracking-widest uppercase">
        {slide.reference}
      </p>
    </div>
  );
}

function ReflectionSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 sm:px-16 lg:px-28 text-center space-y-10">
      <div className="w-12 h-0.5 bg-amber-300/30 rounded-full" />
      <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-light text-white/90 leading-relaxed max-w-4xl">
        {slide.content}
      </p>
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-0.5 bg-amber-300/30 rounded-full" />
        <p className="text-[11px] sm:text-sm font-semibold uppercase tracking-[0.3em] text-white/30 italic">
          Pause. Pray. Walk with Him.
        </p>
      </div>
    </div>
  );
}

function PrayerSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 sm:px-16 lg:px-28 text-center space-y-8">
      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-purple-300/60">
        A Prayer for Today
      </p>
      <p className="text-xl sm:text-2xl lg:text-3xl xl:text-[2rem] font-light text-white/90 leading-relaxed max-w-4xl italic">
        {slide.content}
      </p>
    </div>
  );
}

function ImageSlide({ slide }: { slide: Slide }) {
  return (
    <div className="absolute inset-0">
      <img
        src={slide.imageUrl ?? ""}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
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

function SlideContent({ slide }: { slide: Slide }) {
  if (slide.type === "verse") return <VerseSlide slide={slide} />;
  if (slide.type === "reflection") return <ReflectionSlide slide={slide} />;
  if (slide.type === "prayer") return <PrayerSlide slide={slide} />;
  if (slide.type === "image") return <ImageSlide slide={slide} />;
  return null;
}

function gradientForSlide(type: SlideType): string {
  if (type === "verse")      return "from-[#1a0a2e] via-[#0f0620] to-[#0a0415]";
  if (type === "reflection") return "from-[#1a0f00] via-[#120a00] to-[#0a0620]";
  if (type === "prayer")     return "from-[#0a0a1a] via-[#0d0620] to-[#1a0828]";
  return "from-black via-black to-black";
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
        Daily AI-generated devotional art with scripture, reflection, and prayer — designed for any screen in your home.
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

  const [art, setArt] = useState<DailyArt | null>(null);
  const [prayer, setPrayer] = useState<string>("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Fetch today's art and the full library in parallel
      let artData: DailyArt = FALLBACK_DATA;
      let library: LibraryEntry[] = [];
      try {
        const [artRes, libRes] = await Promise.all([
          fetch("/api/daily-art"),
          fetch("/api/daily-art/library"),
        ]);
        if (artRes.ok) artData = await artRes.json();
        if (libRes.ok) library = await libRes.json();
      } catch {}

      if (cancelled) return;
      setArt(artData);

      let prayerText = FALLBACK_PRAYER;
      try {
        const prayerController = new AbortController();
        const prayerTimeout = setTimeout(() => prayerController.abort(), 8000);
        const prayerRes = await fetch("/api/chat/passage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: prayerController.signal,
          body: JSON.stringify({
            passageRef: artData.reference,
            passageText: artData.scripture,
            messages: [{
              role: "user",
              content: `Write a single heartfelt closing prayer (3 sentences) based on "${artData.scripture}" — ${artData.reference}. Make it personal, warm, and suitable for quiet morning reflection.`,
            }],
          }),
        });
        clearTimeout(prayerTimeout);
        if (prayerRes.ok) {
          const text = await prayerRes.text();
          if (text.trim().length > 20) prayerText = text.trim();
        }
      } catch {}

      if (cancelled) return;
      setPrayer(prayerText);

      // Build today's content slides (verse → reflection → prayer → today's image)
      const todaySlides = buildSlides(artData, prayerText);

      // Append past library images as additional image slides (newest first, skip today)
      const todayDateET = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().split("T")[0];
      const pastSlides: Slide[] = library
        .filter(e => e.date !== todayDateET && e.imageUrl)
        .map(e => ({
          type: "image" as const,
          content: e.scripture,
          reference: e.reference,
          imageUrl: e.imageUrl,
        }));

      setSlides([...todaySlides, ...pastSlides]);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!slides.length) return;

    if (progressRef.current) clearInterval(progressRef.current);
    if (slideTimer.current) clearTimeout(slideTimer.current);

    setProgress(0);
    const startTime = Date.now();

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / SLIDE_DURATION) * 100, 100));
    }, 250);

    slideTimer.current = setTimeout(() => {
      setIndex(i => (i + 1) % slides.length);
      setProgress(0);
    }, SLIDE_DURATION);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (slideTimer.current) clearTimeout(slideTimer.current);
    };
  }, [index, slides]);

  const handleClick = () => {
    advance();
    resetUI();
  };

  if (!hasAccess) return <ProGate />;

  const currentSlide = slides[index] ?? null;
  const gradient = currentSlide ? gradientForSlide(currentSlide.type) : "from-[#0a0415] to-black";
  const isImageSlide = currentSlide?.type === "image";

  return (
    <div
      className={`fixed inset-0 overflow-hidden select-none cursor-pointer`}
      onClick={handleClick}
      data-testid="display-screen"
    >
      <AnimatePresence mode="sync">
        {!isImageSlide && (
          <motion.div
            key={gradient}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
          />
        )}
      </AnimatePresence>

      {/* Subtle grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main slide content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <p className="text-white/30 text-sm font-light tracking-widest uppercase">Preparing today's word…</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {currentSlide && (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <SlideContent slide={currentSlide} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Branding — always visible, very subtle */}
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
                    i === index
                      ? "w-5 h-1.5 bg-white/60"
                      : "w-1.5 h-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-white/30 font-semibold tabular-nums tracking-widest uppercase">
              {index + 1} / {slides.length}
            </p>
          )}
          {slides.length > 4 && (
            <p className="text-[9px] text-white/15 uppercase tracking-[0.2em]">
              {slides.filter(s => s.type === "image").length} artworks · growing daily
            </p>
          )}
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

      {/* UI overlay — fades in on interaction */}
      <AnimatePresence>
        {showUI && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Top bar: back link · slide label · trial badge */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-5">
              {/* Back */}
              <Link href="/" className="pointer-events-auto">
                <span className="text-[10px] text-white/25 uppercase tracking-widest font-semibold hover:text-white/50 transition-colors">
                  ← Home
                </span>
              </Link>

              {/* Slide type label */}
              {currentSlide && (
                <span className={`text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-full border ${
                  currentSlide.type === "verse"      ? "text-amber-300/70 border-amber-300/20 bg-amber-300/5" :
                  currentSlide.type === "reflection" ? "text-orange-300/70 border-orange-300/20 bg-orange-300/5" :
                  currentSlide.type === "prayer"     ? "text-purple-300/70 border-purple-300/20 bg-purple-300/5" :
                                                        "text-white/40 border-white/10 bg-white/5"
                }`}>
                  {currentSlide.type === "verse"      ? "Scripture" :
                   currentSlide.type === "reflection" ? "Reflection" :
                   currentSlide.type === "prayer"     ? "Prayer" : "Today's Image"}
                </span>
              )}

              {/* Trial badge (free users only) or Pro badge */}
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

    </div>
  );
}
