import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ImageIcon } from "lucide-react";

interface DailyArt {
  imageUrl: string | null;
  scripture: string;
  reference: string;
  reflection: string;
}

export function DailyArtCard() {
  const [art, setArt] = useState<DailyArt | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
      // Stale/failed cache — remove and retry
      sessionStorage.removeItem(cacheKey);
    }

    fetch("/api/daily-art")
      .then(r => r.json())
      .then((data: DailyArt) => {
        setArt(data);
        // Only cache successful responses that have a real image
        if (data.imageUrl) {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!loading && (!art || !art.imageUrl)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="mt-3"
    >
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Today&rsquo;s Image
        </span>
      </div>

      <button
        onClick={() => setExpanded(e => !e)}
        data-testid="button-daily-art"
        className="w-full text-left rounded-2xl overflow-hidden border border-border/60 shadow-sm hover:shadow-md transition-all group focus:outline-none"
        aria-label="View today's daily art"
      >
        {/* Image */}
        <div className="relative w-full bg-muted" style={{ aspectRatio: "16/7" }}>
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

          {art?.imageUrl && (
            <motion.img
              src={art.imageUrl}
              alt="Daily inspirational art"
              onLoad={() => setImageLoaded(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: imageLoaded ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="w-full h-full object-cover"
              data-testid="img-daily-art"
            />
          )}

          {/* Gradient overlay */}
          {art?.imageUrl && imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          )}

          {/* Scripture overlay at bottom of image */}
          {art && imageLoaded && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6"
            >
              <p className="text-white font-medium text-sm leading-snug drop-shadow-lg line-clamp-2 italic">
                &ldquo;{art.scripture}&rdquo;
              </p>
              <p className="text-white/70 text-[11px] font-semibold mt-0.5 drop-shadow">
                — {art.reference}
              </p>
            </motion.div>
          )}

          {/* Expand hint */}
          {art?.imageUrl && imageLoaded && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/80 text-[10px] font-medium">
                {expanded ? "Less" : "More"}
              </div>
            </div>
          )}
        </div>

        {/* Expanded reflection */}
        <AnimatePresence>
          {expanded && art && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="bg-card px-4 py-3 border-t border-border/40 flex items-start gap-3">
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                <p className="text-[13px] text-muted-foreground leading-relaxed italic">
                  {art.reflection}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}
