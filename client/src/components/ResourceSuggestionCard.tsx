import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Lock, Sparkles } from "lucide-react";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { UpgradeModal } from "@/components/UpgradeModal";

interface VideoResource {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  leadIn: string;
  momentTitle: string;
  preacher: string;
}

interface ResourceSuggestionCardProps {
  messages: { role: string; content: string }[];
  topic?: string;
}

export function ResourceSuggestionCard({ messages, topic }: ResourceSuggestionCardProps) {
  const [video, setVideo] = useState<VideoResource | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const fetchedRef = useRef(false);
  const isPro = isProVerifiedLocally();

  useEffect(() => {
    if (fetchedRef.current || dismissed) return;

    const userCount = messages.filter((m) => m.role === "user").length;
    const assistantCount = messages.filter((m) => m.role === "assistant").length;
    if (userCount < 2 || assistantCount < 2) return;

    const last = messages[messages.length - 1];
    if (last?.role !== "assistant") return;

    fetchedRef.current = true;

    fetch("/api/resources/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, topic }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.shouldSuggest && data.video) {
          setVideo(data.video);
        }
      })
      .catch(() => {});
  }, [messages, topic, dismissed]);

  if (!video || dismissed) return null;

  const handleWatch = () => {
    if (!isPro) { setShowUpgrade(true); return; }
    setShowPlayer(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl overflow-hidden mb-8"
        style={{
          background: "linear-gradient(135deg, #0d0a1a 0%, #1a0f35 60%, #0d0a1a 100%)",
          border: "1px solid rgba(122,1,141,0.25)",
          boxShadow: "0 8px 32px rgba(122,1,141,0.12)",
        }}
        data-testid="card-resource-moment"
      >
        {/* Purple accent bar */}
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #7A018D, #442f74, transparent)" }} />

        {/* Dismiss */}
        <button
          data-testid="btn-dismiss-resource"
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "rgba(255,255,255,0.08)" }}
          aria-label="Dismiss"
        >
          <X className="w-3 h-3 text-white/50" />
        </button>

        {/* Header label */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-3">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "rgba(180,120,255,0.8)" }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(180,120,255,0.7)" }}>
            A Moment Found For You
          </span>
        </div>

        {/* Lead-in — always visible, creates desire */}
        {video.leadIn && (
          <div className="px-5 pb-4">
            <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.82)", fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
              {video.leadIn}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="mx-5 mb-4" style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />

        {/* Video card */}
        <div className="px-5 pb-5">
          <div
            className="relative rounded-xl overflow-hidden cursor-pointer group"
            onClick={handleWatch}
            data-testid="btn-watch-resource"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {/* Thumbnail */}
            <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
              <img
                src={video.thumbnail}
                alt={video.momentTitle || video.title}
                className="w-full h-full object-cover"
                style={{ filter: !isPro ? "brightness(0.35) blur(2px)" : "brightness(0.75)" }}
              />

              {/* Gradient overlay on thumbnail */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(13,10,26,0.92) 0%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0) 100%)" }}
              />

              {/* Play button / Lock */}
              <div className="absolute inset-0 flex items-center justify-center">
                {isPro ? (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: "rgba(122,1,141,0.85)", boxShadow: "0 4px 20px rgba(122,1,141,0.5)" }}
                  >
                    <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                  </div>
                ) : (
                  <div className="text-center px-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                      style={{ background: "rgba(122,1,141,0.7)" }}
                    >
                      <Lock className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white text-sm font-semibold leading-snug">This moment is waiting for you</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowUpgrade(true); }}
                      className="mt-2 text-xs font-bold px-4 py-1.5 rounded-full"
                      style={{ background: "linear-gradient(135deg, #7A018D, #442f74)", color: "white" }}
                    >
                      Unlock with Pro
                    </button>
                  </div>
                )}
              </div>

              {/* Duration badge */}
              {video.duration && (
                <span
                  className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,255,255,0.9)" }}
                >
                  {video.duration}
                </span>
              )}
            </div>

            {/* Below thumbnail — title + preacher */}
            <div className="px-3 py-3" style={{ background: "rgba(0,0,0,0.4)" }}>
              {video.momentTitle && (
                <p className="text-[13px] font-semibold leading-snug mb-1" style={{ color: "rgba(255,255,255,0.9)", fontFamily: "'Georgia', serif" }}>
                  {video.momentTitle}
                </p>
              )}
              <p className="text-[11px]" style={{ color: "rgba(180,120,255,0.75)" }}>
                {video.preacher || video.channel}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full-screen player */}
      <AnimatePresence>
        {showPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.92)" }}
            onClick={() => setShowPlayer(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#0d0a1a", border: "1px solid rgba(122,1,141,0.3)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(0,0,0,0.5)" }}>
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-semibold text-white line-clamp-1" style={{ fontFamily: "'Georgia', serif" }}>
                    {video.momentTitle || video.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(180,120,255,0.7)" }}>{video.preacher || video.channel}</p>
                </div>
                <button
                  data-testid="btn-close-video"
                  onClick={() => setShowPlayer(false)}
                  className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                />
              </div>
              <div className="px-4 py-3 text-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Watch this moment — then return to your conversation
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </AnimatePresence>
    </>
  );
}
