import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Square, Volume2, VolumeX, Loader2, Zap, Share2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Achievement } from "@/lib/achievements";
import { isStoryMomentAchievement } from "@/lib/achievementMoments";
import { useTTS } from "@/hooks/use-tts";
import { isProVerifiedLocally } from "@/lib/proStatus";
import { createAchievementShareImage } from "@/lib/shareImage";
import { shareImageBlob } from "@/lib/shareVerse";

interface AchievementModalProps {
  achievement: Achievement;
  onClose: () => void;
}

const serif = "var(--font-serif, Georgia, serif)";

export function AchievementModal({ achievement, onClose }: AchievementModalProps) {
  const { toggle, stop, playing, loading } = useTTS();
  const [sharing, setSharing] = useState(false);
  const storyMoment = isStoryMomentAchievement(achievement.id);
  const showProNudge =
    !isProVerifiedLocally() &&
    ["streak_7", "streak_14", "streak_21", "streak_30", "streak_60", "streak_100", "streak_365"].includes(achievement.id);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const blob = await createAchievementShareImage(achievement);
      await shareImageBlob(blob, {
        filename: `shepherds-path-${achievement.id}.png`,
        title: achievement.title,
        text: storyMoment
          ? `${achievement.title} — ${achievement.subtitle} | Shepherd's Path`
          : `${achievement.emoji} ${achievement.title} — ${achievement.subtitle} | Shepherd's Path`,
      });
    } catch {
      // User cancelled share or error — silently ignore
    } finally {
      setSharing(false);
    }
  };

  const handleClose = () => {
    stop();
    onClose();
  };

  if (storyMoment) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-5 sm:p-8"
        style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          onClick={e => e.stopPropagation()}
          className="relative max-w-sm w-full rounded-[1.75rem] overflow-hidden shadow-2xl min-h-[min(78vh,560px)] flex flex-col"
          data-testid="achievement-modal"
        >
          {achievement.photo && (
            <img
              src={achievement.photo}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
              style={{
                objectPosition: achievement.photoObjectPosition ?? "center center",
                filter: "brightness(0.72) saturate(0.92)",
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                achievement.photoOverlay ??
                "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.12) 40%, rgba(9,3,30,0.92) 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[58%] pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.16) 42%, transparent 100%)",
            }}
          />

          <div className="relative z-10 flex flex-col flex-1 justify-end px-8 pt-16 pb-7">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2
                className="text-[2rem] sm:text-[2.15rem] font-normal text-white leading-[1.15] tracking-tight"
                style={{
                  fontFamily: serif,
                  textShadow: "0 2px 24px rgba(0,0,0,0.75), 0 1px 2px rgba(0,0,0,0.9)",
                }}
              >
                {achievement.title}
              </h2>
              <p
                className="mt-3 text-[15px] leading-relaxed text-white/80 max-w-[28ch]"
                style={{
                  fontFamily: serif,
                  fontStyle: "italic",
                  textShadow: "0 1px 18px rgba(0,0,0,0.65)",
                }}
              >
                {achievement.subtitle}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28, duration: 0.5 }}
              className="mt-8 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  data-testid="btn-achievement-audio"
                  onClick={() => toggle(achievement.voiceScript)}
                  disabled={loading}
                  className="flex items-center gap-2.5 text-[12px] text-white/55 hover:text-white/80 transition-colors disabled:opacity-50 min-w-0"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : playing ? (
                    <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">{loading ? "Preparing…" : playing ? "Playing…" : "Hear this moment"}</span>
                  {!loading && (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-white/20 bg-white/5 shrink-0">
                      {playing ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 translate-x-[0.5px]" />}
                    </span>
                  )}
                </button>
                <button
                  data-testid="btn-achievement-share"
                  onClick={handleShare}
                  disabled={sharing}
                  title="Share this moment"
                  className="shrink-0 h-8 w-8 rounded-lg border border-white/8 bg-transparent hover:bg-white/5 flex items-center justify-center text-white/35 hover:text-white/60 transition-all disabled:opacity-50"
                >
                  {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                data-testid="btn-achievement-close"
                onClick={handleClose}
                className="w-full h-11 rounded-xl border border-white/20 bg-white/8 hover:bg-white/12 text-white/90 text-[14px] font-medium transition-colors"
                style={{ fontFamily: serif }}
              >
                Continue
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

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
                style={{
                  objectPosition: achievement.photoObjectPosition ?? "center center",
                  filter: "brightness(0.85) saturate(1.1)",
                }}
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
              A full step taken.
            </div>

            <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
              {achievement.title}
            </h2>
            <p className="text-white/80 text-sm mt-1.5 drop-shadow">
              {achievement.subtitle}
            </p>
          </div>
        </div>

        <div className="-mt-5 bg-background rounded-t-3xl px-7 pt-6 pb-7 space-y-4">
          <p className="text-[14px] text-foreground/80 leading-relaxed text-center">
            {achievement.message}
          </p>

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
              Continue your walk uninterrupted with Pro
            </Link>
          )}

          {["streak_7", "streak_14", "streak_21", "streak_30", "streak_60", "streak_100", "streak_365"].includes(
            achievement.id,
          ) && (
            <Link
              href="/invite"
              onClick={handleClose}
              data-testid="btn-achievement-invite"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-2xl border border-border bg-muted/30 text-foreground/80 text-[12px] font-semibold hover:bg-muted/50 transition-colors mt-2"
            >
              <Gift className="w-3.5 h-3.5 text-amber-600" />
              Invite someone on this walk — earn bonus Pro days
            </Link>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
