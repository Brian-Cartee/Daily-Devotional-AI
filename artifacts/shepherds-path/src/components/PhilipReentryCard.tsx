// Day 2-3 re-entry card — Philip acknowledges the user came back with something real.
// Day 1: First Arrival Card
// Day 2-3: This card (memory-based)
// Day 4+: Daily Greeting Card ("A word for today")

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useLocation } from "wouter";
import { isPhilipMode } from "@/lib/companionMode";
import { prefetchShepherdTTS, speakShepherdLine } from "@/lib/shepherdVoice";
import { getRelationshipAge } from "@/lib/relationship";
import { PhilipPortraitBadge } from "@/components/PhilipPortraitBadge";
import { fetchGuidanceMemory, buildPhilipReturnLine } from "@/lib/guidanceMemory";

const DISMISSED_KEY = "sp_philip_reentry_dismissed_date";
const CREAM = "#e8dcc8";

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function hasDismissedToday(): boolean {
  try { return localStorage.getItem(DISMISSED_KEY) === todayKey(); } catch { return true; }
}

function dismissToday(): void {
  try { localStorage.setItem(DISMISSED_KEY, todayKey()); } catch {}
}

function shouldShowReentry(): boolean {
  const days = getRelationshipAge();
  if (days < 1 || days > 3) return false;
  try { if (sessionStorage.getItem("sp_philip_first_arrival_active")) return false; } catch {}
  return true;
}

export function PhilipReentryCard() {
  const [visible, setVisible] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [played, setPlayed] = useState(false);
  const blobPromiseRef = useRef<Promise<Blob | null> | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isPhilipMode()) return;
    if (!shouldShowReentry()) return;
    if (hasDismissedToday()) return;

    fetchGuidanceMemory().then((memory) => {
      if (!memory) return;
      const line = buildPhilipReturnLine(memory);
      if (!line) return;
      blobPromiseRef.current = prefetchShepherdTTS(line);
      setGreeting(line);
      setVisible(true);
    });
  }, []);

  const handleHear = async () => {
    if (speaking || !greeting) return;
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

  if (!visible || !greeting) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "relative",
        borderRadius: "18px",
        border: "1px solid rgba(251,191,36,0.12)",
        background: "#0e0905",
        padding: "18px 18px 14px",
        marginBottom: "4px",
        overflow: "hidden",
      }}
      data-testid="philip-reentry-card"
    >
      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <PhilipPortraitBadge size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(232,220,200,0.38)",
              marginBottom: "10px",
            }}
          >
            Philip
          </p>
          <p
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: "16px",
              lineHeight: 1.65,
              color: CREAM,
              marginBottom: "14px",
            }}
          >
            {greeting}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <button
              onClick={handleHear}
              disabled={speaking}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: speaking ? "rgba(251,191,36,0.35)" : "rgba(251,191,36,0.82)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: speaking ? "default" : "pointer",
              }}
            >
              <Volume2 size={13} />
              {speaking ? "Philip is speaking…" : played ? "Hear again" : "Hear Philip"}
            </button>
            <span style={{ color: "rgba(232,220,200,0.15)" }}>·</span>
            <button
              onClick={() => { handleDismiss(); navigate("/guidance"); }}
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "rgba(251,191,36,0.72)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              Talk it through
            </button>
            <span style={{ color: "rgba(232,220,200,0.15)", marginLeft: "auto" }}>·</span>
            <button
              onClick={handleDismiss}
              style={{
                fontSize: "12px",
                color: "rgba(232,220,200,0.28)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
