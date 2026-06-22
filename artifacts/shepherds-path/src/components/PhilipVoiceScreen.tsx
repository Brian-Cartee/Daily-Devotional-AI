import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type PhilipVoiceState =
  | "greeting"      // Philip speaking welcome
  | "listening"     // mic open, user speaking
  | "processing"    // user submitted, Philip thinking
  | "speaking"      // Philip speaking response
  | "idle"          // between turns, quiet presence
  | "hidden";       // not in voice mode

export interface PhilipVoiceScreenProps {
  state: PhilipVoiceState;
  /** Text Philip is currently speaking — shown sentence by sentence */
  speakingText?: string | null;
  /** Short status line shown below portrait (optional; keep very brief) */
  caption?: string | null;
  onTap?: () => void;
}

const HALO_COLORS: Record<Exclude<PhilipVoiceState, "hidden">, string> = {
  greeting:   "rgba(251,191,36,0.55)",   // warm gold
  listening:  "rgba(74,222,128,0.50)",   // soft green
  processing: "rgba(167,139,250,0.45)",  // gentle violet
  speaking:   "rgba(251,191,36,0.60)",   // bright gold
  idle:       "rgba(251,191,36,0.25)",   // dim gold
};

const PULSE_DURATION: Record<Exclude<PhilipVoiceState, "hidden">, number> = {
  greeting:   2.2,
  listening:  1.6,
  processing: 1.0,
  speaking:   2.4,
  idle:       3.5,
};

/** Split text into sentences for reveal animation */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function PhilipVoiceScreen({
  state,
  speakingText,
  caption,
  onTap,
}: PhilipVoiceScreenProps) {
  const [visibleSentences, setVisibleSentences] = useState<string[]>([]);
  const sentenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTextRef = useRef<string | null>(null);

  // Reveal sentences one by one when speakingText changes
  useEffect(() => {
    if (!speakingText) {
      setVisibleSentences([]);
      prevTextRef.current = null;
      return;
    }
    if (speakingText === prevTextRef.current) return;
    prevTextRef.current = speakingText;

    const sentences = splitSentences(speakingText);
    setVisibleSentences([]);

    let i = 0;
    const reveal = () => {
      if (i >= sentences.length) return;
      setVisibleSentences((prev) => [...prev, sentences[i]]);
      i++;
      sentenceTimerRef.current = setTimeout(reveal, 2800);
    };
    sentenceTimerRef.current = setTimeout(reveal, 300);
    return () => {
      if (sentenceTimerRef.current) clearTimeout(sentenceTimerRef.current);
    };
  }, [speakingText]);

  if (state === "hidden") return null;

  const haloColor = HALO_COLORS[state];
  const pulseDuration = PULSE_DURATION[state];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 40%, #1a1008 0%, #0d0805 100%)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      onClick={onTap}
    >
      {/* Breathing halo */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Outer glow pulse */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 280,
            height: 280,
            background: `radial-gradient(circle, ${haloColor} 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.18, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: pulseDuration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Inner ring */}
        <motion.div
          className="absolute rounded-full border-2"
          style={{
            width: 208,
            height: 208,
            borderColor: haloColor.replace(/[\d.]+\)$/, "0.8)"),
          }}
          animate={{
            scale: [1, 1.04, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: pulseDuration * 0.9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Philip portrait */}
        <motion.img
          src="/philip.jpg"
          alt="Philip"
          className="relative rounded-full object-cover shadow-2xl"
          style={{ width: 192, height: 192, zIndex: 1 }}
          animate={{
            scale: state === "speaking" ? [1, 1.015, 1] : 1,
          }}
          transition={
            state === "speaking"
              ? { duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }
              : {}
          }
        />

        {/* Listening indicator — subtle green ring ripple */}
        <AnimatePresence>
          {state === "listening" && (
            <motion.div
              key="listen-ring"
              className="absolute rounded-full border"
              style={{
                width: 220,
                height: 220,
                borderColor: "rgba(74,222,128,0.6)",
              }}
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.35, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Processing dots */}
        <AnimatePresence>
          {state === "processing" && (
            <motion.div
              key="proc-dots"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 flex gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: "rgba(167,139,250,0.9)" }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Speaking text reveal */}
      <AnimatePresence mode="wait">
        {state === "speaking" && visibleSentences.length > 0 && (
          <motion.div
            key="speaking-text"
            className="px-8 max-w-sm text-center space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {visibleSentences.map((sentence, idx) => (
              <motion.p
                key={idx}
                className="text-amber-100 text-lg leading-relaxed font-light"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {sentence}
              </motion.p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caption (very subtle, bottom) */}
      <AnimatePresence>
        {caption && (
          <motion.p
            key={caption}
            className="absolute bottom-12 text-sm tracking-wide"
            style={{ color: "rgba(251,191,36,0.45)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {caption}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
