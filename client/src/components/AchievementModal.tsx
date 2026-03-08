import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Achievement } from "@/lib/achievements";

interface AchievementModalProps {
  achievement: Achievement;
  onClose: () => void;
}

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    "Google US English",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Jenny Online (Natural) - English (United States)",
    "Samantha",
    "Karen",
    "Moira",
  ];
  for (const name of preferred) {
    const match = voices.find(v => v.name.includes(name));
    if (match) return match;
  }
  return voices.find(v => v.lang.startsWith("en")) ?? voices[0] ?? null;
}

export function AchievementModal({ achievement, onClose }: AchievementModalProps) {
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const handleToggleAudio = () => {
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(achievement.voiceScript);
    utteranceRef.current = utterance;

    const applyVoice = () => {
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      applyVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = applyVoice;
    }

    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);

    window.speechSynthesis.speak(utterance);
    setPlaying(true);
    setStarted(true);
  };

  const handleClose = () => {
    window.speechSynthesis.cancel();
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
        {/* Gradient header */}
        <div className={`bg-gradient-to-br ${achievement.colorFrom} ${achievement.colorTo} px-7 pt-8 pb-12 text-center`}>
          {/* Big emoji */}
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

          <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight">
            {achievement.title}
          </h2>
          <p className="text-white/75 text-sm mt-1.5">
            {achievement.subtitle}
          </p>
        </div>

        {/* Pull-up card */}
        <div className="-mt-5 bg-background rounded-t-3xl px-7 pt-6 pb-7 space-y-4">
          {/* Message */}
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
              {playing ? "Playing…" : started ? "Hear this message" : "Hear a personal word"}
            </span>
            <button
              data-testid="btn-achievement-audio"
              onClick={handleToggleAudio}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${
                playing
                  ? "bg-red-100 dark:bg-red-950/50 text-red-500 hover:bg-red-200"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {playing
                ? <Square className="w-3 h-3" />
                : <Play className="w-3 h-3 translate-x-[1px]" />
              }
            </button>
          </div>

          {/* CTA */}
          <Button
            data-testid="btn-achievement-close"
            className={`w-full rounded-2xl font-bold py-5 text-sm bg-gradient-to-r ${achievement.colorFrom} ${achievement.colorTo} hover:opacity-90 transition-opacity border-0 text-white`}
            onClick={handleClose}
          >
            Keep Going
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
