import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ImageIcon, X, Image, Share2, Check } from "lucide-react";

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
  const [hidden, setHidden] = useState(() => isHiddenThisSession());
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    if (!art) return;
    const shareText = `"${art.scripture}" — ${art.reference}${art.reflection ? `\n\n${art.reflection}` : ""}\n\nvia Shepherd's Path`;

    // Try to share the actual image file on mobile (Web Share API with files)
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
        // File sharing not supported — share text + URL
        await navigator.share({ title: "A Moment of Beauty", text: shareText, url: window.location.origin });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return; // user cancelled
        // Network or other error — fall through to clipboard
      }
    }

    // Clipboard fallback (desktop)
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

  const hide = () => {
    setHidden(true);
    sessionStorage.setItem(SESSION_HIDDEN_KEY, "true");
  };

  const show = () => {
    setHidden(false);
    sessionStorage.removeItem(SESSION_HIDDEN_KEY);
  };

  // If loading is done and there's no image (generation failed or took too long),
  // show a text-only scripture card so the section is never invisible.
  if (!loading && (!art || !art.imageUrl || imageError)) {
    if (!art) return null;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full px-5 py-5 bg-primary/4"
      >
        <div className="flex flex-col gap-2">
          <p className="text-[15px] text-foreground/85 leading-snug italic font-medium">
            &ldquo;{art.scripture}&rdquo;
          </p>
          <p className="text-[12px] text-muted-foreground/70 font-semibold">
            — {art.reference}
          </p>
          {art.reflection && (
            <p className="text-[13px] text-muted-foreground leading-relaxed italic mt-1">
              {art.reflection}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  if (hidden) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full flex justify-end px-4 py-1.5"
      >
        <button
          onClick={show}
          data-testid="button-daily-art-show"
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <Image className="w-3 h-3" />
          <span>Show today&rsquo;s image</span>
        </button>
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
      <div
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && setExpanded(prev => !prev)}
        role="button"
        tabIndex={0}
        data-testid="button-daily-art"
        className="w-full text-left relative overflow-hidden focus:outline-none group cursor-pointer"
        aria-label="View today's daily art and reflection"
      >
        {/* Full-bleed image */}
        <div className="relative w-full bg-muted aspect-[16/9] sm:aspect-[16/7]">

          {/* Loading state — shown while fetching OR while image is downloading */}
          <AnimatePresence>
            {(loading || (art?.imageUrl && !imageLoaded)) && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground"
                style={{ background: "linear-gradient(135deg, hsl(38 28% 88%) 0%, hsl(258 20% 88%) 100%)" }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">{loading ? "Generating today's image…" : "Loading…"}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The image */}
          {art?.imageUrl && (
            <motion.img
              src={art.imageUrl}
              alt="Daily inspirational art"
              onLoad={() => setImageLoaded(true)}
              onError={() => { setImageLoaded(false); setImageError(true); }}
              initial={{ opacity: 0 }}
              animate={{ opacity: imageLoaded ? 1 : 0 }}
              transition={{ duration: 1 }}
              className="w-full h-full object-cover"
              data-testid="img-daily-art"
            />
          )}

          {/* Subtle vignette only */}
          {imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
          )}


          {/* Hide button — top right, appears on hover/focus */}
          {imageLoaded && (
            <button
              onClick={e => { e.stopPropagation(); hide(); }}
              data-testid="button-daily-art-hide"
              aria-label="Hide today's image"
              className="absolute top-2.5 right-3 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <X className="w-3.5 h-3.5 text-white/80" />
            </button>
          )}

          {/* Tap hint — bottom right, hover only */}
          {imageLoaded && (
            <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white/50 text-[10px] font-medium">
                {expanded ? "close" : "scripture & reflection ↓"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Reflection panel — scripture + reflection together */}
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
              <div>
                <p className="text-[15px] text-foreground/90 leading-snug italic font-medium">
                  &ldquo;{art.scripture}&rdquo;
                </p>
                <p className="text-[12px] text-muted-foreground/70 font-semibold mt-1">
                  — {art.reference}
                </p>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-primary/10">
                <ImageIcon className="w-3.5 h-3.5 text-primary/40 mt-0.5 flex-shrink-0" />
                <p className="text-[13px] text-muted-foreground leading-relaxed italic flex-1">
                  {art.reflection}
                </p>
              </div>
              {/* Share button */}
              <div className="pt-1 border-t border-primary/10 flex justify-end">
                <button
                  onClick={handleShare}
                  data-testid="button-daily-art-share"
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-primary/70 hover:text-primary transition-colors px-3 py-1.5 rounded-full hover:bg-primary/8 active:scale-95"
                >
                  {shared
                    ? <><Check className="w-3.5 h-3.5" /> Copied!</>
                    : <><Share2 className="w-3.5 h-3.5" /> Share this image</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
