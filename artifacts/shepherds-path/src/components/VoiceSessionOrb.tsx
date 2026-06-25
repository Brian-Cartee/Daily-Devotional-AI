import { motion } from "framer-motion";
import { Mic, Volume2 } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type VoiceOrbMode = "speak" | "listen" | "idle";

type Props = {
  mode: VoiceOrbMode;
  size?: number;
  /** Threshold overlay — light icons on black */
  dark?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

/** One circle — speaker when Philip talks, mic when you talk. No labels. */
export function VoiceSessionOrb({ mode, size = 96, dark = false, onClick, disabled }: Props) {
  const isListen = mode === "listen";
  const isSpeak = mode === "speak";
  const pulse = isListen || isSpeak;

  const listenBorder = dark ? "rgba(239,68,68,0.55)" : undefined;
  const speakBorder = dark ? "rgba(139,92,246,0.35)" : undefined;
  const idleBorder = dark ? "rgba(139,92,246,0.20)" : undefined;

  const shell = (
    <motion.div
      key={mode}
      role="status"
      aria-live="polite"
      aria-label={isListen ? "Listening" : isSpeak ? "Philip is speaking" : "Philip"}
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        border: isListen
          ? `1.5px solid ${listenBorder ?? "rgba(239,68,68,0.55)"}`
          : isSpeak
            ? `1.5px solid ${speakBorder ?? "rgba(139,92,246,0.35)"}`
            : `1.5px solid ${idleBorder ?? "rgba(139,92,246,0.22)"}`,
        background: isListen
          ? "radial-gradient(circle, rgba(239,68,68,0.22) 0%, rgba(180,20,20,0.06) 100%)"
          : isSpeak
            ? "radial-gradient(circle, rgba(139,92,246,0.20) 0%, rgba(109,40,217,0.06) 100%)"
            : "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(109,40,217,0.04) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
      animate={
        isListen
          ? {
              boxShadow: [
                "0 0 0 0px rgba(239,68,68,0.0), 0 0 32px 8px rgba(239,68,68,0.30)",
                "0 0 0 20px rgba(239,68,68,0.0), 0 0 48px 16px rgba(239,68,68,0.44)",
                "0 0 0 0px rgba(239,68,68,0.0), 0 0 32px 8px rgba(239,68,68,0.30)",
              ],
              scale: [1, 1.05, 1],
            }
          : isSpeak
            ? {
                boxShadow: [
                  "0 0 0 0px rgba(139,92,246,0.0), 0 0 28px 8px rgba(139,92,246,0.28)",
                  "0 0 0 16px rgba(139,92,246,0.0), 0 0 44px 14px rgba(139,92,246,0.38)",
                  "0 0 0 0px rgba(139,92,246,0.0), 0 0 28px 8px rgba(139,92,246,0.28)",
                ],
                scale: [1, 1.04, 1],
              }
            : {
                boxShadow: [
                  "0 0 0 0px rgba(139,92,246,0.0), 0 0 20px 4px rgba(139,92,246,0.14)",
                  "0 0 0 10px rgba(139,92,246,0.0), 0 0 32px 10px rgba(139,92,246,0.22)",
                  "0 0 0 0px rgba(139,92,246,0.0), 0 0 20px 4px rgba(139,92,246,0.14)",
                ],
                scale: [1, 1.02, 1],
              }
      }
      transition={{
        duration: isListen ? 1.6 : isSpeak ? 2.0 : 2.8,
        repeat: pulse || mode === "idle" ? Infinity : 0,
        ease: "easeInOut",
      }}
    >
      {isListen ? (
        <Mic
          size={Math.round(size * 0.25)}
          style={{ color: dark ? "rgba(239,68,68,0.90)" : undefined }}
          className={dark ? undefined : "text-red-400"}
        />
      ) : (
        <Volume2
          size={Math.round(size * 0.25)}
          style={{
            color: dark
              ? isSpeak
                ? "rgba(196,181,253,0.85)"
                : "rgba(139,92,246,0.45)"
              : undefined,
          }}
          className={dark ? undefined : isSpeak ? "text-violet-400" : "text-violet-400/50"}
        />
      )}
    </motion.div>
  );

  if (onClick) {
    let fired = false;
    const fire = () => {
      if (disabled || fired) return;
      fired = true;
      window.setTimeout(() => { fired = false; }, 400);
      onClick();
    };
    const handlePress = (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      fire();
    };
    return (
      <button
        type="button"
        onPointerUp={handlePress}
        onTouchEnd={(e) => {
          e.preventDefault();
          fire();
        }}
        disabled={disabled}
        className="border-0 bg-transparent p-0 cursor-pointer touch-manipulation disabled:opacity-60 disabled:cursor-default"
        style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
      >
        {shell}
      </button>
    );
  }

  return shell;
}
