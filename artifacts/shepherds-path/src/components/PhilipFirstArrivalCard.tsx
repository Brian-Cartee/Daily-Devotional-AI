// The first job is not inspiration. The first job is recognition.
// Philip does not speak before the user has offered something.
// This card appears only once — after the heart check, on first home screen load.

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { getUserName } from "@/lib/userName";
import { isPhilipMode } from "@/lib/companionMode";
import { prefetchShepherdTTS, speakShepherdLine } from "@/lib/shepherdVoice";
import { useLocation } from "wouter";

const STORAGE_KEY = "sp_philip_first_arrival_shown";

function hasShownFirstArrival(): boolean {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch { return true; }
}

function markFirstArrivalShown(): void {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
}

function buildGreeting(name: string | null): string {
  const first = name?.split(" ")[0] ?? null;
  if (first) {
    return `${first}, I don't know your story yet. But I know this: your life is not random, and neither is this moment. Jesus has not overlooked you. That's where I'd like to begin. When you're ready, tell me what's on your heart.`;
  }
  return `I don't know your story yet. But I know this: your life is not random, and neither is this moment. Jesus has not overlooked you. That's where I'd like to begin. When you're ready, tell me what's on your heart.`;
}

interface Props {
  onDismiss?: () => void;
}

export function PhilipFirstArrivalCard({ onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [played, setPlayed] = useState(false);
  const blobPromiseRef = useRef<Promise<Blob | null> | null>(null);
  const [, navigate] = useLocation();

  const name = getUserName();
  const greeting = buildGreeting(name);

  useEffect(() => {
    if (!isPhilipMode()) return;
    if (hasShownFirstArrival()) return;
    markFirstArrivalShown();
    // Prefetch TTS immediately so it's ready when they tap
    blobPromiseRef.current = prefetchShepherdTTS(greeting);
    setVisible(true);
  }, [greeting]);

  const handleHear = async () => {
    if (speaking) return;
    setSpeaking(true);
    const blob = blobPromiseRef.current ? await blobPromiseRef.current : null;
    blobPromiseRef.current = null;
    speakShepherdLine(greeting, {
      prefetchedBlob: blob,
      onEnd: () => {
        setSpeaking(false);
        // The First Silence — Philip speaks, then gets out of the way.
        // 3 seconds of nothing before "Talk it through" appears.
        // Most apps speak and immediately ask for something. Philip doesn't.
        window.setTimeout(() => setPlayed(true), 3000);
      },
      onFail: () => { setSpeaking(false); },
    });
  };

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        borderRadius: "18px",
        border: "1px solid rgba(139,92,246,0.18)",
        background: "rgba(26,13,46,0.60)",
        padding: "20px 20px 16px",
        marginBottom: "4px",
      }}
      data-testid="philip-first-arrival-card"
    >
      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(167,139,250,0.60)", marginBottom: "12px" }}>
        Philip · A word before you begin
      </p>

      <p style={{ fontFamily: "'Georgia', serif", fontSize: "15px", lineHeight: 1.7, color: "rgba(255,255,255,0.88)", marginBottom: "12px" }}>
        {greeting}
      </p>

      {/* Day 1 orientation — shown once, never again. Teaches identity not navigation. */}
      {!played && (
        <p style={{ fontSize: "12px", lineHeight: 1.6, color: "rgba(255,255,255,0.32)", marginBottom: "16px" }}>
          When there's something on your heart, tap the microphone below and speak naturally. Philip will listen, pray with you, and help you walk through it.
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          onClick={handleHear}
          disabled={speaking}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 600,
            color: speaking ? "rgba(167,139,250,0.50)" : "rgba(167,139,250,0.90)",
            background: "none",
            border: "none",
            padding: 0,
            cursor: speaking ? "default" : "pointer",
            transition: "color 0.15s",
          }}
        >
          <Volume2 size={14} />
          {speaking ? "Philip is speaking…" : played ? "Hear again" : "Hear Philip"}
        </button>

        {played && (
          <>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <button
              onClick={() => { handleDismiss(); navigate("/guidance"); }}
              style={{ fontSize: "13px", fontWeight: 600, color: "rgba(167,139,250,0.90)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              Talk it through
            </button>
          </>
        )}

        <span style={{ color: "rgba(255,255,255,0.15)", marginLeft: "auto" }}>·</span>
        <button
          onClick={handleDismiss}
          style={{ fontSize: "12px", color: "rgba(255,255,255,0.28)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
