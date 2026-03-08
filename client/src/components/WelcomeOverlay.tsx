import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Play, Square, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const WELCOME_SCRIPT = `Welcome. We are so glad you are here.

Shepherd's Path is your quiet, daily walk with Jesus. Start with the Daily Devotional — and we will be right here with you, every morning.`;

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    "Microsoft Christopher Online (Natural) - English (United States)",
    "Microsoft Guy Online (Natural) - English (United States)",
    "Microsoft Davis Online (Natural) - English (United States)",
    "Microsoft David Online (Natural) - English (United States)",
    "Microsoft Eric Online (Natural) - English (United States)",
    "Google UK English Male",
    "Alex",
    "Fred",
    "Tom",
    "Daniel",
  ];
  for (const name of preferred) {
    const match = voices.find(v => v.name.includes(name));
    if (match) return match;
  }
  // fallback: any male-labeled English voice
  const maleFallback = voices.find(v => v.lang.startsWith("en") && /male/i.test(v.name));
  if (maleFallback) return maleFallback;
  return voices.find(v => v.lang.startsWith("en")) ?? voices[0] ?? null;
}

interface WelcomeOverlayProps {
  onDismiss: () => void;
}

export function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const totalWords = WELCOME_SCRIPT.split(/\s+/).length;

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleListen = () => {
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(WELCOME_SCRIPT);
    utteranceRef.current = utterance;

    const setVoice = () => {
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 0.78;
      utterance.pitch = 0.88;
      utterance.volume = 1.0;
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }

    utterance.onboundary = (e) => {
      if (e.name === "word") {
        setWordIndex(Math.floor((e.charIndex / WELCOME_SCRIPT.length) * totalWords));
      }
    };

    utterance.onend = () => {
      setPlaying(false);
      setWordIndex(totalWords);
    };

    utterance.onerror = () => {
      setPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    setPlaying(true);
    setStarted(true);
  };

  const handleDismiss = () => {
    window.speechSynthesis.cancel();
    onDismiss();
  };

  const progress = started ? Math.min(100, Math.round((wordIndex / totalWords) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="bg-background border border-border rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header band */}
        <div className="bg-gradient-to-br from-primary via-primary/90 to-amber-500/80 px-8 pt-9 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-widest mb-4">
            ✦ Welcome
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
            Shepherd's Path
          </h1>
          <p className="text-white/80 text-sm mt-2 leading-relaxed">
            Your daily walk with Jesus
          </p>
        </div>

        {/* Content */}
        <div className="-mt-5 bg-background rounded-t-3xl px-8 pt-7 pb-8 space-y-5">
          {/* Feature list */}
          <div className="space-y-3">
            {[
              { icon: "🌅", title: "Daily Devotional", desc: "A fresh scripture, reflection & prayer — every morning" },
              { icon: "🧭", title: "Bible Journey", desc: "30-day guided transformation through God's Word" },
              { icon: "📖", title: "Read the Bible", desc: "Every book & chapter with AI insight on demand" },
              { icon: "✍️", title: "Prayer Journal", desc: "Capture prayers, reflections & saved scriptures" },
              { icon: "🔥", title: "Daily Streak", desc: "A gentle record of your faithfulness" },
              { icon: "📜", title: "Our Commitment to Scripture", desc: "Every AI response is grounded in God's Word — always" },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-base mt-0.5 shrink-0">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{f.title}</p>
                  <p className="text-[12px] text-muted-foreground leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Audio player */}
          <div className="bg-muted/40 border border-border/50 rounded-2xl px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {playing
                  ? <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                  : <VolumeX className="w-4 h-4 text-muted-foreground" />
                }
                <span className="text-[13px] font-semibold text-foreground">
                  {playing ? "Playing welcome message…" : started ? "Welcome message" : "Hear a personal welcome"}
                </span>
              </div>
              <button
                data-testid="btn-toggle-audio"
                onClick={handleListen}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  playing
                    ? "bg-red-100 dark:bg-red-950/50 text-red-500 hover:bg-red-200"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                {playing
                  ? <Square className="w-3.5 h-3.5" />
                  : <Play className="w-3.5 h-3.5 translate-x-[1px]" />
                }
              </button>
            </div>

            {/* Progress bar */}
            {started && (
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            <p className="text-[11px] text-muted-foreground leading-snug">
              A brief personal welcome — about 15 seconds.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="space-y-2.5 pt-1">
            <Button
              data-testid="btn-start-exploring"
              className="w-full rounded-2xl font-bold py-5 text-sm bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 transition-opacity border-0"
              onClick={handleDismiss}
            >
              Start Exploring
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <button
              data-testid="btn-skip-welcome"
              onClick={handleDismiss}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1 flex items-center justify-center gap-1"
            >
              Skip voice intro
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

