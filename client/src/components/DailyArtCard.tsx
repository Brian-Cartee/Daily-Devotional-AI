import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ImageIcon, X, Image } from "lucide-react";

interface DailyArt {
  imageUrl: string | null;
  scripture: string;
  reference: string;
  reflection: string;
}

const HIDDEN_KEY = "sp-daily-art-hidden";

export function DailyArtCard() {
  const [art, setArt] = useState<DailyArt | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDDEN_KEY) === "true");

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
    localStorage.setItem(HIDDEN_KEY, "true");
  };

  const show = () => {
    setHidden(false);
    localStorage.removeItem(HIDDEN_KEY);
  };

  if (!loading && (!art || !art.imageUrl)) return null;

  // Collapsed state — subtle restore chip
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
      <button
        onClick={() => setExpanded(e => !e)}
        data-testid="button-daily-art"
        className="w-full text-left relative overflow-hidden focus:outline-none group"
        aria-label="View today's daily art and reflection"
      >
        {/* Full-bleed image */}
        <div className="relative w-full bg-muted" style={{ aspectRatio: "16/7" }}>

          {/* Loading state */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-muted gap-2 text-muted-foreground"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Generating today&rsquo;s image…</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The image */}
          {art?.imageUrl && (
            <motion.img
              src={art.imageUrl}
              alt="Daily inspirational art"
              onLoad={() => setImageLoaded(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: imageLoaded ? 1 : 0 }}
              transition={{ duration: 1 }}
              className="w-full h-full object-cover"
              data-testid="img-daily-art"
            />
          )}

          {/* Gradient overlays */}
          {imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/30" />
          )}

          {/* Top-left label */}
          {imageLoaded && (
            <div className="absolute top-3 left-4">
              <span className="text-[13px] font-bold uppercase tracking-widest text-white/90 drop-shadow-md">
                Pause &amp; Behold
              </span>
            </div>
          )}

          {/* Hide button — top right */}
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

          {/* Bottom scripture */}
          {art && imageLoaded && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-8"
            >
              <p className="text-white font-medium text-[15px] leading-snug drop-shadow-lg italic max-w-2xl">
                &ldquo;{art.scripture}&rdquo;
              </p>
              <p className="text-white/65 text-[12px] font-semibold mt-1 drop-shadow">
                — {art.reference}
              </p>
            </motion.div>
          )}

          {/* Tap hint */}
          {imageLoaded && (
            <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white/50 text-[10px] font-medium">
                {expanded ? "close" : "reflection ↓"}
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Reflection panel */}
      <AnimatePresence>
        {expanded && art && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/5 border-b border-primary/10 px-5 py-3 flex items-start gap-3">
              <ImageIcon className="w-3.5 h-3.5 text-primary/40 mt-0.5 flex-shrink-0" />
              <p className="text-[13px] text-muted-foreground leading-relaxed italic">
                {art.reflection}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
