import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Lock } from "lucide-react";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { UpgradeModal } from "@/components/UpgradeModal";

interface VideoResource {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  reason: string;
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/8"
      >
        <button
          data-testid="btn-dismiss-resource"
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-colors"
        >
          <X className="w-3 h-3 text-foreground/60" />
        </button>

        <div className="px-4 pt-4 pb-2.5 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
            <Play className="w-2.5 h-2.5 text-primary fill-primary" />
          </div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
            Guided Teaching — Found for Your Situation
          </span>
        </div>

        <div className="relative">
          <div className={`flex gap-3 px-4 pb-4 ${!isPro ? "blur-[3px] pointer-events-none select-none" : ""}`}>
            <div
              className="relative flex-shrink-0 w-28 h-16 rounded-xl overflow-hidden bg-black/20 cursor-pointer group"
              onClick={() => isPro && setShowPlayer(true)}
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
              </div>
              {video.duration && (
                <span className="absolute bottom-1 right-1 text-[10px] font-bold text-white bg-black/70 px-1 rounded">
                  {video.duration}
                </span>
              )}
            </div>

            <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
              <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                {video.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{video.channel}</p>
              {isPro && (
                <button
                  data-testid="btn-watch-resource"
                  onClick={() => setShowPlayer(true)}
                  className="mt-2 self-start text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  Watch now <Play className="w-3 h-3 fill-current" />
                </button>
              )}
            </div>
          </div>

          {!isPro && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6">
              <Lock className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-center text-foreground leading-snug">
                A specific teaching was found for your situation
              </p>
              <button
                data-testid="btn-unlock-resource"
                onClick={() => setShowUpgrade(true)}
                className="text-xs font-bold text-primary-foreground bg-primary px-4 py-1.5 rounded-full hover:bg-primary/90 transition-colors"
              >
                Unlock with Pro
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4"
            onClick={() => setShowPlayer(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-black rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-semibold text-white line-clamp-1">{video.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{video.channel}</p>
                </div>
                <button
                  data-testid="btn-close-video"
                  onClick={() => setShowPlayer(false)}
                  className="text-zinc-400 hover:text-white transition-colors flex-shrink-0"
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
              <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 text-center">
                  Watch here — then return to your conversation
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
