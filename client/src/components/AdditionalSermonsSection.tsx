import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Play, Share2, X, Loader2, BookOpen } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

function decodeHtml(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

interface AdditionalSermon {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  pastor: string;
}

interface Props {
  verseId: number;
  verseReference: string;
  reflectionContent: string;
  primaryChannel?: string;
}

function AdditionalSermonCard({ sermon }: { sermon: AdditionalSermon }) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [shared, setShared] = useState(false);

  const videoUrl = `https://www.youtube.com/watch?v=${sermon.videoId}`;

  const handleShare = async () => {
    const shareText = `"${decodeHtml(sermon.title)}" — ${decodeHtml(sermon.channel)}\n\nFound this message after today's devotional on Shepherd's Path.\n\nGet the app: shepherdspath.app`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: decodeHtml(sermon.title),
          text: shareText,
          url: videoUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${videoUrl}`);
        setShared(true);
        setTimeout(() => setShared(false), 2200);
      }
    } catch {}
  };

  return (
    <>
      <div
        className="flex gap-3 items-start rounded-2xl p-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Thumbnail */}
        <button
          data-testid={`btn-additional-sermon-watch-${sermon.videoId}`}
          onClick={() => setShowPlayer(true)}
          className="relative flex-shrink-0 rounded-xl overflow-hidden"
          style={{ width: 96, height: 64 }}
        >
          <img
            src={sermon.thumbnail}
            alt={decodeHtml(sermon.title)}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.38)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.9)" }}
            >
              <Play className="w-3.5 h-3.5 text-white" fill="white" />
            </div>
          </div>
          {sermon.duration && (
            <div
              className="absolute bottom-1 right-1 rounded text-[10px] font-semibold px-1"
              style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,255,255,0.85)" }}
            >
              {sermon.duration}
            </div>
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-semibold leading-snug line-clamp-2"
            style={{ color: "rgba(255,255,255,0.85)", fontFamily: "'Georgia', serif" }}
          >
            {decodeHtml(sermon.title)}
          </p>
          <p
            className="text-[11px] mt-1"
            style={{ color: "rgba(167,139,250,0.65)" }}
          >
            {decodeHtml(sermon.channel)}
          </p>
        </div>

        {/* Share button */}
        <button
          data-testid={`btn-additional-sermon-share-${sermon.videoId}`}
          onClick={handleShare}
          className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 transition-opacity"
          style={{
            background: shared ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
            border: shared ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.09)",
          }}
          title="Share this message"
        >
          {shared ? (
            <span className="text-[11px] font-semibold" style={{ color: "rgba(34,197,94,0.9)" }}>
              Copied
            </span>
          ) : (
            <Share2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.45)" }} />
          )}
        </button>
      </div>

      {/* Inline player overlay */}
      <AnimatePresence>
        {showPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.94)" }}
            onClick={() => setShowPlayer(false)}
            data-testid="overlay-additional-sermon-player"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#0c0a1e", border: "1px solid rgba(124,58,237,0.25)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(0,0,0,0.5)" }}>
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-semibold text-white line-clamp-1" style={{ fontFamily: "'Georgia', serif" }}>
                    {decodeHtml(sermon.title)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.7)" }}>
                    {decodeHtml(sermon.channel)}
                  </p>
                </div>
                <button
                  data-testid="btn-close-additional-sermon-player"
                  onClick={() => setShowPlayer(false)}
                  className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${sermon.videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                />
              </div>
              <div className="px-4 py-3 text-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 mx-auto text-[11px]"
                  style={{ color: "rgba(245,158,11,0.7)" }}
                  data-testid="btn-share-from-player"
                >
                  <Share2 className="w-3 h-3" />
                  Share this message
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function AdditionalSermonsSection({ verseId, verseReference, reflectionContent, primaryChannel }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sermons, setSermons] = useState<AdditionalSermon[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleExpand = async () => {
    setExpanded(true);
    if (loaded || loading) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/sermon/additional", {
        verseId,
        date: new Date().toISOString().slice(0, 10),
        reflectionContext: reflectionContent?.slice(0, 400),
        primaryPastor: primaryChannel || "",
      });
      const data = await res.json();
      if (data.found && data.sermons?.length) {
        setSermons(data.sermons);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  return (
    <div className="mt-3">
      {/* Trigger */}
      {!expanded && (
        <button
          data-testid="btn-go-deeper-expand"
          onClick={handleExpand}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-opacity active:opacity-70"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <BookOpen className="w-3.5 h-3.5" style={{ color: "rgba(245,158,11,0.75)" }} />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.78)" }}>
                Go Deeper
              </p>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                2 more voices on today's verse
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
        </button>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            {/* Section header with collapse */}
            <button
              data-testid="btn-go-deeper-collapse"
              onClick={() => setExpanded(false)}
              className="w-full flex items-center justify-between px-1 pb-2.5 pt-0.5"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" style={{ color: "rgba(245,158,11,0.6)" }} />
                <span
                  className="text-[12px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: "rgba(255,255,255,0.38)" }}
                >
                  Go Deeper
                </span>
              </div>
              <ChevronDown
                className="w-4 h-4 rotate-180 transition-transform"
                style={{ color: "rgba(255,255,255,0.25)" }}
              />
            </button>

            {/* Loading */}
            {loading && (
              <div className="flex items-center gap-2.5 py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(245,158,11,0.5)" }} />
                <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
                  Finding more voices…
                </span>
              </div>
            )}

            {/* Failed */}
            {!loading && failed && (
              <p
                className="text-center text-[13px] py-5"
                style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}
              >
                Nothing found for today — check back tomorrow.
              </p>
            )}

            {/* Sermon cards */}
            {!loading && !failed && sermons.length > 0 && (
              <div className="space-y-2.5">
                {sermons.map(sermon => (
                  <AdditionalSermonCard key={sermon.videoId} sermon={sermon} />
                ))}

                {/* Share nudge */}
                <p
                  className="text-center text-[11px] pt-1 pb-0.5"
                  style={{ color: "rgba(255,255,255,0.22)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}
                >
                  Tap the share icon to send a message to someone who needs it today.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
