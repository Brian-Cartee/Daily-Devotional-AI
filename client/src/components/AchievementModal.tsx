import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Square, Volume2, VolumeX, ArrowRight, Loader2, Zap, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Achievement } from "@/lib/achievements";
import { useTTS } from "@/hooks/use-tts";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { createAchievementShareImage } from "@/lib/shareImage";

interface AchievementModalProps {
  achievement: Achievement;
  onClose: () => void;
}

export function AchievementModal({ achievement, onClose }: AchievementModalProps) {
  const { toggle, stop, playing, loading } = useTTS();
  const [sharing, setSharing] = useState(false);
  const showProNudge =
    !isProVerifiedLocally() &&
    ["streak_7", "streak_14", "streak_30", "streak_100"].includes(achievement.id);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const blob = await createAchievementShareImage(achievement);
      const file = new File([blob], `shepherds-path-${achievement.id}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: achievement.title,
          text: `${achievement.emoji} ${achievement.title} — ${achievement.subtitle} | Shepherd's Path`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `shepherds-path-${achievement.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // User cancelled share or error — silently ignore
    } finally {
      setSharing(false);
    }
  };

  const handleClose = () => {
    stop();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)" }}
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        className="bg-background border border-border rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
        data-testid="achievement-modal"
      >
        {/* Header — photo or gradient */}
        <div
          className={`relative overflow-hidden px-7 pt-8 pb-12 text-center ${achievement.photo ? "" : `bg-gradient-to-br ${achievement.colorFrom} ${achievement.colorTo}`}`}
        >
          {achievement.photo && (
            <>
              <img
                src={achievement.photo}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                style={{ filter: "brightness(0.85) saturate(1.1)" }}
              />
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(to bottom, ${achievement.photoOverlay ?? "rgba(150,70,10,0.5)"} 0%, ${achievement.photoOverlay ?? "rgba(150,70,10,0.65)"} 100%)` }}
              />
            </>
          )}
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl mb-4 inline-block"
            >
              {achievement.emoji}
            </motion.div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest mb-3">
              Achievement Unlocked
            </div>

            <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
              {achievement.title}
            </h2>
            <p className="text-white/80 text-sm mt-1.5 drop-shadow">
              {achievement.subtitle}
            </p>
          </div>
        </div>

        {/* Pull-up card */}
        <div className="-mt-5 bg-background rounded-t-3xl px-7 pt-6 pb-7 space-y-4">
          <p className="text-[14px] text-foreground/80 leading-relaxed text-center">
            {achievement.message}
          </p>

          {/* Audio toggle */}
          <div className="flex items-center justify-center gap-2.5 py-2 px-4 rounded-2xl bg-muted/40 border border-border/40">
            {playing
              ? <Volume2 className="w-4 h-4 text-primary animate-pulse shrink-0" />
              : <VolumeX className="w-4 h-4 text-muted-foreground shrink-0" />
            }
            <span className="text-[12px] text-muted-foreground flex-1">
              {loading ? "Preparing…" : playing ? "Playing…" : "Hear a personal word"}
            </span>
            <button
              data-testid="btn-achievement-audio"
              onClick={() => toggle(achievement.voiceScript)}
              disabled={loading}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${
                playing
                  ? "bg-red-100 dark:bg-red-950/50 text-red-500 hover:bg-red-200"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              } disabled:opacity-50`}
            >
              {loading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : playing
                  ? <Square className="w-3 h-3" />
                  : <Play className="w-3 h-3 translate-x-[1px]" />
              }
            </button>
          </div>

          <div className="flex gap-2">
            <button
              data-testid="btn-achievement-share"
              onClick={handleShare}
              disabled={sharing}
              title="Share your achievement"
              className="shrink-0 h-12 w-12 rounded-2xl border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            >
              {sharing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Share2 className="w-4 h-4" />
              }
            </button>
            <Button
              data-testid="btn-achievement-close"
              className={`flex-1 rounded-2xl font-bold py-5 text-sm bg-gradient-to-r ${achievement.colorFrom} ${achievement.colorTo} hover:opacity-90 transition-opacity border-0 text-white`}
              onClick={handleClose}
            >
              Keep Going
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {showProNudge && (
            <Link
              href="/pricing"
              onClick={handleClose}
              data-testid="btn-achievement-pro-nudge"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-2xl border border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 text-[12px] font-semibold hover:bg-amber-100/80 dark:hover:bg-amber-950/40 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Protect your streak with Pro — never lose it to a busy day
            </Link>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
