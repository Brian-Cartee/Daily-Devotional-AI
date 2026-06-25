import { AnimatePresence, motion } from "framer-motion";
import { VOICE_QUIET_MIC_HINT } from "@/lib/voiceQuietHint";

type Props = {
  visible: boolean;
  dark?: boolean;
};

/** One-line voice environment hint — fades in with the mic, out after speech or timeout. */
export function VoiceQuietHint({ visible, dark = false }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.p
          key="voice-quiet-hint"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          data-testid="voice-quiet-hint"
          style={{
            margin: 0,
            maxWidth: "220px",
            textAlign: "center",
            fontSize: "12px",
            lineHeight: 1.45,
            letterSpacing: "0.02em",
            color: dark ? "rgba(255,255,255,0.38)" : "hsl(var(--muted-foreground) / 0.72)",
          }}
        >
          {VOICE_QUIET_MIC_HINT}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
