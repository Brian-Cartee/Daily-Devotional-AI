import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Share2, Check, ChevronDown, Heart } from "lucide-react";
import { saveMoment, removeMoment, isMomentSaved, updateMomentNote, getMoments } from "@/lib/moments";
import { useDailyArt } from "@/hooks/use-daily-art";

const SESSION_HIDDEN_KEY = "sp-daily-art-hidden-session";

function isHiddenThisSession(): boolean {
  localStorage.removeItem("sp-daily-art-hidden");
  localStorage.removeItem("sp-daily-art-hidden-date");
  return sessionStorage.getItem(SESSION_HIDDEN_KEY) === "true";
}

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export function DailyArtCard() {
  const { art, imageUrl, loading: artLoading } = useDailyArt();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hidden] = useState(() => isHiddenThisSession());
  const [shared, setShared] = useState(false);
  const [saved, setSaved] = useState(() => isMomentSaved(todayKey()));
  const [justSaved, setJustSaved] = useState(false);
  const [note, setNote] = useState("");
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayUrl = imageUrl ?? art?.imageUrl ?? null;
  const loading = artLoading && !displayUrl;

  useEffect(() => {
    if (displayUrl) {
      setImageError(false);
      setImageLoaded(false);
    }
  }, [displayUrl]);

  const handleShare = async () => {
    if (!art) return;
    const shareText = `"${art.scripture}" — ${art.reference}${art.reflection ? `\n\n${art.reflection}` : ""}\n\nvia Shepherd's Path`;

    if (navigator.share && displayUrl) {
      try {
        const fullUrl = `${window.location.origin}${displayUrl}`;
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

  const handleSave = () => {
    if (!art) return;
    const date = todayKey();
    if (saved) {
      removeMoment(date);
      setSaved(false);
    } else {
      const isFirst = getMoments().length === 0;
      saveMoment({ date, verse: art.scripture, reference: art.reference, imageUrl: displayUrl });
      setSaved(true);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      if (!expanded) setExpanded(true);
      if (isFirst) window.dispatchEvent(new Event("sp-first-moment-saved"));
    }
  };

  const noteNudgeFiredRef = useRef(false);

  const handleNoteChange = (val: string) => {
    setNote(val);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => {
      updateMomentNote(todayKey(), val);
      if (!noteNudgeFiredRef.current && val.trim().length >= 20) {
        noteNudgeFiredRef.current = true;
        window.dispatchEvent(new Event("sp-journal-note-written"));
      }
    }, 800);
  };

  useEffect(() => {
    const sync = () => setSaved(isMomentSaved(todayKey()));
    window.addEventListener("sp-moments-change", sync);
    return () => window.removeEventListener("sp-moments-change", sync);
  }, []);

  if (hidden) return null;

  if (!loading && (!art || !displayUrl || imageError)) {
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
          <p className="text-[19px] text-primary/75 leading-[1.75] font-normal tracking-wide text-center">
            &ldquo;{art.scripture}&rdquo;
          </p>
          <div className="h-px w-12 mx-auto mt-6 mb-4" style={{ background: "hsl(258 45% 55% / 0.35)" }} />
          <p className="text-[11px] text-primary/50 font-bold uppercase tracking-[0.18em] text-center">
            {art.reference}
          </p>
          {art.reflection && (
            <p className="text-[13px] text-muted-foreground/70 leading-relaxed mt-5 text-center">
              {art.reflection}
            </p>
          )}
          {loading && (
            <p className="text-[12px] text-muted-foreground/50 text-center mt-4 flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Preparing today's artwork…
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
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
        <AnimatePresence>
          {(loading || (displayUrl && !imageLoaded)) && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 flex items-center justify-center gap-2 text-white/60 z-10"
              style={{ background: "linear-gradient(160deg, hsl(258 30% 18%) 0%, hsl(38 25% 22%) 100%)" }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs tracking-wide">A moment is being prepared…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {displayUrl && (
          <motion.img
            src={displayUrl}
            alt="Today's moment"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
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

        {imageLoaded && (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.72) 100%)" }}
          />
        )}

        <AnimatePresence>
          {imageLoaded && art && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              onClick={handleSave}
              data-testid="button-save-moment"
              aria-label={saved ? "Remove from saved moments" : "Save this moment"}
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full transition-transform active:scale-90 z-20"
              style={{ background: "rgba(0,0,0,0.32)", backdropFilter: "blur(6px)" }}
            >
              <Heart
                className={`w-4 h-4 transition-all duration-300 ${saved ? "fill-red-400 text-red-400 scale-110" : "text-white/70"}`}
              />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {justSaved && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white/90 z-20"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
            >
              <Check className="w-3 h-3 text-green-400" />
              Saved to My Moments
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {imageLoaded && art && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3 z-10"
            >
              <p className="text-[15px] text-white/95 font-medium leading-snug drop-shadow-sm">
                &ldquo;{art.scripture}&rdquo;
              </p>
              <p className="text-[11px] text-white/65 font-semibold mt-1.5 tracking-wide uppercase">
                {art.reference}
              </p>

              <button
                onClick={() => setExpanded(e => !e)}
                data-testid="button-daily-art"
                aria-label={expanded ? "Close reflection" : "Read today's reflection"}
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/85 hover:text-white transition-colors bg-black/20 backdrop-blur-sm rounded-full px-3 py-1"
              >
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.div>
                <span>{expanded ? "Close" : "Today's reflection"}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {expanded && art && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/5 border-b border-primary/10 px-5 py-4 flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {art.reflection}
              </p>

              <div className="flex flex-col gap-2 pt-1 border-t border-primary/8">
                <p className="text-[11px] italic text-muted-foreground/50 font-medium">
                  What is God saying to you through this?
                </p>
                <textarea
                  value={note}
                  onChange={e => handleNoteChange(e.target.value)}
                  placeholder="Write freely, just for you…"
                  rows={3}
                  data-testid="textarea-moment-note"
                  className="w-full text-[13px] text-foreground/80 placeholder:text-muted-foreground/30 bg-transparent resize-none outline-none leading-relaxed"
                />
              </div>

              <div className="pt-1 border-t border-primary/10 flex items-center justify-between">
                <Link href="/moments">
                  <span className="text-[12px] text-primary/50 hover:text-primary transition-colors">
                    My Moments →
                  </span>
                </Link>
                <button
                  onClick={handleShare}
                  data-testid="button-daily-art-share"
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-primary/70 hover:text-primary transition-colors px-3 py-1.5 rounded-full hover:bg-primary/8 active:scale-95"
                >
                  {shared ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Share2 className="w-3.5 h-3.5" /> Share this</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {imageLoaded && art && (
        <div
          className="flex items-center justify-between px-4 py-3 gap-3"
          style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}
        >
          <button
            onClick={handleShare}
            data-testid="link-daily-art-calling"
            className="flex items-center gap-2 text-[13px] font-semibold text-foreground/70 hover:text-primary transition-colors"
          >
            <Share2 className="w-4 h-4 text-primary/60" />
            {shared ? "Copied!" : "Share today's art"}
          </button>
          <Link href="/calling">
            <span className="text-[12px] text-primary/60 hover:text-primary font-medium transition-colors">
              Into the world →
            </span>
          </Link>
        </div>
      )}
    </motion.div>
  );
}
