import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Loader2 } from "lucide-react";
import { setUserName, markNamePrompted, setUserVoice } from "@/lib/userName";

const VOICE_SAMPLE = "Come to me, all who are weary and burdened, and I will give you rest. Walk with me each day, and together we will seek His presence.";

interface Props {
  onDone: () => void;
}

type VoiceId = "onyx" | "shimmer";

export function NamePrompt({ onDone }: Props) {
  const [step, setStep] = useState<"name" | "voice">("name");
  const [name, setName] = useState("");
  const [previewing, setPreviewing] = useState<VoiceId | null>(null);
  const [loading, setLoading] = useState<VoiceId | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPreviewing(null);
  };

  const previewVoice = async (voice: VoiceId) => {
    if (previewing === voice) {
      stopAudio();
      return;
    }
    stopAudio();
    setLoading(voice);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: VOICE_SAMPLE, voice }),
      });
      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.oncanplay = () => {
        setLoading(null);
        setPreviewing(voice);
      };

      audio.onended = () => {
        setPreviewing(null);
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setLoading(null);
        setPreviewing(null);
      };

      await audio.play();
    } catch {
      setLoading(null);
      setPreviewing(null);
    }
  };

  const handleNameContinue = () => {
    const trimmed = name.trim();
    if (trimmed) setUserName(trimmed);
    else markNamePrompted();
    setStep("voice");
  };

  const handleVoiceSelect = (voice: VoiceId) => {
    stopAudio();
    setUserVoice(voice);
    onDone();
  };

  const handleSkipVoice = () => {
    stopAudio();
    onDone();
  };

  const handleSkipAll = () => {
    markNamePrompted();
    onDone();
  };

  const firstName = name.trim().split(" ")[0];

  const voices: { id: VoiceId; label: string; description: string }[] = [
    { id: "onyx", label: "Voice A", description: "Deep & warm" },
    { id: "shimmer", label: "Voice B", description: "Smooth & elegant" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-sm bg-background rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/70 to-amber-400" />

        <div className="px-7 pt-8 pb-8 flex flex-col items-center text-center">

          <AnimatePresence mode="wait">

            {step === "name" ? (
              <motion.div
                key="name-step"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
                className="w-full flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <span className="text-2xl">🌿</span>
                </div>

                <h2 className="text-[22px] font-black text-foreground tracking-tight leading-tight mb-2">
                  Before we begin —
                </h2>

                <p className="text-[15px] text-muted-foreground leading-snug mb-7 max-w-[240px]">
                  What should we call you? Your name helps us make every reflection personal.
                </p>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameContinue()}
                  placeholder="Your first name"
                  autoFocus
                  maxLength={40}
                  data-testid="input-user-name"
                  className="w-full text-center text-[17px] font-semibold bg-muted/50 border border-border rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/50 mb-4 transition-all"
                />

                <button
                  onClick={handleNameContinue}
                  data-testid="btn-name-continue"
                  className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 text-[15px] font-bold hover:opacity-90 transition-opacity mb-3"
                >
                  {firstName ? `Continue as ${firstName}` : "Continue"}
                </button>

                <button
                  onClick={handleSkipAll}
                  data-testid="btn-name-skip"
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              </motion.div>

            ) : (
              <motion.div
                key="voice-step"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="w-full flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-5">
                  <span className="text-2xl">🎙️</span>
                </div>

                <h2 className="text-[22px] font-black text-foreground tracking-tight leading-tight mb-2">
                  Choose your guide's voice
                </h2>

                <p className="text-[14px] text-muted-foreground leading-snug mb-6 max-w-[250px]">
                  Preview each voice, then choose the one that feels right for your daily walk.
                </p>

                <div className="w-full flex flex-col gap-3 mb-4">
                  {voices.map(({ id, label, description }) => {
                    const isPlaying = previewing === id;
                    const isLoading = loading === id;

                    return (
                      <div
                        key={id}
                        className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 border transition-all ${
                          isPlaying
                            ? "border-primary bg-primary/5"
                            : "border-border bg-muted/40 hover:border-primary/40"
                        }`}
                      >
                        <button
                          onClick={() => previewVoice(id)}
                          data-testid={`btn-preview-${id}`}
                          disabled={isLoading && !isPlaying}
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isPlaying
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          {isLoading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : isPlaying
                              ? <Square className="w-3.5 h-3.5" />
                              : <Play className="w-3.5 h-3.5 translate-x-[1px]" />
                          }
                        </button>

                        <div className="flex-1 text-left">
                          <p className="text-[14px] font-bold text-foreground leading-tight">{label}</p>
                          <p className="text-[11px] text-muted-foreground">{description}</p>
                        </div>

                        <button
                          onClick={() => handleVoiceSelect(id)}
                          data-testid={`btn-choose-${id}`}
                          className="text-[12px] font-semibold text-primary hover:text-primary/70 transition-colors shrink-0"
                        >
                          Choose
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleSkipVoice}
                  data-testid="btn-voice-skip"
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip — use default voice
                </button>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </motion.div>
    </motion.div>
  );
}
