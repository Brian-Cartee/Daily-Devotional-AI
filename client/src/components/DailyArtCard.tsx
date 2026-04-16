import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Share2, Check, ChevronDown } from "lucide-react";

interface DailyArt {
  imageUrl: string | null;
  scripture: string;
  reference: string;
  reflection: string;
}

const SESSION_HIDDEN_KEY = "sp-daily-art-hidden-session";

function isHiddenThisSession(): boolean {
  localStorage.removeItem("sp-daily-art-hidden");
  localStorage.removeItem("sp-daily-art-hidden-date");
  return sessionStorage.getItem(SESSION_HIDDEN_KEY) === "true";
}

export function DailyArtCard() {
  const [art, setArt] = useState<DailyArt | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hidden] = useState(() => isHiddenThisSession());
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    if (!art) return;
    const shareText = `"${art.scripture}" — ${art.reference}${art.reflection ? `\n\n${art.reflection}` : ""}\n\nvia Shepherd's Path`;

    if (navigator.share && art.imageUrl) {
      try {
        const fullUrl = `${window.location.origin}${art.imageUrl}`;
        const response = await fetch(fullUrl);
        const blob = await response.blob();
        const file = new File([blob], "moment-of-beauty.jpg", { type: "image/jpeg" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: shareText });
          return;
        }
        await navigator.share({ title: "A Moment of Beauty", text: shareText, url: window.location.origin });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${window.location.origin}`);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch { }
  };

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `sp-daily-art-${today}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed: DailyArt = JSON.parse(cached);
      if (parsed.imageUrl) {
        setArt(parsed);
        setLoading(false);
        return;
      }
      sessionStorage.removeItem(cacheKey);
    }

    fetch("/api/daily-art")
      .then(r => r.json())
      .then((data: DailyArt) => {
        setArt(data);
        if (data.imageUrl) {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (hidden) return null;

  // Text-only fallback when image fails or is unavailable
  if (!loading && (!art || !art.imageUrl || imageError)) {
    if (!art) return null;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full px-4 py-2"
      >
        <div
          className="rounded-2xl px-7 py-8 shadow-sm"
          style={{ background: "linear-gradient(160deg, hsl(var(--background)) 0%, hsl(258 40% 8% / 0.5) 100%)", border: "1px solid hsl(258 45% 55% / 0.18)" }}
        >
          <div className="h-px w-12 mx-auto mb-6" style={{ background: "hsl(258 45% 55% / 0.35)" }} />
          <p className="text-[19px] text-primary/75 leading-[1.75] italic font-normal tracking-wide text-center">
            &ldquo;{art.scripture}&rdquo;
          </p>
          <div className="h-px w-12 mx-auto mt-6 mb-4" style={{ background: "hsl(258 45% 55% / 0.35)" }} />
          <p className="text-[11px] text-primary/50 font-bold uppercase tracking-[0.18em] text-center">
            {art.reference}
          </p>
          {art.reflection && (
            <p className="text-[13px] text-muted-foreground/70 leading-relaxed italic mt-5 text-center">
              {art.reflection}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.15 }}
      className="w-full"
    >
      {/* Image with always-visible verse overlay */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>

        {/* Loading shimmer */}
        <AnimatePresence>
          {(loading || (art?.imageUrl && !imageLoaded)) && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 flex items-center justify-center gap-2 text-white/60"
              style={{ background: "linear-gradient(160deg, hsl(258 30% 18%) 0%, hsl(38 25% 22%) 100%)" }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs tracking-wide">A moment is being prepared…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The photograph */}
        {art?.imageUrl && (
          <motion.img
            src={art.imageUrl}
            alt="Today's moment"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              // Clear stale session cache so next render re-fetches a valid URL
              const today = new Date().toISOString().split("T")[0];
              sessionStorage.removeItem(`sp-daily-art-${today}`);
              setImageLoaded(false);
              setImageError(true);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: 1.2 }}
            className="w-full h-full object-cover"
            data-testid="img-daily-art"
          />
        )}

        {/* Deep gradient so verse is always readable */}
        {imageLoaded && (
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.72) 100%)"
            }}
          />
        )}

        {/* Verse — always visible over the image */}
        <AnimatePresence>
          {imageLoaded && art && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3"
            >
              <p className="text-[15px] text-white/95 font-medium italic leading-snug drop-shadow-sm">
                &ldquo;{art.scripture}&rdquo;
              </p>
              <p className="text-[11px] text-white/65 font-semibold mt-1.5 tracking-wide uppercase">
                {art.reference}
              </p>

              {/* Expand button */}
              <button
                onClick={() => setExpanded(e => !e)}
                data-testid="button-daily-art"
                aria-label={expanded ? "Close reflection" : "Read today's reflection"}
                className="mt-3 flex items-center gap-1.5 text-[11px] text-white/55 hover:text-white/80 transition-colors"
              >
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.div>
                <span>{expanded ? "Close" : "Today's reflection"}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reflection panel — expands below the image */}
      <AnimatePresence>
        {expanded && art && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/5 border-b border-primary/10 px-5 py-4 flex flex-col gap-3">
              <p className="text-[13px] text-muted-foreground leading-relaxed italic">
                {art.reflection}
              </p>
              <div className="pt-1 border-t border-primary/10 flex justify-end">
                <button
                  onClick={handleShare}
                  data-testid="button-daily-art-share"
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-primary/70 hover:text-primary transition-colors px-3 py-1.5 rounded-full hover:bg-primary/8 active:scale-95"
                >
                  {shared
                    ? <><Check className="w-3.5 h-3.5" /> Copied!</>
                    : <><Share2 className="w-3.5 h-3.5" /> Share this</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
