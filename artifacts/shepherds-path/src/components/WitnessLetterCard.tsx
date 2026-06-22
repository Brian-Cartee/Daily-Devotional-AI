import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, BookMarked, X, Loader2 } from "lucide-react";
import { getSessionId } from "@/lib/session";
import { getUserName } from "@/lib/userName";
import { isProVerifiedLocally } from "@/lib/proStatus";

interface Props {
  situation: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  phase1Response?: string | null;
  onSaveToJournal: (text: string) => void;
}

export function WitnessLetterCard({ situation, messages, phase1Response, onSaveToJournal }: Props) {
  const [stage, setStage] = useState<"offer" | "loading" | "ready" | "dismissed">("offer");
  const [letter, setLetter] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [saved, setSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleWrite = async () => {
    setStage("loading");
    try {
      const r = await fetch("/api/guidance/witness-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation,
          messages,
          phase1Response: phase1Response ?? undefined,
          userName: getUserName() ?? undefined,
          sessionId: getSessionId() ?? undefined,
        }),
      });
      const data = await r.json() as { letter?: string };
      if (data.letter) {
        setLetter(data.letter);
        setStage("ready");
      } else {
        setStage("dismissed");
      }
    } catch {
      setStage("dismissed");
    }
  };

  const handleSpeak = async () => {
    if (!letter || speaking) return;
    setSpeaking(true);
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: letter,
          voice: "onyx",
          scope: "guidance",
          sessionId: getSessionId(),
          isPro: isProVerifiedLocally(),
        }),
      });
      if (!r.ok) { setSpeaking(false); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.play().catch(() => setSpeaking(false));
    } catch {
      setSpeaking(false);
    }
  };

  const handleSave = () => {
    if (!letter || saved) return;
    onSaveToJournal(letter);
    setSaved(true);
  };

  if (stage === "dismissed") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl border border-white/10 bg-zinc-900/50 px-5 py-5 mt-2"
        data-testid="witness-letter-card"
      >
        {stage === "offer" && (
          <>
            <button
              onClick={() => setStage("dismissed")}
              aria-label="Not now"
              className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X size={14} />
            </button>

            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400/70 mb-2">
              Philip · Witness Letter
            </p>
            <p className="text-[14px] text-foreground/80 leading-relaxed mb-1">
              Philip can write what he saw in you during this conversation.
            </p>
            <p className="text-[12px] text-zinc-500 mb-4 leading-relaxed">
              Not a summary. A word about what he witnessed in you.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleWrite}
                className="text-[13px] font-semibold text-violet-300 hover:text-violet-200 transition-colors"
              >
                Write it
              </button>
              <span className="text-zinc-700">·</span>
              <button
                onClick={() => setStage("dismissed")}
                className="text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Not now
              </button>
            </div>
          </>
        )}

        {stage === "loading" && (
          <div className="flex items-center gap-3 py-2">
            <Loader2 size={16} className="animate-spin text-violet-400" />
            <p className="text-[13px] text-zinc-400">Philip is writing…</p>
          </div>
        )}

        {stage === "ready" && letter && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400/70 mb-3">
              Philip · What I witnessed
            </p>

            <p className="text-[15px] leading-[1.75] text-foreground/90 whitespace-pre-line">
              {letter}
            </p>

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <button
                onClick={handleSpeak}
                disabled={speaking}
                className="flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                <Volume2 size={13} />
                {speaking ? "Philip is speaking…" : "Hear it"}
              </button>

              <span className="text-zinc-700">·</span>

              <button
                onClick={handleSave}
                disabled={saved}
                className="flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-zinc-300 transition-colors disabled:opacity-40"
              >
                <BookMarked size={13} />
                {saved ? "Saved to journal" : "Save to journal"}
              </button>

              <span className="text-zinc-700">·</span>

              <button
                onClick={() => { audioRef.current?.pause(); setStage("dismissed"); }}
                className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
