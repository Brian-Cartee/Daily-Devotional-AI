import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type PhilipVoiceState =
  | "greeting"
  | "listening"
  | "processing"
  | "speaking"
  | "idle"
  | "hidden";

export interface PhilipVoiceScreenProps {
  state: PhilipVoiceState;
  speakingText?: string | null;
  onTap?: () => void;
}

const HALO: Record<Exclude<PhilipVoiceState, "hidden">, { color: string; pulse: number }> = {
  greeting:   { color: "rgba(251,191,36,0.55)",  pulse: 2.2 },
  listening:  { color: "rgba(74,222,128,0.50)",  pulse: 1.6 },
  processing: { color: "rgba(167,139,250,0.45)", pulse: 1.0 },
  speaking:   { color: "rgba(251,191,36,0.60)",  pulse: 2.4 },
  idle:       { color: "rgba(251,191,36,0.35)",  pulse: 3.5 },
};

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean);
}

export function PhilipVoiceScreen({ state, speakingText, onTap }: PhilipVoiceScreenProps) {
  const [visibleSentences, setVisibleSentences] = useState<string[]>([]);
  const sentenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevText = useRef<string | null>(null);

  useEffect(() => {
    if (sentenceTimer.current) clearTimeout(sentenceTimer.current);
    if (!speakingText || state !== "speaking") {
      setVisibleSentences([]);
      prevText.current = null;
      return;
    }
    if (speakingText === prevText.current) return;
    prevText.current = speakingText;

    // Show at most 2 sentences, reveal one at a time
    const sentences = splitSentences(speakingText).slice(0, 2);
    setVisibleSentences([]);
    let i = 0;
    const reveal = () => {
      if (i >= sentences.length) return;
      setVisibleSentences(prev => [...prev, sentences[i]]);
      i++;
      sentenceTimer.current = setTimeout(reveal, 3000);
    };
    sentenceTimer.current = setTimeout(reveal, 400);
    return () => { if (sentenceTimer.current) clearTimeout(sentenceTimer.current); };
  }, [speakingText, state]);

  if (state === "hidden") return null;

  const { color, pulse } = HALO[state];

  return (
    // No opacity transition on the root — prevents iOS black flash on re-render
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: "#0e0905",
        // Force GPU compositing layer — prevents iOS Safari blank-frame bug
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        willChange: "transform",
      }}
      onClick={onTap}
    >
      {/* Portrait + halo */}
      <div className="relative flex items-center justify-center mb-10" style={{ width: 280, height: 280 }}>

        {/* Breathing outer glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${color} 0%, transparent 68%)` }}
          animate={{ scale: [1, 1.16, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: pulse, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Inner ring */}
        <motion.div
          className="absolute rounded-full border-2"
          style={{
            inset: 36,
            borderColor: color.replace(/[\d.]+\)$/, "0.8)"),
          }}
          animate={{ scale: [1, 1.04, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: pulse * 0.85, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Listening ripple — expands outward once per cycle */}
        <AnimatePresence>
          {state === "listening" && (
            <motion.div
              key="ripple"
              className="absolute rounded-full border border-green-400"
              style={{ inset: 30, opacity: 0.7 }}
              animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Philip portrait — always visible at full opacity */}
        <img
          src="/philip.jpg"
          alt="Philip"
          className="absolute rounded-full object-cover shadow-2xl"
          style={{ inset: 44, borderRadius: "50%" }}
        />

        {/* Processing dots — below portrait */}
        <AnimatePresence>
          {state === "processing" && (
            <motion.div
              key="dots"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 flex gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-violet-400"
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Philip's words — max 2 sentences, fade in one at a time, fade out when done speaking */}
      <div className="px-8 max-w-xs text-center min-h-[6rem]">
        <AnimatePresence mode="wait">
          {state === "speaking" && visibleSentences.length > 0 && (
            <motion.div
              key={visibleSentences.join("|")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.5 }}
              className="space-y-3"
            >
              {visibleSentences.map((s, i) => (
                <motion.p
                  key={i}
                  className="text-amber-100 text-base leading-relaxed font-light"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.2 }}
                >
                  {s}
                </motion.p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
