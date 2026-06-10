import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronDown, Heart, Check } from "lucide-react";
import { saveMoment, removeMoment, isMomentSaved, updateMomentNote, getMoments } from "@/lib/moments";
import { useDailyArt } from "@/hooks/use-daily-art";
import { loadDailyArtImage, easternTodayKey } from "@/lib/dailyArtImageLoad";
import { ShareVerseTrigger } from "@/components/ShareVerseSheet";
import { verseExcerptForCard } from "@/lib/verseExcerpt";

const SESSION_HIDDEN_KEY = "sp-daily-art-hidden-session";

function isHiddenThisSession(): boolean {
  localStorage.removeItem("sp-daily-art-hidden");
  localStorage.removeItem("sp-daily-art-hidden-date");
  return sessionStorage.getItem(SESSION_HIDDEN_KEY) === "true";
}

export function DailyArtCard() {
  const { art, imageUrl, loading: artLoading } = useDailyArt();
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hidden] = useState(() => isHiddenThisSession());
  const [saved, setSaved] = useState(() => isMomentSaved(easternTodayKey()));
  const [justSaved, setJustSaved] = useState(false);
  const [note, setNote] = useState("");
  const [imgRetry, setImgRetry] = useState(0);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blobRef = useRef<string | null>(null);

  const rawImageUrl = imageUrl ?? art?.imageUrl ?? null;
  const metaReady = !artLoading && !!art;
  const showImageSpinner = metaReady && !!rawImageUrl && imageLoading && !resolvedSrc && !imageFailed;

  useEffect(() => {
    if (!rawImageUrl) {
      setResolvedSrc(null);
      setImageFailed(false);
      setImageLoading(false);
      return;
    }

    let cancelled = false;
    setImageFailed(false);
    setImageLoading(true);
    setResolvedSrc(null);

    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }

    (async () => {
      const blob = await loadDailyArtImage(rawImageUrl.replace(/\?.*$/, ""), {
        allowBundledPlaceholder: art?.isPlaceholder !== false,
      });
      if (cancelled) {
        if (blob) URL.revokeObjectURL(blob);
        return;
      }
      if (blob) {
        blobRef.current = blob;
        setResolvedSrc(blob);
        setImageFailed(false);
      } else {
        setImageFailed(true);
      }
      setImageLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [rawImageUrl, imgRetry]);

  useEffect(() => {
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, []);

  const retryImage = () => {
    setImageFailed(false);
    setImgRetry((n) => n + 1);
  };

  const shareBgUrl = resolvedSrc ?? imageUrl ?? rawImageUrl;

  const handleSave = () => {
    if (!art) return;
    const date = easternTodayKey();
    if (saved) {
      removeMoment(date);
      setSaved(false);
    } else {
      const isFirst = getMoments().length === 0;
      saveMoment({ date, verse: art.scripture, reference: art.reference, imageUrl: resolvedSrc ?? rawImageUrl });
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
      updateMomentNote(easternTodayKey(), val);
      if (!noteNudgeFiredRef.current && val.trim().length >= 20) {
        noteNudgeFiredRef.current = true;
        window.dispatchEvent(new Event("sp-journal-note-written"));
      }
    }, 800);
  };

  useEffect(() => {
    const sync = () => setSaved(isMomentSaved(easternTodayKey()));
    window.addEventListener("sp-moments-change", sync);
    return () => window.removeEventListener("sp-moments-change", sync);
  }, []);

  if (hidden) return null;

  if (!artLoading && !art) {
    return (
      <div
        className="relative w-full flex flex-col items-center justify-center gap-2 text-white/70 px-6 text-center"
        style={{ aspectRatio: "4/3", background: "linear-gradient(160deg, hsl(258 30% 18%) 0%, hsl(38 25% 22%) 100%)" }}
        data-testid="daily-art-loading-fallback"
      >
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
        <span className="text-sm tracking-wide">Today&apos;s moment is on its way…</span>
      </div>
    );
  }

  const cardVerse = art ? verseExcerptForCard(art.scripture) : null;

  if (artLoading && !art) {
    return (
      <div
        className="relative w-full flex items-center justify-center gap-2 text-white/60"
        style={{ aspectRatio: "4/3", background: "linear-gradient(160deg, hsl(258 30% 18%) 0%, hsl(38 25% 22%) 100%)" }}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs tracking-wide">A moment is being prepared…</span>
      </div>
    );
  }

  if (metaReady && art && imageFailed && !resolvedSrc) {
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
          <button
            type="button"
            onClick={retryImage}
            className="mt-5 mx-auto block text-[13px] font-semibold text-primary hover:underline"
            data-testid="button-retry-daily-art"
          >
            Load today&apos;s image
          </button>
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
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, hsl(258 30% 18%) 0%, hsl(38 25% 22%) 100%)" }}
        />

        <AnimatePresence>
          {showImageSpinner && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center gap-2 text-white/60 z-10"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs tracking-wide">A moment is being prepared…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {resolvedSrc && (
          <motion.img
            key={resolvedSrc}
            src={resolvedSrc}
            alt="Today's moment"
            loading="eager"
            decoding="async"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 w-full h-full object-cover"
            data-testid="img-daily-art"
          />
        )}

        {metaReady && art && !resolvedSrc && !showImageSpinner && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-[5]">
            <p className="text-[15px] text-white/90 font-medium leading-snug drop-shadow-sm">
              &ldquo;{art.scripture}&rdquo;
            </p>
            <p className="text-[11px] text-white/65 font-semibold mt-2 tracking-wide uppercase">
              {art.reference}
            </p>
          </div>
        )}

        {resolvedSrc && (
          <div
            className="absolute inset-0 z-[6]"
            style={{
              background: cardVerse?.truncated
                ? "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.82) 100%)"
                : "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.72) 100%)",
            }}
          />
        )}

        {resolvedSrc && art?.isPlaceholder && (
          <p
            className="absolute top-3 left-3 z-20 text-[10px] font-medium tracking-wide text-white/70 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
          >
            Quiet scene for today
          </p>
        )}

        <AnimatePresence>
          {resolvedSrc && art && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
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
          {resolvedSrc && art && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-8 z-10"
            >
              <p className="text-[15px] sm:text-[16px] text-white/95 font-medium leading-relaxed drop-shadow-sm">
                &ldquo;{cardVerse?.text ?? art.scripture}&rdquo;
              </p>
              <p className="text-[11px] text-white/65 font-semibold mt-1.5 tracking-wide uppercase">
                {art.reference}
              </p>

              <button
                onClick={() => setExpanded(e => !e)}
                data-testid="button-daily-art"
                aria-label={expanded ? "Close reflection" : cardVerse?.truncated ? "Read full verse and reflection" : "Read today's reflection"}
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/85 hover:text-white transition-colors bg-black/20 backdrop-blur-sm rounded-full px-3 py-1"
              >
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.div>
                <span>
                  {expanded ? "Close" : cardVerse?.truncated ? "Read full verse" : "Today's reflection"}
                </span>
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
              {cardVerse?.truncated && (
                <div className="space-y-2 pb-1 border-b border-primary/10">
                  <p className="path-reminder-quote text-[16px] sm:text-[17px] text-foreground/90 leading-relaxed italic">
                    &ldquo;{art.scripture}&rdquo;
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary/60">
                    {art.reference}
                  </p>
                </div>
              )}

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
                <ShareVerseTrigger
                  text={art.scripture}
                  reference={art.reference}
                  date={easternTodayKey()}
                  extraLine={art.reflection?.trim() || undefined}
                  imageBgUrl={shareBgUrl}
                  variant="moment"
                  generateOnOpen={!!shareBgUrl}
                  label="Share this"
                  testId="button-daily-art-share"
                  className="text-primary/70 hover:text-primary px-3 py-1.5 rounded-full hover:bg-primary/8 active:scale-95"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {resolvedSrc && art && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            gap: "12px",
            borderTop: "1px solid rgba(255, 255, 255, 0.10)",
          }}
        >
          <ShareVerseTrigger
            text={art.scripture}
            reference={art.reference}
            date={easternTodayKey()}
            extraLine={art.reflection?.trim() || undefined}
            imageBgUrl={shareBgUrl}
            variant="moment"
            generateOnOpen={!!shareBgUrl}
            label="Share today's art"
            testId="link-daily-art-calling"
            className="text-[13px] text-foreground/70 hover:text-primary [&_svg]:w-4 [&_svg]:h-4 [&_svg]:text-primary/60"
          />
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
