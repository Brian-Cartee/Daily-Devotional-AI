import { useState, useEffect, useRef } from "react";
import { Volume2, X } from "lucide-react";
import {
  fetchDailyGreeting,
  speakDailyGreeting,
  hasGreetingBeenDismissedToday,
  dismissGreetingToday,
  type DailyGreeting,
} from "@/lib/philipDailyGreeting";
import { isPhilipMode } from "@/lib/companionMode";
import { getRelationshipAge } from "@/lib/relationship";
import { useLocation } from "wouter";

export function PhilipDailyGreetingCard() {
  const [greeting, setGreeting] = useState<DailyGreeting | null>(null);
  const [visible, setVisible] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [played, setPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isPhilipMode()) return;
    if (hasGreetingBeenDismissedToday()) return;
    // Day 1-3: reentry card handles Philip's presence. Daily greeting starts day 4.
    if (getRelationshipAge() < 4) return;
    // Never show alongside first arrival card — one Philip voice at a time.
    try { if (!localStorage.getItem("sp_philip_first_arrival_shown")) return; } catch {}

    fetchDailyGreeting().then((g) => {
      if (g) {
        setGreeting(g);
        setVisible(true);
      }
    });
  }, []);

  const handleHearIt = async () => {
    if (speaking || !greeting) return;
    setSpeaking(true);
    const audio = await speakDailyGreeting(greeting.text);
    if (!audio) {
      setSpeaking(false);
      return;
    }
    audioRef.current = audio;
    audio.onended = () => {
      setSpeaking(false);
      setPlayed(true);
      audioRef.current = null;
    };
    audio.play().catch(() => setSpeaking(false));
  };

  const handleDismiss = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    dismissGreetingToday();
    setVisible(false);
  };

  if (!visible || !greeting) return null;

  return (
    <div
      className="relative rounded-2xl border border-white/10 bg-zinc-900/50 px-4 py-4 mb-1"
      data-testid="philip-daily-greeting-card"
    >
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Not today"
        className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <X size={14} />
      </button>

      {/* Label */}
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400/80 mb-2">
        Philip · A word for today
      </p>

      {/* Greeting text — shown after played, or always readable */}
      <p className="text-[15px] leading-relaxed text-foreground/90 pr-4">
        {greeting.text}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-3">
        {!played ? (
          <button
            onClick={handleHearIt}
            disabled={speaking}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-violet-300 hover:text-violet-200 transition-colors disabled:opacity-60"
          >
            <Volume2 size={14} />
            {speaking ? "Philip is speaking…" : "Hear it"}
          </button>
        ) : (
          <>
            <button
              onClick={handleHearIt}
              disabled={speaking}
              className="flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              <Volume2 size={13} />
              {speaking ? "…" : "Hear again"}
            </button>
            <span className="text-zinc-700">·</span>
            <button
              onClick={() => { handleDismiss(); navigate("/guidance"); }}
              className="text-[13px] font-semibold text-violet-300 hover:text-violet-200 transition-colors"
            >
              Talk it through with Philip
            </button>
          </>
        )}

        {!played && (
          <>
            <span className="text-zinc-700">·</span>
            <button
              onClick={handleDismiss}
              className="text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Not today
            </button>
          </>
        )}
      </div>
    </div>
  );
}
