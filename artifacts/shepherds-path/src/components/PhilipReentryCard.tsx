// Day 2-3 re-entry card — Philip acknowledges the user came back.
// Simpler than the daily greeting. The relationship earns the rhythm.
// Day 1: First Arrival Card
// Day 2-3: This card ("You came back.")
// Day 4+: Daily Greeting Card ("A word for today")

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { getUserName } from "@/lib/userName";
import { isPhilipMode } from "@/lib/companionMode";
import { prefetchShepherdTTS, speakShepherdLine } from "@/lib/shepherdVoice";
import { BrandIcon } from "@/components/BrandIcon";
import { getRelationshipAge } from "@/lib/relationship";

const DISMISSED_KEY = "sp_philip_reentry_dismissed_date";

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function hasDismissedToday(): boolean {
  try { return localStorage.getItem(DISMISSED_KEY) === todayKey(); } catch { return true; }
}

function dismissToday(): void {
  try { localStorage.setItem(DISMISSED_KEY, todayKey()); } catch {}
}

// Day 2-3 only — after that, PhilipDailyGreetingCard takes over
function shouldShowReentry(): boolean {
  const days = getRelationshipAge();
  return days >= 1 && days <= 3;
}

const REENTRY_LINES = [
  "You came back.",
  "Good to see you again.",
  "Let's pick up where we left off.",
];

function buildReentryGreeting(name: string | null): string {
  const first = name?.split(" ")[0] ?? null;
  // Rotate through lines based on day so it doesn't repeat
  const days = getRelationshipAge();
  const line = REENTRY_LINES[(days - 1) % REENTRY_LINES.length];
  return first ? `${first}. ${line}` : line;
}

export function PhilipReentryCard() {
  const [visible, setVisible] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [played, setPlayed] = useState(false);
  const blobPromiseRef = useRef<Promise<Blob | null> | null>(null);

  const name = getUserName();
  const greeting = buildReentryGreeting(name);

  useEffect(() => {
    if (!isPhilipMode()) return;
    if (!shouldShowReentry()) return;
    if (hasDismissedToday()) return;
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
      onEnd: () => { setSpeaking(false); setPlayed(true); },
      onFail: () => setSpeaking(false),
    });
  };

  const handleDismiss = () => {
    dismissToday();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "relative",
        borderRadius: "18px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: "18px 20px 14px",
        marginBottom: "4px",
        overflow: "hidden",
      }}
      data-testid="philip-reentry-card"
    >
      {/* Brand glyph — ambient mark, not a face */}
      <div style={{ position: "absolute", top: "12px", right: "14px", opacity: 0.08, pointerEvents: "none" }}>
        <BrandIcon size={28} onDark />
      </div>
      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginBottom: "10px" }}>
        Philip
      </p>

      <p style={{ fontFamily: "'Georgia', serif", fontSize: "16px", lineHeight: 1.6, color: "rgba(255,255,255,0.86)", marginBottom: "14px" }}>
        {greeting}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <button
          onClick={handleHear}
          disabled={speaking}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 600,
            color: speaking ? "rgba(167,139,250,0.40)" : "rgba(167,139,250,0.85)",
            background: "none",
            border: "none",
            padding: 0,
            cursor: speaking ? "default" : "pointer",
          }}
        >
          <Volume2 size={13} />
          {speaking ? "Philip is speaking…" : played ? "Hear again" : "Hear Philip"}
        </button>

        <span style={{ color: "rgba(255,255,255,0.12)", marginLeft: "auto" }}>·</span>
        <button
          onClick={handleDismiss}
          style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
